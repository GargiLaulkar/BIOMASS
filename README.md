# BioPlan AI

## About

BioPlan AI is a full-stack platform designed to connect farmers generating agricultural residue with industrial buyers. By providing AI-driven crop yield and biomass estimates alongside a geospatial matching engine, it helps farmers monetize their stubble (rather than burning it) and allows buyers to secure their biomass supply chains efficiently based on transport cost and price.

The application combines a React dashboard, a FastAPI backend, Leaflet GIS proximity routing, and an XGBoost ML inference pipeline trained on real Indian agricultural and meteorological data.

> **Note:** This repository is a prototype and decision-support tool, not a production procurement, pricing, or agronomic advisory system. See [Known limitations](#known-limitations) before relying on its estimates.

## What it does

- Supports separate **farmer** and **buyer** accounts using JWT authentication.
- Lets farmers create farms with coordinates, crop, area, season, and expected harvest date.
- Predicts crop yield and derives recoverable biomass, availability dates, and a stored prediction record.
- Shows farms and facilities on Leaflet maps and finds nearby counterparties with a Haversine-distance query.
- Lets buyers maintain a facility profile and publish biomass quantity, date-window, and offered-price demands.
- Ranks matching buyers by distance, demand coverage, offer price, and transport cost, while saving explainable match records.
- Includes reproducible data-cleaning, feature-engineering, model-training, and automated-test code.

## Architecture

```text
React 19 + Vite frontend (port 5173)
        │ JWT / JSON HTTP
        ▼
FastAPI backend (port 8000)
        ├── SQLAlchemy → SQLite by default (bioplan.db)
        ├── ML inference → serialized scikit-learn/XGBoost pipeline
        ├── biomass / pricing / matching services
        └── Haversine GIS queries

DES crop-production data + IMD rainfall normals
        ▼
cleaning and feature engineering
        ▼
processed training CSV → model evaluation → yield_model.pkl
```

## Repository layout

| Path | Purpose |
| --- | --- |
| `frontend/` | Vite/React single-page UI, dashboards, Leaflet map, Chart.js visualizations, and browser-side auth state. |
| `backend/app/` | FastAPI entry point, API routers, authentication, schemas, matching, pricing, logistics, and biomass services. |
| `database/` | SQLAlchemy engine/models and an idempotent development seed script. |
| `ml/` | Data ingestion, validation/cleaning, feature engineering, training, inference, trained model, and evaluation report. |
| `ml/data/raw/` | Versioned DES crop production and IMD rainfall source files. |
| `ml/data/processed/` | Model-ready 48,214-row processed dataset and manifest. |
| `docs/` | Data provenance/inventory and pricing/transport assumptions. |
| `tests/` | API, service, GIS, ML-inference, data-pipeline, and formula tests. |

## Quick start

Prerequisites: Python 3.10+ and Node.js 20+ are recommended.

1. Create and activate a Python virtual environment from the repository root.

   ```bash
   python3 -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt
   ```

2. Create your local configuration. The backend defaults to a SQLite database in the repository root when no `.env` file exists.

   ```bash
   cp .env.example .env
   ```

   Before exposing the API outside local development, replace `JWT_SECRET`, restrict `CORS_ALLOWED_ORIGINS`, and use a managed database.

3. Seed local crops, a sample farmer/farm, and buyer demand data.

   ```bash
   python3 database/seed/seed.py
   ```

   Development logins use `password123`:

   | Role | Email |
   | --- | --- |
   | Farmer | `farmer@bioplan.com` |
   | Buyer | `buyer@bioplan.com` |

4. Start the API from the repository root.

   ```bash
   uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000
   ```

   API documentation is available at `http://localhost:8000/docs`.

5. In a second terminal, install and start the frontend.

   ```bash
   cd frontend
   npm ci
   npm run dev
   ```

   Open the Vite URL printed in the terminal (normally `http://localhost:5173`). The default API target is `http://localhost:8000`; override it with `VITE_API_BASE_URL` in `frontend/.env.local` if needed.

## Typical workflow

1. Log in as a farmer and create a farm (or use the seeded farm).
2. Run a biomass prediction for its crop and harvest date.
3. Inspect nearby buyers and ranked buyer recommendations.
4. Log in as a buyer to create a facility profile and post a procurement demand.
5. Use the map and buyer dashboard to inspect nearby farm supply.

## Core calculations

### Yield and biomass

The inference service supplies a predicted yield in tonnes per hectare. Recoverable residue is then calculated as:

```text
biomass (tonnes) = predicted yield × cultivated area × residue ratio × recovery factor
```

The availability period is the stated harvest date through 45 days later. Crop residue/recovery coefficients are seeded for Rice (Paddy), Wheat, Sugarcane, Cotton, and Maize.

### Logistics, price, and matching

- Distance uses the Haversine formula (Earth radius: 6,371 km).
- Transport cost is `distance_km × COST_PER_KM × quantity_tons`; `COST_PER_KM` defaults to ₹5.00 per tonne-km and is configurable in `.env`.
- Estimated price starts from a crop-specific static base price and is adjusted by local system demand/supply ratio, with a ±20% bound.
- The match score weights distance (30%), buyer quantity coverage (20%), offered price (30%), and transport cost (20%). Only demands of the same crop within 100 km are considered by the matching endpoint.

## API overview

All routes except registration/login and crop lookup require `Authorization: Bearer <token>`.

| Area | Main endpoints |
| --- | --- |
| Health | `GET /` |
| Authentication | `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/forgot-password`, `POST /api/auth/reset-password` |
| Crops and farms | `GET /api/crops`, `POST /api/farms`, `GET /api/farms`, `GET /api/farms/{id}` |
| Buyer facilities and demand | `POST /api/buyers`, `GET /api/buyers/me`, `GET/PUT /api/buyers/{id}`, `POST/GET /api/demand`, `GET /api/demand/me` |
| Predictions and recommendations | `POST /api/predictions/biomass`, `GET /api/predictions/{farm_id}`, `GET /api/matching/{farm_id}` |
| GIS | `GET /api/gis/nearby-buyers?farm_id=&radius_km=`, `GET /api/gis/nearby-farms?buyer_id=&radius_km=` |

Use the live OpenAPI interface at `/docs` for exact validation schemas and request examples.

## Data and ML pipeline

The production yield dataset joins:

- DES district/season crop production statistics (1997–2015), with yield derived as production divided by area.
- IMD district rainfall normals, selected by agricultural season.

After validation, crop filtering, district reconciliation, missing-value handling, and agronomic outlier filtering, the included processed dataset contains **48,214 records** across five target crops and **33 states/UTs**. Its eight columns are `state`, `district`, `crop`, `season`, `area_ha`, `temperature_c`, `rainfall_mm`, and `yield_tons_per_ha`.

To regenerate the processed data:

```bash
python3 ml/preprocessing/feature_engineering.py
```

To train and compare Linear Regression, Random Forest, and XGBoost models, then overwrite the serialized model:

```bash
python3 ml/training/train.py
```

The committed comparison report selected **XGBoost** with MAE 1.8917, RMSE 5.5328, and R² 0.9393 on a fixed 80/20 random split. Full source provenance, schemas, and caveats are in [docs/DATA_SOURCES.md](docs/DATA_SOURCES.md), [docs/DATA_INVENTORY.md](docs/DATA_INVENTORY.md), and [ml/evaluation/model_comparison.md](ml/evaluation/model_comparison.md).

## Testing and checks

From the repository root, with Python dependencies installed:

```bash
python3 -m pytest -q
```

For frontend static checks:

```bash
cd frontend
npm run lint
npm run build
```

The backend tests cover authentication, farm/buyer flows, prediction persistence, transport/profit math, matching, GIS proximity, and the empirical-data preprocessing path.

## Configuration

| Variable | Default | Meaning |
| --- | --- | --- |
| `DATABASE_URL` | `sqlite:///./bioplan.db` | SQLAlchemy connection string. |
| `JWT_SECRET` | development fallback | Signing key for access and reset tokens. Replace in every non-local environment. |
| `JWT_ALGORITHM` | `HS256` | JWT algorithm. |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `1440` | Access-token lifetime. |
| `HOST` / `PORT` | `0.0.0.0` / `8000` | Backend bind settings. |
| `CORS_ALLOWED_ORIGINS` | localhost Vite/React URLs | Comma-separated allowed origins. |
| `COST_PER_KM` | `5.0` | Freight rate used by transport calculations. |
| `VITE_API_BASE_URL` | `http://localhost:8000` | Frontend-only API base URL. |

`DATA_GOV_IN_API_KEY` appears in `.env.example` for future automated refreshes; the present pipeline uses the committed source files and does not call that service.

## Known limitations

- `WeatherData` exists in the schema but is not populated by a live weather-ingestion service. Runtime predictions therefore use fallback temperature (25°C) and rainfall (500 mm) values.
- Training temperature is a season/state climatological approximation, not observed IMD temperature data.
- The seed records, buyer locations/demands, residue coefficients, base prices, freight rate, matching weights, and no-prediction yield fallback are prototype assumptions; validate them for an operational region.
- Password-reset currently returns a signed reset token in the API response. It is a development flow, not an email-delivery implementation.
- The API creates tables automatically and has no database migration, observability, rate limiting, authorization audit trail, or production deployment configuration.
- The persisted biomass model-version label is `biomass_formula_v1.0`, while yield records currently use a static `random_forest_v1.0` label; retraining currently selects XGBoost. Version metadata should be aligned before production use.

## Further documentation

- [Dataset notes](docs/dataset_notes.md)
- [Data sources and provenance](docs/DATA_SOURCES.md)
- [Data inventory and assumption audit](docs/DATA_INVENTORY.md)
- [Pricing assumptions](docs/pricing_notes.md)
- [Transport-cost assumptions](docs/transport_cost_notes.md)
