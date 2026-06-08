import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, ForeignKey, Text, Enum as SQLEnum
from sqlalchemy.orm import relationship
from database import Base
import enum

def generate_uuid():
    return str(uuid.uuid4())

def utcnow():
    return datetime.utcnow()

# Enums
class UserTier(str, enum.Enum):
    REGULAR = "regular"
    GOLD = "gold"
    PLATINUM = "platinum"

class UserRole(str, enum.Enum):
    CUSTOMER = "customer"
    STAFF = "staff"
    SUPER_ADMIN = "super_admin"
    MASTER_ADMIN = "master_admin"

class OrderStatus(str, enum.Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    PREPARING = "preparing"
    OUT_FOR_DELIVERY = "out_for_delivery"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"

# Models
class User(Base):
    __tablename__ = 'users'
    
    user_id = Column(String(36), primary_key=True, default=generate_uuid)
    email = Column(String(255), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False)
    password_hash = Column(String(255), nullable=True)
    phone = Column(String(20), nullable=True)
    points = Column(Integer, default=0)
    tier = Column(SQLEnum(UserTier), default=UserTier.REGULAR)
    role = Column(SQLEnum(UserRole), default=UserRole.CUSTOMER)
    referral_code = Column(String(50), nullable=True)
    assigned_staff_id = Column(String(36), ForeignKey('staff.staff_id'), nullable=True, index=True)
    picture = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=utcnow)
    password_reset_token = Column(String(255), nullable=True)
    password_reset_expires = Column(DateTime, nullable=True)
    
    assigned_staff = relationship('Staff', back_populates='customers', foreign_keys=[assigned_staff_id])
    orders = relationship('Order', back_populates='user', cascade='all, delete-orphan')
    rewards = relationship('Reward', back_populates='user', cascade='all, delete-orphan')
    sessions = relationship('UserSession', back_populates='user', cascade='all, delete-orphan')
    chat_messages = relationship('ChatMessage', back_populates='user', cascade='all, delete-orphan')


class UserSession(Base):
    __tablename__ = 'user_sessions'
    
    session_id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey('users.user_id', ondelete='CASCADE'), nullable=False, index=True)
    session_token = Column(String(500), unique=True, nullable=False, index=True)
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=utcnow)
    
    user = relationship('User', back_populates='sessions')


class Staff(Base):
    __tablename__ = 'staff'
    
    staff_id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    referral_code = Column(String(50), unique=True, nullable=False, index=True)
    qr_code_url = Column(String(500), nullable=True)
    whatsapp_number = Column(String(20), nullable=True)
    orders_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=utcnow)
    
    customers = relationship('User', back_populates='assigned_staff', foreign_keys=[User.assigned_staff_id])
    products = relationship('Product', back_populates='staff')
    stock = relationship('Stock', back_populates='staff')
    orders = relationship('Order', back_populates='staff')


class Product(Base):
    __tablename__ = 'products'
    
    product_id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(255), nullable=False, index=True)
    price = Column(Float, nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String(100), nullable=False, index=True)
    image_url = Column(String(500), nullable=True)
    is_active = Column(Boolean, default=True, index=True)
    is_preorder = Column(Boolean, default=False)
    created_at = Column(DateTime, default=utcnow)
    staff_id = Column(String(36), ForeignKey('staff.staff_id'), nullable=True, index=True)
    
    staff = relationship('Staff', back_populates='products')
    stock = relationship('Stock', back_populates='product', cascade='all, delete-orphan')
    order_items = relationship('OrderItem', back_populates='product')
    flash_sales = relationship('FlashSale', back_populates='product', cascade='all, delete-orphan')


class Stock(Base):
    __tablename__ = 'stocks'
    
    stock_id = Column(String(36), primary_key=True, default=generate_uuid)
    product_id = Column(String(36), ForeignKey('products.product_id', ondelete='CASCADE'), nullable=False, index=True)
    staff_id = Column(String(36), ForeignKey('staff.staff_id', ondelete='SET NULL'), nullable=True, index=True)
    quantity = Column(Integer, default=0)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)
    
    product = relationship('Product', back_populates='stock')
    staff = relationship('Staff', back_populates='stock')


class Order(Base):
    __tablename__ = 'orders'
    
    order_id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey('users.user_id', ondelete='CASCADE'), nullable=False, index=True)
    staff_id = Column(String(36), ForeignKey('staff.staff_id', ondelete='SET NULL'), nullable=True, index=True)
    total = Column(Float, nullable=False)
    status = Column(SQLEnum(OrderStatus), default=OrderStatus.PENDING, index=True)
    shipping_address = Column(Text, nullable=False)
    customer_name = Column(String(255), nullable=True)
    customer_whatsapp = Column(String(50), nullable=True)
    is_personal_order = Column(Boolean, default=False)
    payment_proof_url = Column(String(500), nullable=True)
    discount_applied = Column(Float, default=0)
    shipping_discount = Column(Float, default=0)
    points_earned = Column(Integer, default=0)
    created_at = Column(DateTime, default=utcnow, index=True)
    
    user = relationship('User', back_populates='orders')
    staff = relationship('Staff', back_populates='orders')
    order_items = relationship('OrderItem', back_populates='order', cascade='all, delete-orphan')


