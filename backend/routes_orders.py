from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from typing import List, Optional
from pydantic import BaseModel

from database import get_db
from models import User, Product, Order, OrderItem, Stock, Reward, Staff, UserTier, OrderStatus, UserRole, DiscountCode
from sqlalchemy import and_
from schemas import CheckoutRequest, OrderResponse, CartItem
from auth_utils import get_current_user
from sms_utils import send_sms, status_message
from email_utils import send_low_stock_alert, LOW_STOCK_THRESHOLD
from routes_push import notify_staff_or_admins
from datetime import datetime

router = APIRouter(prefix="/orders", tags=["Orders"])

def calculate_tier_discount(user: User, subtotal: float):
    """Platinum gets 3% product discount. No shipping calc — staff handles that."""
    if user.tier == UserTier.PLATINUM:
        return subtotal * 0.03
    return 0.0

def _clean_dict(obj):
    return {k: v for k, v in obj.__dict__.items() if not k.startswith('_')}

async def _enrich_with_staff(order, db):
    item_dicts = [_clean_dict(item) for item in order.order_items]
    product_ids = [i["product_id"] for i in item_dicts if i.get("product_id")]
    product_names = {}
    if product_ids:
        prod_result = await db.execute(select(Product).where(Product.product_id.in_(product_ids)))
        for p in prod_result.scalars().all():
            product_names[p.product_id] = p.name
    for i in item_dicts:
        i["product_name"] = product_names.get(i.get("product_id"), "Unknown Product")

    payload = {
        **_clean_dict(order),
        "items": item_dicts,
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

async def _apply_promo_code(code_str: Optional[str], subtotal: float, user: User, db: AsyncSession):
    code_str = (code_str or "").upper().strip()
    if not code_str:
        return 0.0, None

    result = await db.execute(
        select(DiscountCode)
        .where(DiscountCode.code == code_str, DiscountCode.active == True)
        .with_for_update()
    )
    code = result.scalar_one_or_none()
    if not code:
        raise HTTPException(status_code=400, detail="Invalid promo code lah")
    if code.expires_at and code.expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Promo code dah expired boss")
    if code.max_uses and code.used_count >= code.max_uses:
        raise HTTPException(status_code=400, detail="Promo code dah habis quota")
    if code.min_purchase and subtotal < code.min_purchase:
        raise HTTPException(status_code=400, detail=f"Minimum spend RM{code.min_purchase:.2f} for this code")

    # NEWBRO / first-order-only enforcement
    if code.is_first_order_only:
        prior_result = await db.execute(
            select(func.count(Order.order_id)).where(
                Order.user_id == user.user_id,
                Order.is_personal_order == False,
            )
        )
        if (prior_result.scalar() or 0) > 0:
            raise HTTPException(status_code=400, detail="This code is for new customers only lah")

    if code.discount_type == "percentage":
        discount = subtotal * (code.discount_value / 100)
    else:
        discount = code.discount_value
    discount = max(0.0, min(discount, subtotal))

    code.used_count = (code.used_count or 0) + 1
    return discount, code

# ─── CUSTOMER CHECKOUT ──────────────────────────────────────────────

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

        # FIX: Increment sales_count so "Best Sellers" sort works correctly
        product.sales_count = (product.sales_count or 0) + item.quantity

    product_discount = calculate_tier_discount(user, subtotal)

    promo_discount, promo_code_row = await _apply_promo_code(data.discount_code, subtotal, user, db)
    total_discount = product_discount + promo_discount
    total = max(0.0, subtotal - total_discount)

    order = Order(
        user_id=user.user_id,
        staff_id=user.assigned_staff_id,
        total=total,
        customer_name=data.customer_name.strip(),
        customer_whatsapp=data.customer_whatsapp.strip(),
        shipping_address=data.shipping_address.strip(),
        discount_applied=total_discount,
        shipping_discount=0,
        points_earned=int(total / 10),
        status=OrderStatus.PENDING,
        is_personal_order=False,
        discount_code_used=promo_code_row.code if promo_code_row else None,
    )
    db.add(order)
    await db.flush()

    for item_data in order_items_data:
        order_item = OrderItem(order_id=order.order_id, **item_data)
        db.add(order_item)

    for item_data in order_items_data:
        needed_qty = item_data["quantity"]
        product_id = item_data["product_id"]
        stock_row = None

        if order.staff_id:
            assigned_staff_result = await db.execute(select(Staff).where(Staff.staff_id == order.staff_id))
            assigned_staff = assigned_staff_result.scalar_one_or_none()
            if assigned_staff and assigned_staff.warehouse_id:
                preferred = await db.execute(
                    select(Stock)
                    .where(and_(Stock.warehouse_id == assigned_staff.warehouse_id, Stock.product_id == product_id))
                    .with_for_update()
                )
            else:
                preferred = await db.execute(
                    select(Stock)
                    .where(and_(Stock.staff_id == order.staff_id, Stock.product_id == product_id))
                    .with_for_update()
                )
            preferred_row = preferred.scalar_one_or_none()
            if preferred_row and preferred_row.quantity >= needed_qty:
                stock_row = preferred_row

        if stock_row is None:
            fallback = await db.execute(
                select(Stock)
                .where(Stock.product_id == product_id, Stock.quantity >= needed_qty)
                .order_by(Stock.quantity.desc())
                .with_for_update()
            )
            stock_row = fallback.scalars().first()

        if stock_row is None:
            product_result = await db.execute(select(Product).where(Product.product_id == product_id))
            product_for_error = product_result.scalar_one_or_none()
            product_label = product_for_error.name if product_for_error else product_id
            raise HTTPException(
                status_code=409,
                detail=f"Sorry, not enough stock for {product_label} right now (need {needed_qty}). Please check with staff before retrying.",
            )

        stock_row.quantity -= needed_qty
        if stock_row.staff_id:
            order.staff_id = stock_row.staff_id

        if stock_row.quantity <= LOW_STOCK_THRESHOLD:
            if stock_row.warehouse_id:
                staff_alert_result = await db.execute(select(Staff).where(Staff.warehouse_id == stock_row.warehouse_id))
            else:
                staff_alert_result = await db.execute(select(Staff).where(Staff.staff_id == stock_row.staff_id))
            staff_rows_for_alert = staff_alert_result.scalars().all()
            product_for_alert = await db.execute(select(Product).where(Product.product_id == product_id))
            product_row = product_for_alert.scalar_one_or_none()
            if product_row:
                for staff_row in staff_rows_for_alert:
                    send_low_stock_alert(staff_row.email, staff_row.name, product_row.name, stock_row.quantity)
                await notify_staff_or_admins(
                    db,
                    title="Low stock warning ⚠️",
                    body=f"{product_row.name} — only {stock_row.quantity} left"
                         + (" (shared warehouse stock)" if stock_row.warehouse_id else f" for {staff_row.name}."),
                    staff_user_email=staff_row.email,
                    url="/staff",
                )

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
    staff_email_for_push = None
    if order.staff_id:
        staff_result = await db.execute(select(Staff).where(Staff.staff_id == order.staff_id))
        staff = staff_result.scalar_one_or_none()
        if staff:
            staff_whatsapp = staff.whatsapp_number
            staff_name = staff.name
            staff_email_for_push = staff.email

    await notify_staff_or_admins(
        db,
        title="New order received! 🍾",
        body=f"RM{order.total:.2f} — {order.customer_name or 'A customer'} just checked out.",
        staff_user_email=staff_email_for_push,
        url=f"/staff",
    )

    return {
        **_clean_dict(order),
        "items": [_clean_dict(item) for item in order.order_items],
        "staff_whatsapp": staff_whatsapp,
        "staff_name": staff_name
    }

# ─── STAFF: LOG A PERSONAL / WALK-IN ORDER ────────────────────────────────────────────

class PersonalOrderItem(BaseModel):
    product_id: str
    quantity: int
    price: Optional[float] = None

class PersonalOrderRequest(BaseModel):
    customer_name: str
    customer_whatsapp: str
    items: List[PersonalOrderItem]
    notes: Optional[str] = None

@router.post("/personal", response_model=OrderResponse)
async def log_personal_order(
    data: PersonalOrderRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Staff logs a personal / walk-in order they received outside the app."""
    if user.role == UserRole.CUSTOMER:
        raise HTTPException(status_code=403, detail="Staff only boss")

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

        if item.price is not None:
            if item.price <= 0 or item.price > product.price:
                raise HTTPException(
                    status_code=400,
                    detail=f"Price for {product.name} must be between RM0.01 and RM{product.price:.2f} (listed price)."
                )
            unit_price = item.price
        else:
            unit_price = product.price
        item_total = unit_price * item.quantity
        subtotal += item_total
        order_items_data.append({
            "product_id": product.product_id,
            "quantity": item.quantity,
            "price": unit_price,
            "subtotal": item_total
        })

        # FIX: Increment sales_count for personal/walk-in orders too
        product.sales_count = (product.sales_count or 0) + item.quantity

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
        status=OrderStatus.CONFIRMED,
        is_personal_order=True
    )
    db.add(order)
    await db.flush()

    for item_data in order_items_data:
        order_item = OrderItem(order_id=order.order_id, **item_data)
        db.add(order_item)

    stock_warnings = []
    if staff:
        for item_data in order_items_data:
            if staff.warehouse_id:
                cond = and_(Stock.warehouse_id == staff.warehouse_id, Stock.product_id == item_data["product_id"])
            else:
                cond = and_(Stock.staff_id == staff.staff_id, Stock.product_id == item_data["product_id"])
            sr = await db.execute(select(Stock).where(cond).with_for_update())
            stock_row = sr.scalar_one_or_none()
            if not stock_row:
                stock_row = Stock(
                    staff_id=None if staff.warehouse_id else staff.staff_id,
                    warehouse_id=staff.warehouse_id,
                    product_id=item_data["product_id"],
                    quantity=0,
                )
                db.add(stock_row)
                await db.flush()
            if stock_row.quantity < item_data["quantity"]:
                prod_res = await db.execute(select(Product).where(Product.product_id == item_data["product_id"]))
                prod = prod_res.scalar_one_or_none()
                stock_warnings.append(
                    f"{(prod.name if prod else item_data['product_id'])}: recorded stock was only "
                    f"{stock_row.quantity}, logged sale of {item_data['quantity']} anyway — please recount this item."
                )
            stock_row.quantity = max(0, stock_row.quantity - item_data["quantity"])

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
        "staff_name": staff.name if staff else None,
        "stock_warnings": stock_warnings,
    }

# ─── GET ORDERS ───────────────────────────────────────────────────────────────────────────────

class PromoValidateRequest(BaseModel):
    code: str
    order_total: Optional[float] = 0

@router.post("/validate-promo")
async def validate_promo(
    data: PromoValidateRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Validate a discount code and return calculated savings. Checks first-order-only rules."""
    subtotal = data.order_total or 0
    code_upper = data.code.upper().strip()
    result = await db.execute(
        select(DiscountCode).where(
            DiscountCode.code == code_upper,
            DiscountCode.active == True
        )
    )
    code = result.scalar_one_or_none()
    if not code:
        raise HTTPException(status_code=400, detail="Invalid promo code lah")
    if code.expires_at and code.expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Promo code dah expired boss")
    if code.max_uses and code.used_count >= code.max_uses:
        raise HTTPException(status_code=400, detail="Promo code dah habis quota")
    if code.min_purchase and subtotal < code.min_purchase:
        raise HTTPException(status_code=400, detail=f"Minimum spend RM{code.min_purchase:.2f} for this code")
    if code.is_first_order_only:
        prior_result = await db.execute(
            select(func.count(Order.order_id)).where(
                Order.user_id == user.user_id,
                Order.is_personal_order == False,
            )
        )
        if (prior_result.scalar() or 0) > 0:
            raise HTTPException(status_code=400, detail="This code is for new customers only lah")

    if code.discount_type == "percentage":
        savings = round(subtotal * code.discount_value / 100, 2)
    else:
        savings = min(code.discount_value, subtotal)

    return {
        "code": code.code,
        "discount_type": code.discount_type,
        "discount_value": code.discount_value,
        "savings": savings,
        "is_first_order_only": code.is_first_order_only,
        "message": f"Code valid — you save RM{savings:.2f}!",
    }

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

_ALLOWED_TRANSITIONS = {
    OrderStatus.PENDING: {OrderStatus.CONFIRMED, OrderStatus.CANCELLED},
    OrderStatus.CONFIRMED: {OrderStatus.PREPARING, OrderStatus.CANCELLED},
    OrderStatus.PREPARING: {OrderStatus.OUT_FOR_DELIVERY, OrderStatus.CANCELLED},
    OrderStatus.OUT_FOR_DELIVERY: {OrderStatus.DELIVERED, OrderStatus.CANCELLED},
    OrderStatus.DELIVERED: set(),
    OrderStatus.CANCELLED: set(),
}

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

    if new_status_enum == order.status:
        return {"message": "Status unchanged", "status": new_status, "order_id": order_id}

    allowed_next = _ALLOWED_TRANSITIONS.get(order.status, set())
    if new_status_enum not in allowed_next:
        raise HTTPException(
            status_code=400,
            detail=f"Can't move an order from '{order.status.value}' to '{new_status_enum.value}'.",
        )

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
