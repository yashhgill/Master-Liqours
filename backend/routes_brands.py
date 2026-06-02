"""Brand CMS — public list + Super Admin CRUD."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from pydantic import BaseModel
from typing import Optional, List

from database import get_db
from models import Brand, User, UserRole
from auth_utils import get_current_user

public_router = APIRouter(prefix="/brands", tags=["Brands"])
admin_router = APIRouter(prefix="/admin/brands", tags=["Admin · Brands"])


def _clean(b: Brand) -> dict:
    return {k: v for k, v in b.__dict__.items() if not k.startswith('_')}


class BrandIn(BaseModel):
    name: str
    short_name: Optional[str] = None
    subtitle: Optional[str] = None
    logo_url: Optional[str] = None
    color_hex: Optional[str] = "#1a1a1a"
    search_term: Optional[str] = None
    is_active: bool = True
    order_position: int = 0


@public_router.get("")
async def list_brands(db: AsyncSession = Depends(get_db)):
    """Public list of active brands sorted by order_position."""
    r = await db.execute(
        select(Brand).where(Brand.is_active == True).order_by(Brand.order_position, Brand.name)
    )
    return [_clean(b) for b in r.scalars().all()]


async def _require_admin(user: User):
    if user.role not in (UserRole.SUPER_ADMIN, UserRole.MASTER_ADMIN):
        raise HTTPException(status_code=403, detail="Admin only boss")


@admin_router.get("")
async def admin_list_brands(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _require_admin(user)
    r = await db.execute(select(Brand).order_by(Brand.order_position, Brand.name))
    return [_clean(b) for b in r.scalars().all()]


@admin_router.post("", status_code=201)
async def create_brand(
    data: BrandIn,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _require_admin(user)
    existing = await db.execute(select(Brand).where(Brand.name == data.name))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Brand dah wujud lah")
    brand = Brand(**data.model_dump())
    db.add(brand)
    await db.commit()
    await db.refresh(brand)
    return _clean(brand)


@admin_router.put("/{brand_id}")
async def update_brand(
    brand_id: str,
    data: BrandIn,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _require_admin(user)
    r = await db.execute(select(Brand).where(Brand.brand_id == brand_id))
    brand = r.scalar_one_or_none()
    if not brand:
        raise HTTPException(status_code=404, detail="Brand tak jumpa")
    for k, v in data.model_dump().items():
        setattr(brand, k, v)
    await db.commit()
    await db.refresh(brand)
    return _clean(brand)


@admin_router.delete("/{brand_id}")
async def delete_brand(
    brand_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _require_admin(user)
    r = await db.execute(select(Brand).where(Brand.brand_id == brand_id))
    brand = r.scalar_one_or_none()
    if not brand:
        raise HTTPException(status_code=404, detail="Brand tak jumpa")
    await db.delete(brand)
    await db.commit()
    return {"message": "Brand deleted"}


DEFAULT_BRANDS = [
    {"name": "Johnnie Walker",  "short_name": "Walker",    "color_hex": "#d4af37", "subtitle": "Striding Man",       "order_position": 0},
    {"name": "Chivas Regal",    "short_name": "Chivas",    "color_hex": "#1f4a8c", "subtitle": "Since 1801",         "order_position": 1},
    {"name": "Jack Daniel's",   "short_name": "Jack D's",  "color_hex": "#000000", "subtitle": "Old No. 7",          "order_position": 2},
    {"name": "Hennessy",        "short_name": "Hennessy",  "color_hex": "#4a2c14", "subtitle": "V.S Cognac",         "order_position": 3},
    {"name": "Heineken",        "short_name": "Heineken",  "color_hex": "#01703f", "subtitle": "Open Your World",    "order_position": 4},
    {"name": "Absolut",         "short_name": "Absolut",   "color_hex": "#1a47ce", "subtitle": "Vodka · Sweden",     "order_position": 5},
    {"name": "Bombay Sapphire", "short_name": "Bombay",    "color_hex": "#1f7cb8", "subtitle": "Premium Gin",        "order_position": 6},
    {"name": "Bacardi",         "short_name": "Bacardi",   "color_hex": "#000000", "subtitle": "Caribbean Rum",      "order_position": 7},
    {"name": "Tiger Beer",      "short_name": "Tiger",     "color_hex": "#e87722", "subtitle": "Singapore SG",       "order_position": 8},
    {"name": "Carlsberg",       "short_name": "Carlsberg", "color_hex": "#00513f", "subtitle": "Probably Best",      "order_position": 9},
    {"name": "Moët & Chandon",  "short_name": "Moët",      "color_hex": "#1a1a1a", "subtitle": "Champagne",          "order_position": 10},
    {"name": "Don Julio",       "short_name": "Don Julio", "color_hex": "#7a5c1c", "subtitle": "Tequila",            "order_position": 11},
]


async def seed_default_brands(db: AsyncSession):
    """Seed default brands once if table is empty."""
    r = await db.execute(select(Brand))
    if r.scalars().first():
        return 0
    for b in DEFAULT_BRANDS:
        db.add(Brand(**b))
    await db.commit()
    return len(DEFAULT_BRANDS)
