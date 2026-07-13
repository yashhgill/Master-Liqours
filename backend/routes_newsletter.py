from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
import os
import resend

from database import get_db
from models import NewsletterSubscriber
from schemas import NewsletterSubscribe

router = APIRouter(prefix="/newsletter", tags=["Newsletter"])

resend.api_key = os.environ.get('RESEND_API_KEY')
SENDER_EMAIL = os.environ.get('SENDER_EMAIL', 'noreply@masterliqours.my')

@router.post("/subscribe")
async def subscribe(
    data: NewsletterSubscribe,
    db: AsyncSession = Depends(get_db)
):
    """Subscribe to newsletter"""
    # Check if already subscribed
    result = await db.execute(
        select(NewsletterSubscriber).where(NewsletterSubscriber.email == data.email)
    )
    subscriber = result.scalar_one_or_none()
    
    if subscriber:
        if subscriber.subscribed:
            return {"message": "You're already subscribed boss!"}
        else:
            subscriber.subscribed = True
            await db.commit()
            return {"message": "Welcome back — you're subscribed again!"}
    
    # Create new subscriber
    subscriber = NewsletterSubscriber(email=data.email)
    db.add(subscriber)
    await db.commit()
    
    # Send welcome email
    try:
        params = {
            "from": SENDER_EMAIL,
            "to": [data.email],
            "subject": "Welcome to the Masterliqours family 🥃",
            "html": """
            <div style="font-family: Arial, Helvetica, sans-serif; max-width: 560px; margin: 0 auto; background:#0d0d0d; color:#ffffff; border-radius:16px; overflow:hidden;">
                <div style="background:linear-gradient(135deg,#ff007f,#c8005a); padding:32px 28px; text-align:center;">
                    <h1 style="margin:0; font-size:26px; letter-spacing:0.04em;">YOU'RE IN, BOSS 🎉</h1>
                    <p style="margin:8px 0 0; opacity:0.9; font-size:14px;">Welcome to Masterliqours — premium liquor, delivered.</p>
                </div>
                <div style="padding:28px;">
                    <p style="font-size:15px; line-height:1.6; color:#e5e5e5;">Thanks for subscribing! You'll be first to know about:</p>
                    <ul style="font-size:15px; line-height:1.9; color:#e5e5e5; padding-left:18px;">
                        <li>🎁 Exclusive promos &amp; member deals</li>
                        <li>⚡ Flash sales — limited stock, habis confirm habis</li>
                        <li>🆕 New arrivals &amp; rare drops</li>
                        <li>🎊 Weekly best-price picks</li>
                    </ul>
                    <div style="text-align:center; margin:28px 0 8px;">
                        <a href="https://masterliqours.my/products" style="display:inline-block; background:linear-gradient(135deg,#ff007f,#c8005a); color:#fff; text-decoration:none; padding:14px 32px; border-radius:50px; font-weight:800; font-size:14px; letter-spacing:0.05em;">START SHOPPING →</a>
                    </div>
                </div>
                <div style="padding:16px 28px; border-top:1px solid rgba(255,255,255,0.08); text-align:center;">
                    <p style="color:#777; font-size:12px; margin:0;">Masterliqours · Premium Liquor Delivery · KL &amp; Klang Valley</p>
                    <p style="color:#555; font-size:11px; margin:6px 0 0;">Drink responsibly. Must be 21+ to purchase.</p>
                </div>
            </div>
            """
        }
        resend.Emails.send(params)
    except Exception as e:
        print(f"Failed to send email: {e}")
    
    return {"message": "You're in! Check your email boss."}

@router.post("/unsubscribe")
async def unsubscribe(
    data: NewsletterSubscribe,
    db: AsyncSession = Depends(get_db)
):
    """Unsubscribe from newsletter"""
    result = await db.execute(
        select(NewsletterSubscriber).where(NewsletterSubscriber.email == data.email)
    )
    subscriber = result.scalar_one_or_none()
    
    if not subscriber:
        raise HTTPException(status_code=404, detail="Email not found")
    
    subscriber.subscribed = False
    await db.commit()
    
    return {"message": "Unsubscribed successfully"}


# ─── ADMIN: BROADCAST A CAMPAIGN TO ALL SUBSCRIBERS ────────────────────────────
from typing import Optional
from pydantic import BaseModel
from sqlalchemy import func
from models import User, UserRole
from auth_utils import get_current_user


