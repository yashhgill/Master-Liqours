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


# Raw, idempotent SQL (safe to re-run) -- adds shared-warehouse support without
# relying on `alembic upgrade head`, since this DB's alembic version tracking
# has been unreliable in the past (tables created via create_all() at startup
# rather than through migrations, so alembic's view of "current state" drifts
# from reality).
_STATEMENTS = [
    """
    CREATE TABLE IF NOT EXISTS warehouses (
        warehouse_id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        created_at TIMESTAMP
    )
    """,
    "ALTER TABLE staff ADD COLUMN IF NOT EXISTS warehouse_id VARCHAR(36)",
    "CREATE INDEX IF NOT EXISTS ix_staff_warehouse_id ON staff (warehouse_id)",
    """
    DO $$
    BEGIN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints
            WHERE constraint_name = 'fk_staff_warehouse_id'
        ) THEN
            ALTER TABLE staff
            ADD CONSTRAINT fk_staff_warehouse_id
            FOREIGN KEY (warehouse_id) REFERENCES warehouses(warehouse_id) ON DELETE SET NULL;
        END IF;
    END $$;
    """,
    "ALTER TABLE stocks ADD COLUMN IF NOT EXISTS warehouse_id VARCHAR(36)",
    "CREATE INDEX IF NOT EXISTS ix_stocks_warehouse_id ON stocks (warehouse_id)",
    """
    DO $$
    BEGIN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints
            WHERE constraint_name = 'fk_stocks_warehouse_id'
        ) THEN
            ALTER TABLE stocks
            ADD CONSTRAINT fk_stocks_warehouse_id
            FOREIGN KEY (warehouse_id) REFERENCES warehouses(warehouse_id) ON DELETE SET NULL;
        END IF;
    END $$;
    """,
]


@router.get("/migrate-warehouse")
async def migrate_warehouse(key: str = Query(...)):
    _check_key(key)
    from database import AsyncSessionLocal
    ran = []
    try:
        async with AsyncSessionLocal() as db:
            for stmt in _STATEMENTS:
                await db.execute(text(stmt))
                ran.append(stmt.strip().splitlines()[0][:60])
            await db.commit()
        return {"status": "ok", "ran": ran}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Migration failed: {e}")
