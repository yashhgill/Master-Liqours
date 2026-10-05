"""
Keep-alive endpoint — called every 14 minutes by Cloudflare Workers
or any cron service to prevent Render free tier cold starts.
"""
from fastapi import APIRouter

router = APIRouter()

@router.get("/ping")
async def ping():
    return {"status": "alive", "service": "masterliqours-backend"}
