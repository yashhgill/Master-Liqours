from fastapi import FastAPI, APIRouter, Depends, HTTPException, Response, Request, Cookie
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, delete
from sqlalchemy.orm import noload
from typing import Optional, List
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

limiter = Limiter(key_func=get_remote_address, default_limits=[])

app = FastAPI(title="Masterliqours API", description="Premium liquor e-commerce platform API", version="1.0.0")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

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
    hashed = hash_password(body.password)
    user = User(
        email=body.email,
        password_hash=hashed,
        full_name=body.full_name,
        phone=body.phone,
        role=UserRole.CUSTOMER,
        tier=UserTier.BRONZE,
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
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Emel atau kata laluan tidak sah")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Akaun anda telah digantung")
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
@api_router.get("/products")
async def get_products(
    category: Optional[str] = None,
    search: Optional[str] = None,
    page: int = 1,
    limit: int = 60,
    db: AsyncSession = Depends(get_db)
):
    limit = min(max(1, limit), 200)  # clamp between 1 and 200
    page = max(1, page)
    offset = (page - 1) * limit

    base_query = select(Product).options(noload("*")).where(Product.is_active == True)
    if category:
        base_query = base_query.where(Product.category == category)
    if search:
        base_query = base_query.where(Product.name.ilike(f"%{search}%"))

    # Total count for pagination
    count_result = await db.execute(select(func.count()).select_from(base_query.subquery()))
    total = count_result.scalar() or 0

    result = await db.execute(base_query.order_by(Product.created_at.desc()).offset(offset).limit(limit))
    products = result.scalars().all()
    return {
        "products": [ProductResponse.model_validate(p, from_attributes=True) for p in products],
        "total": total,
        "page": page,
        "limit": limit,
        "pages": -(-total // limit),  # ceiling division
    }

@api_router.get("/products/{product_id}", response_model=ProductResponse)
async def get_product(product_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Product).options(noload("*")).where(Product.product_id == product_id)
    )
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Produk tidak dijumpai")
    return ProductResponse.model_validate(product, from_attributes=True)

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
        select(HeroBanner).where(HeroBanner.is_active == True).order_by(HeroBanner.display_order)
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
            "display_order": b.display_order,
        }
        for b in banners
    ]

@api_router.get("/flash-sales/active")
async def get_active_flash_sales(db: AsyncSession = Depends(get_db)):
    from models import FlashSale
    from datetime import datetime, timezone
    now = datetime.now(timezone.utc)
    result = await db.execute(
        select(FlashSale).where(
            FlashSale.is_active == True,
            FlashSale.start_time <= now,
            FlashSale.end_time >= now,
        )
    )
    sales = result.scalars().all()
    out = []
    for s in sales:
        prod_result = await db.execute(
            select(Product).options(noload("*")).where(Product.product_id == s.product_id)
        )
        prod = prod_result.scalar_one_or_none()
        if prod:
            out.append({
                "flash_sale_id": str(s.flash_sale_id),
                "product_id": str(s.product_id),
                "product_name": prod.name,
                "original_price": float(prod.price),
                "sale_price": float(s.sale_price),
                "discount_percentage": s.discount_percentage,
                "end_time": s.end_time.isoformat(),
                "quantity_available": s.quantity_available,
                "quantity_sold": s.quantity_sold,
            })
    return out

@api_router.get("/users/{user_id}/rewards")
async def get_user_rewards(user_id: str, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if str(current_user.user_id) != user_id and current_user.role not in [UserRole.ADMIN, UserRole.SUPER_ADMIN]:
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
    logger.info("All routes loaded OK")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
