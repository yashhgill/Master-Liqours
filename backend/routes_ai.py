from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
import os
from groq import Groq

from database import get_db
from models import User, ChatMessage, Product
from schemas import ChatRequest
from auth_utils import get_current_user

router = APIRouter(prefix="/ai", tags=["AI"])

groq_client = Groq(api_key=os.environ.get('GROQ_API_KEY'))

@router.post("/chat")
async def chat(
    data: ChatRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """AI chatbot for customer support"""
    # Save user message
    user_msg = ChatMessage(
        user_id=user.user_id,
        role="user",
        content=data.message
    )
    db.add(user_msg)
    
    # Get context about products
    result = await db.execute(select(Product).where(Product.is_active == True).limit(10))
    products = result.scalars().all()
    product_list = "\n".join([f"- {p.name}: RM{p.price} ({p.category})" for p in products])
    
    # Build conversation
    messages = [
        {
            "role": "system",
            "content": f"""You are a helpful customer support assistant for Masterliqours, a premium liquor e-commerce platform in Malaysia. 
            
Speak in casual Manglish (Malaysian English mix). Be friendly and helpful.
            
Our products:
{product_list}

User tier benefits:
- Regular: Standard service
- Gold (5000+ points): RM50 off shipping
- Platinum (10000+ points): RM100 off shipping + 3% discount

Help customers with:
- Product recommendations
- Order inquiries
- Tier benefits
- General questions

Current user: {user.name} ({user.tier} tier, {user.points} points)
"""
        }
    ]
    
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
