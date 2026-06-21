"""Bulk / event order enquiries — the "Contact Us" form for customers who want
carton-quantity pricing for parties, weddings, corporate events, etc. Stored in
the DB so the boss can see/manage them, and emailed to the admin inbox so
nothing gets missed.
"""
import os
import re
import html as html_lib
import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, EmailStr
from typing import Optional, List

from database import get_db
from models import BulkOrderInquiry, User, UserRole
from auth_utils import get_current_user
from email_utils import _send, FALLBACK_SENDER

router = APIRouter(prefix="/bulk-orders", tags=["Bulk Orders"])
logger = logging.getLogger(__name__)

ADMIN_NOTIFY_EMAIL = os.environ.get("ADMIN_NOTIFY_EMAIL", FALLBACK_SENDER)


class BulkOrderRequest(BaseModel):
    name: str
    company: Optional[str] = None
    email: EmailStr
    whatsapp: str
    event_date: Optional[str] = None
    estimated_cartons: Optional[str] = None
    items_wanted: Optional[str] = None
    message: Optional[str] = None


def _clean(obj):
    return {k: v for k, v in obj.__dict__.items() if not k.startswith('_')}


def _esc(value) -> str:
    """HTML-escape any user-supplied text before it goes into an email body.
    This is a public, no-login endpoint — without this, anyone could submit
    a 'bulk order enquiry' containing arbitrary HTML/links that show up in
    the admin's inbox looking like part of our own system notification."""
    return html_lib.escape(str(value)) if value else ""


def _esc_header(value: str) -> str:
    """Strip CR/LF from anything that ends up in an email subject line, so a
    crafted name/message can't inject extra mail headers."""
    return re.sub(r"[\r\n]+", " ", str(value or "")).strip()


@router.post("")
async def submit_bulk_order(data: BulkOrderRequest, db: AsyncSession = Depends(get_db)):
    """Public endpoint — anyone (no login needed) can submit a bulk/event enquiry."""
    inquiry = BulkOrderInquiry(
        name=data.name.strip(),
        company=(data.company or "").strip() or None,
        email=str(data.email),
        whatsapp=data.whatsapp.strip(),
        event_date=data.event_date,
        estimated_cartons=data.estimated_cartons,
        items_wanted=data.items_wanted,
        message=data.message,
    )
    db.add(inquiry)
    await db.commit()
    await db.refresh(inquiry)

    html = f"""
    <h2>New bulk / event order enquiry</h2>
    <p><b>Name:</b> {_esc(data.name)}</p>
    <p><b>Company:</b> {_esc(data.company) or '-'}</p>
    <p><b>Email:</b> {_esc(data.email)}</p>
    <p><b>WhatsApp:</b> {_esc(data.whatsapp)}</p>
    <p><b>Event date:</b> {_esc(data.event_date) or '-'}</p>
    <p><b>Estimated cartons:</b> {_esc(data.estimated_cartons) or '-'}</p>
    <p><b>Items wanted:</b><br/>{_esc(data.items_wanted or '-').replace(chr(10), '<br/>')}</p>
    <p><b>Message:</b><br/>{_esc(data.message or '-').replace(chr(10), '<br/>')}</p>
    """
    _send(
        to=ADMIN_NOTIFY_EMAIL,
        subject=f"Bulk order enquiry from {_esc_header(data.name)}",
        html=html,
        reply_to=str(data.email),
    )

    return {"message": "Thanks! We'll WhatsApp/email you shortly with bulk pricing.", "inquiry_id": inquiry.inquiry_id}


@router.get("")
async def list_bulk_orders(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Boss/admin only — see all bulk/event enquiries."""
    if user.role not in (UserRole.SUPER_ADMIN, UserRole.MASTER_ADMIN):
        raise HTTPException(status_code=403, detail="Admin only")
    r = await db.execute(select(BulkOrderInquiry).order_by(BulkOrderInquiry.created_at.desc()))
    return [_clean(i) for i in r.scalars().all()]


class StatusUpdate(BaseModel):
    status: str


@router.patch("/{inquiry_id}")
async def update_bulk_order_status(
    inquiry_id: str,
    payload: StatusUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if user.role not in (UserRole.SUPER_ADMIN, UserRole.MASTER_ADMIN):
        raise HTTPException(status_code=403, detail="Admin only")
    r = await db.execute(select(BulkOrderInquiry).where(BulkOrderInquiry.inquiry_id == inquiry_id))
    inquiry = r.scalar_one_or_none()
    if not inquiry:
        raise HTTPException(status_code=404, detail="Enquiry not found")
    inquiry.status = payload.status
    await db.commit()
    return {"message": "Updated", "status": inquiry.status}
