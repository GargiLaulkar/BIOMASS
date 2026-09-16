# Pricing Estimation Model & Market Assumptions

BioPlan AI uses a deterministic, explainable pricing formula for Sprint 2, ensuring full transparency. A future machine learning-based forecasting model will be added in Phase 3.

## Base Prices
Base prices are modeled on historical market averages in Punjab, India (in INR per metric ton):
1. **Rice (Paddy) Straw**: `2800.0`
2. **Wheat Straw**: `2400.0`
3. **Sugarcane Trash/Tops**: `1800.0`
4. **Cotton Stalks**: `3200.0`
5. **Maize Stover**: `2100.0`

## Deterministic Price Adjustment Formula
```
estimated_price = base_price * (1 + demand_supply_adjustment)
```

### Supply & Demand Ratio Calculation
1. **Total Demand**: Sum of `required_quantity` from all active `BuyerDemand` records matching the target biomass type.
2. **Total Supply**: Sum of `biomass_quantity` from all farms cultivated with the target crop in the database.
3. **Ratio**: `total_demand / max(1.0, total_supply)`

### Adjustment Rules
- **High Demand (Ratio > 1.2)**: Price increases by `min(20%, (ratio - 1.0) * 10%)`. For example, if demand is 2x supply, ratio = 2.0, price increases by 10% * (2.0 - 1.0) = 10% (up to a max of 20%).
- **Low Demand (Ratio < 0.8)**: Price decreases by `min(20%, (1.0 - ratio) * 10%)`.
- **Balanced Demand (0.8 <= Ratio <= 1.2)**: No adjustment (1.0).

This formula is explainable, logged, and easy to audit for farmers and buyers.
