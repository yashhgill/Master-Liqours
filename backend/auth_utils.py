import os
import bcrypt
import asyncio
from datetime import datetime, timedelta
from typing import Optional
from fastapi import HTTPException, Request, Cookie, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from models import User, UserSession, UserRole
from database import get_db
import httpx

# Password hashing
def hash_password(password: str) -> str:
    """Hash a password using bcrypt"""
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    """Verify a password against its hash"""
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

# Session management
async def create_session(db: AsyncSession, user_id: str) -> str:
    """Create a new session for a user"""
    import uuid
    session_token = f"session_{uuid.uuid4().hex}"
    expires_at = datetime.utcnow() + timedelta(days=7)
    
    session = UserSession(
        user_id=user_id,
        session_token=session_token,
        expires_at=expires_at
    )
    db.add(session)
    await db.commit()
    return session_token

async def get_user_from_session(db: AsyncSession, session_token: str) -> Optional[User]:
    """Get user from session token"""
    result = await db.execute(
        select(UserSession).where(UserSession.session_token == session_token)
    )
    session = result.scalar_one_or_none()
    
    if not session:
        return None
    
    # Check if expired
    if session.expires_at < datetime.utcnow():
        await db.delete(session)
        await db.commit()
        return None
    
    # Get user
    result = await db.execute(
        select(User).where(User.user_id == session.user_id)
    )
    return result.scalar_one_or_none()

# Emergent Google Auth
async def get_current_user(
    request: Request,
    session_token: Optional[str] = Cookie(None),
    db: AsyncSession = Depends(get_db)
) -> User:
    """Get current authenticated user from cookie or Authorization header"""
    token = session_token
    
    # Fallback to Authorization header
    if not token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
    
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    user = await get_user_from_session(db, token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid or expired session")
    
    return user

async def require_role(user: User, *allowed_roles: UserRole):
    """Check if user has required role"""
    if user.role not in allowed_roles:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
