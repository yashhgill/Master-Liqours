from fastapi import FastAPI, APIRouter, Depends, HTTPException, Response, Request, Cookie
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import Optional, List
from pathlib import Path
from dotenv import load_dotenv
import os
import logging

# Local imports
from database import get_db
from models import User, UserSession, Staff, Product, UserRole, UserTier
from schemas import RegisterRequest, LoginRequest, UserResponse, ProductResponse
from auth_utils import (
    hash_password, verify_password, create_session, get_current_user
)

# Import route modules
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

# Load environment
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# FastAPI app
app = FastAPI(
    title="Masterliqours API",
    description="Premium liquor e-commerce platform API",
    version="1.0.0"
)
api_router = APIRouter(prefix="/api")

# CORS — always allow masterliqours.my regardless of env var
_cors_env = os.environ.get("CORS_ORIGINS", "*").strip()
_hardcoded = [
    "https://masterliqours.my",
    "https://www.masterliqours.my",
    "http://localhost:3000",
    "http://localhost:3001",
]
if _cors_env == "*":
    _origins = ["*"]
else:
    _env_list = [o.strip() for o in _cors_env.split(",") if o.strip()]
    _origins = list(set(_hardcoded + _env_list))

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =============================================================================
# AUTHENTICATION ROUTES
# =============================================================================

