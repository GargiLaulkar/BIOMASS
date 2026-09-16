from pydantic import BaseModel, EmailStr, Field
from datetime import date, datetime
from typing import List, Optional

# --- Authentication ---
class UserRegister(BaseModel):
    name: str = Field(..., min_length=2, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=6)
    role: str = Field(..., pattern="^(farmer|buyer)$")

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    role: str

class TokenData(BaseModel):
    email: Optional[str] = None
    role: Optional[str] = None
    user_id: Optional[int] = None

class UserResponse(BaseModel):
    id: int
    name: str
    email: EmailStr
    role: str
    created_at: datetime

    class Config:
        from_attributes = True

# --- Crops ---
class CropResponse(BaseModel):
    id: int
    crop_name: str
    residue_ratio: float
    recovery_factor: float

    class Config:
        from_attributes = True

# --- Farm Crops ---
class FarmCropCreate(BaseModel):
    crop_id: int
    season: str = Field(..., pattern="^(Kharif|Rabi)$")
    cultivated_area: float = Field(..., gt=0)
    expected_harvest_date: date

class FarmCropResponse(BaseModel):
    id: int
    farm_id: int
    crop_id: int
    season: str
    cultivated_area: float
    expected_harvest_date: date
    crop: Optional[CropResponse] = None

    class Config:
        from_attributes = True

# --- Farms ---
class FarmCreate(BaseModel):
    farm_name: str = Field(..., min_length=2, max_length=100)
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    area: float = Field(..., gt=0)  # total area in hectares
    district: str
    state: str
    crops: Optional[List[FarmCropCreate]] = None

class FarmResponse(BaseModel):
    id: int
    farmer_id: int
    farm_name: str
    latitude: float
    longitude: float
    area: float
    district: str
    state: str
    created_at: datetime
    farm_crops: List[FarmCropResponse] = []

    class Config:
        from_attributes = True

# --- Buyers ---
class BuyerCreate(BaseModel):
    company_name: str = Field(..., min_length=2, max_length=100)
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    contact_information: str

class BuyerResponse(BaseModel):
    id: int
    user_id: int
    company_name: str
    latitude: float
    longitude: float
    contact_information: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

# --- Buyer Demands ---
class BuyerDemandCreate(BaseModel):
    biomass_type: str  # Matches crop_name
    required_quantity: float = Field(..., gt=0)
    procurement_start: date
    procurement_end: date
    offered_price: float = Field(..., gt=0)

class BuyerDemandResponse(BaseModel):
    id: int
    buyer_id: int
    biomass_type: str
    required_quantity: float
    procurement_start: date
    procurement_end: date
    offered_price: float
    created_at: datetime
    buyer: Optional[BuyerResponse] = None

    class Config:
        from_attributes = True

# --- Predictions ---
class BiomassPredictionRequest(BaseModel):
    farm_id: int
    crop_id: int
    cultivated_area: float = Field(..., gt=0)
    expected_harvest_date: date

class BiomassPredictionResponse(BaseModel):
    id: int
    farm_id: int
    biomass_quantity: float
    availability_start: date
    availability_end: date
    confidence: float
    model_version: str

    class Config:
        from_attributes = True

class FarmPredictionDetail(BaseModel):
    yield_prediction: Optional[float] = None
    biomass_prediction: Optional[BiomassPredictionResponse] = None

# --- Matches ---
class MatchResponse(BaseModel):
    id: Optional[int] = None
    farm_id: int
    buyer_id: int
    biomass_quantity: float
    distance_km: float
    estimated_transport_cost: float
    estimated_price: float
    estimated_profit: float
    match_score: float
    reason_text: str
    created_at: datetime
    buyer: BuyerResponse

    class Config:
        from_attributes = True

class FarmerMatchingResult(BaseModel):
    farm_id: int
    biomass_quantity: float
    crop_name: str
    availability_start: date
    availability_end: date
    recommended_buyer: Optional[MatchResponse] = None
    matches: List[MatchResponse] = []
