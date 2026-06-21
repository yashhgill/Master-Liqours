import os
import bcrypt
import asyncio
from datetime import datetime, timedelta
from typing import Optional
from fastapi import HTTPException, Request, Cookie, Depends
from sqlalchemy import select, func, delete
from sqlalchemy.ext.asyncio import AsyncSession
from models import User, UserSession, UserRole, Staff
from database import get_db

# Password hashing
def hash_password(password: str) -> str:
    """Hash a password using bcrypt"""
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    """Verify a password against its hash"""
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

# ── Login brute-force protection ─────────────────────────────────────────────
# Locks the *account* (not by IP — a distributed attacker can spoof IPs, but
# can't avoid hitting the same account) after too many wrong passwords in a
# row. This is intentionally simple (no Redis/extra infra) since it only
# needs two columns on User: failed_login_attempts, locked_until.
MAX_FAILED_ATTEMPTS = 6
LOCKOUT_MINUTES = 15

def is_locked_out(user: User) -> bool:
    return bool(user.locked_until and user.locked_until > datetime.utcnow())

async def record_failed_login(db: AsyncSession, user: User):
    user.failed_login_attempts = (user.failed_login_attempts or 0) + 1
    if user.failed_login_attempts >= MAX_FAILED_ATTEMPTS:
        user.locked_until = datetime.utcnow() + timedelta(minutes=LOCKOUT_MINUTES)
        user.failed_login_attempts = 0
    await db.commit()

async def record_successful_login(db: AsyncSession, user: User):
    if user.failed_login_attempts or user.locked_until:
        user.failed_login_attempts = 0
        user.locked_until = None
        await db.commit()

async def invalidate_other_sessions(db: AsyncSession, user_id: str, keep_token: Optional[str] = None):
    """Kill every active session for this user (used on password change/reset)
    so a stolen session token doesn't stay valid for up to 7 more days after
    the password was changed because of a suspected compromise."""
    stmt = delete(UserSession).where(UserSession.user_id == user_id)
    if keep_token:
        stmt = stmt.where(UserSession.session_token != keep_token)
    await db.execute(stmt)
    await db.commit()

# ── Shared staff round-robin assignment ──────────────────────────────────────
# Used by both email/password registration (server.py) and Google OAuth
# sign-up (routes_google_auth.py) so new customers get spread evenly across
# staff. Kept in one place instead of two copies that can drift apart.
async def assign_staff_round_robin(db: AsyncSession) -> Optional[str]:
    result = await db.execute(
        select(Staff, func.count(User.user_id).label('count'))
        .outerjoin(User, User.assigned_staff_id == Staff.staff_id)
        .group_by(Staff.staff_id)
        .order_by(func.count(User.user_id).asc())
        .limit(1)
    )
    staff_row = result.first()
    return staff_row[0].staff_id if staff_row else None

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

# Auth dependency
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
