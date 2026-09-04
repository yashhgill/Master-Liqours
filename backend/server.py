from fastapi import FastAPI, APIRouter, Depends, HTTPException, Response, Request, Cookie
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, delete
from sqlalchemy.orm import noload
from typing import Optional, List
from pydantic import BaseModel
from pathlib import Path
from dotenv import load_dotenv
import os
import logging

# Rate limiting
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from database import get_db
from models import User, UserSession, Staff, Product, UserRole, UserTier
from schemas import RegisterRequest, LoginRequest, UserResponse, ProductResponse
from auth_utils import (
    hash_password, verify_password, create_session, get_current_user
)

from routes_orders import router as orders_router
from routes_auth import router as auth_router
from routes_reviews import router as reviews_router
from routes_admin import router as admin_router
from routes_newsletter import router as newsletter_router
from routes_ai import router as ai_router
from routes_staff import router as staff_router
from routes_drink_reveal import router as drink_reveal_router
from routes_brands import public_router as brands_public_router, admin_router as brands_admin_router, seed_default_brands
from routes_uploads import router as uploads_router
from routes_admin_staff import router as admin_staff_router
from routes_push import router as push_router
from routes_bulk_orders import router as bulk_orders_router
from routes_google_auth import router as google_auth_router
from routes_suppliers import router as suppliers_router

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

from rate_limit import limiter

# Public API docs (/docs, /redoc, /openapi.json) expose the full API surface,
# including admin endpoints. Keep them on locally, off in production.
# Set ENABLE_DOCS=true in the environment to re-enable temporarily.
_docs_on = os.environ.get("ENABLE_DOCS", "").lower() in ("1", "true", "yes")

app = FastAPI(
    title="Masterliqours API",
    description="Premium liquor e-commerce platform API",
    version="1.0.0",
    docs_url="/docs" if _docs_on else None,
    redoc_url="/redoc" if _docs_on else None,
    openapi_url="/openapi.json" if _docs_on else None,
)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Global 500 handler — ensures CORS headers are present even on unhandled errors,
# otherwise the browser reports a misleading "CORS policy" error instead of the real 500.
@app.exception_handler(Exception)
async def _unhandled_exception_handler(request: Request, exc: Exception):
    import logging as _logging
    _logging.getLogger(__name__).exception("Unhandled error on %s %s: %s", request.method, request.url.path, exc)
    origin = request.headers.get("origin", "")
    headers = {}
    if origin in _origins:
        headers = {
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Credentials": "true",
        }
    return JSONResponse(status_code=500, content={"detail": "Internal server error"}, headers=headers)


from cache import cache_get as _cache_get, cache_set as _cache_set, cache_clear as _cache_clear
api_router = APIRouter(prefix="/api")

