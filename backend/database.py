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
    pool_size=5,
    max_overflow=5,
    pool_timeout=30,
    pool_recycle=1800,
    pool_pre_ping=True,
    echo=False,
    connect_args={
        "statement_cache_size": 0,  # disable asyncpg prepared-statement cache (pooler-safe)
        "command_timeout": 30,
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
