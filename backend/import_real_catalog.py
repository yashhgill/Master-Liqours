"""
One-off script: replace the placeholder seed products with the real 687-SKU
catalog (parsed from the distributor price list) at the correct selling prices.

Why soft-delete instead of hard-delete: existing orders/order_items reference
product_id with no cascading delete, so wiping rows outright would break order
history. We deactivate (is_active=False) every current product instead — they
disappear from the live shop immediately, history stays intact — then insert
the new catalog as fresh active products.

Run once after `pip install -r requirements.txt`:
    cd backend && python import_real_catalog.py /path/to/Masterliqours_Pricing_List.csv

Images are left blank (image_url=None) — the frontend already falls back to a
generic bottle photo for products with no image. Bulk image upload is a
separate follow-up (see routes_uploads.py for the existing per-product image
upload endpoint, or batch-assign image_url directly via DB once you have URLs).
"""
import asyncio
import csv
import sys

from sqlalchemy import select, update
from database import AsyncSessionLocal
from models import Product

CATEGORY_KEYWORDS = [
    ("Cognac", ["MARTELL", "REMY MARTIN", "HENNESSY", "COURVOISIER"]),
    ("Brandy", ["BRANDY", "1848", "BARDINET", "EMPERADOR", "HONEY BEE", "KYRON", "RAYNAL", "ST REMY", "BRITISH EMPIRE"]),
    ("Champagne", ["CHAMPAGNE", "MOET", "DOM PERIGNON", "FREIXENET"]),
    ("Tequila", ["TEQUILA", "JOSE CUERVO", "PATRON", "DON JULIO", "CAMINO", "SAUZA"]),
    ("Liqueur", ["BAILEYS", "KAHLUA", "JAGERMEISTER", "COINTREAU", "SAMBUCA", "MIDORI", "DRAMBUIE", "GALLIANO",
                 "BENEDICTINE", "TRIPLE SEC", "MARTINI ", "PIMMS", "DE KUYPER", "BOLS"]),
    ("Gin", ["GIN"]),
    ("Vodka", ["VODKA", "ABSOLUT", "SMIRNOFF", "GREY GOOSE", "CIROC", "BELVEDERE", "SKYY", "FINLANDIA",
               "DANZKA", "STOLICHANIYA", "KING ROBERT II VODKA"]),
    ("Rum", ["RUM", "BACARDI", "CAPTAIN MORGAN", "SAILOR JERRY", "MALIBU", "OLD MONK", "MCDOWELL CELEBRATION"]),
    ("Wine", ["WINE", "MERLOT", "SHIRAZ", "CABERNET", "CHARDONNAY", "PINOT", "SAUVIGNON", "ROSE", "ROUGE",
              "BLANC", "BORDEAUX", "MOSCATO"]),
]


def guess_category(name: str) -> str:
    upper = name.upper()
    for category, keywords in CATEGORY_KEYWORDS:
        if any(k in upper for k in keywords):
            return category
    # Default bucket: whisky/whiskey is the largest single group in this list
    return "Whiskey"


async def main(csv_path: str):
    rows = []
    with open(csv_path, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            rows.append(row)

    async with AsyncSessionLocal() as db:
        # 1) Deactivate every existing product instead of deleting (keeps order history intact)
        await db.execute(update(Product).values(is_active=False))
        await db.flush()
        print("Deactivated existing placeholder products.")

        created = 0
        for r in rows:
            full_name = f"{r['Product Name']} {r['Size']}".strip()
            price = float(r["Bottle Selling Price (RM)"])
            original_price = float(r["Bottle Original Price (RM)"])
            category = guess_category(r["Product Name"]) if r["Category"] == "Premium Spirits & Liquors" else (
                "Wine" if r["Category"] == "Wine" else guess_category(r["Product Name"])
            )
            description = (
                f"{r['Bottles Per Carton']}-bottle carton also available at RM{r['Carton Selling Price (RM)']} "
                f"(RM{r['Carton Cost Price (RM)']} cost). Ask staff for bulk/event pricing."
            )
            db.add(Product(
                name=full_name,
                price=price,
                original_price=original_price,
                category=category,
                description=description,
                image_url=None,
                is_active=True,
                staff_id=None,
            ))
            created += 1

        await db.commit()
        print(f"Inserted {created} real catalog products at the agreed 35% markup pricing.")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python import_real_catalog.py /path/to/Masterliqours_Pricing_List.csv")
        sys.exit(1)
    asyncio.run(main(sys.argv[1]))
