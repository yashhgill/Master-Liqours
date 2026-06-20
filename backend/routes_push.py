"""Web Push notifications — staff/boss get alerted on their phone (installed PWA)
about new orders, low stock, and order status changes, without needing the app
open in the foreground.

Requires VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY env vars (generate once with:
`vapid --gen` from the `py-vapid` package, or `pywebpush`'s helper) and the
`pywebpush` package (added to requirements.txt).
"""
import os
import json
import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional

from database import get_db
from models import User, PushSubscription, UserRole

router = APIRouter(prefix="/push", tags=["Push Notifications"])
logger = logging.getLogger(__name__)

VAPID_PUBLIC_KEY = os.environ.get("VAPID_PUBLIC_KEY", "")
VAPID_PRIVATE_KEY = os.environ.get("VAPID_PRIVATE_KEY", "")
VAPID_CLAIMS_SUB = os.environ.get("VAPID_CLAIMS_EMAIL", "mailto:admin@masterliqours.my")


@router.get("/vapid-public-key")
async def get_vapid_public_key():
    return {"public_key": VAPID_PUBLIC_KEY}


class SubscriptionKeys(BaseModel):
    p256dh: str
    auth: str


class SubscriptionPayload(BaseModel):
    endpoint: str
    keys: SubscriptionKeys


from auth_utils import get_current_user


@router.post("/subscribe")
async def subscribe(
    payload: SubscriptionPayload,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Register this browser/device for push notifications (staff + admins)."""
    existing = await db.execute(select(PushSubscription).where(PushSubscription.endpoint == payload.endpoint))
    sub = existing.scalar_one_or_none()
    if sub:
        sub.user_id = user.user_id
        sub.p256dh = payload.keys.p256dh
        sub.auth = payload.keys.auth
    else:
        sub = PushSubscription(
            user_id=user.user_id,
            endpoint=payload.endpoint,
            p256dh=payload.keys.p256dh,
            auth=payload.keys.auth,
        )
        db.add(sub)
    await db.commit()
    return {"message": "Subscribed for push notifications"}


@router.post("/unsubscribe")
async def unsubscribe(
    payload: dict,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    endpoint = payload.get("endpoint")
    if endpoint:
        existing = await db.execute(select(PushSubscription).where(PushSubscription.endpoint == endpoint))
        sub = existing.scalar_one_or_none()
        if sub:
            await db.delete(sub)
            await db.commit()
    return {"message": "Unsubscribed"}


def _send_to_subscription(sub: PushSubscription, title: str, body: str, url: str = "/staff"):
    """Fire-and-forget push send. Never raises — a failed push must never break
    the request (checkout, stock update, etc.) that triggered it."""
    if not VAPID_PRIVATE_KEY:
        logger.info("Push skipped (no VAPID_PRIVATE_KEY configured): %s — %s", title, body)
        return
    try:
        from pywebpush import webpush, WebPushException
        webpush(
            subscription_info={
                "endpoint": sub.endpoint,
                "keys": {"p256dh": sub.p256dh, "auth": sub.auth},
            },
            data=json.dumps({"title": title, "body": body, "url": url}),
            vapid_private_key=VAPID_PRIVATE_KEY,
            vapid_claims={"sub": VAPID_CLAIMS_SUB},
        )
    except Exception as e:
        logger.warning("Push send failed for %s: %s", sub.endpoint[:50], e)


async def notify_staff_or_admins(db: AsyncSession, title: str, body: str, staff_user_email: Optional[str] = None, url: str = "/staff"):
    """Push a notification to a specific staff member's account (by email) and
    to all super_admin/master_admin accounts (the boss should always know)."""
    target_user_ids = set()

    if staff_user_email:
        r = await db.execute(select(User).where(User.email == staff_user_email))
        u = r.scalar_one_or_none()
        if u:
            target_user_ids.add(u.user_id)

    r = await db.execute(select(User).where(User.role.in_([UserRole.SUPER_ADMIN, UserRole.MASTER_ADMIN])))
    for u in r.scalars().all():
        target_user_ids.add(u.user_id)

    if not target_user_ids:
        return

    subs_result = await db.execute(select(PushSubscription).where(PushSubscription.user_id.in_(target_user_ids)))
    for sub in subs_result.scalars().all():
        _send_to_subscription(sub, title, body, url)
