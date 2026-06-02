from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime
from models import UserTier, UserRole, OrderStatus

# Auth Schemas
class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str
    phone: Optional[str] = None
    referral_code: Optional[str] = None

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    user_id: str
    email: str
    name: str
    phone: Optional[str]
    points: int
    tier: UserTier
    role: UserRole
    picture: Optional[str]
    referral_code: Optional[str]
    assigned_staff_id: Optional[str]
    created_at: datetime

# Product Schemas
class ProductResponse(BaseModel):
    product_id: str
    name: str
    price: float
    description: Optional[str]
    category: str
    image_url: Optional[str]
    is_active: bool
    staff_id: Optional[str]
    created_at: datetime

class ProductCreate(BaseModel):
    name: str
    price: float
    description: Optional[str]
    category: str
    image_url: Optional[str]
    is_active: bool = True

# Cart & Order Schemas
class CartItem(BaseModel):
    product_id: str
    quantity: int

class CheckoutRequest(BaseModel):
    items: List[CartItem]
    shipping_address: str
    discount_code: Optional[str] = None

class OrderResponse(BaseModel):
    order_id: str
    user_id: str
    staff_id: str
    total: float
    status: OrderStatus
    shipping_address: str
    discount_applied: float
    shipping_discount: float
    points_earned: int
    created_at: datetime
    items: List[dict]

# Staff Schemas
class StaffResponse(BaseModel):
    staff_id: str
    name: str
    email: str
    referral_code: str
    qr_code_url: Optional[str]
    whatsapp_number: Optional[str]
    orders_count: int
    created_at: datetime

# Newsletter Schema
class NewsletterSubscribe(BaseModel):
    email: EmailStr

# AI Chat Schema
class ChatRequest(BaseModel):
    message: str
    conversation_history: Optional[List[dict]] = []
