import logging
logger = logging.getLogger(__name__)
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from sqlalchemy.orm import selectinload
from pydantic import BaseModel
from typing import Optional

from database import get_db
from models import User, Order, Staff, Product, Stock, UserRole, OrderStatus, SupplierProduct
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
    """Staff logs new stock received from boss.
    Automatically deducts from supplier pool (FIFO) â staff never see which supplier."""
    staff = await _staff_record_for(user, db)

    if payload.quantity < 0:
        raise HTTPException(status_code=400, detail="Quantity can't be negative lah")

    # Validate product exists
    p_result = await db.execute(select(Product).where(Product.product_id == payload.product_id))
    product = p_result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product tak jumpa")

    # ââ Auto-deduct from suppliers (FIFO by created_at) ââââââââââââââââââââââ
    # Staff don't know which supplier â they just add stock and the backend handles it
    sp_result = await db.execute(
        select(SupplierProduct)
        .where(
            and_(
                SupplierProduct.product_id == payload.product_id,
                SupplierProduct.quantity > 0,
            )
        )
        .order_by(SupplierProduct.created_at.asc())  # oldest supplier stock first
    )
    supplier_products = sp_result.scalars().all()

    remaining = payload.quantity
    for sp in supplier_products:
        if remaining <= 0:
            break
        deduct = min(sp.quantity, remaining)
        sp.quantity -= deduct
        remaining -= deduct
    # remaining > 0 means staff received stock not recorded in any supplier â allowed
    # âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

    # Update or create staff's own stock entry
    existing = await db.execute(
        select(Stock).where(
            Stock.staff_id == staff.staff_id,
            Stock.product_id == payload.product_id
        )
    )
    stock = existing.scalar_one_or_none()

    if stock:
        stock.quantity += payload.quantity
    else:
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
    try:
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

        if user.role == UserRole.STAFF:
            staff = await _staff_record_for(user, db)
            if order.staff_id and order.staff_id != staff.staff_id:
                raise HTTPException(status_code=403, detail="Order ni bukan yours to transfer")

        if payload.target_staff_id == order.staff_id:
            raise HTTPException(status_code=400, detail="Order already with this staff boss")

        tr = await db.execute(select(Staff).where(Staff.staff_id == payload.target_staff_id))
        target = tr.scalar_one_or_none()
        if not target:
            raise HTTPException(status_code=404, detail="Target staff tak jumpa")

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
    if user.role == UserRole.CUSTOMER:
        raise HTTPException(status_code=403, detail="Access denied")

    order_result = await db.execute(select(Order).where(Order.order_id == order_id))
    order = order_result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order tak jumpa")

    if user.role == UserRole.STAFF:
        staff = await _staff_record_for(user, db)
        if order.staff_id and order.staff_id != staff.staff_id:
            raise HTTPException(status_code=403, detail="Order ni bukan yours")

    if not order.staff_id:
        raise HTTPException(status_code=400, detail="No staff assigned to this order yet")

    staff_result = await db.execute(select(Staff).where(Staff.staff_id == order.staff_id))
    staff = staff_result.scalar_one_or_none()
    if not staff:
        raise HTTPException(status_code=404, detail="Assigned staff record not found")

    customer_result = await db.execute(select(User).where(User.user_id == order.user_id))
    customer = customer_result.scalar_one_or_none()
    if not customer or not customer.email:
        raise HTTPException(status_code=400, detail="Customer has no email on file")

    result = send_status_notification(
        to_email=customer.email,
        customer_name=order.customer_name or customer.name,
        order_id=order.order_id,
        status=order.status.value if hasattr(order.status, "value") else order.status,
        staff_name=staff.name,
        staff_email=staff.email,
        staff_whatsapp=staff.whatsapp_number,
    )

    if not result["sent"]:
        raise HTTPException(status_code=502, detail=f"Email not sent â {result['reason']}")

    return {"message": f"Customer notified about {order.status} status", "sent": True}


@router.get("/info")
async def get_all_staff(db: AsyncSession = Depends(get_db)):
    """Get all staff info (public)"""
    result = await db.execute(select(Staff))
    return [_clean(s) for s in result.scalars().all()]
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from sqlalchemy.orm import selectinload
from pydantic import BaseModel
from typing import Optional

