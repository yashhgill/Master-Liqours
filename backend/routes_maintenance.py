"""
One-off maintenance endpoint (Shell isn't available on Render's free plan).
Requires ?key=... matching the MAINTENANCE_KEY env var.
Remove this file (and its router registration in server.py) once run.
"""
import os

from fastapi import APIRouter, HTTPException, Query
from sqlalchemy import text

router = APIRouter(prefix="/maintenance", tags=["maintenance"])


def _check_key(key: str):
    expected = os.environ.get("MAINTENANCE_KEY", "")
    if not expected or key != expected:
        raise HTTPException(status_code=403, detail="Invalid or missing maintenance key.")


# Raw, idempotent SQL (safe to re-run) -- adds the two new User columns used
# by the login brute-force lockout feature. Not relying on `alembic upgrade
# head` since this DB's alembic version tracking has been unreliable in the
# past (tables created via create_all() at startup rather than through
# migrations, so alembic's view of "current state" drifts from reality).
_STATEMENTS = [
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP",
]


@router.get("/migrate-login-security")
async def migrate_login_security(key: str = Query(...)):
    _check_key(key)
    from database import AsyncSessionLocal
    ran = []
    try:
        async with AsyncSessionLocal() as db:
            for stmt in _STATEMENTS:
                await db.execute(text(stmt))
                ran.append(stmt.strip().splitlines()[0][:80])
            await db.commit()
        return {"status": "ok", "ran": ran}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Migration failed: {e}")
