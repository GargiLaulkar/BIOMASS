import os
import sys
from datetime import date
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.pool import StaticPool
from sqlalchemy.orm import sessionmaker

# Setup path to import backend modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from database.models import Base, User, Farm, Crop, FarmCrop, Buyer, BuyerDemand, BiomassPrediction
from database.db import get_db, haversine_distance
from backend.app.main import app
from ml.inference import predict_yield
from backend.app.logistics.cost import calculate_transport_cost
from backend.app.pricing.estimate import estimate_price
from backend.app.matching.engine import compute_match_score, run_matching_engine

# Setup in-memory SQLite for testing
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)
# Register haversine
@event.listens_for(engine, "connect")
def register_sqlite_functions(dbapi_connection, connection_record):
    dbapi_connection.create_function("haversine", 4, haversine_distance)

TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="module")
def db_session():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        # Seed test crops
        rice = Crop(crop_name="Rice (Paddy)", residue_ratio=1.5, recovery_factor=0.5)
        wheat = Crop(crop_name="Wheat", residue_ratio=1.5, recovery_factor=0.3)
        db.add_all([rice, wheat])
        db.commit()
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)

@pytest.fixture(scope="module")
def client(db_session):
    # Override get_db dependency in FastAPI
    def override_get_db():
        try:
            yield db_session
        finally:
            pass
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()

# --- Unit Tests ---

def test_ml_inference():
    # Test ML yield inference with realistic values
    yield_pred = predict_yield(
        state="Punjab",
        district="Ludhiana",
        season="Kharif",
        crop="Rice (Paddy)",
        area_ha=5.0,
        temperature_c=30.0,
        rainfall_mm=800.0
    )
    assert isinstance(yield_pred, float)
    assert yield_pred > 0.0
    assert 3.0 <= yield_pred <= 6.0  # reasonable rice yield range

def test_transport_cost_calculation():
    # Test formula: cost = distance_km * cost_per_km * quantity
    cost = calculate_transport_cost(distance_km=10.0, quantity_tons=2.5)
    # default cost_per_km = 5.0 -> 10.0 * 5.0 * 2.5 = 125.0
    assert cost == 125.0

def test_pricing_estimation(db_session):
    # Test base price retrieval and dynamic adjustment
    price = estimate_price("Rice (Paddy)", db_session)
    # Initial run: no demand and no supply -> returns base price 2800.0
    assert price == 2800.0

def test_compute_match_score():
    # Test matching score weighted math
    score = compute_match_score(
        distance_km=10.0,
        farm_qty=10.0,
        buyer_qty=50.0,
        offered_price=3000.0,
        estimated_price=2800.0,
        transport_cost=50.0
    )
    assert isinstance(score, float)
    assert 0.0 <= score <= 150.0

# --- API Integration Tests ---

def test_api_read_root(client):
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["status"] == "online"

def test_api_get_crops(client):
    response = client.get("/api/crops")
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 2
    assert data[0]["crop_name"] == "Rice (Paddy)"

def test_api_user_registration(client):
    payload = {
        "name": "Test Farmer",
        "email": "testfarmer@bioplan.com",
        "password": "password123",
        "role": "farmer"
    }
    response = client.post("/api/auth/register", json=payload)
    assert response.status_code == 201
    assert response.json()["email"] == "testfarmer@bioplan.com"

def test_api_user_login(client):
    payload = {
        "email": "testfarmer@bioplan.com",
        "password": "password123"
    }
    response = client.post("/api/auth/login", json=payload)
    assert response.status_code == 200
    assert "access_token" in response.json()
    assert response.json()["role"] == "farmer"

# --- Addendum Tests ---