class OrderItem(Base):
    __tablename__ = 'order_items'
    
    order_item_id = Column(String(36), primary_key=True, default=generate_uuid)
    order_id = Column(String(36), ForeignKey('orders.order_id', ondelete='CASCADE'), nullable=False, index=True)
    product_id = Column(String(36), ForeignKey('products.product_id'), nullable=False)
    quantity = Column(Integer, nullable=False)
    price = Column(Float, nullable=False)
    subtotal = Column(Float, nullable=False)
    
    order = relationship('Order', back_populates='order_items')
    product = relationship('Product', back_populates='order_items')


class Reward(Base):
    __tablename__ = 'rewards'
    
    reward_id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey('users.user_id', ondelete='CASCADE'), nullable=False, index=True)
    points = Column(Integer, nullable=False)
    type = Column(String(50), nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utcnow, index=True)
    
    user = relationship('User', back_populates='rewards')


class FlashSale(Base):
    __tablename__ = 'flash_sales'
    
    sale_id = Column(String(36), primary_key=True, default=generate_uuid)
    product_id = Column(String(36), ForeignKey('products.product_id', ondelete='CASCADE'), nullable=False, index=True)
    discount_percentage = Column(Float, nullable=False)
    start_time = Column(DateTime, nullable=False, index=True)
    end_time = Column(DateTime, nullable=False, index=True)
    is_active = Column(Boolean, default=True, index=True)
    is_preorder = Column(Boolean, default=False)
    created_at = Column(DateTime, default=utcnow)
    
    product = relationship('Product', back_populates='flash_sales')


class DiscountCode(Base):
    __tablename__ = 'discount_codes'
    
    code_id = Column(String(36), primary_key=True, default=generate_uuid)
    code = Column(String(50), unique=True, nullable=False, index=True)
    discount_type = Column(String(20), nullable=False)
    discount_value = Column(Float, nullable=False)
    min_purchase = Column(Float, default=0)
    max_uses = Column(Integer, nullable=True)
    used_count = Column(Integer, default=0)
    active = Column(Boolean, default=True, index=True)
    expires_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=utcnow)




class Review(Base):
    __tablename__ = 'reviews'

    review_id = Column(String(36), primary_key=True, default=generate_uuid)
    order_id = Column(String(36), ForeignKey('orders.order_id', ondelete='CASCADE'), nullable=False)
    user_id = Column(String(36), ForeignKey('users.user_id', ondelete='CASCADE'), nullable=False)
    staff_id = Column(String(36), ForeignKey('staff.staff_id', ondelete='SET NULL'), nullable=True)
    rating = Column(Integer, nullable=False)  # 1-5
    comment = Column(Text, nullable=True)
    is_visible = Column(Boolean, default=True)
    created_at = Column(DateTime, default=utcnow)

class NewsletterSubscriber(Base):
    __tablename__ = 'newsletter_subscribers'
    
    subscriber_id = Column(String(36), primary_key=True, default=generate_uuid)
    email = Column(String(255), unique=True, nullable=False, index=True)
    subscribed = Column(Boolean, default=True)
    created_at = Column(DateTime, default=utcnow)


class ChatMessage(Base):
    __tablename__ = 'chat_messages'
    
    message_id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey('users.user_id', ondelete='CASCADE'), nullable=False, index=True)
    role = Column(String(20), nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=utcnow, index=True)
    
    user = relationship('User', back_populates='chat_messages')


# NEW: Hero Banner Model for Super Admin to manage homepage
class HeroBanner(Base):
    __tablename__ = 'hero_banners'
    
    banner_id = Column(String(36), primary_key=True, default=generate_uuid)
    title = Column(String(255), nullable=False)
    subtitle = Column(Text, nullable=True)
    cta_text = Column(String(100), nullable=True)
    cta_link = Column(String(255), nullable=True)
    background_image = Column(String(500), nullable=True)
    is_active = Column(Boolean, default=True)
    order_position = Column(Integer, default=0)
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)


class Brand(Base):
    __tablename__ = 'brands'

    brand_id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(255), nullable=False, unique=True)
    short_name = Column(String(100), nullable=True)
    subtitle = Column(String(255), nullable=True)
    logo_url = Column(String(500), nullable=True)
    color_hex = Column(String(20), nullable=True)
    search_term = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True)
    order_position = Column(Integer, default=0)
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)
