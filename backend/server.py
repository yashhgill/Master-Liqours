from fastapi import FastAPI, APIRouter, Depends, HTTPException, Response, Request, Cookie
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_
from sqlalchemy.orm import selectinload
from typing import Optional, List
from datetime import datetime, timedelta
from pathlib import Path
from dotenv import load_dotenv
import os
import logging

# Local imports
from database import get_db
from models import (
    User, UserSession, Staff, Product, Stock, Order, OrderItem,
    Reward, FlashSale, DiscountCode, NewsletterSubscriber, ChatMessage,
    UserRole, UserTier, OrderStatus
)
from schemas import *
from auth_utils import *

# Load environment
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# FastAPI app
app = FastAPI(title="Masterliqours API")
api_router = APIRouter(prefix="/api")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =============================================================================
# AUTHENTICATION ROUTES
# =============================================================================

@api_router.post("/auth/register", response_model=UserResponse)
async def register(data: RegisterRequest, db: AsyncSession = Depends(get_db)):
    """Register new user"""
    result = await db.execute(select(User).where(User.email == data.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email sudah digunakan")
    
    # Assign staff
    staff_id = None
    if data.referral_code:
        result = await db.execute(
            select(Staff).where(Staff.referral_code == data.referral_code)
        )
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
    """Login with email/password"""
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
    
    return {"message": "Login berjaya", "user": user}

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(user: User = Depends(get_current_user)):
    """Get current user"""
    return user

@api_router.post("/auth/logout")
async def logout(
    response: Response,
    session_token: Optional[str] = Cookie(None),
    db: AsyncSession = Depends(get_db)
):
    """Logout"""
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
    """Get all products"""
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
    """Get all categories"""
    result = await db.execute(
        select(Product.category).distinct().where(Product.is_active == True)
    )
    return {"categories": [row[0] for row in result.all()]}

# Include router
app.include_router(api_router)

@app.get("/")
async def root():
    return {"message": "Masterliqours API - Selamat datang!"}

# Startup
@app.on_event("startup")
async def startup():
    logger.info("🚀 Masterliqours API started!")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
