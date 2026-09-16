from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional

from database.db import get_db
from database.models import BiomassPrediction, YieldPrediction
from backend.app.schemas.schemas import BiomassPredictionRequest, BiomassPredictionResponse, FarmPredictionDetail
from backend.app.services.biomass import calculate_biomass_prediction
from backend.app.auth_utils import get_current_user

router = APIRouter(prefix="/api/predictions", tags=["Predictions"])

@router.post("/biomass", response_model=BiomassPredictionResponse)
def predict_biomass(request: BiomassPredictionRequest, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    result = calculate_biomass_prediction(
        farm_id=request.farm_id,
        crop_id=request.crop_id,
        cultivated_area=request.cultivated_area,
        harvest_date=request.expected_harvest_date,
        db=db
    )
    if "error" in result:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result["error"]
        )
    return result["biomass_prediction"]

@router.get("/{farm_id}", response_model=FarmPredictionDetail)
def get_latest_prediction(farm_id: int, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    # Fetch latest yield and biomass predictions
    biomass = db.query(BiomassPrediction) \
                .filter(BiomassPrediction.farm_id == farm_id) \
                .order_by(BiomassPrediction.id.desc()) \
                .first()
                
    yield_pred = db.query(YieldPrediction) \
                   .filter(YieldPrediction.farm_id == farm_id) \
                   .order_by(YieldPrediction.id.desc()) \
                   .first()
                   
    return FarmPredictionDetail(
        yield_prediction=yield_pred.predicted_yield if yield_pred else None,
        biomass_prediction=biomass
    )
