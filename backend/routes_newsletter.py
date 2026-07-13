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
