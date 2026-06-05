"""
Seed script to populate initial data for Masterliqours
Run with: python seed_data.py

NOTE: Per user request — no staff are seeded. Yash adds staff via Admin → Staff tab.
Products and customers are created with NULL staff_id (unassigned).
"""
import asyncio
import bcrypt
from sqlalchemy import select
from database import AsyncSessionLocal
from models import User, Product, UserRole, UserTier

async def seed_data():
    async with AsyncSessionLocal() as db:
        # Idempotency check — bail if admins exist
        result = await db.execute(select(User).where(User.email == "yash@masterliqours.my"))
        if result.scalars().first():
            print("Database already seeded! Skipping...")
            return

        print("Seeding database with real data...")

        # Create Admin users
        password_hash = bcrypt.hashpw("Admin123!".encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

        super_admin = User(
            email="yash@masterliqours.my",
            name="Yash",
            password_hash=password_hash,
            role=UserRole.SUPER_ADMIN,
            points=0,
            tier=UserTier.REGULAR,
        )
        db.add(super_admin)

        master_admin = User(
            email="jojo@masterliqours.my",
            name="Jojo",
            password_hash=password_hash,
            role=UserRole.MASTER_ADMIN,
            points=0,
            tier=UserTier.REGULAR,
        )
        db.add(master_admin)

        test_customers = [
            {"email": "customer1@test.com", "name": "Ahmad Test", "points": 1000, "tier": UserTier.REGULAR},
            {"email": "customer2@test.com", "name": "Siti Gold", "points": 6000, "tier": UserTier.GOLD},
            {"email": "customer3@test.com", "name": "Kumar Platinum", "points": 15000, "tier": UserTier.PLATINUM},
        ]
        for c in test_customers:
            db.add(User(
                email=c["email"], name=c["name"],
                password_hash=bcrypt.hashpw("Test123!".encode('utf-8'), bcrypt.gensalt()).decode('utf-8'),
                role=UserRole.CUSTOMER, points=c["points"], tier=c["tier"],
            ))

        await db.flush()
        print("✓ Created admins (Yash, Jojo) and test customers")

        products = [
            ("Johnnie Walker Black Label", 180.00, "Whiskey", "Premium Scotch whisky dengan rasa yang smooth dan kaya", "https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=400"),
            ("Chivas Regal 12 Years", 160.00, "Whiskey", "Blended Scotch whisky berumur 12 tahun", "https://images.unsplash.com/photo-1582559372050-2d28c36eb04b?w=400"),
            ("Jack Daniel's Old No. 7", 150.00, "Whiskey", "Tennessee whiskey yang famous", "https://images.unsplash.com/photo-1566754072515-e15b92f5d93a?w=400"),
            ("Glenfiddich 12 Years", 200.00, "Whiskey", "Single malt Scotch whisky terbaik", "https://images.unsplash.com/photo-1618885472179-5e474019f2a9?w=400"),
            ("Absolut Vodka", 90.00, "Vodka", "Premium Swedish vodka yang smooth", "https://images.unsplash.com/photo-1563217373-2a29d6682155?w=400"),
            ("Grey Goose Vodka", 180.00, "Vodka", "French premium vodka berkualiti tinggi", "https://images.unsplash.com/photo-1613294228577-b6c1c8f4f6e4?w=400"),
            ("Bacardi White Rum", 70.00, "Rum", "Light rum yang smooth untuk cocktail", "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=400"),
            ("Captain Morgan Spiced Rum", 85.00, "Rum", "Spiced rum dengan rasa vanilla", "https://images.unsplash.com/photo-1527281400156-5fc933d3d1eb?w=400"),
            ("Bombay Sapphire Gin", 110.00, "Gin", "Premium London dry gin dengan botanical flavors", "https://images.unsplash.com/photo-1602977863861-a12e9ccac06e?w=400"),
            ("Tanqueray Gin", 100.00, "Gin", "Classic London dry gin yang popular", "https://images.unsplash.com/photo-1622070883723-612c52b33ba1?w=400"),
            ("Heineken Beer (24 tin)", 95.00, "Beer", "Premium lager beer, 24-tin pack", "https://images.unsplash.com/photo-1608270586620-248524c67de9?w=400"),
            ("Tiger Beer (24 tin)", 85.00, "Beer", "Local favorite lager, 24-tin pack", "https://images.unsplash.com/photo-1618183479302-1e0aa382c36b?w=400"),
            ("Corona Extra (12 botol)", 80.00, "Beer", "Mexican beer yang famous, 12-bottle pack", "https://images.unsplash.com/photo-1612528443702-f6741f70a049?w=400"),
            ("Cabernet Sauvignon Red Wine", 120.00, "Wine", "Full-bodied red wine dari California", "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400"),
            ("Chardonnay White Wine", 110.00, "Wine", "Smooth white wine untuk special occasions", "https://images.unsplash.com/photo-1547595628-c61a29f496f0?w=400"),
        ]
        for name, price, category, description, image_url in products:
            db.add(Product(name=name, price=price, category=category, description=description, image_url=image_url, staff_id=None))

        await db.flush()
        print(f"✓ Created {len(products)} products (all unassigned — Yash assigns staff later)")

        await db.commit()
        print("\n✅ Database seeded successfully!")
        print("\n📝 Login Credentials:")
        print("Admin (Yash): yash@masterliqours.my / Admin123!")
        print("Admin (Jojo): jojo@masterliqours.my / Admin123!")
        print("Customers: customer1/2/3@test.com / Test123!")
        print("\nStaff: NONE seeded — Yash adds via /admin → Staff tab")

if __name__ == "__main__":
    asyncio.run(seed_data())