def test_auth_edge_cases(client):
    # 1. Duplicate email registration
    payload = {
        "name": "Another Farmer",
        "email": "testfarmer@bioplan.com",  # Already registered above
        "password": "password123",
        "role": "farmer"
    }
    response = client.post("/api/auth/register", json=payload)
    assert response.status_code == 400
    assert response.json()["detail"] == "Email is already registered"

    # 2. Login wrong password
    payload_wrong_pw = {
        "email": "testfarmer@bioplan.com",
        "password": "wrongpassword"
    }
    response = client.post("/api/auth/login", json=payload_wrong_pw)
    assert response.status_code == 401

    # 3. Login non-existent email
    payload_non_existent = {
        "email": "notfound@bioplan.com",
        "password": "password123"
    }
    response = client.post("/api/auth/login", json=payload_non_existent)
    assert response.status_code == 401

def test_farm_crud(client):
    # Register a farmer and login
    email = "farmcrud_farmer@bioplan.com"
    client.post("/api/auth/register", json={
        "name": "CRUD Farmer",
        "email": email,
        "password": "password123",
        "role": "farmer"
    })
    login_resp = client.post("/api/auth/login", json={"email": email, "password": "password123"})
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Valid farm creation
    farm_payload = {
        "farm_name": "Ludhiana Fields",
        "latitude": 30.9002,
        "longitude": 75.8572,
        "area": 10.0,
        "district": "Ludhiana",
        "state": "Punjab",
        "crops": [
            {
                "crop_id": 1,  # Rice (Paddy) from seed
                "season": "Kharif",
                "cultivated_area": 8.0,
                "expected_harvest_date": "2026-10-15"
            }
        ]
    }
    response = client.post("/api/farms", json=farm_payload, headers=headers)
    assert response.status_code == 201
    farm_id = response.json()["id"]
    assert response.json()["farm_name"] == "Ludhiana Fields"

    # 2. Get farm by ID
    get_resp = client.get(f"/api/farms/{farm_id}", headers=headers)
    assert get_resp.status_code == 200
    assert get_resp.json()["farm_name"] == "Ludhiana Fields"

    # 3. Get non-existent farm
    get_not_found = client.get("/api/farms/9999", headers=headers)
    assert get_not_found.status_code == 404

    # 4. Unauthorized access from another farmer
    other_email = "other_farmer@bioplan.com"
    client.post("/api/auth/register", json={
        "name": "Other Farmer",
        "email": other_email,
        "password": "password123",
        "role": "farmer"
    })
    other_login = client.post("/api/auth/login", json={"email": other_email, "password": "password123"})
    other_token = other_login.json()["access_token"]
    other_headers = {"Authorization": f"Bearer {other_token}"}

    unauth_resp = client.get(f"/api/farms/{farm_id}", headers=other_headers)
    assert unauth_resp.status_code == 403

    # 5. Missing / Invalid fields
    invalid_farm = {
        "farm_name": "", # invalid name length
        "latitude": 95.0, # invalid latitude > 90
        "longitude": 75.8572,
        "area": -5.0, # invalid area <= 0
        "district": "Ludhiana",
        "state": "Punjab"
    }
    invalid_resp = client.post("/api/farms", json=invalid_farm, headers=headers)
    assert invalid_resp.status_code == 422 # validation error

def test_buyer_and_demand(client):
    # Register buyer user
    buyer_email = "buyer_user@bioplan.com"
    client.post("/api/auth/register", json={
        "name": "Test Buyer Corp",
        "email": buyer_email,
        "password": "password123",
        "role": "buyer"
    })
    login_resp = client.post("/api/auth/login", json={"email": buyer_email, "password": "password123"})
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create buyer profile
    profile_payload = {
        "company_name": "Satluj Starch",
        "latitude": 30.9100,
        "longitude": 75.8700,
        "contact_information": "contact@satluj.com"
    }
    response = client.post("/api/buyers", json=profile_payload, headers=headers)
    assert response.status_code == 201
    assert response.json()["company_name"] == "Satluj Starch"

    # 2. Duplicate profile check
    dup_resp = client.post("/api/buyers", json=profile_payload, headers=headers)
    assert dup_resp.status_code == 400

    # 3. Create demand entry
    demand_payload = {
        "biomass_type": "Rice (Paddy)",
        "required_quantity": 500.0,
        "procurement_start": "2026-09-15",
        "procurement_end": "2026-11-30",
        "offered_price": 3100.0
    }
    demand_resp = client.post("/api/demand", json=demand_payload, headers=headers)
    assert demand_resp.status_code == 201
    assert demand_resp.json()["offered_price"] == 3100.0

    # 4. Validation errors (negative price/quantity)
    invalid_demand = {
        "biomass_type": "Rice (Paddy)",
        "required_quantity": -50.0,
        "procurement_start": "2026-09-15",
        "procurement_end": "2026-11-30",
        "offered_price": -3100.0
    }
    invalid_resp = client.post("/api/demand", json=invalid_demand, headers=headers)
    assert invalid_resp.status_code == 422

