from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from database.db import get_db
from database.models import Farm, FarmCrop, User
from backend.app.schemas.schemas import FarmCreate, FarmResponse
from backend.app.auth_utils import get_current_user, get_current_farmer

router = APIRouter(prefix="/api/farms", tags=["Farms"])

@router.post("", response_model=FarmResponse, status_code=status.HTTP_201_CREATED)
def create_farm(farm_in: FarmCreate, current_user: User = Depends(get_current_farmer), db: Session = Depends(get_db)):
    # Create farm profile
    db_farm = Farm(
        farmer_id=current_user.id,
        farm_name=farm_in.farm_name,
        latitude=farm_in.latitude,
        longitude=farm_in.longitude,
        area=farm_in.area,
        district=farm_in.district,
        state=farm_in.state
    )
    db.add(db_farm)
    db.flush()  # Populates db_farm.id
    
    # Create associated farm crops if provided
    if farm_in.crops:
        for fc_in in farm_in.crops:
            db_fc = FarmCrop(
                farm_id=db_farm.id,
                crop_id=fc_in.crop_id,
                season=fc_in.season,
                cultivated_area=fc_in.cultivated_area,
                expected_harvest_date=fc_in.expected_harvest_date
            )
            db.add(db_fc)
            
    db.commit()
    db.refresh(db_farm)
    return db_farm

@router.get("", response_model=List[FarmResponse])
def get_farmer_farms(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # If farmer, get their own farms. If buyer, get all farms in system.
    if current_user.role == "farmer":
        farms = db.query(Farm).filter(Farm.farmer_id == current_user.id).all()
    else:
        farms = db.query(Farm).all()
    return farms

@router.get("/{id}", response_model=FarmResponse)
def get_farm(id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    farm = db.query(Farm).filter(Farm.id == id).first()
    if not farm:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Farm with id {id} not found"
        )
    # Check authorization: farmer can only view their own farms
    if current_user.role == "farmer" and farm.farmer_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: You are not authorized to view this farm"
        )
    return farm

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_farm(id: int, current_user: User = Depends(get_current_farmer), db: Session = Depends(get_db)):
    farm = db.query(Farm).filter(Farm.id == id).first()
    if not farm:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Farm with id {id} not found"
        )
    # Farmers may only delete their own farms
    if farm.farmer_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: You can only delete your own farms"
        )
    # ORM cascade="all, delete-orphan" on Farm relationships handles
    # FarmCrop, YieldPrediction, BiomassPrediction, and Match rows automatically.
    db.delete(farm)
    db.commit()
