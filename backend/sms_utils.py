"""Twilio SMS helper — dormant if TWILIO_* env vars not set.

To enable: set in /app/backend/.env:
  TWILIO_ACCOUNT_SID=AC...
  TWILIO_AUTH_TOKEN=...
  TWILIO_FROM_NUMBER=+1xxx (E.164)
"""
import os
import logging

logger = logging.getLogger(__name__)

_STATUS_COPY = {
    "pending": "Order #{oid} received boss! Settle payment via WhatsApp lah.",
    "confirmed": "Order #{oid} confirmed! Your bottles akan be prepared soon.",
    "preparing": "Order #{oid} is being prepared — almost ready to ship.",
    "out_for_delivery": "Order #{oid} is out for delivery! {staff} is on the way boss.",
    "delivered": "Order #{oid} delivered! Drink responsibly lah & enjoy.",
    "cancelled": "Order #{oid} has been cancelled. Reply WhatsApp if got questions.",
}

def status_message(status: str, order_id: str, staff_name: str = "Our staff") -> str:
    template = _STATUS_COPY.get(status, "Order #{oid} status updated to {status}.")
    return template.format(oid=order_id[:8].upper(), staff=staff_name, status=status)


def send_sms(to_number: str, message: str) -> dict:
    """Send an SMS. Returns {sent: bool, sid: str|None, reason: str|None}.

    No-ops gracefully when Twilio creds aren't configured or `to_number` is missing.
    Failures are logged but never raised to the caller.
    """
    sid = os.environ.get("TWILIO_ACCOUNT_SID")
    token = os.environ.get("TWILIO_AUTH_TOKEN")
    from_number = os.environ.get("TWILIO_FROM_NUMBER")

    if not (sid and token and from_number):
        logger.info("[SMS dormant] would send to %s: %s", to_number, message)
        return {"sent": False, "sid": None, "reason": "twilio_not_configured"}

    if not to_number:
        return {"sent": False, "sid": None, "reason": "missing_to_number"}

    # Normalize to E.164 — assume Malaysia (+60) if local format without country code
    to = to_number.strip().replace(" ", "")
    if not to.startswith("+"):
        # 01234567890 -> +60123456789 ; 1234567890 -> +601234567890
        digits = to.lstrip("0")
        to = f"+60{digits}"

    try:
        from twilio.rest import Client  # imported lazily
        client = Client(sid, token)
        msg = client.messages.create(body=message, from_=from_number, to=to)
        return {"sent": True, "sid": msg.sid, "reason": None}
    except Exception as e:  # noqa: BLE001 — never break the order flow on SMS failure
        logger.exception("Twilio SMS failed: %s", e)
        return {"sent": False, "sid": None, "reason": str(e)}
