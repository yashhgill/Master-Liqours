"""Resend email helpers — order confirmations + low stock alerts.

Reuses the same RESEND_API_KEY already configured for password reset emails
in routes_auth.py. No-ops gracefully (logs only) if the key isn't set, so it
never breaks the checkout flow.
"""
import os
import logging

import resend

logger = logging.getLogger(__name__)

resend.api_key = os.environ.get("RESEND_API_KEY", "")
SENDER = os.environ.get("SENDER_EMAIL", "noreply@masterliqours.my")
FRONTEND_URL = os.environ.get("FRONTEND_URL", "https://masterliqours.my")

LOW_STOCK_THRESHOLD = int(os.environ.get("LOW_STOCK_THRESHOLD", "3"))


def _send(to: str, subject: str, html: str) -> dict:
    """Shared sender. Returns {sent, reason}. Never raises."""
    if not resend.api_key:
        logger.info("[Email dormant] would send to %s: %s", to, subject)
        return {"sent": False, "reason": "resend_not_configured"}
    if not to:
        return {"sent": False, "reason": "missing_to_address"}
    try:
        resend.Emails.send({"from": SENDER, "to": to, "subject": subject, "html": html})
        return {"sent": True, "reason": None}
    except Exception as e:  # noqa: BLE001 — never break order flow on email failure
        logger.exception("Resend email failed: %s", e)
        return {"sent": False, "reason": str(e)}


def send_order_confirmation(
    to_email: str,
    customer_name: str,
    order_id: str,
    items: list,
    total: float,
    shipping_address: str,
    staff_name: str = None,
    staff_whatsapp: str = None,
) -> dict:
    """Email sent right after checkout. `items` is a list of dicts with
    product_name, quantity, price keys."""
    short_id = order_id[:8].upper()

    rows_html = "".join(
        f"""<tr>
            <td style="padding:10px 0;color:#fff;border-bottom:1px solid #1a1a1a;">{i.get('product_name', 'Item')}</td>
            <td style="padding:10px 0;color:#999;text-align:center;border-bottom:1px solid #1a1a1a;">×{i.get('quantity', 1)}</td>
            <td style="padding:10px 0;color:#ff007f;text-align:right;border-bottom:1px solid #1a1a1a;">RM{(i.get('price', 0) * i.get('quantity', 1)):.2f}</td>
        </tr>"""
        for i in items
    )

    staff_block = ""
    if staff_name:
        staff_block = f"""
        <div style="background:#111;border-radius:12px;padding:16px;margin-top:20px;">
            <p style="color:#999;margin:0 0 6px;font-size:13px;">Your order is being handled by</p>
            <p style="color:#00f0ff;margin:0;font-weight:bold;font-size:16px;">{staff_name}</p>
            {f'<p style="color:#666;margin:4px 0 0;font-size:13px;">{staff_whatsapp}</p>' if staff_whatsapp else ''}
        </div>"""

    html = f"""
    <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;background:#0a0a0a;color:#fff;border-radius:16px;">
        <h2 style="color:#ff007f;font-size:26px;margin-bottom:4px;">Order Confirmed!</h2>
        <p style="color:#999;margin-bottom:4px;">Hi {customer_name or 'there'}, thanks for ordering boss.</p>
        <p style="color:#555;margin-bottom:24px;font-size:13px;">Order #{short_id}</p>

        <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
            <thead>
                <tr>
                    <th style="text-align:left;color:#666;font-size:11px;text-transform:uppercase;padding-bottom:8px;">Item</th>
                    <th style="text-align:center;color:#666;font-size:11px;text-transform:uppercase;padding-bottom:8px;">Qty</th>
                    <th style="text-align:right;color:#666;font-size:11px;text-transform:uppercase;padding-bottom:8px;">Subtotal</th>
                </tr>
            </thead>
            <tbody>{rows_html}</tbody>
        </table>

        <div style="display:flex;justify-content:space-between;padding-top:8px;">
            <span style="color:#999;">Total</span>
            <span style="color:#ff007f;font-size:22px;font-weight:bold;">RM{total:.2f}</span>
        </div>

        <div style="background:#111;border-radius:12px;padding:16px;margin-top:20px;">
            <p style="color:#999;margin:0 0 6px;font-size:13px;">Delivery Address</p>
            <p style="color:#fff;margin:0;font-size:14px;">{shipping_address}</p>
        </div>

        {staff_block}

        <a href="{FRONTEND_URL}/orders/{order_id}" style="display:inline-block;background:#ff007f;color:#fff;padding:14px 28px;border-radius:50px;text-decoration:none;font-weight:bold;font-size:14px;margin-top:24px;">Track Your Order</a>

        <p style="color:#555;margin-top:24px;font-size:12px;">Settle payment via WhatsApp with your assigned staff. Questions? Just reply to your staff's chat.</p>
    </div>
    """

    return _send(to_email, f"Order #{short_id} confirmed — Masterliqours", html)


def send_low_stock_alert(to_email: str, staff_name: str, product_name: str, quantity: int) -> dict:
    """Email sent to a staff member when one of their products drops at/below threshold."""
    html = f"""
    <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;background:#0a0a0a;color:#fff;border-radius:16px;">
        <h2 style="color:#ffd700;font-size:24px;margin-bottom:8px;">⚠ Low Stock Alert</h2>
        <p style="color:#999;margin-bottom:20px;">Hi {staff_name}, one of your products is running low.</p>
        <div style="background:#111;border-radius:12px;padding:20px;">
            <p style="color:#fff;margin:0 0 4px;font-size:18px;font-weight:bold;">{product_name}</p>
            <p style="color:{'#ff007f' if quantity == 0 else '#ffd700'};margin:0;font-size:14px;">
                {'Out of stock!' if quantity == 0 else f'Only {quantity} left'}
            </p>
        </div>
        <a href="{FRONTEND_URL}/staff" style="display:inline-block;background:#ffd700;color:#0a0a0a;padding:14px 28px;border-radius:50px;text-decoration:none;font-weight:bold;font-size:14px;margin-top:20px;">Restock Now</a>
    </div>
    """
    return _send(to_email, f"Low stock: {product_name}", html)
