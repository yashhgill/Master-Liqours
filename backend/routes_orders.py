from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
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

router = APIRouter(prefix="/orders", tags=["Orders"])


def calculate_tier_discount(user: User, subtotal: float):
    """Platinum gets 3% product discount. No shipping calc — staff handles that."""
    if user.tier == UserTier.PLATINUM:
        return subtotal * 0.03
    return 0.0


def _clean_dict(obj):
    return {k: v for k, v in obj.__dict__.items() if not k.startswith('_')}


async def _enrich_with_staff(order, db):
    # Look up product names for all items in this order
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

    # ── Auto-deduct stock (fixed for the multi-staff "shared stock" issue) ──
    # Each staff can hold their own physical stock count for the same product, so a
    # product is never one single shared pool — it's the sum of every staff's Stock
    # row. Two problems used to happen here:
    #   1) No row locking -> two concurrent checkouts could both read the same
    #      Stock row before either committed, decrementing past zero (overselling).
    #   2) If the customer's own assigned staff had 0/insufficient stock, the loop
    #      just skipped silently — the order still went through with NOTHING
    #      decremented anywhere, so the boss had no idea inventory was wrong.
    # Fix: lock the candidate row with SELECT...FOR UPDATE, prefer the customer's
    # assigned staff, fall back to whichever staff actually has enough on hand, and
    # if literally nobody has enough stock, fail the checkout instead of pretending
    # it succeeded.
    for item_data in order_items_data:
        needed_qty = item_data["quantity"]
        product_id = item_data["product_id"]
        stock_row = None

        # 1) Try the customer's assigned staff first (locks the row for this tx)
        if order.staff_id:
            preferred = await db.execute(
                select(Stock)
                .where(and_(Stock.staff_id == order.staff_id, Stock.product_id == product_id))
                .with_for_update()
            )
            preferred_row = preferred.scalar_one_or_none()
            if preferred_row and preferred_row.quantity >= needed_qty:
                stock_row = preferred_row

        # 2) Fall back to ANY staff that actually has enough stock, locked too
        if stock_row is None:
            fallback = await db.execute(
                select(Stock)
                .where(Stock.product_id == product_id, Stock.quantity >= needed_qty)
                .order_by(Stock.quantity.desc())
                .with_for_update()
            )
            stock_row = fallback.scalars().first()

        if stock_row is None:
            # Nobody has enough — don't silently let this sale through.
            product_result = await db.execute(select(Product).where(Product.product_id == product_id))
            product_for_error = product_result.scalar_one_or_none()
            product_label = product_for_error.name if product_for_error else product_id
            raise HTTPException(
                status_code=409,
                detail=f"Sorry, not enough stock for {product_label} right now (need {needed_qty}). Please check with staff before retrying.",
            )

        stock_row.quantity -= needed_qty
        # Always assign the order to whichever staff actually fulfilled it, so sales
        # are attributed to the real stock holder, not left mismatched.
        order.staff_id = stock_row.staff_id

        # Low stock alert — fire-and-forget, never blocks checkout
        if stock_row.quantity <= LOW_STOCK_THRESHOLD:
            staff_for_alert = await db.execute(select(Staff).where(Staff.staff_id == stock_row.staff_id))
            staff_row = staff_for_alert.scalar_one_or_none()
            product_for_alert = await db.execute(select(Product).where(Product.product_id == product_id))
            product_row = product_for_alert.scalar_one_or_none()
            if staff_row and product_row:
                send_low_stock_alert(staff_row.email, staff_row.name, product_row.name, stock_row.quantity)
                await notify_staff_or_admins(
                    db,
                    title="Low stock warning ⚠️",
                    body=f"{product_row.name} — only {stock_row.quantity} left for {staff_row.name}.",
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

    # Deduct from this staff's own recorded stock too — personal/walk-in sales
    # used to skip this entirely, which is exactly how stock numbers drift out
    # of sync between what staff think they have and what's actually left.
    # We never block a walk-in log (the sale already physically happened), but
    # we surface a clear warning if it pushes a staff's stock into a mismatch
    # so the boss/staff can reconcile instead of finding out later.
    stock_warnings = []
    if staff:
        for item_data in order_items_data:
            sr = await db.execute(
                select(Stock)
                .where(and_(Stock.staff_id == staff.staff_id, Stock.product_id == item_data["product_id"]))
                .with_for_update()
            )
            stock_row = sr.scalar_one_or_none()
            if not stock_row:
                stock_row = Stock(staff_id=staff.staff_id, product_id=item_data["product_id"], quantity=0)
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


# ─── GET ORDERS ───────────────────────────────────────────────────────────────


class PromoValidateRequest(BaseModel):
    code: str

@router.post("/validate-promo")
async def validate_promo(
    data: PromoValidateRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Validate a discount code and return the discount amount."""
    from datetime import datetime
    result = await db.execute(
        select(DiscountCode).where(
            DiscountCode.code == data.code.upper().strip(),
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
    return {
        "code": code.code,
        "discount_type": code.discount_type,
        "discount_value": code.discount_value,
        "discount_amount": code.discount_value,
        "message": f"Code valid — RM{code.discount_value:.2f} off!"
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
