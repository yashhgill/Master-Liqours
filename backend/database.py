import os
from pathlib import Path
from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base

# Load environment variables
load_dotenv(Path(__file__).parent / '.env')

# .strip() guards against trailing newlines/spaces from copy-pasting the URL
# into a dashboard env var (a stray newline makes the db name "postgres\n").
DATABASE_URL = os.environ.get('DATABASE_URL', 'postgresql://postgres:password@localhost:5432/masterliqours').strip()

# Remove pgbouncer=true for asyncpg
DATABASE_URL_CLEAN = DATABASE_URL.replace('?pgbouncer=true', '')

# Convert to async URL
ASYNC_DATABASE_URL = DATABASE_URL_CLEAN.replace('postgresql://', 'postgresql+asyncpg://')

# Engine config for Supabase via Supavisor pooler on a persistent server (Render).
# Use the SESSION pooler (port 5432), not the transaction pooler (6543): a
# persistent server keeps long-lived pooled connections, and the transaction
# pooler multiplexes them across backends which breaks asyncpg prepared
# statements (intermittent 500s on writes). pool_pre_ping replaces any
# connection the pooler has silently dropped, instead of erroring on first use.
engine = create_async_engine(
    ASYNC_DATABASE_URL,
    pool_size=10,          # Keep 10 connections warm at all times
    max_overflow=10,       # Allow burst to 20 total connections
    pool_timeout=10,       # Fail fast if no connection available (was 30s)
    pool_recycle=600,      # Recycle connections every 10 min (Supabase drops idle ones)
    pool_pre_ping=True,    # Verify connection alive before use
    echo=False,
    connect_args={
        "statement_cache_size": 0,  # Required for Supabase pgbouncer compatibility
        "command_timeout": 15,      # Query timeout 15s (fail fast)
        # NOTE: do NOT pass server_settings (e.g. jit) here — Supabase's
        # Supavisor pooler rejects extra startup parameters, which makes
        # every connection fail ("unsupported startup parameter").
    }
)

# Create async session
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False
)

# Create base for models
Base = declarative_base()

# Dependency for FastAPI
async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
