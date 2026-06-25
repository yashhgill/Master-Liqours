"""
AI Assistant with RBAC â powered by Groq LLM.
Each role gets a different system context:
  STAFF       â only their own orders, stock, customer data
  SUPER_ADMIN â all orders, all staff, products (no supplier/cost data)
  MASTER_ADMINâ full access including suppliers, cost prices, margins
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import os
import httpx

from database import get_db
from models import User, UserRole, Staff, Order, Stock, Product, SupplierProduct, Supplier
from auth_utils import get_current_user

router = APIRouter(prefix="/ai-staff", tags=["AI Staff Assistant"])

GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")
GROQ_MODEL = "llama-3.1-70b-versatile"


# ââ Pydantic ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

class ChatMsg(BaseModel):
    role: str   # "user" | "assistant"
    content: str

class ChatRequest(BaseModel):
    message: str
    history: Optional[List[ChatMsg]] = []


# ââ Context builders ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

async def _context_staff(user: User, db: AsyncSession) -> str:
    sr = await db.execute(select(Staff).where(Staff.email == user.email))
    staff = sr.scalar_one_or_none()
    if not staff:
        return "No staff record found for this user.\n"

    ctx = f"=== YOUR PROFILE ===\nName: {staff.name}\nEmail: {staff.email}\nReferral Code: {staff.referral_code}\nWhatsApp: {staff.whatsapp_number or 'Not set'}\n\n"

    # Orders
    or_r = await db.execute(
        select(Order)
        .where(Order.staff_id == staff.staff_id)
        .order_by(Order.created_at.desc())
        .limit(50)
    )
    orders = or_r.scalars().all()
    status_counts: dict = {}
    for o in orders:
        s = o.status.value if hasattr(o.status, "value") else str(o.status)
        status_counts[s] = status_counts.get(s, 0) + 1
    ctx += f"=== YOUR ORDERS ===\nTotal: {len(orders)}\n"
    for s, c in status_counts.items():
        ctx += f"  {s}: {c}\n"
    recent = orders[:10]
    if recent:
        ctx += "Recent 10:\n"
        for o in recent:
            st = o.status.value if hasattr(o.status, "value") else str(o.status)
            ctx += f"  #{o.order_id[:8]} | RM{o.total:.2f} | {st} | Customer: {o.customer_name or 'N/A'} | {o.customer_whatsapp or ''}\n"
    ctx += "\n"

    # Stock
    st_r = await db.execute(
        select(Stock, Product).join(Product).where(Stock.staff_id == staff.staff_id)
    )
    ctx += "=== YOUR STOCK ===\n"
    rows = st_r.all()
    if rows:
        for stock, product in rows:
            warning = " â  LOW" if 0 < stock.quantity <= 2 else (" â  OUT OF STOCK" if stock.quantity == 0 else "")
            ctx += f"  {product.name} ({product.category}): {stock.quantity} units{warning}\n"
    else:
        ctx += "  No stock assigned yet.\n"

    return ctx


async def _context_admin(user: User, db: AsyncSession, include_suppliers: bool) -> str:
    # All orders
    or_r = await db.execute(select(Order).order_by(Order.created_at.desc()).limit(100))
    orders = or_r.scalars().all()
    total_sales = sum(o.total for o in orders)
    status_counts: dict = {}
    for o in orders:
        s = o.status.value if hasattr(o.status, "value") else str(o.status)
        status_counts[s] = status_counts.get(s, 0) + 1
    ctx = f"=== ALL ORDERS (last 100) ===\nTotal: {len(orders)} | Total Sales: RM{total_sales:.2f}\n"
    for s, c in status_counts.items():
        ctx += f"  {s}: {c}\n"
    ctx += "\n"

    # Staff list
    st_r = await db.execute(select(Staff))
    ctx += "=== STAFF LIST ===\n"
    staff_list = st_r.scalars().all()
    for st in staff_list:
        orders_for_staff = [o for o in orders if o.staff_id == st.staff_id]
        sales_for_staff = sum(o.total for o in orders_for_staff)
        ctx += f"  {st.name} | {st.email} | WA: {st.whatsapp_number or 'N/A'} | Orders: {len(orders_for_staff)} | Sales: RM{sales_for_staff:.2f}\n"
    ctx += "\n"

    # Products
    prod_r = await db.execute(select(Product).where(Product.is_active == True))
    products = prod_r.scalars().all()
    ctx += f"=== PRODUCTS ===\nTotal Active: {len(products)}\nCategories: {', '.join(set(p.category for p in products))}\n\n"

    if include_suppliers:
        sup_r = await db.execute(select(Supplier))
        ctx += "=== SUPPLIERS (CONFIDENTIAL) ===\n"
        for supplier in sup_r.scalars().all():
            ctx += f"Supplier: {supplier.name} | Contact: {supplier.contact or 'N/A'} | Notes: {supplier.notes or 'N/A'}\n"
            sp_r = await db.execute(
                select(SupplierProduct, Product)
                .join(Product)
                .where(SupplierProduct.supplier_id == supplier.supplier_id)
            )
            for sp, product in sp_r.all():
                margin = ((sp.selling_price - sp.cost_price) / sp.cost_price * 100) if sp.cost_price > 0 else 0
                ctx += f"  - {product.name}: qty={sp.quantity} | cost=RM{sp.cost_price:.2f} | sell=RM{sp.selling_price:.2f} | margin={margin:.1f}%\n"
        ctx += "\n"

    return ctx


def _system_prompt(role: UserRole, context: str) -> str:
    now = datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")
    role_blurb = {
        UserRole.STAFF: "You are an AI assistant for a Masterliqours staff member. You can only see THEIR own data.",
        UserRole.SUPER_ADMIN: "You are an AI assistant for a Masterliqours super admin. You can see all orders and staff data, but NOT supplier/cost data.",
        UserRole.MASTER_ADMIN: "You are the Masterliqours master admin (boss) AI assistant with FULL system access including supplier names, cost prices, and profit margins.",
    }

    supplier_warning = ""
    if role == UserRole.STAFF:
        supplier_warning = "\nCRITICAL: NEVER reveal supplier names, contact info, cost prices, or profit margins â this is boss-only info. If staff asks about suppliers or costs, say that info is confidential and only the boss can see it."

    return f"""You are an AI assistant embedded inside the Masterliqours liquor distribution system.
{role_blurb.get(role, "")}
System time: {now}

