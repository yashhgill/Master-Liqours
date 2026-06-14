from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from pydantic import BaseModel
from typing import Optional

from database import get_db
from models import User, Order, Staff, Product, Stock, UserRole, OrderStatus
import uuid

def _new_id(): return str(uuid.uuid4())
from auth_utils import get_current_user

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
    """Get staff's stock inventory"""
    staff = await _staff_record_for(user, db)
    r = await db.execute(
        select(Stock, Product)
        .join(Product, Stock.product_id == Product.product_id)
        .where(Stock.staff_id == staff.staff_id)
    )
    items = []
    for stock, product in r.all():
        items.append({
            "stock_id": stock.stock_id,
            "product_id": product.product_id,
            "product_name": product.name,
            "category": product.category,
            "quantity": stock.quantity,
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
    """Staff logs new stock received from boss for a product."""
    staff = await _staff_record_for(user, db)

    if payload.quantity < 0:
        raise HTTPException(status_code=400, detail="Quantity can't be negative lah")

    # Validate product exists
    p_result = await db.execute(select(Product).where(Product.product_id == payload.product_id))
    product = p_result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product tak jumpa")

    # Check if stock entry already exists for this staff + product
    existing = await db.execute(
        select(Stock).where(
            Stock.staff_id == staff.staff_id,
            Stock.product_id == payload.product_id
        )
    )
    stock = existing.scalar_one_or_none()

    if stock:
        # Already exists — just add to quantity
        stock.quantity += payload.quantity
    else:
        # Create new stock entry
        stock = Stock(
            stock_id=str(uuid.uuid4()),
            staff_id=staff.staff_id,
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
    """Staff updates their own stock quantity for a product"""
    staff = await _staff_record_for(user, db)

    r = await db.execute(
        select(Stock).where(Stock.stock_id == stock_id, Stock.staff_id == staff.staff_id)
    )
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
    # Must be staff, super_admin, or master_admin
    if user.role == UserRole.CUSTOMER:
        raise HTTPException(status_code=403, detail="Access denied")

    r = await db.execute(
        select(Order).options(selectinload(Order.order_items)).where(Order.order_id == order_id)
    )
    order = r.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order tak jumpa")

    # Staff can only transfer orders assigned to them
    if user.role == UserRole.STAFF:
        staff = await _staff_record_for(user, db)
        if order.staff_id != staff.staff_id:
            raise HTTPException(status_code=403, detail="Order ni bukan yours to transfer")

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


@router.get("/info")
async def get_all_staff(db: AsyncSession = Depends(get_db)):
    """Get all staff info (public)"""
    result = await db.execute(select(Staff))
    return [_clean(s) for s in result.scalars().all()]
