from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

from database import get_db
from models import User, Order, OrderStatus, Review, UserRole
from auth_utils import get_current_user

router = APIRouter(prefix="/reviews", tags=["Reviews"])


class ReviewCreate(BaseModel):
    order_id: str
    rating: int  # 1-5
    comment: Optional[str] = None


class ReviewResponse(BaseModel):
    review_id: str
    rating: int
    comment: Optional[str]
    created_at: datetime
    user_name: Optional[str] = None
    is_visible: bool


def _clean(obj):
    return {k: v for k, v in obj.__dict__.items() if not k.startswith('_')}


@router.post("/")
async def create_review(
    data: ReviewCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Submit a review for a delivered order."""
    if not (1 <= data.rating <= 5):
        raise HTTPException(status_code=400, detail="Rating must be 1-5 lah")

    # Order must exist and belong to user
    order_result = await db.execute(
        select(Order).where(Order.order_id == data.order_id)
    )
    order = order_result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.user_id != user.user_id:
        raise HTTPException(status_code=403, detail="Not your order boss")
    if order.status != OrderStatus.DELIVERED:
        raise HTTPException(status_code=400, detail="Can only review delivered orders lah")

    # Check duplicate
    existing = await db.execute(
        select(Review).where(
            Review.order_id == data.order_id,
            Review.user_id == user.user_id
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Already reviewed this order")

    review = Review(
        order_id=data.order_id,
        user_id=user.user_id,
        staff_id=order.staff_id,
        rating=data.rating,
        comment=data.comment,
    )
    db.add(review)
    await db.commit()
    await db.refresh(review)

    return {"message": "Review submitted, thanks boss!", "review_id": review.review_id}


@router.get("/public")
async def get_public_reviews(db: AsyncSession = Depends(get_db)):
    """Get visible reviews for homepage display."""
    result = await db.execute(
        select(Review, User.name.label("user_name"))
        .join(User, Review.user_id == User.user_id)
        .where(Review.is_visible == True)
        .order_by(Review.created_at.desc())
        .limit(20)
    )
    rows = result.all()
    out = []
    for review, user_name in rows:
        d = _clean(review)
        d['user_name'] = user_name
        # Anonymize: "Ahmad B." instead of full name
        if user_name:
            parts = user_name.strip().split()
            d['user_name'] = parts[0] + (' ' + parts[1][0] + '.' if len(parts) > 1 else '')
        out.append(d)
    return out


@router.get("/stats")
async def get_review_stats(db: AsyncSession = Depends(get_db)):
    """Get aggregate rating stats for homepage."""
    result = await db.execute(
        select(
            func.avg(Review.rating).label("avg"),
            func.count(Review.review_id).label("total"),
        ).where(Review.is_visible == True)
    )
    row = result.one()
    return {
        "average": round(float(row.avg or 0), 1),
        "total": row.total or 0,
    }


@router.get("/my-pending")
async def get_pending_reviews(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get delivered orders that haven't been reviewed yet — for prompting user."""
    # Get delivered orders
    orders_result = await db.execute(
        select(Order).where(
            Order.user_id == user.user_id,
            Order.status == OrderStatus.DELIVERED
        ).order_by(Order.created_at.desc()).limit(10)
    )
    orders = orders_result.scalars().all()

    # Get already reviewed order IDs
    reviewed_result = await db.execute(
        select(Review.order_id).where(Review.user_id == user.user_id)
    )
    reviewed_ids = {r[0] for r in reviewed_result.all()}

    pending = [
        {"order_id": o.order_id, "total": o.total, "created_at": o.created_at}
        for o in orders if o.order_id not in reviewed_ids
    ]
    return pending


@router.patch("/{review_id}/visibility")
async def toggle_review_visibility(
    review_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Admin toggle review visibility (hide/show)."""
    if user.role not in (UserRole.SUPER_ADMIN, UserRole.MASTER_ADMIN):
        raise HTTPException(status_code=403, detail="Admin only")
    result = await db.execute(select(Review).where(Review.review_id == review_id))
    review = result.scalar_one_or_none()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    review.is_visible = not review.is_visible
    await db.commit()
    return {"message": "Updated", "is_visible": review.is_visible}
