"""
Feature Engineering Module
Combines cleaned agricultural crop data and IMD meteorological normals
to produce the exact feature schema required by the ML yield prediction interface.
"""

import os
import json
from datetime import datetime, timezone
from typing import Optional, Tuple
import pandas as pd
import numpy as np

try:
    from .clean import clean_crop_data, clean_weather_data
    from .validate import validate_dataset
except (ImportError, ValueError):
    from ml.preprocessing.clean import clean_crop_data, clean_weather_data
    from ml.preprocessing.validate import validate_dataset

# Climatological baseline seasonal temperatures (°C) in India's agricultural zones
CLIMATIC_SEASONAL_TEMPERATURES = {
    "Kharif": 30.0,
    "Autumn": 28.5,
    "Rabi": 18.5,
    "Winter": 16.5,
    "Summer": 33.0,
    "Whole Year": 27.0
}

# State-level thermal adjustments (°C delta from national seasonal baseline)
STATE_THERMAL_OFFSETS = {
    "PUNJAB": -1.0,        # Slightly cooler winters / continental climate
    "HARYANA": -0.5,
    "HIMACHAL PRADESH": -6.0,
    "JAMMU AND KASHMIR": -8.0,
    "UTTAR PRADESH": 0.0,
    "RAJASTHAN": 2.0,      # Warmer arid/semi-arid
    "TAMIL NADU": 2.5,     # Tropical maritime
    "KERALA": 1.5,
    "KARNATAKA": 1.0,
    "ANDHRA PRADESH": 2.0,
    "TELANGANA": 2.0,
    "MAHARASHTRA": 1.0,
    "GUJARAT": 1.5,
    "BIHAR": 0.5,
    "WEST BENGAL": 1.0,
    "ODISHA": 1.5,
    "MADHYA PRADESH": 1.0
}

def assign_meteorological_features(
    crop_df: pd.DataFrame,
    weather_df: pd.DataFrame
) -> pd.DataFrame:
    """
    Merges crop production dataset with IMD district rainfall normals
    and assigns seasonal temperatures.
    """
    # 1. Compute state-level fallback rainfall averages for missing districts
    state_rain_fallback = weather_df.groupby("STATE_UT_NAME")[
        ["Jan-Feb", "Mar-May", "Jun-Sep", "Oct-Dec", "ANNUAL"]
    ].mean().to_dict(orient="index")
    
    # 2. Index weather by (STATE_UT_NAME, DISTRICT)
    weather_dict = {}
    for _, row in weather_df.iterrows():
        st = str(row["STATE_UT_NAME"]).strip().upper()
        dist = str(row["DISTRICT"]).strip().upper()
        weather_dict[(st, dist)] = {
            "Jan-Feb": float(row.get("Jan-Feb", 0.0)),
            "Mar-May": float(row.get("Mar-May", 0.0)),
            "Jun-Sep": float(row.get("Jun-Sep", 0.0)),
            "Oct-Dec": float(row.get("Oct-Dec", 0.0)),
            "ANNUAL": float(row.get("ANNUAL", 0.0))
        }

    rainfall_list = []
    temp_list = []

    for _, row in crop_df.iterrows():
        st = str(row["State_Name"]).strip().upper()
        dist = str(row.get("District_Reconciled", row["District_Name"])).strip().upper()
        season = str(row["Season"]).strip()

        # Lookup weather record
        w_rec = weather_dict.get((st, dist))
        if w_rec is None:
            # Documented fallback: State average normal rainfall
            w_rec = state_rain_fallback.get(st, {
                "Jan-Feb": 30.0,
                "Mar-May": 80.0,
                "Jun-Sep": 650.0,
                "Oct-Dec": 90.0,
                "ANNUAL": 850.0
            })

        # Match seasonal rainfall
        if season in ["Kharif", "Autumn"]:
            rain_val = w_rec.get("Jun-Sep", 650.0)
        elif season in ["Rabi", "Winter"]:
            rain_val = w_rec.get("Oct-Dec", 90.0) + w_rec.get("Jan-Feb", 30.0)
        elif season == "Summer":
            rain_val = w_rec.get("Mar-May", 80.0)
        else: # Whole Year or default
            rain_val = w_rec.get("ANNUAL", 850.0)

        # Assign temperature
        base_temp = CLIMATIC_SEASONAL_TEMPERATURES.get(season, 27.0)
        offset = STATE_THERMAL_OFFSETS.get(st, 0.0)
        temp_val = round(base_temp + offset, 1)

        rainfall_list.append(round(float(rain_val), 1))
        temp_list.append(temp_val)

    crop_df["rainfall_mm"] = rainfall_list
    crop_df["temperature_c"] = temp_list
    return crop_df

