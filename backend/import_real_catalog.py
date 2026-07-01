"""
One-off logic: replace the placeholder seed products with the real 687-SKU
catalog (parsed from the distributor price list) at the correct selling prices.

Why soft-delete instead of hard-delete: existing orders/order_items reference
product_id with no cascading delete, so wiping rows outright would break order
history. We deactivate (is_active=False) every current product instead — they
disappear from the live shop immediately, history stays intact — then insert
the new catalog as fresh active products.

Can be run two ways:
1. CLI (needs Shell access):
   cd backend && python import_real_catalog.py /path/to/Masterliqours_Pricing_List.csv
2. Programmatically via the protected maintenance endpoint in routes_maintenance.py,
   which calls run_import() directly with the CSV bundled at backend/data/.

Category column in the CSV is used directly (already mapped to website categories:
Whiskey, Vodka, Gin, Rum, Cognac, Brandy, Tequila, Liqueur, Wine, Champagne, Beer, Sake).
guess_category() is kept as a fallback for rows with missing/unknown Category.
"""
import asyncio
import csv
import sys

from sqlalchemy import update
from database import AsyncSessionLocal
from models import Product

# Valid website categories
VALID_CATEGORIES = {
    "Whiskey", "Vodka", "Gin", "Rum", "Cognac", "Brandy",
    "Tequila", "Liqueur", "Wine", "Champagne", "Beer", "Sake"
}

CATEGORY_KEYWORDS = [
    ("Cognac",    ["MARTELL", "REMY MARTIN", "HENNESSY", "COURVOISIER", "DELAMAIN",
                   "CAMUS", "HINE", "LOUIS XIII", "MEUKOW", "OTARD", "KELT", "HARDY",
                   "PIERRE FERRAND", "COGNAC"]),
    ("Champagne", ["CHAMPAGNE", "MOET", "DOM PERIGNON", "FREIXENET", "VEUVE CLICQUOT",
                   "PERRIER-JOUET", "BOLLINGER", "KRUG", "POL ROGER", "TAITTINGER",
                   "PIPER-HEIDSIECK", "PROSECCO"]),
    ("Sake",      ["SAKE", "SOJU", "SHOCHU", "HAKUTSURU", "GEKKEIKAN"]),
    ("Tequila",   ["TEQUILA", "MEZCAL", "JOSE CUERVO", "PATRON", "DON JULIO", "CAMINO",
                   "SAUZA", "CASAMIGOS", "HERRADURA", "OLMECA", "ESPOLON", "EL JIMADOR"]),
    ("Gin",       ["GIN", "BOMBAY SAPPHIRE", "BOMBAY BRAMBLE", "BEEFEATER", "TANQUERAY",
                   "HENDRICK", "MONKEY 47", "WHITLEY", "BOTANIST", "MALFY", "ROKU",
                   "SIPSMITH", "BULLDOG"]),
    ("Vodka",     ["VODKA", "ABSOLUT", "SMIRNOFF", "GREY GOOSE", "CIROC", "BELVEDERE",
                   "SKYY", "FINLANDIA", "DANZKA", "STOLICHNAYA", "KETEL ONE",
                   "ZUBROWKA", "WYBOROWA", "KING ROBERT II VODKA"]),
    ("Rum",       ["RUM", "BACARDI", "CAPTAIN MORGAN", "SAILOR JERRY", "MALIBU",
                   "OLD MONK", "MCDOWELL CELEBRATION", "APPLETON", "PLANTATION",
                   "RON ZACAPA", "HAVANA CLUB", "DIPLOMATICO", "BUMBU", "KRAKEN"]),
    ("Brandy",    ["BRANDY", "1848", "BARDINET", "EMPERADOR", "HONEY BEE", "KYRON",
                   "RAYNAL", "ST REMY", "ST-REMY", "BRITISH EMPIRE", "KLIPDRIFT",
                   "TORRES", "CARLOS I", "METAXA", "ASBACH"]),
    ("Liqueur",   ["BAILEYS", "KAHLUA", "JAGERMEISTER", "COINTREAU", "SAMBUCA",
                   "MIDORI", "DRAMBUIE", "GALLIANO", "BENEDICTINE", "TRIPLE SEC",
                   "MARTINI ", "PIMMS", "DE KUYPER", "BOLS", "DISARONNO", "AMARETTO",
                   "CHAMBORD", "GRAND MARNIER", "LIMONCELLO", "APEROL", "CAMPARI",
                   "TIA MARIA", "FRANGELICO", "CHARTREUSE", "SOUTHERN COMFORT",
                   "LICOR 43", "LUXARDO", "PASSOA", "CREME DE", "LIQUEUR"]),
    # Whiskey BEFORE Beer so "JAMESON CASKMATES STOUT EDITION" -> Whiskey not Beer
    ("Whiskey",   ["WHISKY", "WHISKEY", "SCOTCH", "BOURBON", "ABERFELDY", "ABERLOUR",
                   "ARDBEG", "ARDMORE", "AUCHENTOSHAN", "BALVENIE", "BOWMORE",
                   "BRUICHLADDICH", "BUNNAHABHAIN", "CAOL ILA", "CARDHU", "CRAGGANMORE",
                   "DALMORE", "DALWHINNIE", "DEANSTON", "EDRADOUR", "FAMOUS GROUSE",
                   "GLENDRONACH", "GLENFARCLAS", "GLENFIDDICH", "GLENKINCHIE",
                   "GLENLIVET", "GLENMORANGIE", "GLENROTHES", "HIGHLAND PARK", "JURA",
                   "JACK DANIEL", "JAMESON", "JOHNNIE WALKER", "KNOCKANDO", "LAPHROAIG",
                   "LONGMORN", "MACALLAN", "MONKEY SHOULDER", "MORTLACH", "OBAN",
                   "OCTOMORE", "PULTENEY", "PASSPORT", "ROYAL SALUTE", "SINGLETON",
                   "SPEYBURN", "TALISKER", "TAMNAVULIN", "TEACHER", "TOMATIN",
                   "CHIVAS", "BALLANTINE", "DEWAR", "J&B", "VAT 69", "BLACK DOG",
                   "ANTIQUITY", "BLENDERS PRIDE", "BAGPIPER", "DIRECTOR SPECIAL",
                   "8PM", "ROYAL STAG", "SIGNATURE", "IMPERIAL BLUE",
                   "100 PIPERS", "WHYTE", "100PIPERS"]),
    ("Beer",      ["BEER", "LAGER", "STOUT", "ALE ", "PILSNER", "HEINEKEN", "TIGER",
                   "CARLSBERG", "GUINNESS", "CORONA", "ASAHI", "SAPPORO", "CHANG",
                   "SINGHA", "BUDWEISER", "STELLA ARTOIS"]),
    ("Wine",      ["WINE", "MERLOT", "SHIRAZ", "CABERNET", "CHARDONNAY", "PINOT",
                   "SAUVIGNON", "ROSE ", "ROUGE", "BLANC", "BORDEAUX", "MOSCATO"]),
]


