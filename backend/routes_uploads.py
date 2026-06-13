"""Uploads + CSV bulk import for products.

Uploads go to Cloudflare R2 (S3-compatible) in production.
If R2 env vars are missing, falls back to local disk for dev convenience.
"""
import os
import csv
import io
import uuid
from pathlib import Path
from typing import List
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from database import get_db
from models import Product, User, UserRole
from auth_utils import get_current_user

router = APIRouter(prefix="/admin", tags=["Admin · Uploads"])

# Local fallback dir (only used when R2 is not configured)
UPLOAD_DIR = Path(os.environ.get("UPLOAD_DIR", "/tmp/uploads"))
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_EXT = {".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg"}
ALLOWED_CT = {
    ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
    ".webp": "image/webp", ".gif": "image/gif", ".svg": "image/svg+xml",
}
MAX_BYTES = 8 * 1024 * 1024  # 8 MB

# --- R2 client (lazy) ---
def _get_r2_config():
    """Read R2 config fresh each call so Render env vars are always picked up."""
    account_id = os.environ.get("R2_ACCOUNT_ID", "")
    access_key = os.environ.get("R2_ACCESS_KEY_ID", "")
    secret_key = os.environ.get("R2_SECRET_ACCESS_KEY", "")
    bucket = os.environ.get("R2_BUCKET", "")
    public_url = (os.environ.get("R2_PUBLIC_URL") or "").rstrip("/")
    enabled = all([account_id, access_key, secret_key, bucket, public_url])
    return account_id, access_key, secret_key, bucket, public_url, enabled

def _r2_client():
    """Always create fresh client — never cache, so env vars always used."""
    account_id, access_key, secret_key, _, _, _ = _get_r2_config()
    import boto3
    from botocore.config import Config
    return boto3.client(
        "s3",
        endpoint_url=f"https://{account_id}.r2.cloudflarestorage.com",
        aws_access_key_id=access_key,
        aws_secret_access_key=secret_key,
        region_name="auto",
        config=Config(signature_version="s3v4"),
    )


async def _require_admin(user: User):
    if user.role not in (UserRole.SUPER_ADMIN, UserRole.MASTER_ADMIN):
        raise HTTPException(status_code=403, detail="Admin only boss")


@router.post("/upload", status_code=201)
async def upload_file(
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
):
    """Upload an image. Returns {url} to embed in product/banner/brand records.

    R2 in production -> returns absolute https URL.
    Local fallback in dev -> returns relative `/api/uploads/<name>`.
    """
    await _require_admin(user)

    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_EXT:
        raise HTTPException(status_code=400, detail=f"Format tak support: {ext or 'unknown'}")

    body = await file.read()
    if len(body) > MAX_BYTES:
        raise HTTPException(status_code=400, detail="File too big lah (max 8 MB)")

    new_name = f"{uuid.uuid4().hex}{ext}"

    _, _, _, R2_BUCKET, R2_PUBLIC_URL, R2_ENABLED = _get_r2_config()
    if R2_ENABLED:
        try:
            _r2_client().put_object(
                Bucket=R2_BUCKET,
                Key=new_name,
                Body=body,
                ContentType=ALLOWED_CT.get(ext, "application/octet-stream"),
                CacheControl="public, max-age=31536000, immutable",
            )
        except Exception as e:  # noqa: BLE001
            raise HTTPException(status_code=500, detail=f"R2 upload failed: {str(e)[:200]}") from e
        return {"url": f"{R2_PUBLIC_URL}/{new_name}", "filename": new_name, "size": len(body), "storage": "r2"}

    # Local fallback
    dest = UPLOAD_DIR / new_name
    dest.write_bytes(body)
    return {"url": f"/api/uploads/{new_name}", "filename": new_name, "size": len(body), "storage": "local"}





@router.get("/presign")
async def get_presigned_url(
    filename: str,
    user: User = Depends(get_current_user),
):
    """Generate a presigned URL so the browser can upload directly to R2.
    Returns {upload_url, public_url}. Frontend PUTs the file to upload_url,
    then saves public_url to the DB record — no backend proxy needed.
    """
    await _require_admin(user)

    _, _, _, R2_BUCKET, R2_PUBLIC_URL, R2_ENABLED = _get_r2_config()
    if not R2_ENABLED:
        raise HTTPException(status_code=503, detail="R2 not configured on this server")

    ext = Path(filename).suffix.lower()
    if ext not in ALLOWED_EXT:
        raise HTTPException(status_code=400, detail=f"Format tak support: {ext}")

    key = f"{uuid.uuid4().hex}{ext}"

    presigned = _r2_client().generate_presigned_url(
        "put_object",
        Params={
            "Bucket": R2_BUCKET,
            "Key": key,
            "ContentType": ALLOWED_CT.get(ext, "application/octet-stream"),
        },
        ExpiresIn=300,  # 5 minutes
        HttpMethod="PUT",
    )

    return {
        "upload_url": presigned,
        "public_url": f"{R2_PUBLIC_URL}/{key}",
        "key": key,
    }


@router.get("/r2-status")
async def r2_status(user: User = Depends(get_current_user)):
    """Check R2 config status — for admin debugging."""
    await _require_admin(user)
    _, _, _, bucket, public_url, enabled = _get_r2_config()
    return {
        "r2_enabled": enabled,
        "bucket": bucket if enabled else "not configured",
        "public_url": public_url if enabled else "not configured",
        "account_id_set": bool(os.environ.get("R2_ACCOUNT_ID")),
        "access_key_set": bool(os.environ.get("R2_ACCESS_KEY_ID")),
        "secret_key_set": bool(os.environ.get("R2_SECRET_ACCESS_KEY")),
    }


class BulkDeleteRequest(BaseModel):
    product_ids: List[str]

@router.post("/products/bulk-delete")
async def bulk_delete_products(
    data: BulkDeleteRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete multiple products at once (Super Admin / Master Admin)."""
    await _require_admin(user)

    if not data.product_ids:
        raise HTTPException(status_code=400, detail="No products selected")

    result = await db.execute(select(Product).where(Product.product_id.in_(data.product_ids)))
    products = result.scalars().all()

    deleted = len(products)
    for p in products:
        await db.delete(p)

    await db.commit()
    return {"message": f"Deleted {deleted} product(s)", "deleted": deleted}


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
