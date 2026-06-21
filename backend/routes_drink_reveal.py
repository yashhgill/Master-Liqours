"""
Mystery Drops — fully admin-controlled.
- Multiple drops, each with own product, discount, active state
- No auto-rotation unless explicitly set
- Admin has full CRUD control via /admin/mystery-drops
- Stored in the `mystery_drops` Postgres table (not a local JSON file), so
  drops survive Render restarts/redeploys instead of silently disappearing.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from database import get_db
from models import Product, MysteryDrop

router = APIRouter(prefix="/drink-reveal", tags=["Drink Reveal"])


@router.get("/today")
async def get_active_drops(db: AsyncSession = Depends(get_db)):
    """Return all currently active mystery drops."""
    result = await db.execute(select(MysteryDrop).where(MysteryDrop.is_active == True))
    active = result.scalars().all()
    if not active:
        return {"available": False, "drops": []}

    result_drops = []
    for drop in active:
        res = await db.execute(
            select(Product).where(Product.product_id == drop.product_id, Product.is_active == True)
        )
        product = res.scalar_one_or_none()
        if not product:
            continue

        discount_pct = drop.discount_pct or 10
        discounted = round(product.price * (1 - discount_pct / 100), 2)

        result_drops.append({
            "drop_id": drop.drop_id,
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
            "label": drop.label or "Mystery Drop",
        })

    return {"available": len(result_drops) > 0, "drops": result_drops}
