from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database.db import get_db
from backend.app.schemas.schemas import FarmerMatchingResult
from backend.app.matching.engine import run_matching_engine
from backend.app.auth_utils import get_current_user

router = APIRouter(prefix="/api/matching", tags=["Matching Engine"])

@router.get("/{farm_id}", response_model=FarmerMatchingResult)
def get_farm_matches(farm_id: int, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    result = run_matching_engine(farm_id=farm_id, db=db)
    if "error" in result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=result["error"]
        )
    return result
