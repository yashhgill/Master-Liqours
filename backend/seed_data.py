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
            print("Database already seeded!")
            return
        
        print("Seeding database...")
        
        # Create 4 Staff members
        staff_data = [
            {"name": "Ahmad", "email": "staff1@masterliqours.com", "referral_code": "STAFF001", 
             "whatsapp_number": "+60123456701", "qr_code_url": "https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=+60123456701"},
            {"name": "Siti", "email": "staff2@masterliqours.com", "referral_code": "STAFF002",
             "whatsapp_number": "+60123456702", "qr_code_url": "https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=+60123456702"},
            {"name": "Kumar", "email": "staff3@masterliqours.com", "referral_code": "STAFF003",
             "whatsapp_number": "+60123456703", "qr_code_url": "https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=+60123456703"},
            {"name": "Lee", "email": "staff4@masterliqours.com", "referral_code": "STAFF004",
             "whatsapp_number": "+60123456704", "qr_code_url": "https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=+60123456704"},
        ]
        
        staff_list = []
        for data in staff_data:
            staff = Staff(**data)
            db.add(staff)
            staff_list.append(staff)
        
        await db.flush()  # Get staff IDs
        print(f"✓ Created {len(staff_list)} staff members")
        
        # Create Admin users
        password_hash = bcrypt.hashpw("Admin123!".encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        
        super_admin = User(
            email="superadmin@masterliqours.com",
            name="Super Admin",
            password_hash=password_hash,
            role=UserRole.SUPER_ADMIN,
            points=0,
            tier=UserTier.REGULAR
        )
        db.add(super_admin)
        
        master_admin = User(
            email="masteradmin@masterliqours.com",
            name="Master Admin",
            password_hash=password_hash,
            role=UserRole.MASTER_ADMIN,
            points=0,
            tier=UserTier.REGULAR
        )
        db.add(master_admin)
        
        # Create test customer
        customer = User(
            email="customer@test.com",
            name="Test Customer",
            password_hash=bcrypt.hashpw("Test123!".encode('utf-8'), bcrypt.gensalt()).decode('utf-8'),
            role=UserRole.CUSTOMER,
            points=1000,
            tier=UserTier.REGULAR,
            assigned_staff_id=staff_list[0].staff_id
        )
        db.add(customer)
        
        await db.flush()
        print("✓ Created admin and test users")
        
        # Create sample products
        categories = ["Whiskey", "Vodka", "Rum", "Gin", "Beer", "Wine"]
        products = [
            {"name": "Johnnie Walker Black Label", "price": 180.00, "category": "Whiskey", 
             "description": "Premium Scotch whisky with rich, smooth taste"},
            {"name": "Chivas Regal 12 Years", "price": 160.00, "category": "Whiskey",
             "description": "Blended Scotch whisky aged 12 years"},
            {"name": "Jack Daniel's Old No. 7", "price": 150.00, "category": "Whiskey",
             "description": "Tennessee whiskey with distinctive smoothness"},
            {"name": "Absolut Vodka", "price": 90.00, "category": "Vodka",
             "description": "Premium Swedish vodka, smooth and pure"},
            {"name": "Grey Goose Vodka", "price": 180.00, "category": "Vodka",
             "description": "French premium vodka with exceptional quality"},
            {"name": "Bacardi White Rum", "price": 70.00, "category": "Rum",
             "description": "Light and smooth white rum"},
            {"name": "Captain Morgan Spiced Rum", "price": 85.00, "category": "Rum",
             "description": "Spiced rum with rich vanilla notes"},
            {"name": "Bombay Sapphire Gin", "price": 110.00, "category": "Gin",
             "description": "Premium London dry gin with botanical flavors"},
            {"name": "Tanqueray Gin", "price": 100.00, "category": "Gin",
             "description": "Classic London dry gin"},
            {"name": "Heineken Beer (24 cans)", "price": 95.00, "category": "Beer",
             "description": "Premium lager beer, 24-can pack"},
            {"name": "Tiger Beer (24 cans)", "price": 85.00, "category": "Beer",
             "description": "Local favorite lager, 24-can pack"},
            {"name": "Corona Extra (12 bottles)", "price": 80.00, "category": "Beer",
             "description": "Mexican beer, 12-bottle pack"},
        ]
        
        product_list = []
        for i, prod_data in enumerate(products):
            # Distribute products among staff
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
                    quantity=50 if product.staff_id == staff.staff_id else 0
                )
                db.add(stock)
        
        print("✓ Created stock inventory")
        
        await db.commit()
        print("\n✅ Database seeded successfully!")
        print("\n📝 Login Credentials:")
        print("Super Admin: superadmin@masterliqours.com / Admin123!")
        print("Master Admin: masteradmin@masterliqours.com / Admin123!")
        print("Customer: customer@test.com / Test123!")
        print("\n🎫 Staff Referral Codes: STAFF001, STAFF002, STAFF003, STAFF004")

if __name__ == "__main__":
    asyncio.run(seed_data())
