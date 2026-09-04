"""
One-shot R2 image migration script.
Run via: python3 migrate_r2.py
Reads all product image_urls from Supabase, fetches each from the old
public R2 CDN, and uploads to Jojo's new R2 bucket.
Skips images already in the new bucket (safe to re-run).
"""
import asyncio, os, sys, httpx, boto3, re
from botocore.exceptions import ClientError
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text

DATABASE_URL = os.environ["DATABASE_URL"]
NEW_ACCESS   = os.environ["R2_ACCESS_KEY_ID"]
NEW_SECRET   = os.environ["R2_SECRET_ACCESS_KEY"]
NEW_BUCKET   = os.environ.get("R2_BUCKET", "masterliqours-uploads")
NEW_ENDPOINT = os.environ.get("R2_ENDPOINT", "https://445c07f7a7bf94c62631b98c0653db9f.r2.cloudflarestorage.com")
NEW_PUBLIC   = os.environ.get("R2_PUBLIC_URL", "https://pub-7c892300de0d42388cce513eaa83b1bb.r2.dev")

# Convert asyncpg URL to async SQLAlchemy URL
db_url = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://").strip().strip('"')

new_s3 = boto3.client(
    's3',
    endpoint_url=NEW_ENDPOINT,
    aws_access_key_id=NEW_ACCESS,
    aws_secret_access_key=NEW_SECRET,
    region_name="auto"
)

def extract_key(url: str) -> str | None:
    """Extract the object key from any R2 public URL."""
    # Matches: https://pub-xxx.r2.dev/filename.png
    m = re.search(r'r2\.dev/(.+)$', url)
    if m:
        return m.group(1)
    return None

def already_in_new(key: str) -> bool:
    try:
        new_s3.head_object(Bucket=NEW_BUCKET, Key=key)
        return True
    except ClientError:
        return False

async def migrate():
    engine = create_async_engine(db_url, pool_pre_ping=True)
    async with AsyncSession(engine) as session:
        result = await session.execute(
            text("SELECT product_id, name, image_url FROM products WHERE image_url IS NOT NULL AND image_url != ''")
        )
        products = result.fetchall()

    print(f"Found {len(products)} products with images")
    ok = skip = fail = 0

    async with httpx.AsyncClient(timeout=30) as http:
        for pid, name, url in products:
            key = extract_key(url)
            if not key:
                print(f"  SKIP (can't parse URL): {url[:60]}")
                skip += 1
                continue

            if already_in_new(key):
                skip += 1
                continue

            try:
                resp = await http.get(url)
                if resp.status_code != 200:
                    print(f"  FAIL {resp.status_code}: {name[:40]}")
                    fail += 1
                    continue

                content_type = resp.headers.get("content-type", "image/png")
                new_s3.put_object(
                    Bucket=NEW_BUCKET,
                    Key=key,
                    Body=resp.content,
                    ContentType=content_type,
                )
                ok += 1
                if ok % 50 == 0:
                    print(f"  Migrated {ok} images so far...")

            except Exception as e:
                print(f"  ERROR {name[:40]}: {e}")
                fail += 1

    print(f"\nDone: {ok} migrated, {skip} skipped, {fail} failed")
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(migrate())