def guess_category(name: str) -> str:
    """Fallback category guesser from product name keywords."""
    upper = name.upper()
    for category, keywords in CATEGORY_KEYWORDS:
        if any(k in upper for k in keywords):
            return category
    return "Whiskey"


async def run_import(csv_path: str) -> str:
    """
    Deactivates all current products and inserts the real catalog from csv_path.
    Uses the 'Category' column in the CSV directly (already mapped to website
    categories). Falls back to keyword guessing if column is missing/invalid.
    Returns a short status string.
    """
    rows = []
    with open(csv_path, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            rows.append(row)

    if not rows:
        return "CSV had 0 rows — nothing imported."

    async with AsyncSessionLocal() as db:
        await db.execute(update(Product).values(is_active=False))
        await db.flush()

        created = 0
        for r in rows:
            product_name = r.get("Product Name", "").strip()
            size = r.get("Size", "").strip()
            full_name = f"{product_name} {size}".strip() if size else product_name

            try:
                price = float(r.get("Bottle Selling Price (RM)", 0) or 0)
                original_price = float(r.get("Bottle Original Price (RM)", 0) or 0)
                bottle_cost = float(r.get("Bottle Cost Price (RM)", 0) or 0)
                carton_qty = r.get("Bottles Per Carton", "")
                carton_sell = r.get("Carton Selling Price (RM)", "")
                carton_cost = r.get("Carton Cost Price (RM)", "")
            except (ValueError, TypeError):
                continue

            # Use Category column if valid, else fall back to keyword guessing
            csv_category = r.get("Category", "").strip()
            category = csv_category if csv_category in VALID_CATEGORIES else guess_category(product_name)

            description = ""
            if carton_qty and carton_sell:
                description = (
                    f"{carton_qty}-bottle carton available at RM{carton_sell} "
                    f"(RM{carton_cost} cost). Ask staff for bulk/event pricing."
                )

            if not full_name or price <= 0:
                continue

            db.add(Product(
                name=full_name,
                price=price,
                original_price=original_price if original_price > 0 else None,
                category=category,
                description=description,
                image_url=None,
                is_active=True,
                staff_id=None,
            ))
            created += 1

        await db.commit()

    return f"Deactivated old products. Inserted {created} catalog products across {len(VALID_CATEGORIES)} categories."


async def main(csv_path: str):
    result = await run_import(csv_path)
    print(result)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python import_real_catalog.py /path/to/Masterliqours_Pricing_List.csv")
        sys.exit(1)
    asyncio.run(main(sys.argv[1]))