class BroadcastRequest(BaseModel):
    subject: str
    heading: Optional[str] = None
    body_html: Optional[str] = None       # raw HTML for the message body
    image_url: Optional[str] = None       # e.g. the launch poster
    cta_text: Optional[str] = "Shop Now"
    cta_link: Optional[str] = "https://masterliqours.my/products"
    test_email: Optional[str] = None      # if set, send ONLY to this address (preview)


def _campaign_html(req: BroadcastRequest) -> str:
    heading = req.heading or "Masterliqours"
    img = ""
    if req.image_url:
        img = f'<img src="{req.image_url}" alt="Masterliqours" style="width:100%; max-width:560px; display:block; border-radius:12px; margin:0 auto 24px;" />'
    body = req.body_html or ""
    cta = ""
    if req.cta_text and req.cta_link:
        cta = (
            f'<div style="text-align:center; margin:28px 0 8px;">'
            f'<a href="{req.cta_link}" style="display:inline-block; background:linear-gradient(135deg,#ff007f,#c8005a); '
            f'color:#fff; text-decoration:none; padding:14px 34px; border-radius:50px; font-weight:800; '
            f'font-size:14px; letter-spacing:0.05em;">{req.cta_text} &rarr;</a></div>'
        )
    return f"""
    <div style="font-family: Arial, Helvetica, sans-serif; max-width: 600px; margin: 0 auto; background:#0d0d0d; color:#ffffff; border-radius:16px; overflow:hidden;">
        <div style="background:linear-gradient(135deg,#ff007f,#c8005a); padding:24px 28px; text-align:center;">
            <h1 style="margin:0; font-size:24px; letter-spacing:0.04em;">{heading}</h1>
        </div>
        <div style="padding:28px;">
            {img}
            <div style="font-size:15px; line-height:1.7; color:#e5e5e5;">{body}</div>
            {cta}
        </div>
        <div style="padding:16px 28px; border-top:1px solid rgba(255,255,255,0.08); text-align:center;">
            <p style="color:#777; font-size:12px; margin:0;">Masterliqours &middot; Premium Liquor Delivery &middot; KL &amp; Klang Valley</p>
            <p style="color:#555; font-size:11px; margin:6px 0 0;">Drink responsibly. Must be 21+ to purchase. You received this because you subscribed at masterliqours.my.</p>
        </div>
    </div>
    """


@router.post("/broadcast")
async def broadcast(
    req: BroadcastRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Admin-only: send a campaign email to all subscribers (or a single test address)."""
    if user.role not in (UserRole.SUPER_ADMIN, UserRole.MASTER_ADMIN):
        raise HTTPException(status_code=403, detail="Admin only boss")

    html = _campaign_html(req)

    # Preview mode — send to one address only
    if req.test_email:
        try:
            resend.Emails.send({
                "from": SENDER_EMAIL,
                "to": [req.test_email],
                "subject": f"[TEST] {req.subject}",
                "html": html,
            })
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"Test send failed: {e}")
        return {"message": f"Test sent to {req.test_email}", "recipients": 1, "test": True}

    # Real broadcast — all active subscribers
    result = await db.execute(
        select(NewsletterSubscriber.email).where(NewsletterSubscriber.subscribed == True)
    )
    emails = [row[0] for row in result.all()]
    if not emails:
        return {"message": "No subscribers to send to", "recipients": 0}

    sent, failed = 0, 0
    for addr in emails:
        try:
            resend.Emails.send({
                "from": SENDER_EMAIL,
                "to": [addr],
                "subject": req.subject,
                "html": html,
            })
            sent += 1
        except Exception:
            failed += 1

    return {
        "message": f"Broadcast sent to {sent} subscriber(s)" + (f", {failed} failed" if failed else ""),
        "recipients": sent,
        "failed": failed,
    }


@router.get("/subscribers/count")
async def subscriber_count(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Admin-only: how many active subscribers."""
    if user.role not in (UserRole.SUPER_ADMIN, UserRole.MASTER_ADMIN):
        raise HTTPException(status_code=403, detail="Admin only boss")
    result = await db.execute(
        select(func.count()).select_from(NewsletterSubscriber).where(NewsletterSubscriber.subscribed == True)
    )
    return {"count": result.scalar() or 0}