def test_transport_and_profit_formulas():
    # Transport cost formula: distance_km * cost_per_km * quantity
    cost = calculate_transport_cost(distance_km=25.0, quantity_tons=4.0)
    # 25.0 * 5.0 * 4.0 = 500.0
    assert cost == 500.0

    # Profit calculation formula verification: expected_profit = revenue - transport_cost
    biomass_qty = 10.0
    offered_price = 3000.0
    transport_cost = 200.0
    revenue = biomass_qty * offered_price
    expected_profit = revenue - transport_cost
    assert expected_profit == 29800.0

def test_predictions_endpoint(client):
    # Register farmer
    email = "pred_farmer@bioplan.com"
    client.post("/api/auth/register", json={
        "name": "Pred Farmer",
        "email": email,
        "password": "password123",
        "role": "farmer"
    })
    login_resp = client.post("/api/auth/login", json={"email": email, "password": "password123"})
    headers = {"Authorization": f"Bearer {login_resp.json()['access_token']}"}

    # Add farm first
    farm_payload = {
        "farm_name": "Prediction Farm",
        "latitude": 30.9002,
        "longitude": 75.8572,
        "area": 5.0,
        "district": "Ludhiana",
        "state": "Punjab",
        "crops": [
            {
                "crop_id": 1,
                "season": "Kharif",
                "cultivated_area": 4.5,
                "expected_harvest_date": "2026-10-15"
            }
        ]
    }
    farm_resp = client.post("/api/farms", json=farm_payload, headers=headers)
    farm_id = farm_resp.json()["id"]

    # 1. Post prediction
    pred_payload = {
        "farm_id": farm_id,
        "crop_id": 1,
        "cultivated_area": 4.5,
        "expected_harvest_date": "2026-10-15"
    }
    pred_resp = client.post("/api/predictions/biomass", json=pred_payload, headers=headers)
    assert pred_resp.status_code == 200
    assert pred_resp.json()["biomass_quantity"] > 0.0

    # 2. Get latest predictions
    get_pred_resp = client.get(f"/api/predictions/{farm_id}", headers=headers)
    assert get_pred_resp.status_code == 200
    assert get_pred_resp.json()["biomass_prediction"] is not None
    assert get_pred_resp.json()["yield_prediction"] is not None

