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
from models import User, UserSession, Staff, Product, UserRole, UserTier, SupplierProduct, OrderItem
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
from routes_suppliers import router as suppliers_router
from routes_ai_staff import router as ai_staff_router

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

# CORS — always allow masterliqours.my + localhost regardless of env var
_cors_env = os.environ.get("CORS_ORIGINS", "").strip()
_origins = [
    "https://masterliqours.my",
    "https://www.masterliqours.my",
    "http://localhost:3000",
    "http://localhost:3001",
]
if _cors_env:
    for o in _cors_env.split(","):
        o = o.strip()
        if o and o not in _origins:
            _origins.append(o)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=3600,
)

@api_router.post("/auth/register", response_model=UserResponse)
async def register(data: RegisterRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == data.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email sudah digunakan")
    staff_id = None
    if data.referral_code:
        result = await db.execute(select(Staff).where(Staff.referral_code == data.referral_code))
        staff = result.scalar_one_or_none()
        if staff:
            staff_id = staff.staff_id
    if not staff_id:
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
        email=data.email, name=data.name,
        password_hash=hash_password(data.password),
        phone=data.phone, assigned_staff_id=staff_id, role=UserRole.CUSTOMER
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user

@api_router.post("/auth/login")
async def login(data: LoginRequest, response: Response, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()
    if not user or not user.password_hash or not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Email atau password salah")
    session_token = await create_session(db, user.user_id)
    response.set_cookie(key="session_token", value=session_token, httponly=True, secure=True, samesite="none", max_age=7*24*60*60, path="/")
    return {"message": "Login berjaya!", "session_token": session_token, "user": UserResponse.model_validate(user, from_attributes=True)}

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(user: User = Depends(get_current_user)):
    return user

@api_router.post("/auth/logout")
async def logout(response: Response, session_token: Optional[str] = Cookie(None), db: AsyncSession = Depends(get_db)):
    if session_token:
        result = await db.execute(select(UserSession).where(UserSession.session_token == session_token))
        session = result.scalar_one_or_none()
        if session:
            await db.delete(session)
            await db.commit()
    response.delete_cookie("session_token", path="/")
    return {"message": "Logout berjaya"}

async def _products_with_stock(db, category=None, search=None, sort=None):
    from datetime import datetime, timedelta

    query = select(Product).where(Product.is_active == True)
    if category:
        query = query.where(Product.category == category)
    if search:
        query = query.where(Product.name.ilike(f"%{search}%"))

    result = await db.execute(query)
    products = result.scalars().all()

    # Stock per product (from supplier_products)
    stock_r = await db.execute(
        select(SupplierProduct.product_id, func.sum(SupplierProduct.quantity).label("total"))
        .group_by(SupplierProduct.product_id)
    )
    stock_map = {row.product_id: int(row.total) for row in stock_r.all()}

    # Also check staff stocks table for backward compatibility
    try:
        from models import Stock
        staff_stock_r = await db.execute(
            select(Stock.product_id, func.sum(Stock.quantity).label("total"))
            .group_by(Stock.product_id)
        )
        for row in staff_stock_r.all():
            existing = stock_map.get(row.product_id, 0)
            stock_map[row.product_id] = max(existing, int(row.total))
    except Exception:
        pass

    # Sales in last 90 days (recent sales weighted more)
    now = datetime.utcnow()
    cutoff_30 = now - timedelta(days=30)
    cutoff_90 = now - timedelta(days=90)

    sales_r = await db.execute(
        select(OrderItem.product_id, func.sum(OrderItem.quantity).label("sold"))
        .group_by(OrderItem.product_id)
    )
    sales_map = {row.product_id: int(row.sold) for row in sales_r.all()}

    recent_sales_r = await db.execute(
        select(OrderItem.product_id, func.sum(OrderItem.quantity).label("sold"))
        .join(Order, OrderItem.order_id == Order.order_id)
        .where(Order.created_at >= cutoff_30)
        .group_by(OrderItem.product_id)
    )
    recent_sales_map = {row.product_id: int(row.sold) for row in recent_sales_r.all()}

    # Product events (views, search clicks, add-to-cart) in last 30 days
    events_map = {}
    try:
        from models import ProductEvent
        events_r = await db.execute(
            select(ProductEvent.product_id, func.count(ProductEvent.event_id).label("hits"))
            .where(ProductEvent.created_at >= cutoff_30)
            .group_by(ProductEvent.product_id)
        )
        events_map = {row.product_id: int(row.hits) for row in events_r.all()}
    except Exception:
        pass

    out = []
    for p in products:
        total_sales = sales_map.get(p.product_id, 0)
        recent_sales = recent_sales_map.get(p.product_id, 0)
        event_hits = events_map.get(p.product_id, 0)
        avail = stock_map.get(p.product_id, -1)

        # ── Relevance Score ──────────────────────────────────────────
        # Components (all weighted):
        # 1. Total sales (lifetime signal of popularity)
        # 2. Recent sales last 30d (recency boost × 3)
        # 3. Event interactions last 30d (search/view/click × 1)
        # 4. Out of stock gets buried (score × 0)
        # 5. Flash sale active → small boost (customers like deals)
        score = (total_sales * 1.0) + (recent_sales * 3.0) + (event_hits * 1.0)
        if avail == 0:
            score = -1  # OOS always goes to bottom
        if p.original_price and p.original_price > p.price:
            score += 5  # Active discount boost

        out.append({
            "product_id": p.product_id,
            "name": p.name,
            "price": p.price,
            "description": p.description,
            "category": p.category,
            "image_url": p.image_url,
            "is_active": p.is_active,
            "is_preorder": p.is_preorder,
            "original_price": p.original_price,
            "staff_id": p.staff_id,
            "created_at": p.created_at.isoformat() if p.created_at else None,
            "available_stock": avail,
            "sales_count": total_sales,
            "_score": score,
        })

    # Default sort: by relevance score (descending), with new arrivals as tiebreaker
    if sort == "trending":
        out.sort(key=lambda x: x["_score"], reverse=True)
    elif sort == "price_asc":
        out.sort(key=lambda x: x["price"])
    elif sort == "price_desc":
        out.sort(key=lambda x: x["price"], reverse=True)
    elif sort == "name_asc":
        out.sort(key=lambda x: x["name"])
    elif sort == "name_desc":
        out.sort(key=lambda x: x["name"], reverse=True)
    elif sort == "newest":
        out.sort(key=lambda x: x["created_at"] or "", reverse=True)
    else:
        # Default: relevance — bestsellers first, OOS last
        out.sort(key=lambda x: (x["_score"], x["created_at"] or ""), reverse=True)

    # Remove internal score from response
    for item in out:
        item.pop("_score", None)

    return out

@api_router.get("/products")
async def get_products(category: Optional[str] = None, search: Optional[str] = None, sort: Optional[str] = None, db: AsyncSession = Depends(get_db)):
    return await _products_with_stock(db, category=category, search=search, sort=sort)

@api_router.get("/products/trending")
async def get_trending_products(limit: int = 12, db: AsyncSession = Depends(get_db)):
    products = await _products_with_stock(db, sort="trending")
    return [p for p in products if p["available_stock"] != 0][:limit]


@api_router.post("/products/track")
async def track_product_event(
    product_id: str,
    event_type: str = "view",
    db: AsyncSession = Depends(get_db),
):
    """Fire-and-forget endpoint — frontend calls this on view/search_click/add_to_cart.
    Never blocks the user; errors are silently swallowed."""
    try:
        from models import ProductEvent
        if event_type not in ("view", "search_click", "add_to_cart"):
            return {"ok": False}
        event = ProductEvent(
            product_id=product_id,
            event_type=event_type,
        )
        db.add(event)
        await db.commit()
    except Exception:
        pass
    return {"ok": True}

@api_router.get("/products/{product_id}")
async def get_product(product_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Product).where(Product.product_id == product_id))
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Produk tidak dijumpai")
    stock_r = await db.execute(select(func.sum(SupplierProduct.quantity)).where(SupplierProduct.product_id == product_id))
    total_stock = stock_r.scalar()
    sales_r = await db.execute(select(func.sum(OrderItem.quantity)).where(OrderItem.product_id == product_id))
    sales_count = sales_r.scalar() or 0
    return {"product_id": product.product_id, "name": product.name, "price": product.price, "description": product.description, "category": product.category, "image_url": product.image_url, "is_active": product.is_active, "is_preorder": product.is_preorder, "original_price": product.original_price, "staff_id": product.staff_id, "created_at": product.created_at, "available_stock": int(total_stock) if total_stock is not None else -1, "sales_count": sales_count}

@api_router.get("/categories")
async def get_categories(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Product.category).distinct().where(Product.is_active == True))
    return {"categories": [row[0] for row in result.all()]}

