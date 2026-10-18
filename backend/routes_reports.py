"""Admin reports: monthly orders / sales / payments summary, CSV export, and
order clean-up. Master/Super admin only.

All month boundaries use Malaysia time (UTC+8). Timestamps are stored as naive
UTC, so a month like 2026-10 means 2026-09-30 16:00 UTC .. 2026-10-31 16:00 UTC.
"""
import csv
import io
from collections import defaultdict
from datetime import datetime, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from auth_utils import get_current_user, require_role
from database import get_db
from models import Order, OrderItem, OrderStatus, Product, Review, Staff, User, UserRole

router = APIRouter(prefix="/admin", tags=["admin-reports"])

MYT = timedelta(hours=8)


def _month_bounds(month: str):
    """'YYYY-MM' (Malaysia time) -> (start_utc, end_utc) naive datetimes."""
    try:
        y, m = (int(x) for x in month.split("-"))
        start_local = datetime(y, m, 1)
    except Exception:
        raise HTTPException(status_code=400, detail="month must be YYYY-MM")
    end_local = datetime(y + (m // 12), (m % 12) + 1, 1)
    return start_local - MYT, end_local - MYT


def _status(o: Order) -> str:
    s = o.status
    return s.value if hasattr(s, "value") else str(s)


async def _load_month(db: AsyncSession, month: str):
    start, end = _month_bounds(month)
    orders = (await db.execute(
        select(Order).where(Order.created_at >= start, Order.created_at < end)
        .order_by(Order.created_at)
    )).scalars().all()
    ids = [o.order_id for o in orders]
    items = []
    if ids:
        items = (await db.execute(
            select(OrderItem, Product.name)
            .join(Product, Product.product_id == OrderItem.product_id, isouter=True)
            .where(OrderItem.order_id.in_(ids))
        )).all()
    staff_names = {s.staff_id: s.name for s in (await db.execute(select(Staff))).scalars().all()}
    return start, end, orders, items, staff_names


@router.get("/reports/monthly")
async def monthly_report(
    month: str = Query(..., description="YYYY-MM, Malaysia time"),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await require_role(user, UserRole.MASTER_ADMIN, UserRole.SUPER_ADMIN)
    start, end, orders, items, staff_names = await _load_month(db, month)

    cancelled = "cancelled"
    live = [o for o in orders if _status(o) != cancelled]
    delivered = [o for o in orders if _status(o) == "delivered"]
    with_proof = [o for o in live if o.payment_proof_url]

    by_status = defaultdict(lambda: {"orders": 0, "amount": 0.0})
    for o in orders:
        b = by_status[_status(o)]
        b["orders"] += 1
        b["amount"] += float(o.total or 0)

    # Daily (Malaysia date) — excludes cancelled
    daily = defaultdict(lambda: {"orders": 0, "sales": 0.0})
    for o in live:
        d = (o.created_at + MYT).date().isoformat()
        daily[d]["orders"] += 1
        daily[d]["sales"] += float(o.total or 0)

    # Per staff — excludes cancelled
    per_staff = defaultdict(lambda: {"orders": 0, "sales": 0.0, "delivered": 0})
    for o in live:
        name = staff_names.get(o.staff_id, "Unassigned") if o.staff_id else "Unassigned"
        p = per_staff[name]
        p["orders"] += 1
        p["sales"] += float(o.total or 0)
        if _status(o) == "delivered":
            p["delivered"] += 1

    # Top products — excludes cancelled orders
    live_ids = {o.order_id for o in live}
    prod = defaultdict(lambda: {"qty": 0, "revenue": 0.0})
    for it, pname in items:
        if it.order_id not in live_ids:
            continue
        p = prod[pname or "(deleted product)"]
        p["qty"] += int(it.quantity or 0)
        p["revenue"] += float(it.price or 0) * int(it.quantity or 0)

    gross = sum(float(o.total or 0) for o in live)
    r2 = lambda x: round(x, 2)
    return {
        "month": month,
        "range_utc": [start.isoformat(), end.isoformat()],
        "summary": {
            "orders": len(orders),
            "orders_excl_cancelled": len(live),
            "gross_sales": r2(gross),
            "delivered_orders": len(delivered),
            "delivered_revenue": r2(sum(float(o.total or 0) for o in delivered)),
            "cancelled_orders": by_status[cancelled]["orders"] if cancelled in by_status else 0,
            "cancelled_value": r2(by_status[cancelled]["amount"]) if cancelled in by_status else 0,
            "outstanding_orders": len([o for o in live if _status(o) != "delivered"]),
            "outstanding_value": r2(sum(float(o.total or 0) for o in live if _status(o) != "delivered")),
            "payment_proofs": len(with_proof),
            "payment_proof_value": r2(sum(float(o.total or 0) for o in with_proof)),
            "discounts_given": r2(sum(float(o.discount_applied or 0) for o in live)),
            "avg_order_value": r2(gross / len(live)) if live else 0,
            "unique_customers": len({o.user_id for o in live}),
            "bottles_sold": sum(v["qty"] for v in prod.values()),
        },
        "by_status": {k: {"orders": v["orders"], "amount": r2(v["amount"])} for k, v in by_status.items()},
        "daily": [{"date": d, "orders": v["orders"], "sales": r2(v["sales"])} for d, v in sorted(daily.items())],
        "by_staff": sorted(
            [{"staff": k, "orders": v["orders"], "delivered": v["delivered"], "sales": r2(v["sales"])} for k, v in per_staff.items()],
            key=lambda x: -x["sales"]),
        "top_products": sorted(
            [{"product": k, "qty": v["qty"], "revenue": r2(v["revenue"])} for k, v in prod.items()],
            key=lambda x: (-x["revenue"], -x["qty"]))[:20],
    }


@router.get("/reports/monthly.csv")
async def monthly_report_csv(
    month: str = Query(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Every order in the month, one row each — opens in Excel / Google Sheets."""
    await require_role(user, UserRole.MASTER_ADMIN, UserRole.SUPER_ADMIN)
    _, _, orders, items, staff_names = await _load_month(db, month)
    lines = defaultdict(list)
    for it, pname in items:
        lines[it.order_id].append(f"{it.quantity}x {pname or '?'} @ RM{float(it.price or 0):.2f}")

    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(["Date (MYT)", "Order ID", "Customer", "WhatsApp", "Staff", "Status",
                "Items", "Discount (RM)", "Total (RM)", "Payment proof", "Promo code"])
    for o in orders:
        w.writerow([
            (o.created_at + MYT).strftime("%Y-%m-%d %H:%M"),
            o.order_id[:8].upper(),
            o.customer_name or "",
            o.customer_whatsapp or "",
            staff_names.get(o.staff_id, "Unassigned") if o.staff_id else "Unassigned",
            _status(o),
            "; ".join(lines.get(o.order_id, [])),
            f"{float(o.discount_applied or 0):.2f}",
            f"{float(o.total or 0):.2f}",
            "Yes" if o.payment_proof_url else "No",
            o.discount_code_used or "",
        ])
    data = "﻿" + buf.getvalue()  # BOM so Excel reads UTF-8 correctly
    return StreamingResponse(
        iter([data]), media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="masterliqours-orders-{month}.csv"'},
    )


class OrderDelete(BaseModel):
    order_ids: List[str] = Field(min_length=1, max_length=500)


@router.post("/orders/delete")
async def delete_orders(
    payload: OrderDelete,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Permanently delete orders (e.g. test orders). Stock is NOT changed."""
    await require_role(user, UserRole.MASTER_ADMIN, UserRole.SUPER_ADMIN)
    ids = list(dict.fromkeys(payload.order_ids))
    await db.execute(delete(Review).where(Review.order_id.in_(ids)))
    await db.execute(delete(OrderItem).where(OrderItem.order_id.in_(ids)))
    res = await db.execute(delete(Order).where(Order.order_id.in_(ids)))
    await db.commit()
    return {"deleted": res.rowcount or 0}
