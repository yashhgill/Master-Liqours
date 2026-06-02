from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_
from typing import List, Optional
from datetime import datetime

from database import get_db
from models import User, Product, Order, Staff, FlashSale, DiscountCode, UserRole
from schemas import ProductCreate, ProductResponse
from auth_utils import get_current_user, require_role

router = APIRouter(prefix="/admin", tags=["Admin"])

# =============================================================================
# PRODUCT MANAGEMENT (Super Admin)
# =============================================================================

@router.post("/products", response_model=ProductResponse)
async def create_product(
    data: ProductCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create product (Super Admin only)"""
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
    """Update product (Super Admin only)"""
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
# FLASH SALES & DISCOUNTS (Super Admin)
# =============================================================================

@router.post("/flash-sales")
async def create_flash_sale(
    product_id: str,
    discount_percentage: float,
    start_time: datetime,
    end_time: datetime,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create flash sale (Super Admin only)"""
    await require_role(user, UserRole.SUPER_ADMIN, UserRole.MASTER_ADMIN)
    
    flash_sale = FlashSale(
        product_id=product_id,
        discount_percentage=discount_percentage,
        start_time=start_time,
        end_time=end_time,
        is_active=True
    )
    db.add(flash_sale)
    await db.commit()
    await db.refresh(flash_sale)
    return flash_sale

@router.get("/flash-sales")
async def get_flash_sales(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get all flash sales"""
    await require_role(user, UserRole.SUPER_ADMIN, UserRole.MASTER_ADMIN)
    
    result = await db.execute(select(FlashSale).order_by(FlashSale.start_time.desc()))
    return result.scalars().all()

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
    
    return {
        "total_sales": total_sales or 0,
        "total_orders": total_orders or 0,
        "pending_orders": pending_orders or 0,
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
