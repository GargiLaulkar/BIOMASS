# Dataset Notes & Feature Columns

> **Status (updated Prompt 01b):** The yield prediction model is now trained on
> **empirical, real-world data**. The synthetic generator described in previous
> versions of this file has been retired from the production training path.
> See [`docs/DATA_SOURCES.md`](DATA_SOURCES.md) for full provenance of all real data sources.

---

## Real Training Data (Current)

The processed training dataset at `ml/data/processed/crop_yield_weather_processed.csv`
is derived from two authoritative external sources documented in
[`docs/DATA_SOURCES.md`](DATA_SOURCES.md):

| Feature | Source | Notes |
|---|---|---|
| `state` | DES APY `State_Name` | Stripped whitespace, title-cased |
| `district` | DES APY `District_Name` | Uppercased; district name reconciliation applied (see `ml/preprocessing/clean.py`) |
| `crop` | DES APY `Crop` mapped via `CROP_NAME_MAPPING` | Only 5 target crops retained: Rice (Paddy), Wheat, Sugarcane, Cotton, Maize |
| `season` | DES APY `Season` | Stripped whitespace |
| `area_ha` | DES APY `Area` (hectares) | Non-positive values dropped |
| `temperature_c` | Derived from `CLIMATIC_SEASONAL_TEMPERATURES` (state+season baseline) | **Not measured IMD temperature data** — documented approximation; no IMD temperature dataset was acquired in Prompt 01a |
| `rainfall_mm` | IMD `district_wise_rainfall_normal.csv` seasonal columns | Season-matched to Kharif (Jun–Sep), Rabi (Oct–Dec + Jan–Feb), Summer (Mar–May), Whole Year (ANNUAL) |
| `yield_tons_per_ha` | Derived as `Production (MT) / Area (ha)` | Target variable; outliers outside agronomic bounds filtered before training |

### Processed Dataset Statistics

- **Source**: DES APY 1997–2015 × IMD district rainfall normals
- **Pipeline**: `ml/preprocessing/feature_engineering.py → run_pipeline()`
- **Rows**: ~48,214 (after cleaning and outlier filtering)
- **Crops**: Cotton, Maize, Rice (Paddy), Sugarcane, Wheat
- **States**: 33 States/UTs (pan-India)
- **Yield range**: 0.059 – 159.954 MT/ha (reflects genuine Sugarcane high-tonnage range)

---

## Deprecated: Synthetic Generator

`generate_agricultural_data()` in `ml/training/train.py` is **deprecated from
the production path** as of Prompt 01b. It is retained in the file **only** to
support test fixture generation in `tests/test_data_ingestion.py` and must
**never** be called from `main()` or any production code path.

The synthetic generator produced 5,000 rows via a hand-written formula with
`np.random.seed(42)`, yielding an artificially high R²=0.9911. This metric
is not comparable to results on real data and is now superseded.

---

## Cleaning & Validation Transforms Applied

See `ml/preprocessing/clean.py` and `ml/preprocessing/validate.py` for full
details. Key documented transforms:

1. **Crop name mapping** — `Rice` → `Rice (Paddy)`, `Cotton(lint)` → `Cotton`
2. **Missing Production** — DROP (cannot compute yield target)
3. **Non-positive Area** — REJECT
4. **District name reconciliation** — `FIROZEPUR` → `FEROZEPUR`,
   `FAZILKA` → `FEROZEPUR` (bifurcated 2011, parent IMD station used), etc.
5. **Agronomic yield outlier filtering** — bounds per crop documented in
   `AGRONOMIC_YIELD_BOUNDS` (e.g. Rice: 0.1–8.0 MT/ha, Sugarcane: 5.0–160.0 MT/ha)
6. **Temperature approximation** — seasonal baseline + state thermal offset;
   this is a documented limitation, not a silent default.
