from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, func
from typing import List, Optional
from datetime import datetime, timedelta
import os
from groq import Groq

from database import get_db
from models import User, ChatMessage, Product
from schemas import ChatRequest
from auth_utils import get_current_user
from rate_limit import limiter

router = APIRouter(prefix="/ai", tags=["AI"])

groq_client = Groq(api_key=os.environ.get('GROQ_API_KEY'))

# Simple per-user rate limit on the paid Groq endpoint — without this, any
# registered customer (sign-up is free/self-serve) could loop requests and
# run up the AI bill with no ceiling tied to the cost of "being logged in".
CHAT_RATE_LIMIT = 20  # messages
CHAT_RATE_WINDOW_MINUTES = 60

@router.post("/chat")
@limiter.limit("30/minute")  # IP-level hard cap on top of per-user DB check
async def chat(
    request: Request,
    data: ChatRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """AI chatbot for customer support"""
    window_start = datetime.utcnow() - timedelta(minutes=CHAT_RATE_WINDOW_MINUTES)
    recent_count_result = await db.execute(
        select(func.count(ChatMessage.message_id)).where(
            ChatMessage.user_id == user.user_id,
            ChatMessage.role == "user",
            ChatMessage.created_at >= window_start,
        )
    )
    recent_count = recent_count_result.scalar() or 0
    if recent_count >= CHAT_RATE_LIMIT:
        raise HTTPException(
            status_code=429,
            detail=f"You've hit the chat limit ({CHAT_RATE_LIMIT}/hour) — please try again later.",
        )

    # Save user message
    user_msg = ChatMessage(
        user_id=user.user_id,
        role="user",
        content=data.message
    )
    db.add(user_msg)

    # Get context about products — search for ones relevant to what the user is asking,
    # falling back to a broader catalog sample so the AI never claims something
    # "isn't in our list" when it actually exists further down the table.
    keywords = [w for w in data.message.lower().split() if len(w) > 2]
    relevant_products = []
    if keywords:
        or_clauses = [Product.name.ilike(f"%{kw}%") for kw in keywords]
        result = await db.execute(
            select(Product).where(Product.is_active == True, or_(*or_clauses)).limit(15)
        )
        relevant_products = result.scalars().all()

    result = await db.execute(select(Product).where(Product.is_active == True).limit(60))
    catalog_sample = result.scalars().all()

    # Merge, relevant matches first, no duplicates
    seen_ids = set()
    products = []
    for p in relevant_products + catalog_sample:
        if p.product_id not in seen_ids:
            seen_ids.add(p.product_id)
            products.append(p)

    product_list = "\n".join([f"- {p.name}: RM{p.price} ({p.category})" for p in products])

    # Build role-aware system prompt
    role = user.role.value if hasattr(user.role, 'value') else str(user.role)
    context = getattr(data, 'context', 'customer') or 'customer'

    if role in ('super_admin', 'master_admin') or context == 'admin_dashboard':
        system_prompt = f"""You are an intelligent admin assistant for Masterliqours — a premium liquor delivery platform in Malaysia.

You are speaking with {user.name}, a BOSS-LEVEL ADMIN. Give direct, data-focused answers. No fluff. You can discuss:
- Sales performance, order trends, revenue insights
- Staff management and performance
- Product catalog, pricing strategy, stock levels
- Supplier management, cost vs selling price margins
- Customer tiers, loyalty program stats
- Business strategy and operations

Speak confidently and concisely. Use Manglish when natural. The boss wants answers, not disclaimers.

Our product catalog (sample):
{product_list}

User: {user.name} | Role: Admin | {user.tier} tier"""

    elif role == 'staff' or context == 'staff_dashboard':
        system_prompt = f"""You are an AI assistant for Masterliqours staff. You are helping {user.name}, a staff member.

Your job is to help staff with:
- Finding products quickly (prices, categories, stock status)
- Understanding order statuses and what to do next
- Answering customer questions on behalf of staff
- Explaining tier benefits to help close sales
- Suggesting upsells based on what customer is ordering

Be direct and practical. Use Manglish. Give short, actionable answers.

Product catalog (for reference):
{product_list}

Staff member: {user.name}"""

    else:
        # Customer — upgraded: proactively help with orders, not just answer questions
        system_prompt = f"""You are KiLi, a friendly AI assistant for Masterliqours — Malaysia's premium liquor delivery service in KL & Klang Valley.

Speak in casual Manglish. Be warm, helpful, and a little cheeky like a knowledgeable friend who knows their drinks.

YOUR MAIN JOBS:
1. **Help customers find the right drink** — ask about occasion, budget, taste preference, quantity
2. **Guide them to order** — tell them exactly which product to add to cart and how to checkout
3. **Upsell naturally** — if they want whisky, suggest a pairing snack or a slightly better bottle
4. **Explain the rewards** — Regular (1pt/RM10) → Gold (100pts) → Platinum (500pts), all earn discounts
5. **Handle order questions** — delivery is same-day KL/Klang Valley, payment via WhatsApp after order

HOW TO HELP WITH ORDERS:
- When customer picks a product, say: "Nice choice! Just add it to cart, checkout, and our team will WhatsApp you to confirm and arrange payment 👍"
- If they want to know if something is available: check our product list below and answer directly
- For bulk orders (event, party): direct them to the Bulk Order page or say "tell me how many bottles and I'll help you get the best deal"
- If they ask for recommendations: ask 2-3 quick questions (occasion? budget? prefer beer/wine/spirit?) then suggest 2-3 specific options with prices

THINGS YOU CAN TELL THEM:
- Same-day delivery in KL & Klang Valley
- Payment via WhatsApp after order confirmation  
- Free delivery above RM1,250
- They earn points on every order (current: {user.points} pts, tier: {user.tier})
- Can order in bulk for events

THINGS TO AVOID:
- Never make up products or prices not in the list below
- Don't promise delivery times you're not sure about
- If they ask about their specific order status, tell them to WhatsApp the team directly

Our current products:
{product_list}

Customer: {user.name} | Tier: {user.tier} | Points: {user.points} pts"""

    messages = [{"role": "system", "content": system_prompt}]

    # Add conversation history
    if data.conversation_history:
        messages.extend(data.conversation_history[-10:])  # Last 10 messages

    messages.append({"role": "user", "content": data.message})

    # Get AI response
    try:
        completion = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=messages,
            temperature=0.7,
            max_tokens=500
        )

        ai_response = completion.choices[0].message.content

        # Save AI message
        ai_msg = ChatMessage(
            user_id=user.user_id,
            role="assistant",
            content=ai_response
        )
        db.add(ai_msg)
        await db.commit()

        return {"response": ai_response}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI error: {str(e)}")

@router.get("/chat-history")
async def get_chat_history(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get user's chat history"""
    result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.user_id == user.user_id)
        .order_by(ChatMessage.created_at.desc())
        .limit(50)
    )
    messages = result.scalars().all()
    return messages[::-1]  # Reverse to chronological order

@router.post("/recommendations")
async def get_recommendations(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get AI-powered product recommendations"""
    # Get user's order history
    result = await db.execute(
        select(Product).where(Product.is_active == True).limit(20)
    )
    products = result.scalars().all()

    # Simple recommendation: popular products from different categories
    recommendations = []
    categories_seen = set()

    for product in products:
        if product.category not in categories_seen and len(recommendations) < 6:
            recommendations.append(product)
            categories_seen.add(product.category)

    return recommendations
