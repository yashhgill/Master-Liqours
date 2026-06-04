"""
Password reset + change password routes.
Works for both customers and staff.
"""
import secrets
import hashlib
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, EmailStr

from database import get_db
from models import User
from auth_utils import get_current_user, hash_password, verify_password
import resend
import os

router = APIRouter(prefix="/auth", tags=["Auth"])

resend.api_key = os.environ.get("RESEND_API_KEY", "")
SENDER = os.environ.get("SENDER_EMAIL", "noreply@masterliqours.my")
FRONTEND_URL = os.environ.get("FRONTEND_URL", "https://masterliqours.my")


def _make_token() -> str:
    return secrets.token_urlsafe(32)


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


# ── Forgot Password ──────────────────────────────────────────────────────────

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

@router.post("/forgot-password")
async def forgot_password(data: ForgotPasswordRequest, db: AsyncSession = Depends(get_db)):
    """Send password reset email. Always returns 200 to prevent email enumeration."""
    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()

    if user:
        token = _make_token()
        user.password_reset_token = _hash_token(token)
        user.password_reset_expires = datetime.utcnow() + timedelta(hours=1)
        await db.commit()

        reset_url = f"{FRONTEND_URL}/reset-password?token={token}&email={data.email}"

        try:
            resend.Emails.send({
                "from": SENDER,
                "to": data.email,
                "subject": "Reset your Masterliqours password",
                "html": f"""
                <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;background:#0a0a0a;color:#fff;border-radius:16px;">
                    <h2 style="color:#ff007f;font-size:28px;margin-bottom:8px;">Reset Password</h2>
                    <p style="color:#999;margin-bottom:24px;">Click the button below to reset your password. This link expires in 1 hour.</p>
                    <a href="{reset_url}" style="display:inline-block;background:#ff007f;color:#fff;padding:14px 28px;border-radius:50px;text-decoration:none;font-weight:bold;font-size:16px;">Reset Password</a>
                    <p style="color:#555;margin-top:24px;font-size:12px;">If you didn't request this, ignore this email.</p>
                </div>
                """
            })
        except Exception:
            pass  # Don't leak errors

    return {"message": "If that email exists, a reset link has been sent."}


# ── Reset Password (from email link) ────────────────────────────────────────

class ResetPasswordRequest(BaseModel):
    email: EmailStr
    token: str
    new_password: str

@router.post("/reset-password")
async def reset_password(data: ResetPasswordRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()

    if not user or not user.password_reset_token:
        raise HTTPException(status_code=400, detail="Invalid or expired reset link")

    if user.password_reset_expires < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Reset link expired — request a new one")

    if user.password_reset_token != _hash_token(data.token):
        raise HTTPException(status_code=400, detail="Invalid reset token")

    if len(data.new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    user.password_hash = hash_password(data.new_password)
    user.password_reset_token = None
    user.password_reset_expires = None
    await db.commit()

    return {"message": "Password reset successful — you can now log in"}


# ── Change Password (logged in) ──────────────────────────────────────────────

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

@router.post("/change-password")
async def change_password(
    data: ChangePasswordRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if not user.password_hash:
        raise HTTPException(status_code=400, detail="Account uses Google login — no password to change")

    if not verify_password(data.current_password, user.password_hash):
        raise HTTPException(status_code=400, detail="Current password is wrong lah")

    if len(data.new_password) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters")

    if data.current_password == data.new_password:
        raise HTTPException(status_code=400, detail="New password same as current lah")

    user.password_hash = hash_password(data.new_password)
    await db.commit()

    return {"message": "Password changed successfully"}
