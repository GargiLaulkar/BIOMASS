# BioPlan AI — Project Documentation

## 1. Overview and problem statement

BioPlan AI is a full-stack agricultural-residue planning prototype for connecting farmers who have crop residue with industrial biomass buyers. It focuses on the operational questions that arise after harvest: how much recoverable residue may be available, when it can be collected, which facilities are nearby, what transport will cost, and which buyer demand is the most attractive.

Agricultural residue such as paddy straw, wheat straw, maize residue, cotton stalks, and sugarcane residue can be a feedstock for biomass power, pellets, board, paper, biofuels, and industrial boilers. However, this supply is geographically dispersed, seasonal, and expensive to transport. A farmer may not know which buyer has an active requirement, while an industrial buyer may not have a view of nearby farm supply. In practice this can contribute to unutilised residue and, in some regions, open-field burning. BioPlan AI demonstrates how farm information, yield estimation, geospatial search, and transparent commercial calculations can support better decisions.

The system is explicitly a prototype and decision-support application. It does not claim to replace agronomic advice, contracted procurement, market-price discovery, or a production-grade logistics system.

## 2. Objectives

1. Register farmer-owned farms with location, area, crop, season, and expected harvest date.
2. Maintain buyer/facility profiles and crop-residue procurement requirements.
3. Estimate yield and recoverable biomass using a trained machine-learning model and crop coefficients.
4. Identify nearby farmers or buyers using geographic coordinates and Haversine distance.
5. Estimate transport cost, indicative price, expected profit, and an explainable match score.
6. Present the result through farmer and buyer dashboards, maps, charts, and accessible multilingual UI support.
7. Preserve a reproducible empirical data-processing and model-training path.

## 3. System architecture

```text
┌────────────────────────────────────────────────────────────────────┐
│ React 19 + Vite frontend                                            │
│ AuthView | FarmerDashboard | BuyerDashboard | Leaflet | Chart.js    │
│ English / Hindi / Marathi UI resources via react-i18next            │
└───────────────────────────────┬────────────────────────────────────┘
                                │ JSON over HTTP; JWT Bearer token
                                ▼
┌────────────────────────────────────────────────────────────────────┐
│ FastAPI application (`backend.app.main`)                            │
│ auth | crops | farms | buyers/demand | GIS | predictions | matching │
└───────────────┬────────────────────┬───────────────────────────────┘
                │                    │
                ▼                    ▼
┌─────────────────────────┐  ┌──────────────────────────────────────┐
│ SQLAlchemy / SQLite      │  │ ML inference (`ml/inference.py`)     │
│ users, farms, crops,     │  │ `yield_model.pkl` → predicted yield │
│ demands, predictions,    │  └──────────────────────────────────────┘
│ and matches              │
└─────────────────────────┘

DES crop production CSV + IMD rainfall-normal CSV
                │
                ▼
validation → cleaning → feature engineering → processed CSV
                │
                ▼
model comparison/training → `ml/models/yield_model.pkl`
```

The frontend calls existing REST endpoints through `frontend/src/services/api.js`. FastAPI initializes SQLAlchemy tables at application startup. SQLite is the default local database; the design permits a PostgreSQL connection string through `DATABASE_URL`, though spatial/PostGIS migrations are not currently implemented.

## 4. Technology stack and rationale

| Layer | Technology | Why it is used |
| --- | --- | --- |
| User interface | React 19, Vite | Component-based UI with fast local development and a small client-side deployment model. |
| Styling | CSS custom properties, Inter | A tokenized agricultural palette makes the interface consistent and easy to revise without changing UI logic. |
| Internationalisation | i18next, react-i18next | Standard React i18n integration with persisted language preference and JSON resource files. |
| Maps | Leaflet, React Leaflet | Open-source interactive maps for farms, facilities, popups, and search radii. |
| Charts | Chart.js, react-chartjs-2 | Compact bar and doughnut visualisations for farm output and buyer demand. |
| API | FastAPI, Pydantic | Typed request validation, generated OpenAPI documentation, and concise Python route definition. |
| Persistence | SQLAlchemy 2, SQLite | ORM-backed relational data model with zero-configuration local development. |
| Authentication | JWT, bcrypt | Stateless bearer-token access control with bcrypt password hashes. |
| Data/ML | pandas, NumPy, scikit-learn, XGBoost, joblib | CSV preparation, preprocessing pipelines, model comparison, and serialized local inference. |
| Testing | pytest, httpx | Unit/integration tests for services, API flows, GIS calculations, and preprocessing. |

