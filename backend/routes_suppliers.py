from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel
from typing import Optional
import uuid

from database import get_db
from models import User, UserRole, Supplier, SupplierProduct, Product
from auth_utils import get_current_user

router = APIRouter(prefix="/admin/suppliers", tags=["Suppliers"])


def _require_master(user: User):
    if user.role not in (UserRole.MASTER_ADMIN, UserRole.SUPER_ADMIN):
        raise HTTPException(status_code=403, detail="Admin only boss")


# ââ Pydantic Schemas âââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

class SupplierCreate(BaseModel):
    name: str
    contact: Optional[str] = None
    notes: Optional[str] = None

class SupplierUpdate(BaseModel):
    name: Optional[str] = None
    contact: Optional[str] = None
    notes: Optional[str] = None

class SupplierProductCreate(BaseModel):
    product_id: str
    cost_price: float
    selling_price: float
    quantity: int

class SupplierProductUpdate(BaseModel):
    cost_price: Optional[float] = None
    selling_price: Optional[float] = None
    quantity: Optional[int] = None


# ââ Helper âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

async def _supplier_detail(supplier: Supplier, db: AsyncSession) -> dict:
    sp_result = await db.execute(
        select(SupplierProduct, Product)
        .join(Product, SupplierProduct.product_id == Product.product_id)
        .where(SupplierProduct.supplier_id == supplier.supplier_id)
        .order_by(SupplierProduct.created_at.asc())
    )
    products = []
    for sp, product in sp_result.all():
        margin = ((sp.selling_price - sp.cost_price) / sp.cost_price * 100) if sp.cost_price > 0 else 0
        products.append({
            "sp_id": sp.sp_id,
            "product_id": product.product_id,
            "product_name": product.name,
            "category": product.category,
            "image_url": product.image_url,
            "cost_price": sp.cost_price,
            "selling_price": sp.selling_price,
            "quantity": sp.quantity,
            "margin_pct": round(margin, 1),
            "created_at": sp.created_at.isoformat() if sp.created_at else None,
        })
    return {
        "supplier_id": supplier.supplier_id,
        "name": supplier.name,
        "contact": supplier.contact,
        "notes": supplier.notes,
        "created_at": supplier.created_at.isoformat() if supplier.created_at else None,
        "products": products,
        "total_stock": sum(p["quantity"] for p in products),
        "total_products": len(products),
    }


# ââ Supplier CRUD âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

