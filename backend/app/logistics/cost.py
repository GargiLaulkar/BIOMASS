import os
from dotenv import load_dotenv

load_dotenv()

COST_PER_KM = float(os.getenv("COST_PER_KM", "5.0"))

def calculate_transport_cost(distance_km: float, quantity_tons: float = 1.0) -> float:
    """
    Computes transportation cost: distance_km * cost_per_km * quantity_tons
    """
    base_cost = float(distance_km) * COST_PER_KM
    total_cost = base_cost * float(quantity_tons)
    return round(total_cost, 2)