## 5. Core modules

### 5.1 Authentication and roles

`backend/app/api/auth.py` provides registration and JSON login. A successful login returns an access token containing the email, user ID, role, and expiry. `backend/app/auth_utils.py` verifies the bearer token and provides role guards:

- `get_current_user`: validates JWT and loads the user.
- `get_current_farmer`: limits farmer-only actions such as creating a farm.
- `get_current_buyer`: limits buyer-only profile and demand actions.

There are only two application roles: `farmer` and `buyer`. The frontend stores the token and user summary in browser local storage and attaches the token to requests. A compatibility form endpoint exists for FastAPI OAuth tooling.

### 5.2 Farm and buyer management

Farm creation stores a farm profile and optional `FarmCrop` rows in one transaction. A farm has coordinates, total area, district, state, and a farmer owner. Each farm crop identifies the crop, Kharif/Rabi season, cultivated area, and expected harvest date.

Buyers first create one buyer profile tied one-to-one to their user account. A buyer can then create any number of `BuyerDemand` records, each with a biomass/crop type, required tonnes, procurement time window, and offered price. The crop type value is deliberately sent unchanged from the backend crop catalogue; translated UI text must not change this matching value.

### 5.3 Biomass prediction

`POST /api/predictions/biomass` calls `calculate_biomass_prediction`. The service retrieves the farm and crop, determines a season from an existing farm-crop row or the harvest month, invokes ML inference, and persists both yield and biomass prediction records.

The core biomass formula is:

```text
predicted yield (MT/ha) = ML model(state, district, crop, season,
                                   area, temperature, rainfall)

recoverable biomass (MT) = predicted yield × cultivated area (ha)
                           × residue ratio × recovery factor
```

The availability window is currently the expected harvest date through 45 days after it. Seeded crop coefficients are: Rice (Paddy) 1.5/0.5, Wheat 1.5/0.3, Sugarcane 0.2/0.8, Cotton 2.75/0.8, and Maize 1.5/0.4 (residue ratio/recovery factor).

### 5.4 GIS proximity

`database/db.py` implements the Haversine formula with an Earth radius of 6,371 km and registers it as SQLite function `haversine`. GIS endpoints query buyers around a farm or farms around a buyer/coordinate, filter by a requested radius (default 50 km), and return rounded distances. Leaflet visualises these locations, using agriculture-themed farm and facility markers and optional radius rings.

### 5.5 Price and logistics estimation

Transport cost is deterministic:

```text
transport cost (INR) = distance (km) × COST_PER_KM × biomass quantity (MT)
```

`COST_PER_KM` defaults to `5.0` in the environment. `estimate_price` starts from hardcoded crop-specific base prices and calculates the ratio of active demand to known/estimated supply. High demand raises the base price and low demand reduces it; the adjustment is bounded at ±20%. If no biomass prediction exists, supply uses a 4.0 MT/ha yield approximation.

### 5.6 Buyer–farmer matching

`run_matching_engine` loads the latest biomass prediction for a farm. If absent, it applies a 4.0 MT/ha fallback to estimate biomass. It retains demands only when the crop name matches exactly and buyer distance is within 100 km. Old stored matches for that farm are deleted, new matches are persisted, and results are ordered by descending score.

Expected profit and score are calculated as follows:

```text
revenue         = biomass quantity × buyer offered price
expected profit = revenue − transport cost

score = 100 × (
  0.30 × distance score  +
  0.20 × quantity score  +
  0.30 × price score     +
  0.20 × transport score
)
```

