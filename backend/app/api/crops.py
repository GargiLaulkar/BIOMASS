from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from database.db import get_db
from database.models import Crop
from backend.app.schemas.schemas import CropResponse

router = APIRouter(prefix="/api/crops", tags=["Crops"])

@router.get("", response_model=List[CropResponse])
def get_crops(db: Session = Depends(get_db)):
    crops = db.query(Crop).all()
    return crops
