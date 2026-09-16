from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from pydantic import BaseModel

from database.db import get_db
from database.models import Farm, Buyer
from backend.app.schemas.schemas import BuyerResponse, FarmResponse
from backend.app.auth_utils import get_current_user

router = APIRouter(prefix="/api/gis", tags=["GIS"])

class NearbyBuyerResponse(BaseModel):
    buyer: BuyerResponse
    distance_km: float

    class Config:
        from_attributes = True

class NearbyFarmResponse(BaseModel):
    farm: FarmResponse
    distance_km: float

    class Config:
        from_attributes = True

@router.get("/nearby-buyers", response_model=List[NearbyBuyerResponse])
def get_nearby_buyers(
    farm_id: int = Query(...),
    radius_km: float = Query(50.0), # default 50km
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    # Fetch farm coordinates
    farm = db.query(Farm).filter(Farm.id == farm_id).first()
    if not farm:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Farm with id {farm_id} not found"
        )
    
    # Query buyers and compute distance using sqlite registered haversine function
    distance_expr = func.haversine(farm.latitude, farm.longitude, Buyer.latitude, Buyer.longitude)
    
    nearby_query = db.query(Buyer, distance_expr.label("distance")) \
                     .filter(distance_expr <= radius_km) \
                     .order_by("distance") \
                     .all()
    
    results = []
    for buyer, dist in nearby_query:
        results.append(NearbyBuyerResponse(
            buyer=BuyerResponse.model_validate(buyer),
            distance_km=round(float(dist), 2)
        ))
        
    return results

@router.get("/nearby-farms", response_model=List[NearbyFarmResponse])
def get_nearby_farms(
    buyer_id: Optional[int] = Query(None),
    latitude: Optional[float] = Query(None),
    longitude: Optional[float] = Query(None),
    radius_km: float = Query(50.0),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    lat = latitude
    lon = longitude
    
    if buyer_id is not None:
        buyer = db.query(Buyer).filter(Buyer.id == buyer_id).first()
        if not buyer:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Buyer with id {buyer_id} not found"
            )
        lat = buyer.latitude
        lon = buyer.longitude

    if lat is None or lon is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Either buyer_id or both latitude and longitude must be provided"
        )

    distance_expr = func.haversine(lat, lon, Farm.latitude, Farm.longitude)
    nearby_query = db.query(Farm, distance_expr.label("distance")) \
                     .filter(distance_expr <= radius_km) \
                     .order_by("distance") \
                     .all()

    results = []
    for farm, dist in nearby_query:
        results.append(NearbyFarmResponse(
            farm=FarmResponse.model_validate(farm),
            distance_km=round(float(dist), 2)
        ))

    return results

