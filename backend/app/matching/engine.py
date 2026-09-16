from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import func
import math

from database.models import Farm, FarmCrop, Crop, Buyer, BuyerDemand, Match, BiomassPrediction
from database.db import haversine_distance
from backend.app.logistics.cost import calculate_transport_cost
from backend.app.pricing.estimate import estimate_price

# Match score weights (must sum to 1.0)
WEIGHT_DISTANCE = 0.3
WEIGHT_QUANTITY = 0.2
WEIGHT_PRICE = 0.3
WEIGHT_TRANSPORT = 0.2

def compute_match_score(distance_km: float, farm_qty: float, buyer_qty: float, offered_price: float, estimated_price: float, transport_cost: float) -> float:
    """
    Computes a normalized matching score from 0.0 to 100.0 based on distance, quantity, price, and transport cost.
    """
    # 1. Distance Score (closer is better, max range 100km)
    max_radius = 100.0
    dist_score = max(0.0, 1.0 - (distance_km / max_radius))
    
    # 2. Quantity Score (how much of our biomass can they consume?)
    if buyer_qty >= farm_qty:
        qty_score = 1.0
    else:
        qty_score = buyer_qty / max(0.1, farm_qty)
        
    # 3. Price Score (how does their price compare to the estimated market price?)
    price_score = offered_price / max(1.0, estimated_price)
    price_score = min(1.5, price_score) # Cap at 1.5 for outliers
    
    # 4. Transport Cost Score (lower transport cost is better)
    # Assume max reasonable transport cost is 500 per ton (e.g. 100km * 5)
    max_reasonable_transport = 500.0 * farm_qty
    if max_reasonable_transport <= 0:
        trans_score = 1.0
    else:
        trans_score = max(0.0, 1.0 - (transport_cost / max_reasonable_transport))
        
    # Weighted average (normalized to 100.0)
    weighted_score = (
        (dist_score * WEIGHT_DISTANCE) +
        (qty_score * WEIGHT_QUANTITY) +
        (price_score * WEIGHT_PRICE) +
        (trans_score * WEIGHT_TRANSPORT)
    ) * 100.0
    
    return round(weighted_score, 1)

def run_matching_engine(farm_id: int, db: Session, max_radius_km: float = 100.0) -> dict:
    """
    Finds and ranks compatible buyers for a farm, computes financial metrics,
    persists matches to the database, and returns the recommendations.
    """
    # 1. Fetch farm and its biomass prediction
    farm = db.query(Farm).filter(Farm.id == farm_id).first()
    if not farm:
        return {"error": "Farm not found"}
        
    # Get latest biomass prediction
    prediction = db.query(BiomassPrediction) \
                   .filter(BiomassPrediction.farm_id == farm_id) \
                   .order_by(BiomassPrediction.model_version.desc()) \
                   .first()
                   
    # Fallback if no prediction has been saved yet (calculate dynamic yield)
    if not prediction:
        farm_crop = db.query(FarmCrop).filter(FarmCrop.farm_id == farm_id).first()
        if not farm_crop:
            return {"error": "No crops registered for this farm"}
            
        crop = farm_crop.crop
        # Dummy yield of 4.0 tons/ha for fallback matching
        approx_yield = 4.0
        biomass_qty = approx_yield * farm_crop.cultivated_area * crop.residue_ratio * crop.recovery_factor
        crop_name = crop.crop_name
        avail_start = datetime.utcnow().date()
        avail_end = datetime.utcnow().date()
    else:
        biomass_qty = prediction.biomass_quantity
        avail_start = prediction.availability_start
        avail_end = prediction.availability_end
        # Find crop name
        farm_crop = db.query(FarmCrop).filter(FarmCrop.farm_id == farm_id).first()
        crop_name = farm_crop.crop.crop_name if farm_crop else "Rice (Paddy)"

    # 2. Estimate market price
    est_price = estimate_price(crop_name, db)
    
    # 3. Find compatible buyer demands (matching crop name)
    demands = db.query(BuyerDemand) \
                .filter(BuyerDemand.biomass_type == crop_name) \
                .all()
                
    matches_list = []
    
    # Delete old matches for this farm first to avoid duplicates
    db.query(Match).filter(Match.farm_id == farm_id).delete()
    
    for demand in demands:
        buyer = demand.buyer
        # Calculate Haversine distance
        dist = haversine_distance(farm.latitude, farm.longitude, buyer.latitude, buyer.longitude)
        
        # Filter by distance
        if dist > max_radius_km:
            continue
            
        # Calculate financials
        transport_cost = calculate_transport_cost(dist, biomass_qty)
        # Revenue is based on the buyer's offered price
        offered_price = demand.offered_price
        revenue = biomass_qty * offered_price
        expected_profit = revenue - transport_cost
        
        # Calculate matching score
        score = compute_match_score(
            distance_km=dist,
            farm_qty=biomass_qty,
            buyer_qty=demand.required_quantity,
            offered_price=offered_price,
            estimated_price=est_price,
            transport_cost=transport_cost
        )
        
        # Generate explainable reason text
        reason = (
            f"Recommended because: Buyer accepts {crop_name}, "
            f"their demand is {demand.required_quantity:.1f} tons, "
            f"buyer is {dist:.1f} km away (low transport cost), and "
            f"expected profit is {expected_profit:,.2f} INR."
        )
        
        # Instantiate db model
        db_match = Match(
            farm_id=farm_id,
            buyer_id=buyer.id,
            biomass_quantity=biomass_qty,
            distance_km=round(dist, 2),
            estimated_transport_cost=transport_cost,
            estimated_price=offered_price,
            estimated_profit=expected_profit,
            match_score=score,
            reason_text=reason
        )
        db.add(db_match)
        db.flush() # Populate match.id
        
        matches_list.append({
            "id": db_match.id,
            "farm_id": farm_id,
            "buyer_id": buyer.id,
            "biomass_quantity": round(biomass_qty, 2),
            "distance_km": round(dist, 2),
            "estimated_transport_cost": transport_cost,
            "estimated_price": offered_price,
            "estimated_profit": expected_profit,
            "match_score": score,
            "reason_text": reason,
            "created_at": db_match.created_at,
            "buyer": buyer
        })
        
    db.commit()
    
    # Sort matches by score descending
    matches_list.sort(key=lambda x: x["match_score"], reverse=True)
    
    recommended_buyer = matches_list[0] if matches_list else None
    
    return {
        "farm_id": farm_id,
        "biomass_quantity": round(biomass_qty, 2),
        "crop_name": crop_name,
        "availability_start": avail_start,
        "availability_end": avail_end,
        "recommended_buyer": recommended_buyer,
        "matches": matches_list
    }
