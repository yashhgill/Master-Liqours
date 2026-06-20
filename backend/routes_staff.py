from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from sqlalchemy.orm import selectinload
from pydantic import BaseModel
from typing import Optional

from database import get_db
from models import User, Order, Staff, Product, Stock, UserRole, OrderStatus
import uuid

def _new_id(): return str(uuid.uuid4())
from auth_utils import get_current_user
from email_utils import send_status_notification

router = APIRouter(prefix="/staff", tags=["Staff"])


async def _staff_record_for(user: User, db: AsyncSession) -> Staff:
    """Resolve the Staff row for a logged-in user. Admins can also access this."""
    allowed = (UserRole.STAFF, UserRole.SUPER_ADMIN, UserRole.MASTER_ADMIN)
    if user.role not in allowed:
        raise HTTPException(status_code=403, detail="Staff/Admin only")
    r = await db.execute(select(Staff).where(Staff.email == user.email))
    s = r.scalar_one_or_none()
    if not s:
        raise HTTPException(status_code=404, detail="No staff record found. Ask master admin to create a staff entry for your account first.")
    return s


def _clean(obj):
    return {k: v for k, v in obj.__dict__.items() if not k.startswith('_')}


@router.get("/my-customers")
async def get_my_customers(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Get customers assigned to this staff"""
    staff = await _staff_record_for(user, db)
    r = await db.execute(select(User).where(User.assigned_staff_id == staff.staff_id))
    return [_clean(u) for u in r.scalars().all()]


@router.get("/my-orders")
async def get_staff_orders(
    status: str = None,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get orders assigned to this staff"""
    if user.role in (UserRole.MASTER_ADMIN, UserRole.SUPER_ADMIN):
        query = select(Order).options(selectinload(Order.order_items))
    else:
        staff = await _staff_record_for(user, db)
        query = select(Order).options(selectinload(Order.order_items)).where(Order.staff_id == staff.staff_id)

    if status:
        query = query.where(Order.status == status)

    query = query.order_by(Order.created_at.desc())
    result = await db.execute(query)
    orders = result.scalars().all()

    # Look up product names for all items across all orders in one go
    all_product_ids = {i.product_id for o in orders for i in o.order_items if i.product_id}
    product_names = {}
    if all_product_ids:
        prod_result = await db.execute(select(Product).where(Product.product_id.in_(all_product_ids)))
        for p in prod_result.scalars().all():
            product_names[p.product_id] = p.name

    out = []
    for o in orders:
        items = []
        for i in o.order_items:
            item_dict = _clean(i)
            item_dict["product_name"] = product_names.get(i.product_id, "Unknown Product")
            items.append(item_dict)
        out.append({**_clean(o), "items": items})
    return out


@router.get("/my-stock")
async def get_my_stock(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Get staff's stock inventory. If this staff shares a warehouse with
    others, this returns the shared pool (same rows every member of that
    warehouse sees) instead of a personal-only count."""
    staff = await _staff_record_for(user, db)

    if staff.warehouse_id:
        cond = Stock.warehouse_id == staff.warehouse_id
    else:
        cond = and_(Stock.staff_id == staff.staff_id, Stock.warehouse_id.is_(None))

    r = await db.execute(
        select(Stock, Product)
        .join(Product, Stock.product_id == Product.product_id)
        .where(cond)
    )
    items = []
    for stock, product in r.all():
        items.append({
            "stock_id": stock.stock_id,
            "product_id": product.product_id,
            "product_name": product.name,
            "category": product.category,
            "quantity": stock.quantity,
            "shared": bool(staff.warehouse_id),
        })
    return items


class StockAddPayload(BaseModel):
    product_id: str
    quantity: int


@router.post("/my-stock")
async def add_my_stock(
    payload: StockAddPayload,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Staff logs new stock received from boss for a product. If staff is
    part of a shared warehouse, this adds to the shared pool — every other
    staff in that warehouse will immediately see the updated quantity."""
    staff = await _staff_record_for(user, db)

    if payload.quantity < 0:
        raise HTTPException(status_code=400, detail="Quantity can't be negative lah")

    # Validate product exists
    p_result = await db.execute(select(Product).where(Product.product_id == payload.product_id))
    product = p_result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product tak jumpa")

    # Check if a matching stock entry already exists (personal or shared pool)
    if staff.warehouse_id:
        cond = and_(Stock.warehouse_id == staff.warehouse_id, Stock.product_id == payload.product_id)
    else:
        cond = and_(Stock.staff_id == staff.staff_id, Stock.product_id == payload.product_id, Stock.warehouse_id.is_(None))

    existing = await db.execute(select(Stock).where(cond))
    stock = existing.scalar_one_or_none()

    if stock:
        # Already exists — just add to quantity
        stock.quantity += payload.quantity
    else:
        # Create new stock entry — either personal or pointed at the shared warehouse
        stock = Stock(
            stock_id=str(uuid.uuid4()),
            staff_id=None if staff.warehouse_id else staff.staff_id,
            warehouse_id=staff.warehouse_id,
            product_id=payload.product_id,
            quantity=payload.quantity,
        )
        db.add(stock)

    await db.commit()
    return {
        "message": "Stock added",
        "stock_id": stock.stock_id,
        "product_id": payload.product_id,
        "product_name": product.name,
        "quantity": stock.quantity,
        "shared": bool(staff.warehouse_id),
    }


class StockUpdatePayload(BaseModel):
    quantity: int


@router.patch("/my-stock/{stock_id}")
async def update_my_stock(
    stock_id: str,
    payload: StockUpdatePayload,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Staff updates their own stock quantity for a product (or the shared
    warehouse pool's quantity, if they belong to one)."""
    staff = await _staff_record_for(user, db)

    if staff.warehouse_id:
        cond = and_(Stock.stock_id == stock_id, Stock.warehouse_id == staff.warehouse_id)
    else:
        cond = and_(Stock.stock_id == stock_id, Stock.staff_id == staff.staff_id)

    r = await db.execute(select(Stock).where(cond))
    stock = r.scalar_one_or_none()
    if not stock:
        raise HTTPException(status_code=404, detail="Stock item tak jumpa or tak belong to you")

    if payload.quantity < 0:
        raise HTTPException(status_code=400, detail="Quantity can't be negative lah")

    stock.quantity = payload.quantity
    await db.commit()
    return {"message": "Stock updated", "stock_id": stock_id, "quantity": payload.quantity}


class TransferOrderPayload(BaseModel):
    target_staff_id: str
    reason: Optional[str] = None


@router.post("/orders/{order_id}/transfer")
async def transfer_order(
    order_id: str,
    payload: TransferOrderPayload,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Transfer an order to another staff member"""
    try:
        # Must be staff, super_admin, or master_admin
        if user.role == UserRole.CUSTOMER:
            raise HTTPException(status_code=403, detail="Access denied")

        if not payload.target_staff_id:
            raise HTTPException(status_code=400, detail="Pick a staff to transfer to lah")

        r = await db.execute(
            select(Order).options(selectinload(Order.order_items)).where(Order.order_id == order_id)
        )
        order = r.scalar_one_or_none()
        if not order:
            raise HTTPException(status_code=404, detail="Order tak jumpa")

        # Staff can only transfer orders assigned to them (admins can transfer any order)
        if user.role == UserRole.STAFF:
            staff = await _staff_record_for(user, db)
            if order.staff_id and order.staff_id != staff.staff_id:
                raise HTTPException(status_code=403, detail="Order ni bukan yours to transfer")

        if payload.target_staff_id == order.staff_id:
            raise HTTPException(status_code=400, detail="Order already with this staff boss")

        # Validate target staff exists
        tr = await db.execute(select(Staff).where(Staff.staff_id == payload.target_staff_id))
        target = tr.scalar_one_or_none()
        if not target:
            raise HTTPException(status_code=404, detail="Target staff tak jumpa")

        # Can't transfer already delivered/cancelled orders
        if order.status in (OrderStatus.DELIVERED, OrderStatus.CANCELLED):
            raise HTTPException(status_code=400, detail="Can't transfer a completed/cancelled order")

        order.staff_id = payload.target_staff_id
        await db.commit()

        return {
            "message": f"Order transferred to {target.name}",
            "order_id": order_id,
            "new_staff_id": payload.target_staff_id,
            "new_staff_name": target.name,
            "new_staff_whatsapp": target.whatsapp_number,
        }
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Transfer error: {str(e)}")


@router.post("/orders/{order_id}/notify-customer")
async def notify_customer(
    order_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Staff/admin clicks 'Notify Customer' on the dashboard. Sends an email
    from the *actual person clicking the button*'s own alias
    (name@masterliqours.my), auto-picking the template based on the order's
    current status. No body needed.

    Previously this always credited whichever staff the order's staff_id
    happened to point to -- which is really just "whoever's stock the order
    was fulfilled from," an inventory detail. That meant if an admin (or any
    staff member action that doesn't update staff_id) sent the notification,
    the email could show a completely different person's name -- and worse,
    used that other person's literal personal email as Reply-To. Now it
    always credits whoever is actually logged in and clicking the button.
    """
    if user.role == UserRole.CUSTOMER:
        raise HTTPException(status_code=403, detail="Access denied")

    order_result = await db.execute(select(Order).where(Order.order_id == order_id))
    order = order_result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order tak jumpa")

    # Staff can only notify for orders assigned to them (admins can notify any order)
    notifying_staff = None
    if user.role == UserRole.STAFF:
        staff = await _staff_record_for(user, db)
        if order.staff_id and order.staff_id != staff.staff_id:
            raise HTTPException(status_code=403, detail="Order ni bukan yours")
        if not order.staff_id:
            raise HTTPException(status_code=400, detail="No staff assigned to this order yet")
        notifying_staff = staff
    else:
        # Admin/boss sending it themselves — credit whoever is actually
        # clicking the button, not whichever staff member's stock happened
        # to fulfil the order.
        admin_staff_result = await db.execute(select(Staff).where(Staff.email == user.email))
        notifying_staff = admin_staff_result.scalar_one_or_none()

    if notifying_staff:
        staff_name = notifying_staff.name
        staff_email = notifying_staff.email
        staff_whatsapp = notifying_staff.whatsapp_number
    else:
        # Admin has no Staff row of their own — still send, attributed to
        # their account name, just without a personal WhatsApp button.
        staff_name = user.name
        staff_email = None
        staff_whatsapp = None

    customer_result = await db.execute(select(User).where(User.user_id == order.user_id))
    customer = customer_result.scalar_one_or_none()
    if not customer or not customer.email:
        raise HTTPException(status_code=400, detail="Customer has no email on file")

    result = send_status_notification(
        to_email=customer.email,
        customer_name=order.customer_name or customer.name,
        order_id=order.order_id,
        status=order.status.value if hasattr(order.status, "value") else order.status,
        staff_name=staff_name,
        staff_email=staff_email,
        staff_whatsapp=staff_whatsapp,
    )

    if not result["sent"]:
        raise HTTPException(status_code=502, detail=f"Email not sent — {result['reason']}")

    return {"message": f"Customer notified about {order.status} status", "sent": True}


@router.get("/info")
async def get_all_staff(db: AsyncSession = Depends(get_db)):
    """Get all staff info (public)"""
    result = await db.execute(select(Staff))
    return [_clean(s) for s in result.scalars().all()]
