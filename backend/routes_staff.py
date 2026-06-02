from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from database import get_db
from models import User, Order, Staff, Product, Stock, UserRole
from auth_utils import get_current_user

router = APIRouter(prefix="/staff", tags=["Staff"])


async def _staff_record_for(user: User, db: AsyncSession) -> Staff:
    """Resolve the Staff row for a logged-in user (matched by email)."""
    if user.role != UserRole.STAFF:
        raise HTTPException(status_code=403, detail="Staff only")
    r = await db.execute(select(Staff).where(Staff.email == user.email))
    s = r.scalar_one_or_none()
    if not s:
        raise HTTPException(status_code=404, detail="Staff record not found")
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
    if user.role == UserRole.MASTER_ADMIN:
        query = select(Order).options(selectinload(Order.order_items))
    else:
        staff = await _staff_record_for(user, db)
        query = select(Order).options(selectinload(Order.order_items)).where(Order.staff_id == staff.staff_id)

    if status:
        query = query.where(Order.status == status)

    query = query.order_by(Order.created_at.desc())
    result = await db.execute(query)
    orders = result.scalars().all()
    return [
        {
            **_clean(o),
            "items": [_clean(i) for i in o.order_items],
        }
        for o in orders
    ]


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
            "product_id": product.product_id,
            "product_name": product.name,
            "category": product.category,
            "quantity": stock.quantity,
        })
    return items


@router.get("/info")
async def get_all_staff(db: AsyncSession = Depends(get_db)):
    """Get all staff info (public)"""
    result = await db.execute(select(Staff))
    return [_clean(s) for s in result.scalars().all()]