# FIX: Never use wildcard with allow_credentials=True — browsers block it
_cors_env = os.environ.get("CORS_ORIGINS", "").strip()
_hardcoded = [
    "https://masterliqours.my",
    "https://www.masterliqours.my",
    "http://localhost:3000",
    "http://localhost:3001",
]
_origins = _hardcoded if (not _cors_env or _cors_env == "*") else list(set(_hardcoded + [o.strip() for o in _cors_env.split(",") if o.strip()]))

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security headers on every API response (defense in depth alongside the
# frontend's _headers). Cheap, and closes common headers-based attacks.
@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    # The API returns JSON, never HTML to render, so a strict CSP is safe here.
    response.headers["Content-Security-Policy"] = "default-src 'none'; frame-ancestors 'none'"
    return response

# Explicit OPTIONS handler — CORSMiddleware can return 405 on preflight in some Starlette versions
@app.options("/{full_path:path}", include_in_schema=False)
async def cors_preflight(full_path: str, request: Request):
    origin = request.headers.get("origin", "")
    if not origin:
        return Response(status_code=200)
    return Response(
        status_code=200,
        headers={
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "Authorization, Content-Type, Accept, X-Requested-With, X-Maintenance-Key",
            "Access-Control-Max-Age": "86400",
            "Vary": "Origin",
        },
    )

@api_router.get("/health")
async def health_check():
    return {"status": "ok", "message": "Masterliqours API is running"}

@api_router.get("/")
async def root():
    return {"message": "Masterliqours API", "version": "1.0.0"}

@api_router.post("/register")
@limiter.limit("5/minute")
async def register(request: Request, body: RegisterRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == body.email))
    existing = result.scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail="Email sudah didaftarkan")

    # Resolve referral code → assign the owning staff to this customer
    assigned_staff_id = None
    stored_referral = None
    if body.referral_code and body.referral_code.strip():
        code = body.referral_code.strip().upper()
        staff_res = await db.execute(
            select(Staff).where(func.upper(Staff.referral_code) == code)
        )
        ref_staff = staff_res.scalar_one_or_none()
        if ref_staff:
            assigned_staff_id = ref_staff.staff_id
            stored_referral = ref_staff.referral_code
        # If the code doesn't match any staff we still let them register,
        # just without an assigned staff (avoids blocking signup on a typo).

    hashed = hash_password(body.password)
    user = User(
        email=body.email,
        password_hash=hashed,
        name=body.name,
        phone=body.phone,
        role=UserRole.CUSTOMER,
        tier=UserTier.REGULAR,
        referral_code=stored_referral,
        assigned_staff_id=assigned_staff_id,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    session_token = await create_session(db, user.user_id)
    return {"message": "Pendaftaran berjaya", "token": session_token, "user": UserResponse.model_validate(user, from_attributes=True)}

@api_router.post("/login")
@limiter.limit("10/minute")
async def login(request: Request, body: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()

    # Account lockout: after 5 consecutive failures, lock for 15 minutes. This
    # stops password brute-forcing even from rotating IPs (which the per-IP rate
    # limit alone wouldn't catch).
    from datetime import datetime, timedelta
    MAX_FAILS = 5
    LOCK_MINUTES = 15
    if user and getattr(user, "locked_until", None):
        if user.locked_until and user.locked_until > datetime.utcnow():
            mins = int((user.locked_until - datetime.utcnow()).total_seconds() / 60) + 1
            raise HTTPException(status_code=423, detail=f"Too many attempts. Try again in {mins} min.")

    if not user or not verify_password(body.password, user.password_hash):
        # Count the failure against a real account (don't reveal which emails exist).
        if user:
            user.failed_login_attempts = (user.failed_login_attempts or 0) + 1
            if user.failed_login_attempts >= MAX_FAILS:
                user.locked_until = datetime.utcnow() + timedelta(minutes=LOCK_MINUTES)
                user.failed_login_attempts = 0
            await db.commit()
        raise HTTPException(status_code=401, detail="Emel atau kata laluan tidak sah")

    if not user.is_active:
        raise HTTPException(status_code=403, detail="Akaun anda telah digantung")

    # Success — reset the failure counter and any lock.
    if user.failed_login_attempts or getattr(user, "locked_until", None):
        user.failed_login_attempts = 0
        user.locked_until = None
        await db.commit()

    session_token = await create_session(db, user.user_id)
    return {"message": "Log masuk berjaya", "token": session_token, "user": UserResponse.model_validate(user, from_attributes=True)}

@api_router.post("/logout")
async def logout(request: Request, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    # Actually invalidate the session so the token can't be reused
    auth_header = request.headers.get("authorization", "")
    token = auth_header.replace("Bearer ", "").strip() if auth_header else ""
    if token:
        await db.execute(delete(UserSession).where(UserSession.session_token == token))
        await db.commit()
    return {"message": "Log keluar berjaya"}

@api_router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return UserResponse.model_validate(current_user, from_attributes=True)

# FIX: noload("*") prevents async lazy-load hang on Product relationships
# Backward compat: omitting `page` returns a plain array (existing callers like admin dashboard)
# Passing `page` returns paginated object { products, total, page, limit, pages }
@api_router.get("/ping")
async def ping():
    """Keep-alive endpoint — called every 14 min to prevent Render cold start."""
    return {"ok": True}


@api_router.post("/admin/migrate-r2")
async def migrate_r2_images(
    maintenance_key: str,
    db: AsyncSession = Depends(get_db)
):
    """
    One-shot endpoint: copies all product images from the old public R2 CDN
    to Jojo's new R2 bucket. Also updates image_url in DB to new bucket URL.
    Safe to re-run — skips images already migrated.
    Protected by MAINTENANCE_KEY env var.
    """
    import httpx, re
    from botocore.exceptions import ClientError as BotoClientError

    expected_key = os.environ.get("MAINTENANCE_KEY", "")
    if not expected_key or maintenance_key != expected_key:
        raise HTTPException(status_code=403, detail="Invalid maintenance key")

    new_s3 = boto3.client(
        "s3",
        endpoint_url=os.environ.get("R2_ENDPOINT"),
        aws_access_key_id=os.environ.get("R2_ACCESS_KEY_ID"),
        aws_secret_access_key=os.environ.get("R2_SECRET_ACCESS_KEY"),
        region_name="auto"
    )
    new_bucket = os.environ.get("R2_BUCKET", "masterliqours-uploads")
    new_public = os.environ.get("R2_PUBLIC_URL", "").rstrip("/")

    result = await db.execute(
        select(Product.product_id, Product.name, Product.image_url)
        .where(Product.image_url.isnot(None), Product.image_url != "")
    )
    products = result.fetchall()

    def extract_key(url):
        m = re.search(r"r2\.dev/(.+)$", url)
        return m.group(1) if m else None

    def already_in_new(key):
        try:
            new_s3.head_object(Bucket=new_bucket, Key=key)
            return True
        except BotoClientError:
            return False

    ok = skip = fail = 0
    failed_names = []

    async with httpx.AsyncClient(timeout=20) as http:
        for pid, name, url in products:
            if new_public and url.startswith(new_public):
                skip += 1
                continue
            key = extract_key(url)
            if not key:
                skip += 1
                continue
            try:
                if already_in_new(key):
                    new_url = f"{new_public}/{key}"
                    await db.execute(text("UPDATE products SET image_url = :url WHERE product_id = :pid"), {"url": new_url, "pid": str(pid)})
                    skip += 1
                    continue
                resp = await http.get(url)
                if resp.status_code != 200:
                    fail += 1
                    failed_names.append(f"{name} ({resp.status_code})")
                    continue
                ct = resp.headers.get("content-type", "image/png")
                new_s3.put_object(Bucket=new_bucket, Key=key, Body=resp.content, ContentType=ct)
                new_url = f"{new_public}/{key}"
                await db.execute(text("UPDATE products SET image_url = :url WHERE product_id = :pid"), {"url": new_url, "pid": str(pid)})
                ok += 1
            except Exception as e:
                fail += 1
                failed_names.append(f"{name}: {str(e)[:50]}")

    await db.commit()
    return {"migrated": ok, "skipped": skip, "failed": fail, "failed_list": failed_names[:20]}


@api_router.get("/products")
async def get_products(
    category: Optional[str] = None,
    search: Optional[str] = None,
    page: Optional[int] = None,
    limit: int = 60,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    sort: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    limit = min(max(1, limit), 200)

    base_query = select(Product).options(noload("*")).where(Product.is_active == True)
    if category:
        base_query = base_query.where(Product.category == category)
    if search:
        base_query = base_query.where(Product.name.ilike(f"%{search}%"))
    # Price range filtering happens in SQL so it applies to the whole catalog,
    # not just the page already loaded in the browser.
    if min_price is not None:
        base_query = base_query.where(Product.price >= min_price)
    if max_price is not None:
        base_query = base_query.where(Product.price <= max_price)

    # Ordering
    # Popularity score: purchases weigh most, then cart-adds, then views.
    _popularity = (
        (func.coalesce(Product.sales_count, 0) * 4)
        + (func.coalesce(Product.cart_count, 0) * 2)
        + func.coalesce(Product.view_count, 0)
    )
    if sort == "price_asc":
        order_col = Product.price.asc()
    elif sort == "price_desc":
        order_col = Product.price.desc()
    elif sort == "name_asc":
        order_col = Product.name.asc()
    elif sort == "name_desc":
        order_col = Product.name.desc()
    elif sort in ("popular", "trending", "best_sellers"):
        # Most bought & viewed first, newest as a tie-breaker.
        order_col = _popularity.desc()
    elif sort == "newest":
        order_col = Product.created_at.desc()
    elif sort == "random":
        # Temporary: shuffle results (used on the homepage rows until there's
        # enough real popularity data to rank by). Swap the callers back to
        # 'popular' / 'newest' to return to the real algorithm.
        order_col = func.random()
    elif search:
        order_col = Product.name
    else:
        # Default: popularity so the front of the catalogue reflects real demand,
        # then newest for products with no signal yet.
        order_col = _popularity.desc()

    _tiebreak = Product.created_at.desc()

    # Always return the paginated envelope. A missing `page` just means page 1,
    # so there is no code path that dumps the entire catalogue in one response.
    page = max(1, page or 1)
    offset = (page - 1) * limit

    cache_key = f"products:page:{category}:{search}:{page}:{limit}:{min_price}:{max_price}:{sort}"
    # random sort must never be cached, or the first shuffle would be frozen.
    _use_cache = sort != "random"
    if _use_cache:
        cached = _cache_get(cache_key)
        if cached is not None:
            return cached

    # NOTE: these must run sequentially — a single AsyncSession cannot execute
    # two queries concurrently ("concurrent operations are not permitted").
    count_result = await db.execute(select(func.count()).select_from(base_query.subquery()))
    total = count_result.scalar() or 0
    data_result = await db.execute(base_query.order_by(order_col, _tiebreak).offset(offset).limit(limit))
    products = data_result.scalars().all()

    out = {
        "products": [ProductResponse.model_validate(p, from_attributes=True) for p in products],
        "total": total,
        "page": page,
        "limit": limit,
        "pages": -(-total // limit) if limit else 0,
    }
    if _use_cache:
        _cache_set(cache_key, out, ttl=300)
    return out

@api_router.get("/settings/public")
async def get_public_settings(db: AsyncSession = Depends(get_db)):
    """Public site settings the storefront needs (e.g. the boss WhatsApp number
    used for pre-order 'Contact Boss' links). Safe to expose."""
    from models import SiteSetting
    result = await db.execute(select(SiteSetting).where(SiteSetting.key.in_(["boss_whatsapp"])))
    rows = {r.key: r.value for r in result.scalars().all()}
    return {
        "boss_whatsapp": rows.get("boss_whatsapp", "60182085097"),
    }


class SettingUpdate(BaseModel):
    boss_whatsapp: Optional[str] = None


@api_router.put("/admin/settings")
async def update_settings(
    body: SettingUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Admin-only: edit site settings (currently the boss WhatsApp number)."""
    if current_user.role not in (UserRole.MASTER_ADMIN, UserRole.SUPER_ADMIN):
        raise HTTPException(status_code=403, detail="Admin only")
    from models import SiteSetting
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    for key, value in updates.items():
        # Normalise the phone: digits only, so wa.me links always work.
        if key == "boss_whatsapp":
            value = "".join(ch for ch in value if ch.isdigit())
        existing = await db.execute(select(SiteSetting).where(SiteSetting.key == key))
        row = existing.scalar_one_or_none()
        if row:
            row.value = value
        else:
            db.add(SiteSetting(key=key, value=value))
    await db.commit()
    return {"ok": True, "updated": list(updates.keys())}


@api_router.get("/products/all-names")
async def get_all_product_names(db: AsyncSession = Depends(get_db)):
    """Lightweight endpoint — returns id, name, price, category only. Used for admin dropdowns."""
    cache_key = "products:names"
    cached = _cache_get(cache_key)
    if cached is not None:
        return cached
    result = await db.execute(
        select(Product.product_id, Product.name, Product.price, Product.category, Product.is_active)
        .where(Product.is_active == True)
        .order_by(Product.name)
    )
    rows = result.all()
    out = [{"product_id": str(r.product_id), "name": r.name, "price": float(r.price), "category": r.category or "", "is_active": bool(r.is_active)} for r in rows]
    _cache_set(cache_key, out, ttl=60)
    return out


@api_router.post("/products/track")
async def track_product_event(
    product_id: str,
    event_type: str = "view",
    db: AsyncSession = Depends(get_db)
):
    """
    Record a lightweight popularity signal for a product. Called (fire-and-forget)
    by the storefront when a product page is viewed or added to cart. Purchases
    are tracked separately via sales_count at checkout.

    event_type: "view" | "add_to_cart" | "search"
    """
    # Map event → column. Unknown events are ignored quietly.
    col = {"view": "view_count", "search": "view_count", "add_to_cart": "cart_count"}.get(event_type)
    if not col:
        return {"ok": False}
    from sqlalchemy import update as _update
    try:
        await db.execute(
            _update(Product)
            .where(Product.product_id == product_id)
            .values({col: getattr(Product, col) + 1})
        )
        await db.commit()
    except Exception:
        await db.rollback()
        return {"ok": False}
    return {"ok": True}

@api_router.get("/products/{product_id}", response_model=ProductResponse)
async def get_product(product_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Product).options(noload("*")).where(Product.product_id == product_id)
    )
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Produk tidak dijumpai")
    return ProductResponse.model_validate(product, from_attributes=True)

@api_router.get("/my-unavailable-products")
async def my_unavailable_products(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns the set of product IDs the signed-in customer's ASSIGNED STAFF is out
    of stock on (has a stock row with quantity <= 0). The storefront uses this to
    grey those bottles out — the customer can't buy them directly but can message
    that staff member to arrange it.

    Products with no stock row for the staff are treated as AVAILABLE (untracked),
    so this only flags things the staff explicitly holds zero of.
    """
    from models import Stock
    staff_id = getattr(current_user, "assigned_staff_id", None)
    if not staff_id:
        return {"unavailable": []}

    result = await db.execute(
        select(Stock.product_id).where(
            Stock.staff_id == staff_id,
            Stock.quantity <= 0,
        )
    )
    ids = [str(r[0]) for r in result.all()]
    return {"unavailable": ids}

@api_router.get("/categories")
async def get_categories(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Product.category, func.count(Product.product_id).label("count"))
        .where(Product.is_active == True)
        .group_by(Product.category)
        .order_by(func.count(Product.product_id).desc())
    )
    categories = result.all()
    return [{"name": cat, "count": count} for cat, count in categories]

@api_router.get("/hero-banners")
async def get_hero_banners(db: AsyncSession = Depends(get_db)):
    from models import HeroBanner
    result = await db.execute(
        select(HeroBanner).where(HeroBanner.is_active == True).order_by(HeroBanner.order_position)
    )
    banners = result.scalars().all()
    return [
        {
            "id": str(b.banner_id),
            "title": b.title,
            "subtitle": b.subtitle,
            "background_image": b.background_image,
            "cta_text": b.cta_text,
            "cta_link": b.cta_link,
            "display_order": b.order_position,
        }
        for b in banners
    ]

@api_router.get("/flash-sales/active")
async def get_active_flash_sales(db: AsyncSession = Depends(get_db)):
    from models import FlashSale
    from datetime import datetime, timezone
    now = datetime.now(timezone.utc)
    # Use naive UTC for comparison (DB stores naive datetimes)
    now_naive = now.replace(tzinfo=None)
    result = await db.execute(
        select(FlashSale).where(
            FlashSale.is_active == True,
            FlashSale.start_time <= now_naive,
            FlashSale.end_time >= now_naive,
        )
    )
    sales = result.scalars().all()
    if not sales:
        return []
    # FIX: batch-fetch all products in one query instead of N+1 per sale
    product_ids = [s.product_id for s in sales]
    prod_result = await db.execute(
        select(Product).options(noload("*")).where(Product.product_id.in_(product_ids))
    )
    products_by_id = {p.product_id: p for p in prod_result.scalars().all()}
    out = []
    for s in sales:
        prod = products_by_id.get(s.product_id)
        if prod:
            sale_price = round(prod.price * (1 - s.discount_percentage / 100), 2)
            out.append({
                "flash_sale_id": str(s.sale_id),
                "product_id": str(s.product_id),
                "product_name": prod.name,
                "original_price": float(prod.price),
                "sale_price": sale_price,
                "discount_percentage": s.discount_percentage,
                "end_time": s.end_time.isoformat(),
                "image_url": prod.image_url,
                # Nested product object — Home.js passes sale.product to ProductCard
                "product": {
                    "product_id": str(prod.product_id),
                    "name": prod.name,
                    "price": sale_price,
                    "original_price": float(prod.price),
                    "category": prod.category,
                    "image_url": prod.image_url,
                    "is_active": prod.is_active,
                    "description": prod.description,
                    "is_preorder": prod.is_preorder,
                    "created_at": prod.created_at.isoformat() if prod.created_at else None,
                },
            })
    # Randomise the order each request so it's not always the same bottle first.
    import random as _random
    _random.shuffle(out)
    return out

@api_router.get("/users/{user_id}/rewards")
async def get_user_rewards(user_id: str, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if str(current_user.user_id) != user_id and current_user.role not in [UserRole.MASTER_ADMIN, UserRole.SUPER_ADMIN]:
        raise HTTPException(status_code=403, detail="Akses ditolak")
    result = await db.execute(select(User).where(User.user_id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Pengguna tidak dijumpai")
    return {
        "user_id": str(user.user_id),
        "tier": user.tier.value if user.tier else "bronze",
        "reward_points": user.reward_points or 0,
        "total_spent": float(user.total_spent or 0),
    }

# Include all routers
api_router.include_router(auth_router)
api_router.include_router(orders_router)
api_router.include_router(admin_router)
api_router.include_router(reviews_router)
api_router.include_router(newsletter_router)
api_router.include_router(ai_router)
api_router.include_router(staff_router)
api_router.include_router(drink_reveal_router)
api_router.include_router(brands_public_router)
api_router.include_router(brands_admin_router)
api_router.include_router(uploads_router)
api_router.include_router(admin_staff_router)
api_router.include_router(push_router)
api_router.include_router(bulk_orders_router)
api_router.include_router(google_auth_router)
api_router.include_router(suppliers_router)

app.include_router(api_router)

@app.on_event("startup")
async def startup():
    logger.info("Masterliqours API started!")
    try:
        from database import engine, AsyncSessionLocal
        from models import Base
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
            # Migrate new columns that create_all skips on existing tables
            from sqlalchemy import text as _text
            _migrations = [
                "ALTER TABLE products ADD COLUMN IF NOT EXISTS sales_count INTEGER DEFAULT 0 NOT NULL",
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0 NOT NULL",
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP",
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE NOT NULL",
                "ALTER TABLE products ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0 NOT NULL",
                "ALTER TABLE products ADD COLUMN IF NOT EXISTS cart_count INTEGER DEFAULT 0 NOT NULL",
                "ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_code_used VARCHAR(50)",
                "ALTER TABLE discount_codes ADD COLUMN IF NOT EXISTS is_first_order_only BOOLEAN DEFAULT FALSE",
            ]
            for _sql in _migrations:
                try:
                    await conn.execute(_text(_sql))
                except Exception as _me:
                    logger.warning("Migration skipped: %s", _me)
        async with AsyncSessionLocal() as db:
            n = await seed_default_brands(db)
            if n:
                logger.info(f"Seeded {n} default brands")
    except Exception as e:
        logger.exception("Startup table/seed failed: %s", e)
    try:
        from database import AsyncSessionLocal
        from sqlalchemy import text as sa_text
        async with AsyncSessionLocal() as _db:
            _res = await _db.execute(sa_text("SELECT COUNT(*) FROM products WHERE is_active = TRUE"))
            _count = _res.scalar() or 0
            if _count == 0:
                _csv = os.path.join(os.path.dirname(__file__), "data", "Masterliqours_Pricing_List.csv")
                if os.path.exists(_csv):
                    logger.info("No products found — importing catalog from CSV...")
                    from import_real_catalog import run_import
                    _r = await run_import(_csv)
                    logger.info(f"Import done: {_r}")
                else:
                    logger.warning(f"CSV not found at: {_csv}")
            else:
                logger.info(f"Products already in DB: {_count}")
    except Exception as e:
        logger.exception("Startup product import failed: %s", e)

    # Warm the connection pool so the first real request doesn't pay the
    # asyncpg connection-setup cost (noticeable on a cold Render instance).
    try:
        from database import AsyncSessionLocal
        from sqlalchemy import text as _wt
        async with AsyncSessionLocal() as _wdb:
            await _wdb.execute(_wt("SELECT 1"))
        logger.info("DB connection pool warmed")
    except Exception as e:
        logger.warning("Pool warm-up skipped: %s", e)

    logger.info("All routes loaded OK")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
