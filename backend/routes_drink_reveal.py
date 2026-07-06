"""
Mystery Drops — fully admin-controlled.
- Multiple drops, each with own product, discount, active state
- No auto-rotation unless explicitly set
- Admin has full CRUD control via /admin/mystery-drops
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from pydantic import BaseModel
import json, os, uuid
from datetime import datetime, timezone

from database import get_db
from models import Product

router = APIRouter(prefix="/drink-reveal", tags=["Drink Reveal"])

DROPS_PATH = os.path.join(os.path.dirname(__file__), "mystery_drops.json")

def _load_drops() -> list:
    if os.path.exists(DROPS_PATH):
        try:
            with open(DROPS_PATH) as f:
                return json.load(f)
        except Exception:
            pass
    return []

def _save_drops(drops: list):
    with open(DROPS_PATH, "w") as f:
        json.dump(drops, f, indent=2)


@router.get("/today")
async def get_active_drops(db: AsyncSession = Depends(get_db)):
    """Return all currently active mystery drops."""
    drops = _load_drops()
    active = [d for d in drops if d.get("is_active", False)]
    if not active:
        return {"available": False, "drops": []}

    result_drops = []
    for drop in active:
        product_id = drop.get("product_id")
        if not product_id:
            continue
        res = await db.execute(
            select(Product).where(Product.product_id == product_id, Product.is_active == True)
        )
        product = res.scalar_one_or_none()
        if not product:
            continue

        discount_pct = drop.get("discount_pct", 10)
        discounted = round(product.price * (1 - discount_pct / 100), 2)

        result_drops.append({
            "drop_id": drop["drop_id"],
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
            "label": drop.get("label", "Mystery Drop"),
        })

    return {"available": len(result_drops) > 0, "drops": result_drops}
