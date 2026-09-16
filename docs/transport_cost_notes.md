# Transportation Cost Assumptions & Logistics Parameters

BioPlan AI uses a transparent, linear pricing model for transportation estimation to ensure interpretability and predictability for farmers and buyers.

## Formula
```
transport_cost = distance_km * cost_per_km
```

## Configuration Parameter
- **COST_PER_KM**: Default value is set to **`5.0`** (e.g., 5 INR per ton-km).
- This value is configurable in the `.env` file under the key `COST_PER_KM`.

## Research Reasoning
In rural India, commercial transport rates for agricultural products (in medium-duty trucks like Tata 407 or Mahindra Bolero Pik-Up carrying 2 to 4 metric tons) average around **5 to 8 INR per ton-km**. 

Using a configurable base rate of `5.0` gives a realistic, transparent baseline for Sprints 1 and 2, which can be dynamically updated based on fuel prices, vehicle type, and road conditions in future sprints.
