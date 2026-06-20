"""Resend email helpers.

Two things live here:
1. Staff-triggered "Notify Customer" emails — sent FROM the staff member's own
   alias (e.g. "Sam <sam@masterliqours.my>") rather than a generic noreply@.
   Template is auto-picked based on the order's current status.
2. Low stock alerts — sent TO staff when their stock runs low.

Both no-op gracefully (log only) if RESEND_API_KEY isn't set, so they never
break the checkout/dashboard flow.
"""
import os
import re
import logging

import resend

logger = logging.getLogger(__name__)

resend.api_key = os.environ.get("RESEND_API_KEY", "")
SENDER_DOMAIN = os.environ.get("SENDER_DOMAIN", "masterliqours.my")
FALLBACK_SENDER = os.environ.get("SENDER_EMAIL", f"noreply@{SENDER_DOMAIN}")
FRONTEND_URL = os.environ.get("FRONTEND_URL", "https://masterliqours.my")

LOW_STOCK_THRESHOLD = int(os.environ.get("LOW_STOCK_THRESHOLD", "3"))


def _send(to: str, subject: str, html: str, from_addr: str = None, reply_to: str = None) -> dict:
    """Shared sender. Returns {sent, reason}. Never raises."""
    if not resend.api_key:
        logger.info("[Email dormant] would send to %s from %s: %s", to, from_addr, subject)
        return {"sent": False, "reason": "resend_not_configured"}
    if not to:
        return {"sent": False, "reason": "missing_to_address"}
    try:
        payload = {"from": from_addr or FALLBACK_SENDER, "to": to, "subject": subject, "html": html}
        if reply_to:
            payload["reply_to"] = reply_to
        resend.Emails.send(payload)
        return {"sent": True, "reason": None}
    except Exception as e:  # noqa: BLE001 — never break order/dashboard flow on email failure
        logger.exception("Resend email failed: %s", e)
        return {"sent": False, "reason": str(e)}


def staff_sender_address(staff_name: str) -> str:
    """Turn 'Sam Tan' into 'Sam from Masterliqours <sam@masterliqours.my>' —
    a deliverable alias on our verified domain that still reads as personal,
    since Resend can't send on behalf of inboxes we don't own (e.g. a
    staff member's personal Gmail)."""
    first_name = (staff_name or "staff").strip().split(" ")[0]
    slug = re.sub(r"[^a-z0-9]", "", first_name.lower()) or "staff"
    return f"{first_name} from Masterliqours <{slug}@{SENDER_DOMAIN}>"


_STATUS_TEMPLATES = {
    "pending": {
        "subject": "Order #{oid} received — Masterliqours",
        "heading": "Order Received!",
        "color": "#ffd700",
        "body": "Thanks for ordering boss. We've got your order and will confirm shortly. Settle payment via WhatsApp with {staff} when ready.",
    },
    "confirmed": {
        "subject": "Order #{oid} confirmed — Masterliqours",
        "heading": "Order Confirmed!",
        "color": "#00f0ff",
        "body": "Good news — your order is confirmed and {staff} is getting your bottles ready.",
    },
    "preparing": {
        "subject": "Order #{oid} is being prepared — Masterliqours",
        "heading": "Preparing Your Order",
        "color": "#00f0ff",
        "body": "{staff} is packing your order right now. Almost ready to ship boss!",
    },
    "out_for_delivery": {
        "subject": "Order #{oid} is on the way! — Masterliqours",
        "heading": "Out for Delivery",
        "color": "#39ff14",
        "body": "Your order is out for delivery — {staff} is on the way to you now. Have your payment ready lah.",
    },
    "delivered": {
        "subject": "Order #{oid} delivered — Masterliqours",
        "heading": "Delivered!",
        "color": "#39ff14",
        "body": "Your order has been delivered. Drink responsibly and enjoy! Don't forget to leave a review.",
    },
    "cancelled": {
        "subject": "Order #{oid} cancelled — Masterliqours",
        "heading": "Order Cancelled",
        "color": "#ff007f",
        "body": "This order has been cancelled. Reply to {staff} on WhatsApp if you have any questions.",
    },
}


def send_status_notification(
    to_email: str,
    customer_name: str,
    order_id: str,
    status: str,
    staff_name: str,
    staff_email: str = None,
    staff_whatsapp: str = None,
) -> dict:
    """The 'Notify Customer' button on staff dashboard calls this. Auto-picks
    the template based on the order's current status and sends FROM the
    staff member's own alias."""
    short_id = order_id[:8].upper()
    template = _STATUS_TEMPLATES.get(status, _STATUS_TEMPLATES["confirmed"])

    body_text = template["body"].format(staff=staff_name or "our staff")
    subject = template["subject"].format(oid=short_id)
    from_addr = staff_sender_address(staff_name)

    whatsapp_block = ""
    if staff_whatsapp:
        wa_digits = re.sub(r"\D", "", staff_whatsapp)
        whatsapp_block = f"""
        <a href="https://wa.me/{wa_digits}" style="display:inline-block;background:#25d366;color:#fff;padding:12px 24px;border-radius:50px;text-decoration:none;font-weight:bold;font-size:14px;margin-top:16px;margin-right:8px;">Message {staff_name} on WhatsApp</a>"""

    html = f"""
    <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;background:#0a0a0a;color:#fff;border-radius:16px;">
        <h2 style="color:{template['color']};font-size:26px;margin-bottom:8px;">{template['heading']}</h2>
        <p style="color:#999;margin-bottom:4px;">Hi {customer_name or 'there'},</p>
        <p style="color:#fff;margin-bottom:20px;font-size:15px;line-height:1.6;">{body_text}</p>
        <p style="color:#555;margin-bottom:20px;font-size:13px;">Order #{short_id}</p>

        <a href="{FRONTEND_URL}/orders/{order_id}" style="display:inline-block;background:#ff007f;color:#fff;padding:12px 24px;border-radius:50px;text-decoration:none;font-weight:bold;font-size:14px;margin-top:4px;margin-right:8px;">Track Order</a>
        {whatsapp_block}

        <p style="color:#444;margin-top:28px;font-size:12px;">Sent by {staff_name} from Masterliqours</p>
    </div>
    """

    # Reply-To is always the same masterliqours.my alias used as the From
    # address -- never the staff member's actual personal inbox (staff_email
    # may be a personal Gmail/etc since that's just their login). Customers
    # should only ever see a masterliqours.my address, never a teammate's
    # private email.
    return _send(
        to=to_email,
        subject=subject,
        html=html,
        from_addr=from_addr,
        reply_to=from_addr,
    )


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