@api_router.post("/auth/register", response_model=UserResponse)
async def register(data: RegisterRequest, db: AsyncSession = Depends(get_db)):
    """Register new user dengan email/password"""
    result = await db.execute(select(User).where(User.email == data.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email sudah digunakan")
    
    # Assign staff (round-robin or by referral code)
    staff_id = None
    if data.referral_code:
        result = await db.execute(
            select(Staff).where(Staff.referral_code == data.referral_code)
        )
        staff = result.scalar_one_or_none()
        if staff:
            staff_id = staff.staff_id
    
    if not staff_id:
        # Round-robin
        result = await db.execute(
            select(Staff, func.count(User.user_id).label('count'))
            .outerjoin(User, User.assigned_staff_id == Staff.staff_id)
            .group_by(Staff.staff_id)
            .order_by(func.count(User.user_id).asc())
            .limit(1)
        )
        staff_row = result.first()
        if staff_row:
            staff_id = staff_row[0].staff_id
    
    user = User(
        email=data.email,
        name=data.name,
        password_hash=hash_password(data.password),
        phone=data.phone,
        assigned_staff_id=staff_id,
        role=UserRole.CUSTOMER
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user

@api_router.post("/auth/login")
async def login(
    data: LoginRequest,
    response: Response,
    db: AsyncSession = Depends(get_db)
):
    """Login dengan email/password"""
    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()
    
    if not user or not user.password_hash or not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Email atau password salah")
    
    session_token = await create_session(db, user.user_id)
    
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=7 * 24 * 60 * 60,
        path="/"
    )
    
    # session_token returned in body so the frontend can use header-based auth
    # (Authorization: Bearer) — works cross-domain where third-party cookies are blocked.
    return {"message": "Login berjaya!", "session_token": session_token, "user": UserResponse.model_validate(user, from_attributes=True)}

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(user: User = Depends(get_current_user)):
    """Get current user info"""
    return user

@api_router.post("/auth/logout")
async def logout(
    response: Response,
    session_token: Optional[str] = Cookie(None),
    db: AsyncSession = Depends(get_db)
):
    """Logout user"""
    if session_token:
        result = await db.execute(
            select(UserSession).where(UserSession.session_token == session_token)
        )
        session = result.scalar_one_or_none()
        if session:
            await db.delete(session)
            await db.commit()
    
    response.delete_cookie("session_token", path="/")
    return {"message": "Logout berjaya"}

# =============================================================================
# PRODUCT ROUTES
# =============================================================================

@api_router.get("/products", response_model=List[ProductResponse])
async def get_products(
    category: Optional[str] = None,
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """Get all active products"""
    query = select(Product).where(Product.is_active == True)
    
    if category:
        query = query.where(Product.category == category)
    if search:
        query = query.where(Product.name.ilike(f"%{search}%"))
    
    result = await db.execute(query.order_by(Product.created_at.desc()))
    return result.scalars().all()

@api_router.get("/products/{product_id}", response_model=ProductResponse)
async def get_product(product_id: str, db: AsyncSession = Depends(get_db)):
    """Get single product"""
    result = await db.execute(select(Product).where(Product.product_id == product_id))
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Produk tidak dijumpai")
    return product

@api_router.get("/categories")
async def get_categories(db: AsyncSession = Depends(get_db)):
    """Get all product categories"""
    result = await db.execute(
        select(Product.category).distinct().where(Product.is_active == True)
    )
    return {"categories": [row[0] for row in result.all()]}

# =============================================================================
# HERO BANNERS & FLASH SALES (Public)
# =============================================================================

@api_router.get("/hero-banners")
async def get_active_hero_banners(db: AsyncSession = Depends(get_db)):
    """Get active hero banners untuk homepage"""
    from models import HeroBanner
    result = await db.execute(
        select(HeroBanner)
        .where(HeroBanner.is_active == True)
        .order_by(HeroBanner.order_position.asc())
    )
    return result.scalars().all()

@api_router.get("/flash-sales/active")
async def get_active_flash_sales(db: AsyncSession = Depends(get_db)):
    """Get active flash sales sekarang"""
    from sqlalchemy import and_
    from models import FlashSale
    from datetime import datetime
    
    now = datetime.utcnow()
    result = await db.execute(
        select(FlashSale, Product)
        .join(Product, FlashSale.product_id == Product.product_id)
        .where(and_(
            FlashSale.is_active == True,
            FlashSale.start_time <= now,
            FlashSale.end_time > now,
            Product.is_active == True
        ))
    )
    
    sales = []
    for sale, product in result.all():
        discounted_price = product.price * (1 - sale.discount_percentage / 100)
        sales.append({
            "sale_id": sale.sale_id,
            "product": product,
            "original_price": product.price,
            "discounted_price": round(discounted_price, 2),
            "discount_percentage": sale.discount_percentage,
            "end_time": sale.end_time
        })
    
    return sales

# =============================================================================
# USER ROUTES
# =============================================================================

@api_router.get("/users/rewards")
async def get_my_rewards(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get user's reward points history"""
    from models import Reward
    result = await db.execute(
        select(Reward)
        .where(Reward.user_id == user.user_id)
        .order_by(Reward.created_at.desc())
    )
    return result.scalars().all()

# Include all route modules
api_router.include_router(orders_router)
api_router.include_router(admin_router)
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

# Health endpoint (used by Fly.io healthcheck)
@api_router.get("/health")
async def api_health_check():
    return {"status": "healthy", "service": "masterliqours-api"}

# Include main router
app.include_router(api_router)

# Serve uploaded files
from fastapi.staticfiles import StaticFiles
import os as _os
_UPLOAD_DIR = _os.environ.get("UPLOAD_DIR", "/tmp/uploads")
_os.makedirs(_UPLOAD_DIR, exist_ok=True)
app.mount("/api/uploads", StaticFiles(directory=_UPLOAD_DIR), name="uploads")

@app.get("/")
async def root():
    return {
        "message": "Masterliqours API - Selamat datang!",
        "version": "1.0.0",
        "domain": "masterliqours.my"
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "masterliqours-api"}

# Startup event
@app.on_event("startup")
async def startup():
    logger.info("🚀 Masterliqours API started!")
    logger.info("📦 Domain: masterliqours.my")
    # Ensure new tables exist + seed default brands
    try:
        from database import engine, AsyncSessionLocal
        from models import Base
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        async with AsyncSessionLocal() as db:
            n = await seed_default_brands(db)
            if n:
                logger.info(f"🍷 Seeded {n} default brands")
    except Exception as e:
        logger.exception("Startup table/seed failed: %s", e)
    logger.info("✅ All routes loaded")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
