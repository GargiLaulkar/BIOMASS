from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date

from database.db import get_db
from database.models import Buyer, BuyerDemand, User
from backend.app.schemas.schemas import BuyerCreate, BuyerResponse, BuyerDemandCreate, BuyerDemandResponse
from backend.app.auth_utils import get_current_user, get_current_buyer

router = APIRouter(tags=["Buyers & Demands"])

# --- Buyer Profile Endpoints ---

@router.post("/api/buyers", response_model=BuyerResponse, status_code=status.HTTP_201_CREATED)
def create_buyer_profile(buyer_in: BuyerCreate, current_user: User = Depends(get_current_buyer), db: Session = Depends(get_db)):
    # Check if profile already exists
    existing = db.query(Buyer).filter(Buyer.user_id == current_user.id).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Buyer profile already exists for this account"
        )
    
    db_buyer = Buyer(
        user_id=current_user.id,
        company_name=buyer_in.company_name,
        latitude=buyer_in.latitude,
        longitude=buyer_in.longitude,
        contact_information=buyer_in.contact_information
    )
    db.add(db_buyer)
    db.commit()
    db.refresh(db_buyer)
    return db_buyer

@router.get("/api/buyers/me", response_model=BuyerResponse)
def get_my_buyer_profile(current_user: User = Depends(get_current_buyer), db: Session = Depends(get_db)):
    buyer = db.query(Buyer).filter(Buyer.user_id == current_user.id).first()
    if not buyer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Buyer profile not found for this account"
        )
    return buyer

@router.get("/api/buyers/{id}", response_model=BuyerResponse)
def get_buyer_profile(id: int, db: Session = Depends(get_db)):
    buyer = db.query(Buyer).filter(Buyer.id == id).first()
    if not buyer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Buyer profile with id {id} not found"
        )
    return buyer

@router.put("/api/buyers/{id}", response_model=BuyerResponse)
def update_buyer_profile(id: int, buyer_in: BuyerCreate, current_user: User = Depends(get_current_buyer), db: Session = Depends(get_db)):
    buyer = db.query(Buyer).filter(Buyer.id == id).first()
    if not buyer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Buyer profile with id {id} not found"
        )
    
    # Check authorization (can only edit their own profile)
    if buyer.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: You can only edit your own profile"
        )
        
    buyer.company_name = buyer_in.company_name
    buyer.latitude = buyer_in.latitude
    buyer.longitude = buyer_in.longitude
    buyer.contact_information = buyer_in.contact_information
    
    db.commit()
    db.refresh(buyer)
    return buyer

# --- Buyer Demand Endpoints ---

@router.post("/api/demand", response_model=BuyerDemandResponse, status_code=status.HTTP_201_CREATED)
def create_demand(demand_in: BuyerDemandCreate, current_user: User = Depends(get_current_buyer), db: Session = Depends(get_db)):
    # Fetch buyer profile for this user
    buyer = db.query(Buyer).filter(Buyer.user_id == current_user.id).first()
    if not buyer:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You must create a buyer profile before adding demands"
        )
        
    db_demand = BuyerDemand(
        buyer_id=buyer.id,
        biomass_type=demand_in.biomass_type,
        required_quantity=demand_in.required_quantity,
        procurement_start=demand_in.procurement_start,
        procurement_end=demand_in.procurement_end,
        offered_price=demand_in.offered_price
    )
    db.add(db_demand)
    db.commit()
    db.refresh(db_demand)
    return db_demand

@router.get("/api/demand", response_model=List[BuyerDemandResponse])
def get_demands(
    biomass_type: Optional[str] = Query(None),
    min_qty: Optional[float] = Query(None),
    start: Optional[date] = Query(None),
    end: Optional[date] = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(BuyerDemand)
    
    if biomass_type:
        query = query.filter(BuyerDemand.biomass_type == biomass_type)
    if min_qty:
        query = query.filter(BuyerDemand.required_quantity >= min_qty)
    if start:
        query = query.filter(BuyerDemand.procurement_end >= start)
    if end:
        query = query.filter(BuyerDemand.procurement_start <= end)
        
    return query.all()

@router.get("/api/demand/me", response_model=List[BuyerDemandResponse])
def get_my_demands(current_user: User = Depends(get_current_buyer), db: Session = Depends(get_db)):
    buyer = db.query(Buyer).filter(Buyer.user_id == current_user.id).first()
    if not buyer:
        return []
    demands = db.query(BuyerDemand).filter(BuyerDemand.buyer_id == buyer.id).all()
    return demands

@router.get("/api/demand/buyer/{buyer_id}", response_model=List[BuyerDemandResponse])
def get_buyer_demands(buyer_id: int, db: Session = Depends(get_db)):
    demands = db.query(BuyerDemand).filter(BuyerDemand.buyer_id == buyer_id).all()
    return demands
