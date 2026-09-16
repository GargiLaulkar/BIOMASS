import os
import sys
from datetime import date, datetime
import bcrypt

# Adjust sys.path to find database package
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from database.db import SessionLocal, engine
from database.models import Base, User, Farm, Crop, FarmCrop, Buyer, BuyerDemand

# Password hashing
def get_password_hash(password):
    pwd_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(pwd_bytes, salt)
    return hashed.decode('utf-8')

def seed_database():
    print("Initialising database tables...")
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        # 1. Seed Crops
        print("Seeding crops...")
        crops_data = [
            {"crop_name": "Rice (Paddy)", "residue_ratio": 1.5, "recovery_factor": 0.5},
            {"crop_name": "Wheat", "residue_ratio": 1.5, "recovery_factor": 0.3},
            {"crop_name": "Sugarcane", "residue_ratio": 0.2, "recovery_factor": 0.8},
            {"crop_name": "Cotton", "residue_ratio": 2.75, "recovery_factor": 0.8},
            {"crop_name": "Maize", "residue_ratio": 1.5, "recovery_factor": 0.4}
        ]
        
        db_crops = {}
        for c in crops_data:
            existing = db.query(Crop).filter(Crop.crop_name == c["crop_name"]).first()
            if not existing:
                crop = Crop(**c)
                db.add(crop)
                db.flush()
                db_crops[c["crop_name"]] = crop
                print(f"Added crop: {c['crop_name']}")
            else:
                db_crops[c["crop_name"]] = existing
                print(f"Crop {c['crop_name']} already exists.")

        # 2. Seed Default Users
        print("Seeding default users...")
        users_data = [
            {
                "name": "Rajesh Kumar",
                "email": "farmer@bioplan.com",
                "password_hash": get_password_hash("password123"),
                "role": "farmer"
            },
            {
                "name": "Punjab Biomass Industries",
                "email": "buyer@bioplan.com",
                "password_hash": get_password_hash("password123"),
                "role": "buyer"
            }
        ]
        
        seeded_users = {}
        for u in users_data:
            existing = db.query(User).filter(User.email == u["email"]).first()
            if not existing:
                user = User(**u)
                db.add(user)
                db.flush()
                seeded_users[u["role"]] = user
                print(f"Added user: {u['email']} ({u['role']})")
            else:
                seeded_users[u["role"]] = existing
                print(f"User {u['email']} already exists.")

        # 3. Seed Default Farm (for farmer রাজেশ কুমার)
        print("Seeding default farm...")
        farmer = seeded_users.get("farmer")
        if farmer:
            existing_farm = db.query(Farm).filter(Farm.farmer_id == farmer.id).first()
            if not existing_farm:
                farm = Farm(
                    farmer_id=farmer.id,
                    farm_name="Golden Wheat Farm",
                    latitude=30.9002,
                    longitude=75.8572,
                    area=5.5,
                    district="Ludhiana",
                    state="Punjab"
                )
                db.add(farm)
                db.flush()
                print("Added farm: Golden Wheat Farm")
                
                # Add a farm crop
                farm_crop = FarmCrop(
                    farm_id=farm.id,
                    crop_id=db_crops["Rice (Paddy)"].id,
                    season="Kharif",
                    cultivated_area=5.0,
                    expected_harvest_date=date(2026, 10, 15)
                )
                db.add(farm_crop)
                print("Added farm crop entry for Golden Wheat Farm")
            else:
                print("Farm already exists.")

        # 4. Seed Buyer Profiles and Demands (Sprint 2)
        print("Seeding buyers and demands...")
        # We will seed 8-12 buyers located at varying distances around Ludhiana (30.9002, 75.8572)
        # 0.01 degrees is roughly 1.1 km
        buyers_data = [
            {
                "company_name": "Ludhiana Bio-Energy Ltd",
                "latitude": 30.9250, # ~3 km North
                "longitude": 75.8620,
                "contact_information": "info@ludhianabio.com | +91 98765 43210",
                "email": "buyer1@bioplan.com",
                "demands": [
                    {"biomass_type": "Rice (Paddy)", "qty": 150.0, "price": 2800.0, "months": 2},
                    {"biomass_type": "Wheat", "qty": 100.0, "price": 2500.0, "months": 5}
                ]
            },
            {
                "company_name": "Satluj Paper Mills",
                "latitude": 30.9850, # ~10 km North
                "longitude": 75.8800,
                "contact_information": "procurement@satlujpaper.com",
                "email": "buyer2@bioplan.com",
                "demands": [
                    {"biomass_type": "Rice (Paddy)", "qty": 500.0, "price": 2600.0, "months": 3},
                    {"biomass_type": "Wheat", "qty": 400.0, "price": 2400.0, "months": 6}
                ]
            },
            {
                "company_name": "Khanna Straw Board Factory",
                "latitude": 30.7010, # ~28 km South-East (Khanna)
                "longitude": 76.2200,
                "contact_information": "khannastraw@gmail.com",
                "email": "buyer3@bioplan.com",
                "demands": [
                    {"biomass_type": "Wheat", "qty": 200.0, "price": 2700.0, "months": 4},
                    {"biomass_type": "Maize", "qty": 150.0, "price": 2200.0, "months": 3}
                ]
            },
            {
                "company_name": "Phagwara Biomass Gasifier",
                "latitude": 31.2200, # ~40 km North-West (Phagwara)
                "longitude": 75.7700,
                "contact_information": "phagwaragas@biopower.in",
                "email": "buyer4@bioplan.com",
                "demands": [
                    {"biomass_type": "Rice (Paddy)", "qty": 120.0, "price": 3100.0, "months": 2},
                    {"biomass_type": "Cotton", "qty": 80.0, "price": 3500.0, "months": 3}
                ]
            },
            {
                "company_name": "Green Earth Pellets Jalandhar",
                "latitude": 31.3260, # ~50 km North-West (Jalandhar)
                "longitude": 75.5760,
                "contact_information": "jalandhar@greenearth.org",
                "email": "buyer5@bioplan.com",
                "demands": [
                    {"biomass_type": "Rice (Paddy)", "qty": 300.0, "price": 2900.0, "months": 3},
                    {"biomass_type": "Cotton", "qty": 150.0, "price": 3600.0, "months": 4},
                    {"biomass_type": "Maize", "qty": 100.0, "price": 2400.0, "months": 2}
                ]
            },
            {
                "company_name": "Samrala Brick Kiln Association",
                "latitude": 30.8400, # ~32 km East (Samrala)
                "longitude": 76.1900,
                "contact_information": "samralabricks@yahoo.com",
                "email": "buyer6@bioplan.com",
                "demands": [
                    {"biomass_type": "Sugarcane", "qty": 250.0, "price": 1800.0, "months": 5},
                    {"biomass_type": "Wheat", "qty": 150.0, "price": 2300.0, "months": 4}
                ]
            },
            {
                "company_name": "Malerkotla Agro Fuels",
                "latitude": 30.5200, # ~43 km South (Malerkotla)
                "longitude": 75.8900,
                "contact_information": "contact@malerkotlaagro.com",
                "email": "buyer7@bioplan.com",
                "demands": [
                    {"biomass_type": "Rice (Paddy)", "qty": 80.0, "price": 3000.0, "months": 2},
                    {"biomass_type": "Sugarcane", "qty": 200.0, "price": 1900.0, "months": 4}
                ]
            },
            {
                "company_name": "Doraha Agri-Energy Plant",
                "latitude": 30.8100, # ~15 km South-East (Doraha)
                "longitude": 76.0300,
                "contact_information": "procure@dorahapower.com",
                "email": "buyer8@bioplan.com",
                "demands": [
                    {"biomass_type": "Rice (Paddy)", "qty": 100.0, "price": 2950.0, "months": 2},
                    {"biomass_type": "Wheat", "qty": 120.0, "price": 2550.0, "months": 3},
                    {"biomass_type": "Sugarcane", "qty": 80.0, "price": 2000.0, "months": 2}
                ]
            }
        ]

        # First seed user accounts for buyers if they don't exist
        for b_idx, b in enumerate(buyers_data):
            existing_user = db.query(User).filter(User.email == b["email"]).first()
            if not existing_user:
                buyer_user = User(
                    name=b["company_name"],
                    email=b["email"],
                    password_hash=get_password_hash("password123"),
                    role="buyer"
                )
                db.add(buyer_user)
                db.flush()
                print(f"Created buyer user: {b['email']}")
            else:
                buyer_user = existing_user
            
            # Check buyer profile
            existing_profile = db.query(Buyer).filter(Buyer.user_id == buyer_user.id).first()
            if not existing_profile:
                buyer = Buyer(
                    user_id=buyer_user.id,
                    company_name=b["company_name"],
                    latitude=b["latitude"],
                    longitude=b["longitude"],
                    contact_information=b["contact_information"]
                )
                db.add(buyer)
                db.flush()
                print(f"Created buyer profile for {b['company_name']}")
            else:
                buyer = existing_profile
                
            # Seed demands for this buyer
            for d in b["demands"]:
                # Check if demand already exists
                existing_demand = db.query(BuyerDemand).filter(
                    BuyerDemand.buyer_id == buyer.id,
                    BuyerDemand.biomass_type == d["biomass_type"]
                ).first()
                if not existing_demand:
                    demand = BuyerDemand(
                        buyer_id=buyer.id,
                        biomass_type=d["biomass_type"],
                        required_quantity=d["qty"],
                        procurement_start=date(2026, 9, 1),
                        procurement_end=date(2026, 12, 31),
                        offered_price=d["price"]
                    )
                    db.add(demand)
                    print(f"  Added demand for {d['biomass_type']}: {d['qty']} tons @ {d['price']}/ton")
        
        # Seed default buyer profile for the default buyer account (buyer@bioplan.com)
        default_buyer_user = seeded_users.get("buyer")
        if default_buyer_user:
            existing_default_profile = db.query(Buyer).filter(Buyer.user_id == default_buyer_user.id).first()
            if not existing_default_profile:
                default_buyer_profile = Buyer(
                    user_id=default_buyer_user.id,
                    company_name="Punjab Biomass Industries",
                    latitude=30.9100, # ~2 km from Golden Wheat Farm
                    longitude=75.8700,
                    contact_information="procurement@punjabby.com | +91 99999 88888"
                )
                db.add(default_buyer_profile)
                db.flush()
                print("Created default buyer profile for Punjab Biomass Industries")
                
                # Add default demand
                default_demand = BuyerDemand(
                    buyer_id=default_buyer_profile.id,
                    biomass_type="Rice (Paddy)",
                    required_quantity=200.0,
                    procurement_start=date(2026, 9, 15),
                    procurement_end=date(2026, 11, 30),
                    offered_price=3050.0
                )
                db.add(default_demand)
                print("  Added default demand for Rice (Paddy)")
                
        db.commit()
        print("Database seeded successfully!")
    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
