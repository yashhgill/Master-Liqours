"""Uploads + CSV bulk import for products."""
import os
import csv
import io
import uuid
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from database import get_db
from models import Product, User, UserRole
from auth_utils import get_current_user

router = APIRouter(prefix="/admin", tags=["Admin · Uploads"])

UPLOAD_DIR = Path(os.environ.get("UPLOAD_DIR", "/app/backend/uploads"))
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_EXT = {".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg"}
MAX_BYTES = 8 * 1024 * 1024  # 8 MB


async def _require_admin(user: User):
    if user.role not in (UserRole.SUPER_ADMIN, UserRole.MASTER_ADMIN):
        raise HTTPException(status_code=403, detail="Admin only boss")


@router.post("/upload", status_code=201)
async def upload_file(
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
):
    """Upload an image. Returns {url} to embed in product/banner/brand records."""
    await _require_admin(user)

    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_EXT:
        raise HTTPException(status_code=400, detail=f"Format tak support: {ext or 'unknown'}")

    body = await file.read()
    if len(body) > MAX_BYTES:
        raise HTTPException(status_code=400, detail="File too big lah (max 8 MB)")

    new_name = f"{uuid.uuid4().hex}{ext}"
    dest = UPLOAD_DIR / new_name
    dest.write_bytes(body)

    return {"url": f"/api/uploads/{new_name}", "filename": new_name, "size": len(body)}


@router.post("/products/bulk-import")
async def bulk_import_products(
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """CSV bulk import. Columns: name, price, category, description, image_url, stock_quantity (optional)."""
    await _require_admin(user)

    if not (file.filename or "").lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="CSV file only boss")

    body = (await file.read()).decode("utf-8", errors="replace")
    reader = csv.DictReader(io.StringIO(body))

    required = {"name", "price", "category"}
    if not reader.fieldnames or not required.issubset({c.strip().lower() for c in reader.fieldnames}):
        raise HTTPException(status_code=400, detail=f"CSV must have columns: {', '.join(sorted(required))}, description, image_url")

    created, skipped, errors = 0, 0, []
    for idx, row in enumerate(reader, start=2):
        try:
            row_l = {k.strip().lower(): (v or "").strip() for k, v in row.items() if k}
            name = row_l.get("name")
            price_str = row_l.get("price")
            category = row_l.get("category")
            if not name or not price_str or not category:
                skipped += 1
                continue
            price = float(price_str)

            # Skip if already exists by name
            existing = await db.execute(select(Product).where(Product.name == name))
            if existing.scalar_one_or_none():
                skipped += 1
                continue

            p = Product(
                name=name,
                price=price,
                category=category,
                description=row_l.get("description") or "",
                image_url=row_l.get("image_url") or "",
                is_active=True,
            )
            db.add(p)
            created += 1
        except Exception as e:  # noqa: BLE001
            errors.append({"row": idx, "error": str(e)[:200]})

    await db.commit()
    return {"created": created, "skipped": skipped, "errors": errors}
