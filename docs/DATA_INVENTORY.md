# Data Inventory — BioPlan AI Repository

This document contains a comprehensive, verified inventory of every dataset, table, constant, formula, and mock/fixture currently utilized or defined across the BioPlan AI codebase. Every classification is verified directly against actual source code lines.

---

## 1. Inventory Classification Taxonomy

- **Real**: Empirically measured, observed, or authoritative real-world data from an external agency or verified source.
- **Generated**: Created programmatically via synthetic equations, random sampling, or mathematical simulation.
- **Mock**: Placeholder values or empty data containers standing in for unintegrated external services (e.g., weather fallbacks, dummy values).
- **Hardcoded**: Static numerical or string values embedded directly within application logic or seed scripts without empirical provenance.
- **Calculated**: Derived deterministically at runtime via mathematical formulas or algorithmic transformation of inputs.
- **Test Fixture**: Ephemeral in-memory test setups, mock inputs, or fixture objects used exclusively during test execution.

---

## 2. Comprehensive Inventory Table

| Item / Data Entity | Code / File Location | Classification | Verified Details & Provenance |
| :--- | :--- | :--- | :--- |
| **Crop Yield Training Dataset** | [`ml/data/processed/crop_yield_weather_processed.csv`](file:///c:/BIOMASS/ml/data/processed/crop_yield_weather_processed.csv) | **Real** | 48,214 empirical rows produced by the `run_pipeline()` feature engineering step from DES APY raw data (246,091 rows, 1997–2015) merged with IMD district rainfall normals (641 districts). Documented in [`docs/DATA_SOURCES.md`](file:///c:/BIOMASS/docs/DATA_SOURCES.md) and [`docs/dataset_notes.md`](file:///c:/BIOMASS/docs/dataset_notes.md). The prior synthetic generator (`generate_agricultural_data()`) is deprecated from the production path as of Prompt 01b; retained in [`ml/training/train.py`](file:///c:/BIOMASS/ml/training/train.py) for test-fixture generation only. |
| **DES APY Raw Crop Production Data** | [`ml/data/raw/crop_yield_des/crop_production.csv`](file:///c:/BIOMASS/ml/data/raw/crop_yield_des/crop_production.csv) | **Real** | 246,091 rows, 1997–2015, pan-India (33 States/UTs, 646 districts). Publishing authority: Directorate of Economics and Statistics (DES), Ministry of Agriculture & Farmers Welfare, GoI. License: NDSAP / OGD India. Manifest: [`ml/data/raw/crop_yield_des/manifest.json`](file:///c:/BIOMASS/ml/data/raw/crop_yield_des/manifest.json). |
| **IMD Subdivision Rainfall Time-Series** | [`ml/data/raw/imd_weather/rainfall_in_india_1901_2015.csv`](file:///c:/BIOMASS/ml/data/raw/imd_weather/rainfall_in_india_1901_2015.csv) | **Real** | 4,116 rows covering 36 meteorological subdivisions, 1901–2015. Publishing authority: India Meteorological Department (IMD), Ministry of Earth Sciences, GoI. Citation: Pai et al. (2014), MAUSAM 65(1). |
| **IMD District Rainfall Normals** | [`ml/data/raw/imd_weather/district_wise_rainfall_normal.csv`](file:///c:/BIOMASS/ml/data/raw/imd_weather/district_wise_rainfall_normal.csv) | **Real** | 641 rows, one per administrative district, standard climate normals (monthly + seasonal mm). Used as the primary weather feature source in feature engineering. |
| **Crop Residue Ratios & Recovery Factors** | [`database/seed/seed.py:28-32`](file:///c:/BIOMASS/database/seed/seed.py#L28-L32), [`database/models.py`](file:///c:/BIOMASS/database/models.py) | **Hardcoded** | Hardcoded agronomic coefficients for 5 crops: Rice (1.5 ratio, 0.5 recovery), Wheat (1.5 ratio, 0.3 recovery), Sugarcane (0.2 ratio, 0.8 recovery), Cotton (2.75 ratio, 0.8 recovery), Maize (1.5 ratio, 0.4 recovery). No academic citation was originally linked in code. |
| **Base Market Prices (`BASE_PRICES`)** | [`backend/app/pricing/estimate.py:5-11`](file:///c:/BIOMASS/backend/app/pricing/estimate.py#L5-L11) | **Hardcoded** | Static dictionary in INR/ton: Rice: ₹2,800, Wheat: ₹2,400, Sugarcane: ₹1,800, Cotton: ₹3,200, Maize: ₹2,100. Fallback default is ₹2,000. Documented in [`docs/pricing_notes.md`](file:///c:/BIOMASS/docs/pricing_notes.md). |
| **Weather Input in Biomass Forecasting** | [`backend/app/services/biomass.py:29-30`](file:///c:/BIOMASS/backend/app/services/biomass.py#L29-L30) | **Mock / Hardcoded Fallback** | `temp = weather.temperature if weather else 25.0` and `rainfall = weather.rainfall if weather else 500.0`. Because `WeatherData` is never populated, these synthetic fallback constants are the only execution path. |
| **Database `WeatherData` Table** | [`database/models.py:66-75`](file:///c:/BIOMASS/database/models.py#L66-L75) | **Mock (Unpopulated Schema)** | Table schema exists in SQLAlchemy models (`location`, `date`, `rainfall`, `temperature`, `humidity`), but no database seed or ingestion pipeline populates it. |
| **Seeded Farm Location & Details** | [`database/seed/seed.py:86-106`](file:///c:/BIOMASS/database/seed/seed.py#L86-L106) | **Hardcoded / Mock** | Seeds 1 default farm ("Golden Wheat Farm", Ludhiana, Punjab: lat `30.9002`, lon `75.8572`, 5.5 ha) with 5.0 ha Kharif Rice. |
| **Seeded Buyer Facilities & Demands** | [`database/seed/seed.py:114-205`](file:///c:/BIOMASS/database/seed/seed.py#L114-L205) | **Hardcoded / Mock** | Seeds 8 industrial buyer profiles with offsets around Ludhiana (lat `30.52` to `31.32`, lon `75.57` to `76.22`) and static procurement tenders (100–500 MT, ₹1,800–₹3,600/MT). |
| **Freight Transport Rate (`COST_PER_KM`)** | [`backend/app/logistics/cost.py:6`](file:///c:/BIOMASS/backend/app/logistics/cost.py#L6), [`.env.example`](file:///c:/BIOMASS/.env.example) | **Hardcoded / Configurable Constant** | Default ₹5.0 per ton-km. Modeled on rural medium-duty commercial transport (Tata 407/Bolero Pik-up). Configurable via `.env`. |
| **Matching Engine Weights & Radius Caps** | [`backend/app/matching/engine.py:12-15, 22`](file:///c:/BIOMASS/backend/app/matching/engine.py#L12-L15) | **Hardcoded** | `WEIGHT_DISTANCE = 0.3`, `WEIGHT_QUANTITY = 0.2`, `WEIGHT_PRICE = 0.3`, `WEIGHT_TRANSPORT = 0.2`. `max_radius = 100.0 km`, max transport freight = ₹500/ton. |
| **Geodesic Haversine Distance Calculation** | [`database/db.py:13-27`](file:///c:/BIOMASS/database/db.py#L13-L27) | **Calculated** | Pure mathematical implementation using spherical trigonometry ($R = 6371.0\text{ km}$) registered as custom SQL function in SQLite connection engine. |
| **Dynamic Biomass Yield Calculation** | [`backend/app/services/biomass.py:45`](file:///c:/BIOMASS/backend/app/services/biomass.py#L45) | **Calculated** | Deterministic agricultural residue equation: $\text{Biomass (MT)} = \text{Yield (MT/ha)} \times \text{Area (ha)} \times \text{Residue Ratio} \times \text{Recovery Factor}$. |
| **Dynamic Market Price Adjustment** | [`backend/app/pricing/estimate.py:53-62`](file:///c:/BIOMASS/backend/app/pricing/estimate.py#L53-L62) | **Calculated** | Adjusts base price by $\pm 10\%$ per ratio deviation when $\text{Demand}/\text{Supply} > 1.2$ or $< 0.8$ (bounded at $\pm 20\%$). |
| **Match Scoring & Net Profit Calculation** | [`backend/app/matching/engine.py:17-51, 117`](file:///c:/BIOMASS/backend/app/matching/engine.py#L17-L51) | **Calculated** | $\text{Expected Profit} = (\text{Quantity} \times \text{Offered Price}) - \text{Transport Cost}$. Score combines 4 weighted sub-metrics normalized to 100. |
| **ML Inference Service** | [`ml/inference.py:17-39`](file:///c:/BIOMASS/ml/inference.py#L17-L39) | **Calculated (ML Pipeline)** | Runs Scikit-learn Pipeline (`ColumnTransformer` + Random Forest Regressor) loaded from [`ml/models/yield_model.pkl`](file:///c:/BIOMASS/ml/models/yield_model.pkl). As of Prompt 01b, the model is **retrained on empirical DES + IMD data** (48,214 real rows). Prior R²=0.9911 on synthetic data is superseded; see [`ml/evaluation/model_comparison.md`](file:///c:/BIOMASS/ml/evaluation/model_comparison.md) for current honest metrics. |
| **Test Fixtures & SQLite In-Memory DB** | [`tests/test_bioplan.py:22-62`](file:///c:/BIOMASS/tests/test_bioplan.py#L22-L62) | **Test Fixture** | Ephemeral in-memory SQLite database (`sqlite:///:memory:`) and temporary mock farmers, buyers, and crops used during pytest runs. |

---

## 3. Findings & Current Status

1. **Real Agricultural Yield Data — RESOLVED (Prompt 01b)**: The yield prediction model is now trained on 48,214 empirical DES APY rows (1997–2015) merged with IMD district rainfall normals. The prior synthetic generator is deprecated from the production path. Honest R² on real data is lower than the synthetic 0.9911 — this is expected and correct.
2. **Missing Real Weather Ingestion — PARTIALLY RESOLVED**: Although the `WeatherData` SQLAlchemy table remains unpopulated (no real-time temperature/rainfall ingestion pipeline exists), the ML training pipeline now uses IMD district rainfall normals as the rainfall feature source. Temperature is approximated from climatological baselines (state + season) — a documented limitation. The `WeatherData` table population remains out of scope for Prompt 01b.
3. **Seeded Geographic Scope — EXPANDED**: The processed training dataset covers 33 States/UTs and hundreds of districts pan-India (not just Punjab). The seeded farm and buyer locations remain concentrated in Punjab for the application layer.
