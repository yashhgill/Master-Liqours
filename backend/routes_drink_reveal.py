"""Daily 'Drink Reveal' — deterministic-per-day flash drop.

Picks one active product per UTC date (stable index) at a fixed discount window.
Reveal goes live at REVEAL_HOUR_UTC and runs 24h.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timezone, timedelta

from database import get_db
from models import Product

router = APIRouter(prefix="/drink-reveal", tags=["Drink Reveal"])

REVEAL_HOUR_UTC = 12  # 12:00 UTC = 8 PM Malaysia time (UTC+8)
REVEAL_DISCOUNT_PCT = 30


def _reveal_window(now: datetime):
    """Return (start, end, today_date) for the current reveal cycle in UTC."""
    today = now.replace(hour=REVEAL_HOUR_UTC, minute=0, second=0, microsecond=0)
    if now < today:
        # Before today's reveal — show the previous cycle (still active for 24h)
        start = today - timedelta(days=1)
    else:
        start = today
    end = start + timedelta(days=1)
    return start, end


@router.get("/today")
async def get_today_reveal(db: AsyncSession = Depends(get_db)):
    """Return today's revealed product + countdown window.

    Stateless: deterministic from UTC date so all clients see the same drop.
    """
    now = datetime.now(timezone.utc)
    start, end = _reveal_window(now)

    result = await db.execute(
        select(Product).where(Product.is_active == True).order_by(Product.product_id)
    )
    products = result.scalars().all()
    if not products:
        return {"available": False}

    # Seed: epoch days since 1970-01-01 so it rotates daily
    epoch_day = int(start.timestamp() // 86400)
    product = products[epoch_day % len(products)]
    discounted = round(product.price * (1 - REVEAL_DISCOUNT_PCT / 100), 2)

    return {
        "available": True,
        "product": {
            "product_id": product.product_id,
            "name": product.name,
            "category": product.category,
            "image_url": product.image_url,
            "description": product.description,
            "price": product.price,
        },
        "discount_percentage": REVEAL_DISCOUNT_PCT,
        "discounted_price": discounted,
        "reveal_start": start.isoformat(),
        "reveal_end": end.isoformat(),
    }