Distance score declines linearly across a 100 km range. Quantity score is 1 when buyer demand can absorb all farm biomass, otherwise it is the demand/supply ratio. Price score compares offer price to the indicative estimated price and is capped at 1.5. Transport score compares cost with a ₹500-per-ton maximum-reasonable-cost reference. Each stored match also includes a human-readable explanation.

## 6. Data pipeline and model

### Sources

The production path uses committed source data, documented in `docs/DATA_SOURCES.md`:

- Directorate of Economics and Statistics (DES), Government of India: district-wise, season-wise crop production statistics, 1997–2015.
- India Meteorological Department (IMD): district rainfall normals, with monthly and seasonal rainfall fields.

### Preparation

`ml/preprocessing/feature_engineering.py` orchestrates ingestion, validation, cleaning, feature engineering, processed-CSV output, and a manifest. Key transformations are:

1. Validate required raw columns and geographic/crop references.
2. Retain five target crops; map `Rice` to `Rice (Paddy)` and `Cotton(lint)` to `Cotton`.
3. Drop missing production and non-positive area because yield cannot be calculated reliably.
4. Reconcile selected district spellings to rainfall reference names.
5. Remove crop-specific agronomic yield outliers.
6. Choose rainfall by season: Kharif = Jun–Sep; Rabi = Oct–Dec plus Jan–Feb; Summer = Mar–May; Whole Year = annual.
7. Approximate temperature from season/state climate baselines.
8. Derive target yield as `Production / Area`.

The included processed manifest reports **48,214 rows** from 33 states/UTs. Its schema is:

| Field | Meaning |
| --- | --- |
| `state`, `district`, `crop`, `season` | Categorical model features. |
| `area_ha`, `temperature_c`, `rainfall_mm` | Numeric model features. |
| `yield_tons_per_ha` | Regression target. |

### Model methodology and result

`ml/training/train.py` performs a fixed 80/20 random split (`random_state=42`), one-hot encodes categorical features, leaves numeric features as pass-through, trains Linear Regression, Random Forest, and XGBoost candidates, and selects the highest-R² pipeline. The committed comparison report is:

| Model | MAE | RMSE | R² |
| --- | ---: | ---: | ---: |
| Linear Regression | 4.8819 | 9.5629 | 0.8186 |
| Random Forest | 1.7841 | 5.7114 | 0.9353 |
| XGBoost (selected) | 1.8917 | 5.5328 | 0.9393 |

The winner is written to `ml/models/yield_model.pkl` and loaded lazily by `ml/inference.py`. The historical synthetic generator is retained only for test-fixture support; it is not used in the production training path.

## 7. Database schema overview

| Table | Purpose and principal relationships |
| --- | --- |
| `users` | User identity, email, bcrypt hash, and farmer/buyer role. One user has many farms or one buyer profile. |
| `farms` | Farmer-owned geolocated farm; one-to-many with `farm_crops`, yield predictions, biomass predictions, and matches. |
| `crops` | Crop name and biomass coefficients; referenced by farm crops. |
| `farm_crops` | Crop plan for a farm: crop, season, cultivated area, harvest date. |
| `weather_data` | Location/date/rainfall/temperature/humidity schema; currently not seeded or live-populated. |
| `yield_predictions` | Persisted model yield values and version label per farm. |
| `biomass_predictions` | Calculated tonnes, availability dates, confidence, and formula version per farm. |
| `buyers` | Buyer facility profile linked one-to-one to a user. |
| `buyer_demand` | Buyer procurement requirements, time period, quantity, and offer price. |
| `matches` | Persisted farm-to-buyer recommendation, transport/economic values, score, and reason text. |

## 8. API reference summary

