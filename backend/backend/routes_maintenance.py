"""
One-off maintenance endpoints, built specifically because Render's free plan
has no Shell access (it's a Starter-plan-only feature). These let the boss
run the pending database migration and the real-catalog import by just
visiting a URL in the browser, instead of needing a terminal.

Both require ?key=... matching the MAINTENANCE_KEY env var. Remove this file
(and its router registration in server.py) once both have been run — it has
no reason to stay in production after the one-time setup is done.
"""
import os
from pathlib import Path

from fastapi import APIRouter, HTTPException, Query
from starlette.concurrency import run_in_threadpool

router = APIRouter(prefix="/maintenance", tags=["maintenance"])

BACKEND_DIR = Path(__file__).parent
CSV_PATH = BACKEND_DIR / "data" / "Masterliqours_Pricing_List.csv"


def _check_key(key: str):
    expected = os.environ.get("MAINTENANCE_KEY", "")
    if not expected or key != expected:
        raise HTTPException(status_code=403, detail="Invalid or missing maintenance key.")


def _run_alembic_upgrade():
    from alembic.config import Config
    from alembic import command

    cfg = Config(str(BACKEND_DIR / "alembic.ini"))
    cfg.set_main_option("script_location", str(BACKEND_DIR / "alembic"))
    command.upgrade(cfg, "head")
    return "Alembic migration ran successfully (now at head)."


@router.get("/migrate")
async def migrate(key: str = Query(...)):
    _check_key(key)
    try:
        result = await run_in_threadpool(_run_alembic_upgrade)
        return {"status": "ok", "detail": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Migration failed: {e}")


@router.get("/import-catalog")
async def import_catalog(key: str = Query(...)):
    _check_key(key)
    if not CSV_PATH.exists():
        raise HTTPException(
            status_code=404,
            detail=f"CSV not found at {CSV_PATH}. Make sure data/Masterliqours_Pricing_List.csv was uploaded to the repo.",
        )
    from import_real_catalog import run_import
    try:
        result = await run_import(str(CSV_PATH))
        return {"status": "ok", "detail": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Import failed: {e}")
