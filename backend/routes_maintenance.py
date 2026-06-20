"""
One-off maintenance endpoints (Shell isn't available on Render's free plan).
Both require ?key=... matching the MAINTENANCE_KEY env var.
Remove this file (and its router registration in server.py) once run.
"""
import os
from pathlib import Path
from urllib.parse import quote

from fastapi import APIRouter, HTTPException, Query
from sqlalchemy import select, update
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
        raise HTTPException(status_code=404, detail=f"CSV not found at {CSV_PATH}.")
    from import_real_catalog import run_import
    try:
        result = await run_import(str(CSV_PATH))
        return {"status": "ok", "detail": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Import failed: {e}")


# Brand -> real bottle photo sourced from Wikimedia Commons (freely licensed,
# stable hotlink via Special:FilePath). Only the most widely recognized
# international brands in the catalog are covered here -- this is a partial
# best-effort batch (~150/687 SKUs), not full coverage.
BRAND_IMAGES = {
    "JW BLACK LABEL": "Johnnie Walker Black Label.jpg",
    "JW RED LABEL": "Johnnie Walker Red Label.jpg",
    "CHIVAS REGAL": "ChivasRegal-Wiki.JPG",
    "ABSOLUT": "Absolut vodka bottle.png",
    "SMIRNOFF": "Botellas de Smirnoff.png",
    "BACARDI": "Bacardi rum bottle.jpg",
    "CAPTAIN MORGAN": "Captain Morgan Rum - Bottle.png",
    "BAILEYS": "BaileysIrishCream.JPG",
    "COINTREAU": "Cointreau Orange Liqueur 01.jpg",
    "BOMBAY SAPPHIRE": "Bombay-sapphire.jpg",
    "HENNESSY": "Hennessy cognac bottle with drinking glass.JPG",
    "REMY MARTIN": "Remy Martin VSOP.jpg",
    "BALLANTINE": "2017 Ballantine's Finest.jpg",
    "GLENLIVET": "Bottles of The Glenlivet.JPG",
    "JAMESON": "Jameson Irish Whiskey.JPG",
}


def _commons_url(filename: str) -> str:
    return "https://commons.wikimedia.org/wiki/Special:FilePath/" + quote(filename)


@router.get("/apply-brand-images")
async def apply_brand_images(key: str = Query(...)):
    _check_key(key)
    from database import AsyncSessionLocal
    from models import Product

    updated_by_brand = {}
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Product).where(Product.is_active == True))
        products = result.scalars().all()
        for p in products:
            if p.image_url:
                continue
            name_upper = p.name.upper()
            for brand, filename in BRAND_IMAGES.items():
                if brand in name_upper:
                    p.image_url = _commons_url(filename)
                    updated_by_brand[brand] = updated_by_brand.get(brand, 0) + 1
                    break
        await db.commit()

    total = sum(updated_by_brand.values())
    return {"status": "ok", "detail": f"Set images on {total} products.", "by_brand": updated_by_brand}
