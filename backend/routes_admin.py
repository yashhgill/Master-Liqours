from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_
from datetime import datetime, timedelta
from typing import List, Optional
from pydantic import BaseModel

from database import get_db
from models import (
    User, Product, Order, Staff, FlashSale, DiscountCode,
    UserRole, HeroBanner
)
from schemas import ProductCreate, ProductResponse
from auth_utils import get_current_user, require_role

router = APIRouter(prefix="/admin", tags=["Admin"])

# =============================================================================
# HERO BANNER MANAGEMENT (Super Admin)
# =============================================================================

class HeroBannerCreate(BaseModel):
    title: str
    subtitle: Optional[str] = None
    cta_text: Optional[str] = None
    cta_link: Optional[str] = None
    background_image: Optional[str] = None
    is_active: bool = True
    order_position: int = 0

class HeroBannerResponse(BaseModel):
    banner_id: str
    title: str
    subtitle: Optional[str]
    cta_text: Optional[str]
    cta_link: Optional[str]
    background_image: Optional[str]
    is_active: bool
    order_position: int
    created_at: datetime
    updated_at: datetime

@router.post("/hero-banners", response_model=HeroBannerResponse)
async def create_hero_banner(
    data: HeroBannerCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create hero banner (Super Admin only)"""
    await require_role(user, UserRole.SUPER_ADMIN, UserRole.MASTER_ADMIN)

    banner = HeroBanner(**data.dict())
    db.add(banner)
    await db.commit()
    await db.refresh(banner)
    return banner

@router.get("/hero-banners", response_model=List[HeroBannerResponse])
async def get_all_hero_banners(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get all hero banners for admin"""
    await require_role(user, UserRole.SUPER_ADMIN, UserRole.MASTER_ADMIN)

    result = await db.execute(
        select(HeroBanner).order_by(HeroBanner.order_position.asc())
    )
    return result.scalars().all()

@router.patch("/hero-banners/{banner_id}", response_model=HeroBannerResponse)
async def update_hero_banner(
    banner_id: str,
    data: HeroBannerCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update hero banner (Super Admin only)"""
    await require_role(user, UserRole.SUPER_ADMIN, UserRole.MASTER_ADMIN)

    result = await db.execute(select(HeroBanner).where(HeroBanner.banner_id == banner_id))
    banner = result.scalar_one_or_none()

    if not banner:
        raise HTTPException(status_code=404, detail="Banner tak jumpa")

    for key, value in data.dict(exclude_unset=True).items():
        setattr(banner, key, value)

    banner.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(banner)
    return banner

@router.delete("/hero-banners/{banner_id}")
async def delete_hero_banner(
    banner_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete hero banner (Super Admin only)"""
    await require_role(user, UserRole.SUPER_ADMIN, UserRole.MASTER_ADMIN)

    result = await db.execute(select(HeroBanner).where(HeroBanner.banner_id == banner_id))
    banner = result.scalar_one_or_none()

    if not banner:
        raise HTTPException(status_code=404, detail="Banner tak jumpa")

    await db.delete(banner)
    await db.commit()
    return {"message": "Banner dipadam"}

# =============================================================================
# PRODUCT MANAGEMENT WITH IMAGE UPLOAD (Super Admin)
# =============================================================================

async def _sync_flash_sale_from_discount(product: Product, data: ProductCreate, db: AsyncSession):
    """Create/update/remove a flash sale based on discount_price + duration fields."""
    has_discount = data.discount_price is not None and data.discount_price > 0 and data.discount_price < product.price

    # Find existing active flash sale for this product
    existing_result = await db.execute(
        select(FlashSale).where(FlashSale.product_id == product.product_id, FlashSale.is_active == True)
    )
    existing_sale = existing_result.scalars().first()

    if not has_discount:
        # No discount set — deactivate any existing flash sale, restore original price
        if existing_sale:
            existing_sale.is_active = False
        if product.original_price:
            product.original_price = None
        return

    # Calculate discount percentage from prices
    discount_pct = round((1 - (data.discount_price / product.price)) * 100, 2)
    if discount_pct <= 0 or discount_pct >= 100:
        return

    days = data.discount_days or 0
    hours = data.discount_hours or 0
    minutes = data.discount_minutes or 0
    total_seconds = days * 86400 + hours * 3600 + minutes * 60
    if total_seconds <= 0:
        total_seconds = 86400  # default 24h if no duration given

    start_time = datetime.utcnow()
    end_time = start_time + timedelta(seconds=total_seconds)

    # Set original_price so frontend can show strikethrough
    product.original_price = product.price

    if existing_sale:
        existing_sale.discount_percentage = discount_pct
        existing_sale.start_time = start_time
        existing_sale.end_time = end_time
        existing_sale.is_active = True
    else:
        new_sale = FlashSale(
            product_id=product.product_id,
            discount_percentage=discount_pct,
            start_time=start_time,
            end_time=end_time,
            is_active=True,
        )
        db.add(new_sale)


@router.post("/products", response_model=ProductResponse)
async def create_product(
    data: ProductCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create product dengan image URL (Super Admin only). If discount_price is set,
    a flash sale is automatically created with the given discount % and duration."""
    await require_role(user, UserRole.SUPER_ADMIN, UserRole.MASTER_ADMIN)

    try:
        base_fields = data.dict(exclude={"discount_price", "discount_days", "discount_hours", "discount_minutes"})
        product = Product(**base_fields)
        db.add(product)
        await db.flush()  # get product_id before creating flash sale

        await _sync_flash_sale_from_discount(product, data, db)

        await db.commit()
        await db.refresh(product)
        return product
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Create product failed: {str(e)}")

@router.patch("/products/{product_id}", response_model=ProductResponse)
async def update_product(
    product_id: str,
    data: ProductCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update product termasuk image (Super Admin only). If discount_price is set,
    a flash sale is automatically created/updated. If left blank, any active
    flash sale for this product is deactivated and original_price cleared."""
    await require_role(user, UserRole.SUPER_ADMIN, UserRole.MASTER_ADMIN)

    try:
        result = await db.execute(select(Product).where(Product.product_id == product_id))
        product = result.scalar_one_or_none()

        if not product:
            raise HTTPException(status_code=404, detail="Produk tak jumpa")

        base_fields = data.dict(exclude_unset=True, exclude={"discount_price", "discount_days", "discount_hours", "discount_minutes"})
        for key, value in base_fields.items():
            setattr(product, key, value)

        await _sync_flash_sale_from_discount(product, data, db)

        await db.commit()
        await db.refresh(product)
        return product
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Update product failed: {str(e)}")

@router.delete("/products/{product_id}")
async def delete_product(
    product_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete/deactivate product (Super Admin only)"""
    await require_role(user, UserRole.SUPER_ADMIN, UserRole.MASTER_ADMIN)

    result = await db.execute(select(Product).where(Product.product_id == product_id))
    product = result.scalar_one_or_none()

    if not product:
        raise HTTPException(status_code=404, detail="Produk tak jumpa")

    product.is_active = False
    await db.commit()
    return {"message": "Produk dipadamkan"}

# =============================================================================
# FLASH SALES WITH AUTO-EXPIRY (Super Admin)
# =============================================================================

class FlashSaleCreate(BaseModel):
    product_id: str
    discount_percentage: float
    start_time: datetime
    end_time: datetime

class FlashSaleUpdate(BaseModel):
    discount_percentage: Optional[float] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    is_active: Optional[bool] = None

class FlashSaleResponse(BaseModel):
    sale_id: str
    product_id: str
    discount_percentage: float
    start_time: datetime
    end_time: datetime
    is_active: bool
    created_at: datetime

@router.post("/flash-sales", response_model=FlashSaleResponse)
async def create_flash_sale(
    data: FlashSaleCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create flash sale dengan auto-timeout (Super Admin only)"""
    await require_role(user, UserRole.SUPER_ADMIN, UserRole.MASTER_ADMIN)

    # Validate dates (normalize to naive UTC for DB comparison)
    start_naive = data.start_time.replace(tzinfo=None) if data.start_time.tzinfo else data.start_time
    end_naive = data.end_time.replace(tzinfo=None) if data.end_time.tzinfo else data.end_time
    if end_naive <= start_naive:
        raise HTTPException(status_code=400, detail="End time mesti after start time")

    if end_naive <= datetime.utcnow():
        raise HTTPException(status_code=400, detail="End time mesti di masa depan")

    flash_sale = FlashSale(
        product_id=data.product_id,
        discount_percentage=data.discount_percentage,
        start_time=start_naive,
        end_time=end_naive,
        is_active=True
    )
    db.add(flash_sale)
    await db.commit()
    await db.refresh(flash_sale)
    return flash_sale

@router.get("/flash-sales", response_model=List[FlashSaleResponse])
async def get_all_flash_sales(
    include_expired: bool = False,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get all flash sales (Super Admin only)"""
    await require_role(user, UserRole.SUPER_ADMIN, UserRole.MASTER_ADMIN)

    query = select(FlashSale)

    if not include_expired:
        query = query.where(FlashSale.end_time > datetime.utcnow())

    query = query.order_by(FlashSale.start_time.desc())
    result = await db.execute(query)
    return result.scalars().all()

@router.patch("/flash-sales/{sale_id}/toggle")
async def toggle_flash_sale(
    sale_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Activate/deactivate flash sale manually (Super Admin only)"""
    await require_role(user, UserRole.SUPER_ADMIN, UserRole.MASTER_ADMIN)

    result = await db.execute(select(FlashSale).where(FlashSale.sale_id == sale_id))
    sale = result.scalar_one_or_none()

    if not sale:
        raise HTTPException(status_code=404, detail="Flash sale tak jumpa")

    sale.is_active = not sale.is_active
    await db.commit()
    return {"message": f"Flash sale {'activated' if sale.is_active else 'deactivated'}"}

@router.patch("/flash-sales/{sale_id}")
async def update_flash_sale(
    sale_id: str,
    data: FlashSaleUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Edit flash sale details (Super Admin only)"""
    await require_role(user, UserRole.SUPER_ADMIN, UserRole.MASTER_ADMIN)

    result = await db.execute(select(FlashSale).where(FlashSale.sale_id == sale_id))
    sale = result.scalar_one_or_none()
    if not sale:
        raise HTTPException(status_code=404, detail="Flash sale tak jumpa")

    if data.discount_percentage is not None:
        sale.discount_percentage = data.discount_percentage
    if data.start_time is not None:
        sale.start_time = data.start_time.replace(tzinfo=None) if data.start_time.tzinfo else data.start_time
    if data.end_time is not None:
        sale.end_time = data.end_time.replace(tzinfo=None) if data.end_time.tzinfo else data.end_time
    if data.is_active is not None:
        sale.is_active = data.is_active

    await db.commit()
    await db.refresh(sale)
    return sale

@router.delete("/flash-sales/{sale_id}")
async def delete_flash_sale(
    sale_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete flash sale (Super Admin only)"""
    await require_role(user, UserRole.SUPER_ADMIN, UserRole.MASTER_ADMIN)

    result = await db.execute(select(FlashSale).where(FlashSale.sale_id == sale_id))
    sale = result.scalar_one_or_none()

    if not sale:
        raise HTTPException(status_code=404, detail="Flash sale tak jumpa")

    await db.delete(sale)
    await db.commit()
    return {"message": "Flash sale dipadam"}


# =============================================================================
# MYSTERY DROPS — Full CRUD (Super Admin)
# =============================================================================
# Stored in the `mystery_drops` Postgres table (not a local JSON file). The
# old local-file version lost all its data every time Render restarted/
# redeployed (ephemeral disk), and had no protection against two admins
# editing at the same time clobbering each other's changes. The DB gives us
# both durability and transactional safety for free.

class MysteryDropPayload(BaseModel):
    product_id: str
    discount_pct: int = 20
    label: Optional[str] = "Mystery Drop"
    is_active: bool = True

@router.get("/mystery-drops")
async def list_mystery_drops(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """List all mystery drops"""
    await require_role(user, UserRole.SUPER_ADMIN, UserRole.MASTER_ADMIN)
    result = await db.execute(select(MysteryDrop).order_by(MysteryDrop.created_at.desc()))
    drops = result.scalars().all()
    enriched = []
    for d in drops:
        product_result = await db.execute(select(Product).where(Product.product_id == d.product_id))
        product = product_result.scalar_one_or_none()
        enriched.append({
            "drop_id": d.drop_id,
            "product_id": d.product_id,
            "discount_pct": d.discount_pct,
            "label": d.label,
            "is_active": d.is_active,
            "product_name": product.name if product else "Unknown",
            "product_price": product.price if product else 0,
        })
    return enriched

@router.post("/mystery-drops")
async def create_mystery_drop(data: MysteryDropPayload, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Create a new mystery drop"""
    await require_role(user, UserRole.SUPER_ADMIN, UserRole.MASTER_ADMIN)
    if not (1 <= data.discount_pct <= 90):
        raise HTTPException(status_code=400, detail="discount_pct must be 1-90")
    product_result = await db.execute(select(Product).where(Product.product_id == data.product_id))
    if not product_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Product not found")
    drop = MysteryDrop(
        product_id=data.product_id,
        discount_pct=data.discount_pct,
        label=data.label,
        is_active=data.is_active,
    )
    db.add(drop)
    await db.commit()
    await db.refresh(drop)
    return {
        "drop_id": drop.drop_id,
        "product_id": drop.product_id,
        "discount_pct": drop.discount_pct,
        "label": drop.label,
        "is_active": drop.is_active,
    }

@router.patch("/mystery-drops/{drop_id}")
async def update_mystery_drop(drop_id: str, data: MysteryDropPayload, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Update a mystery drop"""
    await require_role(user, UserRole.SUPER_ADMIN, UserRole.MASTER_ADMIN)
    result = await db.execute(select(MysteryDrop).where(MysteryDrop.drop_id == drop_id))
    drop = result.scalar_one_or_none()
    if not drop:
        raise HTTPException(status_code=404, detail="Drop not found")
    if not (1 <= data.discount_pct <= 90):
        raise HTTPException(status_code=400, detail="discount_pct must be 1-90")
    drop.product_id = data.product_id
    drop.discount_pct = data.discount_pct
    drop.label = data.label
    drop.is_active = data.is_active
    await db.commit()
    await db.refresh(drop)
    return {
        "drop_id": drop.drop_id,
        "product_id": drop.product_id,
        "discount_pct": drop.discount_pct,
        "label": drop.label,
        "is_active": drop.is_active,
    }

@router.patch("/mystery-drops/{drop_id}/toggle")
async def toggle_mystery_drop(drop_id: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Toggle a mystery drop on/off"""
    await require_role(user, UserRole.SUPER_ADMIN, UserRole.MASTER_ADMIN)
    result = await db.execute(select(MysteryDrop).where(MysteryDrop.drop_id == drop_id))
    drop = result.scalar_one_or_none()
    if not drop:
        raise HTTPException(status_code=404, detail="Drop not found")
    drop.is_active = not drop.is_active
    await db.commit()
    return {
        "drop_id": drop.drop_id,
        "product_id": drop.product_id,
        "discount_pct": drop.discount_pct,
        "label": drop.label,
        "is_active": drop.is_active,
    }

@router.delete("/mystery-drops/{drop_id}")
async def delete_mystery_drop(drop_id: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Delete a mystery drop"""
    await require_role(user, UserRole.SUPER_ADMIN, UserRole.MASTER_ADMIN)
    result = await db.execute(select(MysteryDrop).where(MysteryDrop.drop_id == drop_id))
    drop = result.scalar_one_or_none()
    if not drop:
        raise HTTPException(status_code=404, detail="Drop not found")
    await db.delete(drop)
    await db.commit()
    return {"message": "Deleted"}

# =============================================================================
# ANALYTICS (Master Admin)
# =============================================================================
# =============================================================================

@router.get("/analytics")
async def get_analytics(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get sales analytics (Admin only)"""
    await require_role(user, UserRole.MASTER_ADMIN, UserRole.SUPER_ADMIN)

    # Total sales
    result = await db.execute(select(func.sum(Order.total), func.count(Order.order_id)))
    total_sales, total_orders = result.first()

    # Sales by staff
    result = await db.execute(
        select(Staff.name, func.sum(Order.total), func.count(Order.order_id))
        .join(Order, Order.staff_id == Staff.staff_id)
        .group_by(Staff.staff_id, Staff.name)
    )
    staff_sales = [{"name": row[0], "sales": row[1], "orders": row[2]} for row in result.all()]

    # Pending orders
    result = await db.execute(
        select(func.count(Order.order_id))
        .where(Order.status == "pending")
    )
    pending_orders = result.scalar()

    # Active flash sales
    result = await db.execute(
        select(func.count(FlashSale.sale_id))
        .where(and_(
            FlashSale.is_active == True,
            FlashSale.start_time <= datetime.utcnow(),
            FlashSale.end_time > datetime.utcnow()
        ))
    )
    active_sales = result.scalar()

    return {
        "total_sales": total_sales or 0,
        "total_orders": total_orders or 0,
        "pending_orders": pending_orders or 0,
        "active_flash_sales": active_sales or 0,
        "staff_sales": staff_sales
    }

@router.get("/all-orders")
async def get_all_orders(
    status: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    limit: int = 100,
    offset: int = 0,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get orders (Admin only). Paginated — defaults to the most recent 100
    so this doesn't load every order in the database into memory on every
    page view as order history grows over time."""
    await require_role(user, UserRole.MASTER_ADMIN, UserRole.SUPER_ADMIN)

    limit = max(1, min(limit, 500))
    offset = max(0, offset)

    query = select(Order).order_by(Order.created_at.desc())

    if status:
        query = query.where(Order.status == status)
    if start_date:
        query = query.where(Order.created_at >= start_date)
    if end_date:
        query = query.where(Order.created_at <= end_date)

    query = query.limit(limit).offset(offset)
    result = await db.execute(query)
    return result.scalars().all()


# =============================================================================
# STAFF PERFORMANCE TRACKING (Admin)
# =============================================================================

@router.get("/staff-performance")
async def staff_performance(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Per-staff performance: orders count, status breakdown, revenue, customers, last activity.
    Optional start_date/end_date narrow the order aggregation so the boss isn't
    forced to scan full order history every time this loads as the store grows."""
    await require_role(user, UserRole.MASTER_ADMIN, UserRole.SUPER_ADMIN)

    # All staff
    sr = await db.execute(select(Staff).order_by(Staff.created_at.desc()))
    staff_list = sr.scalars().all()

    # Aggregate per-staff order metrics
    om_query = select(
        Order.staff_id,
        Order.status,
        func.count(Order.order_id),
        func.sum(Order.total),
        func.max(Order.created_at),
    )
    if start_date:
        om_query = om_query.where(Order.created_at >= start_date)
    if end_date:
        om_query = om_query.where(Order.created_at <= end_date)
    om = await db.execute(om_query.group_by(Order.staff_id, Order.status))

    # Build a dict: {staff_id: {status: {count, revenue}, last_at}}
    bucket = {}
    for staff_id, status, cnt, total, last in om.all():
        if staff_id is None:
            continue
        s = bucket.setdefault(staff_id, {"by_status": {}, "last_at": None, "total_orders": 0, "total_revenue": 0.0})
        s["by_status"][str(status.value) if hasattr(status, "value") else str(status)] = {
            "count": int(cnt or 0),
            "revenue": float(total or 0),
        }
        s["total_orders"] += int(cnt or 0)
        s["total_revenue"] += float(total or 0)
        if last and (s["last_at"] is None or last > s["last_at"]):
            s["last_at"] = last

    # Customer counts per staff
    cm = await db.execute(
        select(User.assigned_staff_id, func.count(User.user_id))
        .where(User.assigned_staff_id.isnot(None))
        .group_by(User.assigned_staff_id)
    )
    customer_counts = {row[0]: int(row[1] or 0) for row in cm.all()}

    rows = []
    for s in staff_list:
        b = bucket.get(s.staff_id, {"by_status": {}, "last_at": None, "total_orders": 0, "total_revenue": 0.0})
        delivered = b["by_status"].get("delivered", {}).get("count", 0)
        conversion = round((delivered / b["total_orders"]) * 100, 1) if b["total_orders"] else 0.0
        rows.append({
            "staff_id": s.staff_id,
            "name": s.name,
            "email": s.email,
            "referral_code": s.referral_code,
            "whatsapp_number": s.whatsapp_number,
            "total_orders": b["total_orders"],
            "total_revenue": round(b["total_revenue"], 2),
            "customers_count": customer_counts.get(s.staff_id, 0),
            "by_status": b["by_status"],
            "last_order_at": b["last_at"].isoformat() if b["last_at"] else None,
            "conversion_rate": conversion,
        })

    # Sort by revenue desc
    rows.sort(key=lambda r: r["total_revenue"], reverse=True)

    # Unassigned-orders summary
    unassigned_query = select(func.count(Order.order_id), func.sum(Order.total)).where(Order.staff_id.is_(None))
    if start_date:
        unassigned_query = unassigned_query.where(Order.created_at >= start_date)
    if end_date:
        unassigned_query = unassigned_query.where(Order.created_at <= end_date)
    unassigned = await db.execute(unassigned_query)
    u_cnt, u_rev = unassigned.first()

    return {
        "staff": rows,
        "unassigned": {
            "total_orders": int(u_cnt or 0),
            "total_revenue": float(u_rev or 0),
        },
    }
