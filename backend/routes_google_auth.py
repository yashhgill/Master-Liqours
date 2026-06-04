"""Direct Google OAuth 2.0 — replaces Emergent-managed Google Auth.

REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
Frontend sends the same `redirect_uri` it used to obtain the `code` from Google.
"""
import os
import httpx
from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import User, Staff, UserRole
from schemas import UserResponse
from auth_utils import create_session

router = APIRouter(prefix="/auth/google", tags=["Auth · Google OAuth"])

GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET")

GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo"


class GoogleExchangePayload(BaseModel):
    code: str
    redirect_uri: str


@router.post("/exchange")
async def google_exchange(
    payload: GoogleExchangePayload,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    if not (GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET):
        raise HTTPException(status_code=500, detail="Google OAuth not configured boss")

    # 1) Exchange authorization code for access token
    async with httpx.AsyncClient(timeout=15) as client:
        token_res = await client.post(
            GOOGLE_TOKEN_URL,
            data={
                "code": payload.code,
                "client_id": GOOGLE_CLIENT_ID,
                "client_secret": GOOGLE_CLIENT_SECRET,
                "redirect_uri": payload.redirect_uri,
                "grant_type": "authorization_code",
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        if token_res.status_code != 200:
            raise HTTPException(status_code=401, detail=f"Google token exchange failed: {token_res.text}")
        tokens = token_res.json()
        access_token = tokens.get("access_token")
        if not access_token:
            raise HTTPException(status_code=401, detail="No access token from Google")

        # 2) Fetch user profile
        info_res = await client.get(
            GOOGLE_USERINFO_URL,
            headers={"Authorization": f"Bearer {access_token}"},
        )
        if info_res.status_code != 200:
            raise HTTPException(status_code=401, detail="Failed to fetch Google profile")
        info = info_res.json()

    email = (info.get("email") or "").lower()
    if not email:
        raise HTTPException(status_code=400, detail="Google profile missing email")
    name = info.get("name") or email.split("@")[0]
    picture = info.get("picture")

    # 3) Upsert user
    r = await db.execute(select(User).where(User.email == email))
    user = r.scalar_one_or_none()

    if not user:
        # Round-robin staff assignment (NULL if no staff exists yet)
        sr = await db.execute(
            select(Staff, func.count(User.user_id).label("count"))
            .outerjoin(User, User.assigned_staff_id == Staff.staff_id)
            .group_by(Staff.staff_id)
            .order_by(func.count(User.user_id).asc())
            .limit(1)
        )
        staff_row = sr.first()
        staff_id = staff_row[0].staff_id if staff_row else None

        user = User(
            email=email,
            name=name,
            picture=picture,
            assigned_staff_id=staff_id,
            role=UserRole.CUSTOMER,
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
    else:
        # Refresh profile picture / name from Google
        if picture and not user.picture:
            user.picture = picture
        if name and not user.name:
            user.name = name
        await db.commit()
        await db.refresh(user)

    # 4) Create session + cookie
    session_token = await create_session(db, user.user_id)
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=7 * 24 * 60 * 60,
        path="/",
    )

    return {
        "message": "Login berjaya lah!",
        "session_token": session_token,
        "user": UserResponse.model_validate(user, from_attributes=True),
    }
