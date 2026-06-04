from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import List, Optional
from pydantic import BaseModel

from database import get_db
from models import User, Product, Order, OrderItem, Stock, Reward, Staff, UserTier, OrderStatus, UserRole
from sqlalchemy import and_
from schemas import CheckoutRequest, OrderResponse, CartItem
from auth_utils import get_current_user
from sms_utils import send_sms, status_message

router = APIRouter(prefix="/orders", tags=["Orders"])


def calculate_tier_discount(user: User, subtotal: float):
    """Platinum gets 3% product discount. No shipping calc — staff handles that."""
    if user.tier == UserTier.PLATINUM:
        return subtotal * 0.03
    return 0.0


def _clean_dict(obj):
    return {k: v for k, v in obj.__dict__.items() if not k.startswith('_')}


async def _enrich_with_staff(order, db):
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


# ─── CUSTOMER CHECKOUT ────────────────────────────────────────────────────────

@router.post("/checkout", response_model=OrderResponse)
async def checkout(
    data: CheckoutRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Customer checkout. Shipping cost discussed with staff after order."""
    if not data.items:
        raise HTTPException(status_code=400, detail="Keranjang kosong")

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

    product_discount = calculate_tier_discount(user, subtotal)
    total = subtotal - product_discount

    order = Order(
        user_id=user.user_id,
        staff_id=user.assigned_staff_id,
        total=total,
        customer_name=data.customer_name.strip(),
        customer_whatsapp=data.customer_whatsapp.strip(),
        shipping_address=data.shipping_address.strip(),
        discount_applied=product_discount,
        shipping_discount=0,
        points_earned=int(total / 10),
        status=OrderStatus.PENDING,
        is_personal_order=False
    )
    db.add(order)
    await db.flush()

    for item_data in order_items_data:
        order_item = OrderItem(order_id=order.order_id, **item_data)
        db.add(order_item)

    # Auto-deduct stock for the assigned staff
    if order.staff_id:
        for item_data in order_items_data:
            stock_result = await db.execute(
                select(Stock).where(
                    and_(
                        Stock.staff_id == order.staff_id,
                        Stock.product_id == item_data["product_id"]
                    )
                )
            )
            stock_row = stock_result.scalar_one_or_none()
            if stock_row and stock_row.quantity > 0:
                stock_row.quantity = max(0, stock_row.quantity - item_data["quantity"])

    reward = Reward(
        user_id=user.user_id,
        points=order.points_earned,
        type="earned",
        description=f"Order #{order.order_id[:8]}"
    )
    db.add(reward)

    user.points += order.points_earned
    if user.points >= 10000:
        user.tier = UserTier.PLATINUM
    elif user.points >= 5000:
        user.tier = UserTier.GOLD

    await db.commit()
    await db.refresh(order)

    result = await db.execute(
        select(Order).options(selectinload(Order.order_items)).where(Order.order_id == order.order_id)
    )
    order = result.scalar_one()

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


# ─── STAFF: LOG A PERSONAL / WALK-IN ORDER ───────────────────────────────────

class PersonalOrderItem(BaseModel):
    product_id: str
    quantity: int
    price: Optional[float] = None  # override price if needed (e.g. negotiated)

class PersonalOrderRequest(BaseModel):
    customer_name: str
    customer_whatsapp: str
    items: List[PersonalOrderItem]
    notes: Optional[str] = None  # maps to shipping_address field

@router.post("/personal", response_model=OrderResponse)
async def log_personal_order(
    data: PersonalOrderRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Staff logs a personal / walk-in order they received outside the app."""
    if user.role == UserRole.CUSTOMER:
        raise HTTPException(status_code=403, detail="Staff only boss")

    # Get staff record
    staff_result = await db.execute(select(Staff).where(Staff.email == user.email))
    staff = staff_result.scalar_one_or_none()
    if not staff and user.role == UserRole.STAFF:
        raise HTTPException(status_code=404, detail="Staff record not found")

    subtotal = 0
    order_items_data = []

    for item in data.items:
        result = await db.execute(select(Product).where(Product.product_id == item.product_id))
        product = result.scalar_one_or_none()
        if not product:
            raise HTTPException(status_code=404, detail=f"Produk {item.product_id} tak jumpa")

        unit_price = item.price if item.price is not None else product.price
        item_total = unit_price * item.quantity
        subtotal += item_total
        order_items_data.append({
            "product_id": product.product_id,
            "quantity": item.quantity,
            "price": unit_price,
            "subtotal": item_total
        })

    # Use a placeholder user_id — personal orders aren't tied to an app account
    # We embed customer info in the order fields directly
    # We need a valid user_id for FK — use the staff's own user row
    staff_user_result = await db.execute(select(User).where(User.email == user.email))
    staff_user = staff_user_result.scalar_one_or_none()
    if not staff_user:
        raise HTTPException(status_code=404, detail="Staff user record not found")

    order = Order(
        user_id=staff_user.user_id,
        staff_id=staff.staff_id if staff else None,
        total=subtotal,
        customer_name=data.customer_name.strip(),
        customer_whatsapp=data.customer_whatsapp.strip(),
        shipping_address=data.notes.strip() if data.notes else "Personal order — no address",
        discount_applied=0,
        shipping_discount=0,
        points_earned=0,
        status=OrderStatus.CONFIRMED,  # personal orders start as confirmed
        is_personal_order=True
    )
    db.add(order)
    await db.flush()

    for item_data in order_items_data:
        order_item = OrderItem(order_id=order.order_id, **item_data)
        db.add(order_item)

    await db.commit()
    await db.refresh(order)

    result = await db.execute(
        select(Order).options(selectinload(Order.order_items)).where(Order.order_id == order.order_id)
    )
    order = result.scalar_one()

    return {
        **_clean_dict(order),
        "items": [_clean_dict(item) for item in order.order_items],
        "staff_whatsapp": staff.whatsapp_number if staff else None,
        "staff_name": staff.name if staff else None
    }


# ─── GET ORDERS ───────────────────────────────────────────────────────────────

@router.get("/my-orders", response_model=List[OrderResponse])
async def get_my_orders(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
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
    result = await db.execute(
        select(Order)
        .options(selectinload(Order.order_items))
        .where(Order.order_id == order_id)
    )
    order = result.scalar_one_or_none()

    if not order:
        raise HTTPException(status_code=404, detail="Order tak jumpa")

    if order.user_id != user.user_id and user.role.value not in ['staff', 'super_admin', 'master_admin']:
        raise HTTPException(status_code=403, detail="Tak ada akses")

    return await _enrich_with_staff(order, db)


@router.patch("/{order_id}/status")
async def update_order_status(
    order_id: str,
    payload: dict,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if user.role == UserRole.CUSTOMER:
        raise HTTPException(status_code=403, detail="Tak ada akses")

    new_status = payload.get("status")
    if not new_status:
        raise HTTPException(status_code=400, detail="status required")
    try:
        new_status_enum = OrderStatus(new_status)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid status: {new_status}")

    result = await db.execute(select(Order).where(Order.order_id == order_id))
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order tak jumpa")

    if user.role == UserRole.STAFF:
        staff_row = await db.execute(select(Staff).where(Staff.email == user.email))
        staff_record = staff_row.scalar_one_or_none()
        if not staff_record or order.staff_id != staff_record.staff_id:
            raise HTTPException(status_code=403, detail="Order ni tak assigned to you boss")

    order.status = new_status_enum
    await db.commit()

    customer_result = await db.execute(select(User).where(User.user_id == order.user_id))
    customer = customer_result.scalar_one_or_none()
    staff_name = "Our staff"
    if order.staff_id:
        s = await db.execute(select(Staff).where(Staff.staff_id == order.staff_id))
        staff_obj = s.scalar_one_or_none()
        if staff_obj:
            staff_name = staff_obj.name
    if customer and customer.phone:
        send_sms(customer.phone, status_message(new_status, order.order_id, staff_name))

    return {"message": "Status updated", "status": new_status, "order_id": order_id}
