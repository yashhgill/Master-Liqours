"""Daily 'Drink Reveal' / Mystery Drop — config-driven flash drop.

Super Admin can control: hour, discount %, locked product, on/off switch.
Config lives in mystery_drop_config.json next to this file.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timezone, timedelta
import json, os

from database import get_db
from models import Product

router = APIRouter(prefix="/drink-reveal", tags=["Drink Reveal"])

CONFIG_PATH = os.path.join(os.path.dirname(__file__), "mystery_drop_config.json")

def _get_config():
    defaults = {"reveal_hour_utc": 12, "discount_pct": 30, "locked_product_id": None, "is_active": True}
    if os.path.exists(CONFIG_PATH):
        try:
            with open(CONFIG_PATH) as f:
                return {**defaults, **json.load(f)}
        except Exception:
            pass
    return defaults


def _reveal_window(now: datetime, reveal_hour: int):
    today = now.replace(hour=reveal_hour, minute=0, second=0, microsecond=0)
    if now < today:
        start = today - timedelta(days=1)
    else:
        start = today
    end = start + timedelta(days=1)
    return start, end


@router.get("/today")
async def get_today_reveal(db: AsyncSession = Depends(get_db)):
    """Return today's revealed product + countdown window."""
    cfg = _get_config()

    if not cfg.get("is_active", True):
        return {"available": False, "reason": "Mystery drop is currently off"}

    now = datetime.now(timezone.utc)
    start, end = _reveal_window(now, cfg["reveal_hour_utc"])
    discount_pct = cfg["discount_pct"]

    # If a specific product is locked in by admin, use that
    if cfg.get("locked_product_id"):
        result = await db.execute(
            select(Product).where(
                Product.product_id == cfg["locked_product_id"],
                Product.is_active == True
            )
        )
        product = result.scalar_one_or_none()
        if not product:
            # Locked product not found/inactive — fall through to auto-rotate
            cfg_product = None
        else:
            cfg_product = product
    else:
        cfg_product = None

    if cfg_product is None:
        # Auto-rotate daily
        result = await db.execute(
            select(Product).where(Product.is_active == True).order_by(Product.product_id)
        )
        products = result.scalars().all()
        if not products:
            return {"available": False}

        epoch_day = int(start.timestamp() // 86400)
        product = products[epoch_day % len(products)]
    else:
        product = cfg_product

    discounted = round(product.price * (1 - discount_pct / 100), 2)

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
        "discount_percentage": discount_pct,
        "discounted_price": discounted,
        "reveal_start": start.isoformat(),
        "reveal_end": end.isoformat(),
        "is_locked": cfg.get("locked_product_id") is not None,
    }