| Area | Endpoint | Auth / role |
| --- | --- | --- |
| Service | `GET /` | Public |
| Authentication | `POST /api/auth/register`, `POST /api/auth/login` | Public |
| Password recovery | `POST /api/auth/forgot-password`, `POST /api/auth/reset-password` | Public development flow |
| Crops | `GET /api/crops` | Public |
| Farms | `POST /api/farms` | Farmer |
|  | `GET /api/farms`, `GET /api/farms/{id}` | Authenticated |
| Buyer profiles | `POST /api/buyers`, `GET /api/buyers/me`, `PUT /api/buyers/{id}` | Buyer |
|  | `GET /api/buyers/{id}` | Public route in current code |
| Buyer demand | `POST /api/demand`, `GET /api/demand/me` | Buyer |
|  | `GET /api/demand`, `GET /api/demand/buyer/{buyer_id}` | Public route in current code |
| Prediction | `POST /api/predictions/biomass`, `GET /api/predictions/{farm_id}` | Authenticated |
| Matching | `GET /api/matching/{farm_id}` | Authenticated |
| GIS | `GET /api/gis/nearby-buyers`, `GET /api/gis/nearby-farms` | Authenticated |

FastAPI’s live API documentation is available at `/docs` while the backend is running.

## 9. Known limitations and assumptions

- `WeatherData` is unpopulated. Runtime biomass inference falls back to 25°C and 500 mm rainfall.
- Training temperature is a climatological approximation, not measured observed temperature.
- Seeded farms, buyers, demand, residue coefficients, base prices, freight rate, fallback yield, score weights, and radius rules are prototype assumptions, not validated operational policy.
- Price estimation is internal supply/demand arithmetic, not a live mandi or contract-price feed.
- Password reset returns a signed reset token in the API response; no email delivery is implemented.
- SQLite tables are created automatically. There are no Alembic migrations, production backups, or PostGIS spatial indexes.
- The prediction service stores the fixed yield version `random_forest_v1.0`, while the committed training report selects XGBoost. This metadata inconsistency must be resolved before production use.
- Frontend authentication state is local-storage based; production deployment needs stronger security controls, token lifecycle handling, and secure operational configuration.

## 10. Testing coverage

The repository includes 35 test cases across `tests/test_bioplan.py` and `tests/test_data_ingestion.py`. Coverage includes ML inference availability, transport and profit formulas, price estimation, match scoring, root/crop/auth/farm/buyer/prediction endpoints, GIS proximity, matching execution, raw-schema validation, missing-data policy, feature engineering, reproducibility, and isolation of the deprecated synthetic-data path.

Run them after installing Python dependencies:

```bash
python3 -m pytest -q
```

## 11. Installation and execution

See [README.md](README.md) for the full walkthrough. The concise local flow is:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python3 database/seed/seed.py
uvicorn backend.app.main:app --reload
```

In another terminal:

```bash
cd frontend
npm ci
npm run dev
```

Use `npm run build` to create a production frontend bundle and `npm run lint` for static checks.

## 12. Future scope

1. Integrate a trusted live weather API and populate `WeatherData` to replace fallback temperature/rainfall values.
2. Move to managed PostgreSQL with Alembic migrations, backups, indexes, and PostGIS where appropriate.
3. Implement a real email- or OTP-based password-reset workflow rather than returning a token to the caller.
4. Replace static base prices with contracted rates and/or mandi-market feeds, including a controlled `DATA_GOV_IN_API_KEY` refresh process.
5. Add more crops, geographically validated residue/recovery coefficients, and crop-specific availability assumptions.
6. Deliver a PWA or native mobile interface designed for field use, offline drafts, and low-bandwidth synchronisation.
7. Provide SMS/IVR access for farmers who cannot depend on continuous data connectivity.
8. Automate model retraining with dataset versioning, per-region evaluation, feature monitoring, and drift alerts.
9. Add a role-based administrator dashboard for data quality, user support, procurement oversight, and aggregate analytics.
10. Extend current multilingual UI work with voice input/output in regional languages, subject to human-language review.
11. Add rate limiting, audit trails, structured logs, health monitoring, alerts, and production observability.
12. Align the persisted yield model-version label with the actually deployed serialized pipeline (currently XGBoost in the comparison report).