from database import get_db
from models import User, Order, Staff, Product, Stock, UserRole, OrderStatus, SupplierProduct
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
    """Staff logs new stock received from boss.
    Automatically deducts from supplier pool (FIFO) â staff never see which supplier."""
    staff = await _staff_record_for(user, db)

    if payload.quantity < 0:
        raise HTTPException(status_code=400, detail="Quantity can't be negative lah")

    # Validate product exists
    p_result = await db.execute(select(Product).where(Product.product_id == payload.product_id))
    product = p_result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product tak jumpa")

    # ââ Auto-deduct from suppliers (FIFO by created_at) ââââââââââââââââââââââ
    # Staff don't know which supplier â they just add stock and the backend handles it
    sp_result = await db.execute(
        select(SupplierProduct)
        .where(
            and_(
                SupplierProduct.product_id == payload.product_id,
                SupplierProduct.quantity > 0,
            )
        )
        .order_by(SupplierProduct.created_at.asc())  # oldest supplier stock first
    )
    supplier_products = sp_result.scalars().all()

    remaining = payload.quantity
    for sp in supplier_products:
        if remaining <= 0:
            break
        deduct = min(sp.quantity, remaining)
        sp.quantity -= deduct
        remaining -= deduct
    # remaining > 0 means staff received stock not recorded in any supplier â allowed
    # âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

    # Update or create staff's own stock entry
    existing = await db.execute(
        select(Stock).where(
            Stock.staff_id == staff.staff_id,
            Stock.product_id == payload.product_id
        )
    )
    stock = existing.scalar_one_or_none()

    if stock:
        stock.quantity += payload.quantity
    else:
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
    try:
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

        if user.role == UserRole.STAFF:
            staff = await _staff_record_for(user, db)
            if order.staff_id and order.staff_id != staff.staff_id:
                raise HTTPException(status_code=403, detail="Order ni bukan yours to transfer")

        if payload.target_staff_id == order.staff_id:
            raise HTTPException(status_code=400, detail="Order already with this staff boss")

        tr = await db.execute(select(Staff).where(Staff.staff_id == payload.target_staff_id))
        target = tr.scalar_one_or_none()
        if not target:
            raise HTTPException(status_code=404, detail="Target staff tak jumpa")

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
    if user.role == UserRole.CUSTOMER:
        raise HTTPException(status_code=403, detail="Access denied")

    order_result = await db.execute(select(Order).where(Order.order_id == order_id))
    order = order_result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order tak jumpa")

    if user.role == UserRole.STAFF:
        staff = await _staff_record_for(user, db)
        if order.staff_id and order.staff_id != staff.staff_id:
            raise HTTPException(status_code=403, detail="Order ni bukan yours")

    if not order.staff_id:
        raise HTTPException(status_code=400, detail="No staff assigned to this order yet")

    staff_result = await db.execute(select(Staff).where(Staff.staff_id == order.staff_id))
    staff = staff_result.scalar_one_or_none()
    if not staff:
        raise HTTPException(status_code=404, detail="Assigned staff record not found")

    customer_result = await db.execute(select(User).where(User.user_id == order.user_id))
    customer = customer_result.scalar_one_or_none()
    if not customer or not customer.email:
        raise HTTPException(status_code=400, detail="Customer has no email on file")

    result = send_status_notification(
        to_email=customer.email,
        customer_name=order.customer_name or customer.name,
        order_id=order.order_id,
        status=order.status.value if hasattr(order.status, "value") else order.status,
        staff_name=staff.name,
        staff_email=staff.email,
        staff_whatsapp=staff.whatsapp_number,
    )

    if not result["sent"]:
        raise HTTPException(status_code=502, detail=f"Email not sent â {result['reason']}")

    return {"message": f"Customer notified about {order.status} status", "sent": True}


@router.get("/info")
async def get_all_staff(db: AsyncSession = Depends(get_db)):
    """Get all staff info (public)"""
    result = await db.execute(select(Staff))
    return [_clean(s) for s in result.scalars().all()]
