from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List

from database import get_db
from models import User, Order, Staff, Product, Stock, UserRole
from auth_utils import get_current_user, require_role

router = APIRouter(prefix="/staff", tags=["Staff"])

@router.get("/my-customers")
async def get_my_customers(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get staff's assigned customers"""
    # This would be for staff members if they had accounts
    # For now, return customers assigned to staff
    if user.role != UserRole.STAFF:
        raise HTTPException(status_code=403, detail="Staff only")
    
    result = await db.execute(
        select(User).where(User.assigned_staff_id == user.user_id)
    )
    customers = result.scalars().all()
    return customers

@router.get("/my-orders")
async def get_staff_orders(
    status: str = None,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get orders assigned to this staff"""
    if user.role not in [UserRole.STAFF, UserRole.MASTER_ADMIN]:
        raise HTTPException(status_code=403, detail="No access")
    
    query = select(Order).where(Order.staff_id == user.user_id)
    
    if status:
        query = query.where(Order.status == status)
    
    query = query.order_by(Order.created_at.desc())
    result = await db.execute(query)
    return result.scalars().all()

@router.get("/my-stock")
async def get_my_stock(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get staff's stock inventory"""
    if user.role != UserRole.STAFF:
        raise HTTPException(status_code=403, detail="Staff only")
    
    result = await db.execute(
        select(Stock, Product)
        .join(Product, Stock.product_id == Product.product_id)
        .where(Stock.staff_id == user.user_id)
    )
    
    stock_items = []
    for stock, product in result.all():
        stock_items.append({
            "product_id": product.product_id,
            "product_name": product.name,
            "category": product.category,
            "quantity": stock.quantity,
            "updated_at": stock.updated_at
        })
    
    return stock_items

@router.get("/info")
async def get_all_staff(db: AsyncSession = Depends(get_db)):
    """Get all staff info (public)"""
    result = await db.execute(select(Staff))
    return result.scalars().all()
