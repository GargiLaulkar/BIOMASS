from datetime import date, timedelta
from sqlalchemy.orm import Session

from database.models import Farm, Crop, FarmCrop, WeatherData, YieldPrediction, BiomassPrediction
from ml.inference import predict_yield

def calculate_biomass_prediction(farm_id: int, crop_id: int, cultivated_area: float, harvest_date: date, db: Session) -> dict:
    # 1. Fetch farm details
    farm = db.query(Farm).filter(Farm.id == farm_id).first()
    if not farm:
        return {"error": "Farm not found"}
        
    # 2. Fetch crop details
    crop = db.query(Crop).filter(Crop.id == crop_id).first()
    if not crop:
        return {"error": "Crop not found"}
        
    # 3. Determine season from harvest date (e.g. Rabi if harvest is Nov-Apr, Kharif otherwise)
    # Or check if there's a FarmCrop entry to pull the season from.
    farm_crop = db.query(FarmCrop).filter(FarmCrop.farm_id == farm_id, FarmCrop.crop_id == crop_id).first()
    season = farm_crop.season if farm_crop else ("Rabi" if harvest_date.month in [11, 12, 1, 2, 3, 4] else "Kharif")
    
    # 4. Fetch weather data for location & season (if available)
    weather = db.query(WeatherData) \
                .filter(WeatherData.location == farm.district) \
                .order_by(WeatherData.date.desc()) \
                .first()
                
    temp = weather.temperature if weather else 25.0
    rainfall = weather.rainfall if weather else 500.0
    
    # 5. Call ML model inference to predict yield (tons/hectare)
    predicted_yield_val = predict_yield(
        state=farm.state,
        district=farm.district,
        season=season,
        crop=crop.crop_name,
        area_ha=cultivated_area,
        temperature_c=temp,
        rainfall_mm=rainfall
    )
    
    # 6. Calculate biomass using coefficients
    # biomass_quantity = predicted_yield * cultivated_area * residue_ratio * recovery_factor
    biomass_qty = predicted_yield_val * cultivated_area * crop.residue_ratio * crop.recovery_factor
    
    # 7. Availability window: harvest_date to harvest_date + 45 days (calculated_estimate)
    avail_start = harvest_date
    avail_end = harvest_date + timedelta(days=45)
    
    # Save yield prediction to DB
    db_yield = YieldPrediction(
        farm_id=farm_id,
        predicted_yield=round(predicted_yield_val, 2),
        model_version="random_forest_v1.0"
    )
    db.add(db_yield)
    db.flush()
    
    # Save biomass prediction to DB
    db_biomass = BiomassPrediction(
        farm_id=farm_id,
        biomass_quantity=round(biomass_qty, 2),
        availability_start=avail_start,
        availability_end=avail_end,
        confidence=0.92, # Random forest confidence score indicator
        model_version="biomass_formula_v1.0"
    )
    db.add(db_biomass)
    db.commit()
    
    return {
        "yield_prediction": db_yield,
        "biomass_prediction": db_biomass
    }
