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
            return {"message": "Dah subscribe"}
        else:
            subscriber.subscribed = True
            await db.commit()
            return {"message": "Subscribe semula berjaya"}
    
    # Create new subscriber
    subscriber = NewsletterSubscriber(email=data.email)
    db.add(subscriber)
    await db.commit()
    
    # Send welcome email
    try:
        params = {
            "from": SENDER_EMAIL,
            "to": [data.email],
            "subject": "Selamat datang ke Masterliqours! 🥃",
            "html": f"""
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h1 style="color: #000;">Terima kasih subscribe! 🎉</h1>
                <p>You akan dapat updates terkini tentang:</p>
                <ul>
                    <li>🎁 Special promotions & discounts</li>
                    <li>⚡ Flash sales</li>
                    <li>🆕 Produk baru</li>
                    <li>🎊 Weekly deals</li>
                </ul>
                <p>Stay tuned! 🚀</p>
                <p style="color: #666; font-size: 12px;">Masterliqours - Your premium liquor destination</p>
            </div>
            """
        }
        resend.Emails.send(params)
    except Exception as e:
        print(f"Failed to send email: {e}")
    
    return {"message": "Subscribe berjaya! Check your email"}

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
        raise HTTPException(status_code=404, detail="Email tak jumpa")
    
    subscriber.subscribed = False
    await db.commit()
    
    return {"message": "Unsubscribe berjaya"}