REAL-TIME DATA:
{context}

RULES:
- Be concise and helpful â Malaysian style, can use "lah", "boss", "bro" casually when appropriate
- Always use RM for prices (Malaysian Ringgit)
- If you don't have data to answer, say so clearly â don't make up numbers
- Focus on actionable insights about orders, stock, and sales{supplier_warning}
- Keep responses under 300 words unless a detailed breakdown is needed"""


# ââ Endpoint ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

@router.post("/chat")
async def staff_ai_chat(
    payload: ChatRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if user.role == UserRole.CUSTOMER:
        raise HTTPException(status_code=403, detail="Staff and admin only lah")

    if not GROQ_API_KEY:
        raise HTTPException(status_code=503, detail="AI not configured â GROQ_API_KEY missing from environment")

    msg = payload.message.strip()
    if not msg:
        raise HTTPException(status_code=400, detail="Empty message")
    if len(msg) > 1200:
        raise HTTPException(status_code=400, detail="Message too long boss, keep it under 1200 chars")

    # Build role-appropriate context
    if user.role == UserRole.STAFF:
        context = await _context_staff(user, db)
    else:
        context = await _context_admin(
            user, db,
            include_suppliers=(user.role == UserRole.MASTER_ADMIN)
        )

    system_prompt = _system_prompt(user.role, context)

    # Build message list
    messages = [{"role": "system", "content": system_prompt}]
    for m in (payload.history or [])[-12:]:   # cap history at 12 turns
        messages.append({"role": m.role, "content": m.content[:800]})
    messages.append({"role": "user", "content": msg})

    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            resp = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {GROQ_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": GROQ_MODEL,
                    "messages": messages,
                    "max_tokens": 700,
                    "temperature": 0.65,
                },
            )
            resp.raise_for_status()
            data = resp.json()
            reply = data["choices"][0]["message"]["content"]
            tokens_used = data.get("usage", {}).get("total_tokens", 0)
            return {
                "reply": reply,
                "role": user.role.value,
                "tokens": tokens_used,
            }
        except httpx.HTTPStatusError as e:
            raise HTTPException(status_code=502, detail=f"Groq API error: {e.response.status_code}")
        except httpx.TimeoutException:
            raise HTTPException(status_code=504, detail="AI request timed out â try again boss")
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"AI service error: {str(e)}")
