from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_
from typing import List, Optional
from datetime import datetime
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

@router.post("/products", response_model=ProductResponse)
async def create_product(
    data: ProductCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create product dengan image URL (Super Admin only)"""
    await require_role(user, UserRole.SUPER_ADMIN, UserRole.MASTER_ADMIN)
    
    product = Product(**data.dict())
    db.add(product)
    await db.commit()
    await db.refresh(product)
    return product

@router.patch("/products/{product_id}", response_model=ProductResponse)
async def update_product(
    product_id: str,
    data: ProductCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update product termasuk image (Super Admin only)"""
    await require_role(user, UserRole.SUPER_ADMIN, UserRole.MASTER_ADMIN)
    
    result = await db.execute(select(Product).where(Product.product_id == product_id))
    product = result.scalar_one_or_none()
    
    if not product:
        raise HTTPException(status_code=404, detail="Produk tak jumpa")
    
    for key, value in data.dict(exclude_unset=True).items():
        setattr(product, key, value)
    
    await db.commit()
    await db.refresh(product)
    return product

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
# ANALYTICS (Master Admin)
# =============================================================================

@router.get("/analytics")
async def get_analytics(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get sales analytics (Master Admin only)"""
    await require_role(user, UserRole.MASTER_ADMIN)
    
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
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get all orders (Master Admin only)"""
    await require_role(user, UserRole.MASTER_ADMIN)
    
    query = select(Order).order_by(Order.created_at.desc())
    
    if status:
        query = query.where(Order.status == status)
    
    result = await db.execute(query)
    return result.scalars().all()