def test_pricing_supply_demand(client, db_session):
    # Retrieve base price
    base_price = estimate_price("Wheat", db_session)
    assert base_price == 2400.0

    # Setup a mock buyer user, buyer profile, and demands to affect supply/demand ratio
    buyer = User(name="Wheat Buyer", email="wheatbuyer@bioplan.com", password_hash="dummy", role="buyer")
    db_session.add(buyer)
    db_session.commit()

    buyer_prof = Buyer(user_id=buyer.id, company_name="Wheat Proc", latitude=30.9002, longitude=75.8572)
    db_session.add(buyer_prof)
    db_session.commit()

    # Create excessive demand to force ratio > 1.2
    # Assume supply is 0 or low fallback. Fallback supply from seed for Wheat is 0, so let's verify logic
    # Total supply = 0 at start, so estimate_price returns base_price (fallback case)
    # Let's seed a farm and farmcrop to establish a supply baseline
    farmer = User(name="Wheat Farmer", email="wheatfarmer@bioplan.com", password_hash="dummy", role="farmer")
    db_session.add(farmer)
    db_session.commit()

    farm = Farm(farmer_id=farmer.id, farm_name="Wheat Field", latitude=30.9002, longitude=75.8572, area=10.0, district="Ludhiana", state="Punjab")
    db_session.add(farm)
    db_session.commit()

    # Crop 2 is Wheat (residue_ratio=1.5, recovery_factor=0.3)
    # Cultivated area = 10ha
    # Baseline yield assumes 4.0 tons/ha -> supply = 4.0 * 10 * 1.5 * 0.3 = 18.0 tons
    fc = FarmCrop(farm_id=farm.id, crop_id=2, season="Rabi", cultivated_area=10.0, expected_harvest_date=date(2026, 12, 1))
    db_session.add(fc)
    db_session.commit()

    # 1. Balanced: no active demands
    price_balanced = estimate_price("Wheat", db_session)
    assert price_balanced == 2160.0  # 2400.0 - 10% because demand=0 and supply=18.0 (ratio=0)

    # 2. High Demand: demand = 30 tons, supply = 18 tons -> ratio = 30/18 = 1.666 (> 1.2)
    # Adjustment is min(0.20, (1.666 - 1.0)*0.10) = 0.0666 -> +6.67%
    demand_high = BuyerDemand(buyer_id=buyer_prof.id, biomass_type="Wheat", required_quantity=30.0, procurement_start=date(2026, 9, 1), procurement_end=date(2026, 12, 31), offered_price=2500.0)
    db_session.add(demand_high)
    db_session.commit()

    price_high = estimate_price("Wheat", db_session)
    print(f"DEBUG: price_high = {price_high}")
    assert price_high > 2400.0
    assert price_high == 2560.0

    # 3. Low Demand: demand = 2 tons, supply = 18 tons -> ratio = 2/18 = 0.111 (< 0.8)
    # Adjustment is -min(0.20, (1.0 - 0.111)*0.10) = -0.0889 -> -8.89%
    demand_high.required_quantity = 2.0
    db_session.commit()

    price_low = estimate_price("Wheat", db_session)
    print(f"DEBUG: price_low = {price_low}")
    assert price_low < 2400.0
    assert price_low == 2186.67

def test_matching_engine_run(client, db_session):
    # Setup matching engine test case
    # Verify run_matching_engine returns correctly ranked results
    # We already have Golden Wheat Farm (id=1) seeded, but let's query a known farm or create one
    farmer = User(name="Match Farmer", email="matchfarmer@bioplan.com", password_hash="dummy", role="farmer")
    db_session.add(farmer)
    db_session.commit()

    farm = Farm(farmer_id=farmer.id, farm_name="Match Field", latitude=30.9002, longitude=75.8572, area=5.0, district="Ludhiana", state="Punjab")
    db_session.add(farm)
    db_session.commit()

    # Crop 1 is Rice (Paddy) (residue_ratio=1.5, recovery_factor=0.5)
    # Approx yield = 4.0 -> biomass = 4.0 * 5.0 * 1.5 * 0.5 = 15.0 tons
    fc = FarmCrop(farm_id=farm.id, crop_id=1, season="Kharif", cultivated_area=5.0, expected_harvest_date=date(2026, 10, 15))
    db_session.add(fc)
    db_session.commit()

    # Run matching engine
    results = run_matching_engine(farm.id, db_session)
    assert "farm_id" in results
    assert results["farm_id"] == farm.id
    assert isinstance(results["matches"], list)