def engineer_features(
    crop_clean: pd.DataFrame,
    weather_clean: pd.DataFrame
) -> pd.DataFrame:
    """
    Transforms cleaned crop and weather DataFrames into the final ML model feature schema:
    ['state', 'district', 'crop', 'season', 'area_ha', 'temperature_c', 'rainfall_mm', 'yield_tons_per_ha']
    """
    # 1. Merge meteorological features
    merged = assign_meteorological_features(crop_clean.copy(), weather_clean.copy())
    
    # 2. Derive target yield: yield_tons_per_ha = Production / Area
    merged["yield_tons_per_ha"] = (merged["Production"] / merged["Area"]).round(3)
    
    # 3. Standardize column names to match predict_yield()
    result = pd.DataFrame({
        "state": merged["State_Name"].str.strip(),
        "district": merged["District_Name"].str.strip(),
        "crop": merged["Crop"].str.strip(),
        "season": merged["Season"].str.strip(),
        "area_ha": merged["Area"].astype(float).round(2),
        "temperature_c": merged["temperature_c"].astype(float),
        "rainfall_mm": merged["rainfall_mm"].astype(float),
        "yield_tons_per_ha": merged["yield_tons_per_ha"].astype(float)
    })
    
    return result

def run_pipeline(
    crop_raw_path: Optional[str] = None,
    weather_raw_path: Optional[str] = None,
    output_dir: Optional[str] = None
) -> Tuple[pd.DataFrame, dict]:
    """
    Full reproducible pipeline: Ingest -> Validate -> Clean -> Feature Engineer -> Save Versioned Processed Dataset.
    """
    from ml.data_ingestion.load_crop_yield import load_crop_yield_data
    from ml.data_ingestion.load_weather import load_weather_data
    
    # 1. Ingestion
    crop_raw = load_crop_yield_data(crop_raw_path)
    weather_raw = load_weather_data(weather_raw_path)
    
    # 2. Validation
    validation_report = validate_dataset(crop_raw, weather_raw)
    
    # 3. Cleaning
    crop_clean = clean_crop_data(crop_raw)
    weather_clean = clean_weather_data(weather_raw)
    
    # 4. Feature Engineering
    processed_df = engineer_features(crop_clean, weather_clean)
    
    # 5. Save output if output_dir specified
    if output_dir is not None:
        os.makedirs(output_dir, exist_ok=True)
        out_csv = os.path.join(output_dir, "crop_yield_weather_processed.csv")
        processed_df.to_csv(out_csv, index=False)
        
        manifest = {
            "dataset_name": "Empirical Agricultural Crop Yield & Climate Normals (BioPlan Processed)",
            "version": "1.0.0",
            "date_generated": datetime.now(timezone.utc).isoformat(),
            "source_raw_crop": crop_raw_path or "ml/data/raw/crop_yield_des/crop_production.csv",
            "source_raw_weather": weather_raw_path or "ml/data/raw/imd_weather/district_wise_rainfall_normal.csv",
            "row_count": len(processed_df),
            "columns": list(processed_df.columns),
            "crops_covered": sorted(processed_df["crop"].unique().tolist()),
            "states_covered": sorted(processed_df["state"].unique().tolist()),
            "yield_summary": {
                "mean": float(processed_df["yield_tons_per_ha"].mean()),
                "std": float(processed_df["yield_tons_per_ha"].std()),
                "min": float(processed_df["yield_tons_per_ha"].min()),
                "max": float(processed_df["yield_tons_per_ha"].max())
            }
        }
        out_manifest = os.path.join(output_dir, "manifest.json")
        with open(out_manifest, "w", encoding="utf-8") as f:
            json.dump(manifest, f, indent=2)
            
    return processed_df, validation_report

if __name__ == "__main__":
    out_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data", "processed"))
    df, report = run_pipeline(output_dir=out_path)
    print(f"Processed dataset successfully generated at {out_path}")
    print(f"Processed shape: {df.shape}")
    print(df.head())