@api_router.get("/hero-banners")
async def get_active_hero_banners(db: AsyncSession = Depends(get_db)):
    from models import HeroBanner
    result = await db.execute(select(HeroBanner).where(HeroBanner.is_active == True).order_by(HeroBanner.order_position.asc()))
    return result.scalars().all()

@api_router.get("/flash-sales/active")
async def get_active_flash_sales(db: AsyncSession = Depends(get_db)):
    from sqlalchemy import and_
    from models import FlashSale
    from datetime import datetime
    now = datetime.utcnow()
    result = await db.execute(select(FlashSale, Product).join(Product, FlashSale.product_id == Product.product_id).where(and_(FlashSale.is_active == True, FlashSale.start_time <= now, FlashSale.end_time > now, Product.is_active == True)))
    sales = []
    for sale, product in result.all():
        discounted_price = product.price * (1 - sale.discount_percentage / 100)
        sales.append({"sale_id": sale.sale_id, "product": product, "original_price": product.price, "discounted_price": round(discounted_price, 2), "discount_percentage": sale.discount_percentage, "end_time": sale.end_time})
    return sales

@api_router.get("/users/rewards")
async def get_my_rewards(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    from models import Reward
    result = await db.execute(select(Reward).where(Reward.user_id == user.user_id).order_by(Reward.created_at.desc()))
    return result.scalars().all()

api_router.include_router(auth_router)
api_router.include_router(reviews_router)
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
api_router.include_router(suppliers_router)
api_router.include_router(ai_staff_router)

@api_router.get("/health")
async def api_health_check():
    return {"status": "healthy", "service": "masterliqours-api"}

app.include_router(api_router)

from fastapi.staticfiles import StaticFiles
import os as _os
_UPLOAD_DIR = _os.environ.get("UPLOAD_DIR", "/tmp/uploads")
_os.makedirs(_UPLOAD_DIR, exist_ok=True)
app.mount("/api/uploads", StaticFiles(directory=_UPLOAD_DIR), name="uploads")

@app.get("/")
async def root():
    return {"message": "Masterliqours API", "version": "1.0.0"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "masterliqours-api"}

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
    # One-time category fix: re-import if products still have old category
    try:
        from sqlalchemy import text as sa_text
        import os as _os_startup
        async with AsyncSessionLocal() as _db_fix:
            _res = await _db_fix.execute(sa_text(
                "SELECT COUNT(*) FROM products WHERE is_active=true AND category='Premium Spirits & Liquors'"
            ))
            _bad = _res.scalar() or 0
            if _bad > 0:
                logger.info(f"Found {_bad} products with wrong category - running re-import...")
                from import_real_catalog import run_import
                _csv = _os_startup.path.join(_os_startup.path.dirname(__file__), "data", "Masterliqours_Pricing_List.csv")
                _r2 = await run_import(_csv)
                logger.info(f"Category re-import done: {_r2}")
    except Exception as e:
        logger.exception("Category fix startup failed: %s", e)
    logger.info("All routes loaded - suppliers + AI RBAC active")

@app.post("/api/maintenance/import-catalog")
async def maintenance_import_catalog(request: Request):
    key = request.headers.get("X-Maintenance-Key", "")
    expected = os.environ.get("MAINTENANCE_KEY", "")
    if not expected or key != expected:
        raise HTTPException(status_code=403, detail="Forbidden")
    try:
        from import_real_catalog import run_import
        csv_path = os.path.join(os.path.dirname(__file__), "data", "Masterliqours_Pricing_List.csv")
        result = await run_import(csv_path)
        return {"status": "ok", "result": result}
    except Exception as e:
        logger.exception("Maintenance import failed: %s", e)
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