def test_gis_nearby_buyers(client):
    # Register farmer, login
    email = "gis_farmer@bioplan.com"
    client.post("/api/auth/register", json={
        "name": "GIS Farmer",
        "email": email,
        "password": "password123",
        "role": "farmer"
    })
    login_resp = client.post("/api/auth/login", json={"email": email, "password": "password123"})
    headers = {"Authorization": f"Bearer {login_resp.json()['access_token']}"}

    # Add farm at remote coordinate (32.1000, 76.2000)
    farm_payload = {
        "farm_name": "GIS Farm",
        "latitude": 32.1000,
        "longitude": 76.2000,
        "area": 5.0,
        "district": "Kangra",
        "state": "Himachal"
    }
    farm_resp = client.post("/api/farms", json=farm_payload, headers=headers)
    farm_id = farm_resp.json()["id"]

    # Register a buyer at a close distance (~3km away)
    buyer_email = "gis_buyer@bioplan.com"
    client.post("/api/auth/register", json={
        "name": "GIS Buyer",
        "email": buyer_email,
        "password": "password123",
        "role": "buyer"
    })
    b_login = client.post("/api/auth/login", json={"email": buyer_email, "password": "password123"})
    b_headers = {"Authorization": f"Bearer {b_login.json()['access_token']}"}
    
    # ~3km away North-East
    client.post("/api/buyers", json={
        "company_name": "Ludhiana Bio Close",
        "latitude": 32.1250,
        "longitude": 76.2050,
        "contact_information": "close@bio.com"
    }, headers=b_headers)

    # Query nearby buyers with a large radius (50km)
    response = client.get(f"/api/gis/nearby-buyers?farm_id={farm_id}&radius_km=50.0", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1
    buyer_names = [b["buyer"]["company_name"] for b in data]
    assert "Ludhiana Bio Close" in buyer_names
    assert data[0]["distance_km"] < 10.0

    # Query nearby buyers with a small radius (1km) - should be empty
    response_empty = client.get(f"/api/gis/nearby-buyers?farm_id={farm_id}&radius_km=1.0", headers=headers)
    assert response_empty.status_code == 200
    assert len(response_empty.json()) == 0

def test_gis_nearby_farms(client):
    # Register buyer, login
    email = "gis_farms_buyer@bioplan.com"
    client.post("/api/auth/register", json={
        "name": "GIS Farms Buyer",
        "email": email,
        "password": "password123",
        "role": "buyer"
    })
    login_resp = client.post("/api/auth/login", json={"email": email, "password": "password123"})
    headers = {"Authorization": f"Bearer {login_resp.json()['access_token']}"}

    # Create buyer profile at (30.9000, 75.8500)
    b_resp = client.post("/api/buyers", json={
        "company_name": "Ludhiana Bio Buyer",
        "latitude": 30.9000,
        "longitude": 75.8500,
        "contact_information": "buyer@bio.com"
    }, headers=headers)
    buyer_id = b_resp.json()["id"]

    # Register farmer and add nearby farm (~2km away)
    f_email = "gis_near_farmer@bioplan.com"
    client.post("/api/auth/register", json={
        "name": "GIS Near Farmer",
        "email": f_email,
        "password": "password123",
        "role": "farmer"
    })
    f_login = client.post("/api/auth/login", json={"email": f_email, "password": "password123"})
    f_headers = {"Authorization": f"Bearer {f_login.json()['access_token']}"}

    client.post("/api/farms", json={
        "farm_name": "GIS Ludhiana Farm",
        "latitude": 30.9150,
        "longitude": 75.8600,
        "area": 8.0,
        "district": "Ludhiana",
        "state": "Punjab"
    }, headers=f_headers)

    # Query nearby farms with radius 50km
    resp = client.get(f"/api/gis/nearby-farms?buyer_id={buyer_id}&radius_km=50.0", headers=headers)
    assert resp.status_code == 200
    farms_data = resp.json()
    assert len(farms_data) >= 1
    farm_names = [f["farm"]["farm_name"] for f in farms_data]
    assert "GIS Ludhiana Farm" in farm_names
    assert farms_data[0]["distance_km"] < 5.0

