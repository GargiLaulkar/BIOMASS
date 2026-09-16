from sqlalchemy.orm import Session
from database.models import Crop, BuyerDemand, FarmCrop, Farm, BiomassPrediction

# Base market prices (INR per ton)
BASE_PRICES = {
    "Rice (Paddy)": 2800.0,
    "Wheat": 2400.0,
    "Sugarcane": 1800.0,
    "Cotton": 3200.0,
    "Maize": 2100.0
}

def estimate_price(biomass_type: str, db: Session) -> float:
    """
    Estimates market price for a biomass type adjusted by supply/demand ratio in the system.
    """
    base_price = BASE_PRICES.get(biomass_type, 2000.0)
    
    # 1. Total active demand
    demands = db.query(BuyerDemand).filter(BuyerDemand.biomass_type == biomass_type).all()
    total_demand = sum(float(d.required_quantity) for d in demands)
    
    # 2. Total active supply (using existing biomass predictions or active farm crops)
    predictions = db.query(BiomassPrediction) \
                    .join(Farm) \
                    .join(FarmCrop, FarmCrop.farm_id == Farm.id) \
                    .join(Crop, Crop.id == FarmCrop.crop_id) \
                    .filter(Crop.crop_name == biomass_type) \
                    .all()
    
    total_supply = sum(float(p.biomass_quantity) for p in predictions)
    
    # Fallback to estimate supply from farm crops directly if no predictions have been run yet
    if total_supply <= 0:
        farm_crops = db.query(FarmCrop) \
                       .join(Crop, Crop.id == FarmCrop.crop_id) \
                       .filter(Crop.crop_name == biomass_type) \
                       .all()
        for fc in farm_crops:
            crop = fc.crop
            # Assume a baseline yield of 4.0 tons/ha for supply ratio purposes
            approx_yield = 4.0
            approx_biomass = approx_yield * fc.cultivated_area * crop.residue_ratio * crop.recovery_factor
            total_supply += approx_biomass
            
    if total_supply <= 0:
        # If no supply or demand exists, return base price
        return base_price
        
    ratio = total_demand / total_supply
    
    # Price adjustment based on ratio
    adjustment = 0.0
    if ratio > 1.2:
        # High demand: increase price by 10% per ratio unit above 1.0 (max +20%)
        adjustment = min(0.20, (ratio - 1.0) * 0.10)
    elif ratio < 0.8:
        # Low demand: decrease price by 10% per ratio unit below 1.0 (max -20%)
        adjustment = -min(0.20, (1.0 - ratio) * 0.10)
        
    estimated_price = base_price * (1.0 + adjustment)
    return round(estimated_price, 2)