@router.get("")
async def list_suppliers(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    _require_master(user)
    try:
        result = await db.execute(select(Supplier).order_by(Supplier.created_at.desc()))
        suppliers = result.scalars().all()
        return [
            {
                "supplier_id": s.supplier_id,
                "name": s.name,
                "contact": s.contact,
                "notes": s.notes,
                "created_at": s.created_at.isoformat() if s.created_at else None,
                "products": [],
                "total_stock": 0,
                "total_products": 0,
            }
            for s in suppliers
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"List suppliers failed: {str(e)}")


@router.post("")
async def create_supplier(
    payload: SupplierCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    _require_master(user)
    s = Supplier(
        supplier_id=str(uuid.uuid4()),
        name=payload.name.strip(),
        contact=payload.contact,
        notes=payload.notes,
    )
    db.add(s)
    await db.commit()
    await db.refresh(s)
    return {
        "supplier_id": s.supplier_id,
        "name": s.name,
        "contact": s.contact,
        "notes": s.notes,
        "products": [],
        "total_stock": 0,
        "total_products": 0,
    }


@router.put("/{supplier_id}")
async def update_supplier(
    supplier_id: str,
    payload: SupplierUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    _require_master(user)
    result = await db.execute(select(Supplier).where(Supplier.supplier_id == supplier_id))
    s = result.scalar_one_or_none()
    if not s:
        raise HTTPException(status_code=404, detail="Supplier not found")
    if payload.name is not None:
        s.name = payload.name.strip()
    if payload.contact is not None:
        s.contact = payload.contact
    if payload.notes is not None:
        s.notes = payload.notes
    await db.commit()
    return await _supplier_detail(s, db)


@router.delete("/{supplier_id}")
async def delete_supplier(
    supplier_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    _require_master(user)
    result = await db.execute(select(Supplier).where(Supplier.supplier_id == supplier_id))
    s = result.scalar_one_or_none()
    if not s:
        raise HTTPException(status_code=404, detail="Supplier not found")
    await db.delete(s)
    await db.commit()
    return {"message": "Supplier deleted"}


# ââ Supplier Products âââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

@router.post("/{supplier_id}/products")
async def add_supplier_product(
    supplier_id: str,
    payload: SupplierProductCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    _require_master(user)
    sr = await db.execute(select(Supplier).where(Supplier.supplier_id == supplier_id))
    if not sr.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Supplier not found")
    pr = await db.execute(select(Product).where(Product.product_id == payload.product_id))
    product = pr.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    if payload.quantity < 0:
        raise HTTPException(status_code=400, detail="Quantity cannot be negative")

    sp = SupplierProduct(
        sp_id=str(uuid.uuid4()),
        supplier_id=supplier_id,
        product_id=payload.product_id,
        cost_price=payload.cost_price,
        selling_price=payload.selling_price,
        quantity=payload.quantity,
    )
    db.add(sp)
    await db.commit()
    await db.refresh(sp)
    margin = ((sp.selling_price - sp.cost_price) / sp.cost_price * 100) if sp.cost_price > 0 else 0
    return {
        "sp_id": sp.sp_id,
        "product_id": product.product_id,
        "product_name": product.name,
        "category": product.category,
        "cost_price": sp.cost_price,
        "selling_price": sp.selling_price,
        "quantity": sp.quantity,
        "margin_pct": round(margin, 1),
        "created_at": sp.created_at,
    }


@router.put("/{supplier_id}/products/{sp_id}")
async def update_supplier_product(
    supplier_id: str,
    sp_id: str,
    payload: SupplierProductUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    _require_master(user)
    result = await db.execute(
        select(SupplierProduct).where(
            SupplierProduct.sp_id == sp_id,
            SupplierProduct.supplier_id == supplier_id,
        )
    )
    sp = result.scalar_one_or_none()
    if not sp:
        raise HTTPException(status_code=404, detail="Not found")
    if payload.cost_price is not None:
        sp.cost_price = payload.cost_price
    if payload.selling_price is not None:
        sp.selling_price = payload.selling_price
    if payload.quantity is not None:
        if payload.quantity < 0:
            raise HTTPException(status_code=400, detail="Quantity cannot be negative")
        sp.quantity = payload.quantity
    await db.commit()
    return {"message": "Updated", "sp_id": sp_id, "quantity": sp.quantity}


@router.delete("/{supplier_id}/products/{sp_id}")
async def delete_supplier_product(
    supplier_id: str,
    sp_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    _require_master(user)
    result = await db.execute(
        select(SupplierProduct).where(
            SupplierProduct.sp_id == sp_id,
            SupplierProduct.supplier_id == supplier_id,
        )
    )
    sp = result.scalar_one_or_none()
    if not sp:
        raise HTTPException(status_code=404, detail="Not found")
    await db.delete(sp)
    await db.commit()
    return {"message": "Deleted"}


# ââ Available stock summary (used by Products page for blur feature) ââââââââââ
# Returns {product_id: total_qty} â no supplier names exposed

@router.get("/available-stock", include_in_schema=False)
async def available_stock_summary(db: AsyncSession = Depends(get_db)):
    """Public endpoint: total supplier stock per product. Supplier names NOT included."""
    result = await db.execute(
        select(SupplierProduct.product_id, func.sum(SupplierProduct.quantity).label("total"))
        .group_by(SupplierProduct.product_id)
    )
    return {row.product_id: int(row.total) for row in result.all()}
