"""
Seed script to populate initial data for Masterliqours
Run with: python seed_data.py
"""
import asyncio
import bcrypt
from datetime import datetime, timezone
from sqlalchemy import select
from database import AsyncSessionLocal
from models import User, Staff, Product, UserRole, UserTier, Stock

async def seed_data():
    async with AsyncSessionLocal() as db:
        # Check if data already exists
        result = await db.execute(select(Staff))
        if result.scalars().first():
            print("Database already seeded! Skipping...")
            return
        
        print("Seeding database with real data...")
        
        # Create 4 Staff members with real names
        staff_data = [
            {"name": "Sam", "email": "sam@masterliqours.my", "referral_code": "SAM001", 
             "whatsapp_number": "+60126884925", "qr_code_url": "https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=+60126884925"},
            {"name": "Logen", "email": "logen@masterliqours.my", "referral_code": "LOGEN002",
             "whatsapp_number": "+60126884924", "qr_code_url": "https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=+60126884924"},
            {"name": "Mukesh", "email": "mukesh@masterliqours.my", "referral_code": "MUKESH003",
             "whatsapp_number": "+60126884925", "qr_code_url": "https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=+60126884925"},
            {"name": "Sharvin", "email": "sharvin@masterliqours.my", "referral_code": "SHARVIN004",
             "whatsapp_number": "+60126884924", "qr_code_url": "https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=+60126884924"},
        ]
        
        staff_list = []
        for data in staff_data:
            staff = Staff(**data)
            db.add(staff)
            staff_list.append(staff)
        
        await db.flush()
        print(f"✓ Created {len(staff_list)} staff members: Sam, Logen, Mukesh, Sharvin")
        
        # Create Admin users
        password_hash = bcrypt.hashpw("Admin123!".encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        
        # Super Admin - Yash
        super_admin = User(
            email="yash@masterliqours.my",
            name="Yash",
            password_hash=password_hash,
            role=UserRole.SUPER_ADMIN,
            points=0,
            tier=UserTier.REGULAR
        )
        db.add(super_admin)
        
        # Master Admin - Jojo (Boss)
        master_admin = User(
            email="jojo@masterliqours.my",
            name="Jojo",
            password_hash=password_hash,
            role=UserRole.MASTER_ADMIN,
            points=0,
            tier=UserTier.REGULAR
        )
        db.add(master_admin)
        
        # Create test customers with different tiers
        test_customers = [
            {"email": "customer1@test.com", "name": "Ahmad Test", "points": 1000, "tier": UserTier.REGULAR},
            {"email": "customer2@test.com", "name": "Siti Gold", "points": 6000, "tier": UserTier.GOLD},
            {"email": "customer3@test.com", "name": "Kumar Platinum", "points": 15000, "tier": UserTier.PLATINUM},
        ]
        
        for i, customer_data in enumerate(test_customers):
            customer = User(
                email=customer_data["email"],
                name=customer_data["name"],
                password_hash=bcrypt.hashpw("Test123!".encode('utf-8'), bcrypt.gensalt()).decode('utf-8'),
                role=UserRole.CUSTOMER,
                points=customer_data["points"],
                tier=customer_data["tier"],
                assigned_staff_id=staff_list[i % len(staff_list)].staff_id
            )
            db.add(customer)
        
        await db.flush()
        print("✓ Created admins (Yash, Jojo) and test customers")
        
        # Create sample products with Malaysian context
        products = [
            {"name": "Johnnie Walker Black Label", "price": 180.00, "category": "Whiskey", 
             "description": "Premium Scotch whisky dengan rasa yang smooth dan kaya", "image_url": "https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=400"},
            {"name": "Chivas Regal 12 Years", "price": 160.00, "category": "Whiskey",
             "description": "Blended Scotch whisky berumur 12 tahun", "image_url": "https://images.unsplash.com/photo-1582559372050-2d28c36eb04b?w=400"},
            {"name": "Jack Daniel's Old No. 7", "price": 150.00, "category": "Whiskey",
             "description": "Tennessee whiskey yang famous", "image_url": "https://images.unsplash.com/photo-1566754072515-e15b92f5d93a?w=400"},
            {"name": "Glenfiddich 12 Years", "price": 200.00, "category": "Whiskey",
             "description": "Single malt Scotch whisky terbaik", "image_url": "https://images.unsplash.com/photo-1618885472179-5e474019f2a9?w=400"},
            
            {"name": "Absolut Vodka", "price": 90.00, "category": "Vodka",
             "description": "Premium Swedish vodka yang smooth", "image_url": "https://images.unsplash.com/photo-1563217373-2a29d6682155?w=400"},
            {"name": "Grey Goose Vodka", "price": 180.00, "category": "Vodka",
             "description": "French premium vodka berkualiti tinggi", "image_url": "https://images.unsplash.com/photo-1613294228577-b6c1c8f4f6e4?w=400"},
            
            {"name": "Bacardi White Rum", "price": 70.00, "category": "Rum",
             "description": "Light rum yang smooth untuk cocktail", "image_url": "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=400"},
            {"name": "Captain Morgan Spiced Rum", "price": 85.00, "category": "Rum",
             "description": "Spiced rum dengan rasa vanilla", "image_url": "https://images.unsplash.com/photo-1527281400156-5fc933d3d1eb?w=400"},
            
            {"name": "Bombay Sapphire Gin", "price": 110.00, "category": "Gin",
             "description": "Premium London dry gin dengan botanical flavors", "image_url": "https://images.unsplash.com/photo-1602977863861-a12e9ccac06e?w=400"},
            {"name": "Tanqueray Gin", "price": 100.00, "category": "Gin",
             "description": "Classic London dry gin yang popular", "image_url": "https://images.unsplash.com/photo-1622070883723-612c52b33ba1?w=400"},
            
            {"name": "Heineken Beer (24 tin)", "price": 95.00, "category": "Beer",
             "description": "Premium lager beer, 24-tin pack", "image_url": "https://images.unsplash.com/photo-1608270586620-248524c67de9?w=400"},
            {"name": "Tiger Beer (24 tin)", "price": 85.00, "category": "Beer",
             "description": "Local favorite lager, 24-tin pack", "image_url": "https://images.unsplash.com/photo-1618183479302-1e0aa382c36b?w=400"},
            {"name": "Corona Extra (12 botol)", "price": 80.00, "category": "Beer",
             "description": "Mexican beer yang famous, 12-bottle pack", "image_url": "https://images.unsplash.com/photo-1612528443702-f6741f70a049?w=400"},
            
            {"name": "Cabernet Sauvignon Red Wine", "price": 120.00, "category": "Wine",
             "description": "Full-bodied red wine dari California", "image_url": "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400"},
            {"name": "Chardonnay White Wine", "price": 110.00, "category": "Wine",
             "description": "Smooth white wine untuk special occasions", "image_url": "https://images.unsplash.com/photo-1547595628-c61a29f496f0?w=400"},
        ]
        
        product_list = []
        for i, prod_data in enumerate(products):
            staff = staff_list[i % len(staff_list)]
            product = Product(**prod_data, staff_id=staff.staff_id)
            db.add(product)
            product_list.append(product)
        
        await db.flush()
        print(f"✓ Created {len(product_list)} products")
        
        # Create stock for each product
        for product in product_list:
            for staff in staff_list:
                stock = Stock(
                    product_id=product.product_id,
                    staff_id=staff.staff_id,
                    quantity=50 if product.staff_id == staff.staff_id else 10
                )
                db.add(stock)
        
        print("✓ Created stock inventory")
        
        await db.commit()
        print("\n✅ Database seeded successfully dengan real data!")
        print("\n📝 Login Credentials:")
        print("Super Admin (Yash): yash@masterliqours.my / Admin123!")
        print("Master Admin (Jojo): jojo@masterliqours.my / Admin123!")
        print("Test Customers: customer1@test.com, customer2@test.com, customer3@test.com / Test123!")
        print("\n👥 Staff Names: Sam, Logen, Mukesh, Sharvin")
        print("🎫 Referral Codes: SAM001, LOGEN002, MUKESH003, SHARVIN004")
        print("📱 WhatsApp: +60126884925, +60126884924")

if __name__ == "__main__":
    asyncio.run(seed_data())
