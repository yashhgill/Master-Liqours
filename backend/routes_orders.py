from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from sqlalchemy.orm import selectinload
from typing import List, Optional
from datetime import datetime

from database import get_db
from models import User, Product, Order, OrderItem, Stock, Reward, Staff, UserTier, OrderStatus, UserRole
from schemas import CheckoutRequest, OrderResponse, CartItem
from auth_utils import get_current_user

router = APIRouter(prefix="/orders", tags=["Orders"])

def calculate_tier_benefits(user: User, subtotal: float):
    """Calculate shipping discount and product discount based on user tier"""
    shipping_discount = 0
    product_discount = 0
    
    if user.tier == UserTier.GOLD:
        shipping_discount = 50.0
    elif user.tier == UserTier.PLATINUM:
        shipping_discount = 100.0
        product_discount = subtotal * 0.03  # 3% discount
    
    return shipping_discount, product_discount

def _clean_dict(obj):
    """Remove SQLAlchemy internal state from a model __dict__"""
    return {k: v for k, v in obj.__dict__.items() if not k.startswith('_')}

async def _enrich_with_staff(order, db):
    """Attach staff_whatsapp + staff_name to an order's clean dict"""
    payload = {
        **_clean_dict(order),
        "items": [_clean_dict(item) for item in order.order_items],
        "staff_whatsapp": None,
        "staff_name": None,
    }
    if order.staff_id:
        staff_result = await db.execute(select(Staff).where(Staff.staff_id == order.staff_id))
        staff = staff_result.scalar_one_or_none()
        if staff:
            payload["staff_whatsapp"] = staff.whatsapp_number
            payload["staff_name"] = staff.name
    return payload

@router.post("/checkout", response_model=OrderResponse)
async def checkout(
    data: CheckoutRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Checkout - create order"""
    if not data.items:
        raise HTTPException(status_code=400, detail="Keranjang kosong")
    
    # Calculate total
    subtotal = 0
    order_items_data = []
    
    for item in data.items:
        result = await db.execute(select(Product).where(Product.product_id == item.product_id))
        product = result.scalar_one_or_none()
        if not product:
            raise HTTPException(status_code=404, detail=f"Produk {item.product_id} tak jumpa")
        
        item_total = product.price * item.quantity
        subtotal += item_total
        order_items_data.append({
            "product_id": product.product_id,
            "quantity": item.quantity,
            "price": product.price,
            "subtotal": item_total
        })
    
    # Apply tier benefits
    shipping_discount, product_discount = calculate_tier_benefits(user, subtotal)
    total = subtotal - product_discount
    
    # Create order
    order = Order(
        user_id=user.user_id,
        staff_id=user.assigned_staff_id,
        total=total,
        shipping_address=data.shipping_address,
        discount_applied=product_discount,
        shipping_discount=shipping_discount,
        points_earned=int(total / 10),  # 1 point per RM10
        status=OrderStatus.PENDING
    )
    db.add(order)
    await db.flush()
    
    # Create order items
    for item_data in order_items_data:
        order_item = OrderItem(order_id=order.order_id, **item_data)
        db.add(order_item)
    
    # Add reward points
    reward = Reward(
        user_id=user.user_id,
        points=order.points_earned,
        type="earned",
        description=f"Order #{order.order_id[:8]}"
    )
    db.add(reward)
    
    # Update user points and tier
    user.points += order.points_earned
    if user.points >= 10000:
        user.tier = UserTier.PLATINUM
    elif user.points >= 5000:
        user.tier = UserTier.GOLD
    
    await db.commit()
    await db.refresh(order)
    
    # Get order with items
    result = await db.execute(
        select(Order).options(selectinload(Order.order_items)).where(Order.order_id == order.order_id)
    )
    order = result.scalar_one()
    
    # Get staff details for WhatsApp
    staff_whatsapp = None
    staff_name = None
    if order.staff_id:
        staff_result = await db.execute(select(Staff).where(Staff.staff_id == order.staff_id))
        staff = staff_result.scalar_one_or_none()
        if staff:
            staff_whatsapp = staff.whatsapp_number
            staff_name = staff.name
    
    return {
        **_clean_dict(order),
        "items": [_clean_dict(item) for item in order.order_items],
        "staff_whatsapp": staff_whatsapp,
        "staff_name": staff_name
    }

@router.get("/my-orders", response_model=List[OrderResponse])
async def get_my_orders(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get user's orders"""
    result = await db.execute(
        select(Order)
        .options(selectinload(Order.order_items))
        .where(Order.user_id == user.user_id)
        .order_by(Order.created_at.desc())
    )
    orders = result.scalars().all()
    
    return [await _enrich_with_staff(order, db) for order in orders]

@router.get("/{order_id}", response_model=OrderResponse)
async def get_order(
    order_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get single order"""
    result = await db.execute(
        select(Order)
        .options(selectinload(Order.order_items))
        .where(Order.order_id == order_id)
    )
    order = result.scalar_one_or_none()
    
    if not order:
        raise HTTPException(status_code=404, detail="Order tak jumpa")
    
    # Check permission
    if order.user_id != user.user_id and user.role.value not in ['staff', 'super_admin', 'master_admin']:
        raise HTTPException(status_code=403, detail="Tak ada akses")
    
    return await _enrich_with_staff(order, db)

@router.patch("/{order_id}/status")
async def update_order_status(
    order_id: str,
    status: OrderStatus,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update order status (staff/admin only)"""
    if user.role == UserRole.CUSTOMER:
        raise HTTPException(status_code=403, detail="Tak ada akses")
    
    result = await db.execute(select(Order).where(Order.order_id == order_id))
    order = result.scalar_one_or_none()
    
    if not order:
        raise HTTPException(status_code=404, detail="Order tak jumpa")
    
    order.status = status
    await db.commit()
    
    return {"message": "Status updated", "order": order}
