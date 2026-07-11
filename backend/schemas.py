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
    assigned_staff_name: Optional[str] = None
    assigned_staff_whatsapp: Optional[str] = None
    assigned_staff_referral: Optional[str] = None
    created_at: datetime

# Product Schemas
class ProductResponse(BaseModel):
    product_id: str
    name: str
    price: float
    description: Optional[str] = None
    category: str
    image_url: Optional[str] = None
    is_active: bool
    is_preorder: Optional[bool] = False
    original_price: Optional[float] = None
    staff_id: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}

class ProductCreate(BaseModel):
    name: str
    price: float
    description: Optional[str] = None
    category: str
    image_url: Optional[str] = None
    is_active: bool = True
    is_preorder: Optional[bool] = False
    staff_id: Optional[str] = None
    # Discount fields — if discount_price is set, a flash sale is auto-created/updated
    discount_price: Optional[float] = None
    discount_days: Optional[int] = 0
    discount_hours: Optional[int] = 0
    discount_minutes: Optional[int] = 0

# Cart & Order Schemas
class CartItem(BaseModel):
    product_id: str
    quantity: int

class CheckoutRequest(BaseModel):
    items: List[CartItem]
    customer_name: str
    customer_whatsapp: str
    shipping_address: str
    discount_code: Optional[str] = None

class OrderResponse(BaseModel):
    order_id: str
    user_id: str
    staff_id: Optional[str] = None
    total: float
    status: OrderStatus
    shipping_address: str
    customer_name: Optional[str] = None
    customer_whatsapp: Optional[str] = None
    discount_applied: float
    shipping_discount: float
    points_earned: int
    created_at: datetime
    items: List[dict]
    staff_whatsapp: Optional[str] = None
    staff_name: Optional[str] = None
    is_personal_order: Optional[bool] = False
    stock_warnings: Optional[List[str]] = None

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
    message: str = Field(min_length=1, max_length=1000)
    conversation_history: Optional[List[dict]] = []
    context: Optional[str] = 'customer'  # customer | staff_dashboard | admin_dashboard
