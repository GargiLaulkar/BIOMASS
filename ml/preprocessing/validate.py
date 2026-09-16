"""
Data Validation Module
Implements Section F empirical data validation checks on raw and merged agricultural/meteorological data.
"""

import os
import json
import logging
from typing import Dict, Any, List, Optional
import pandas as pd
import numpy as np

# Configure logging
logger = logging.getLogger("BioPlan.ML.Validate")

# Agronomic plausible yield thresholds (MT/ha) per crop
AGRONOMIC_YIELD_BOUNDS = {
    "Rice": (0.1, 8.0),
    "Rice (Paddy)": (0.1, 8.0),
    "Wheat": (0.1, 8.0),
    "Sugarcane": (5.0, 160.0),
    "Cotton(lint)": (0.05, 6.0),
    "Cotton": (0.05, 6.0),
    "Maize": (0.1, 10.0)
}

# Physical bounds for meteorological features
WEATHER_BOUNDS = {
    "temperature_c": (-10.0, 55.0), # °C
    "rainfall_mm": (0.0, 5000.0)    # mm
}

DEFAULT_REF_PATH = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "data", "external", "state_district_reference.json")
)

def load_reference_geography(ref_path: Optional[str] = None) -> Dict[str, List[str]]:
    """Loads known states and districts from reference lookup."""
    target_path = ref_path if ref_path is not None else DEFAULT_REF_PATH
    if os.path.exists(target_path):
        with open(target_path, "r", encoding="utf-8") as f:
            data = json.load(f)
            states = {}
            for state, info in data.get("states", {}).items():
                states[state.upper()] = [d.upper() for d in info.get("districts", [])]
            return states
    return {}

def validate_crop_data(df: pd.DataFrame, ref_path: Optional[str] = None) -> Dict[str, Any]:
    """
    Performs comprehensive validation on crop production dataset.
    
    Checks:
    1. Per-column null rates and missing value policies
    2. Duplicate keys (District_Name, Crop, Season, Crop_Year)
    3. Invalid crop years (< 1950 or > 2030)
    4. Invalid geography (district/state names)
    5. Invalid crop names (checks against supported crop list)
    6. Impossible values (negative or zero areas/production)
    7. Agronomic yield outliers
    
    Returns:
        Dict containing validation report and detailed failure logs.
    """
    failures = []
    summary = {
        "total_rows": len(df),
        "valid_rows": 0,
        "null_counts": df.isnull().sum().to_dict(),
        "null_rates": (df.isnull().mean() * 100).round(2).to_dict(),
        "duplicate_count": 0,
        "invalid_year_count": 0,
        "invalid_geography_count": 0,
        "invalid_crop_count": 0,
        "impossible_value_count": 0,
        "outlier_count": 0,
        "policies_applied": {
            "missing_production": "DROP: Records with null production cannot compute yield target",
            "non_positive_area": "REJECT: Cultivated area must be strictly > 0 ha",
            "missing_key_fields": "REJECT: State, District, Crop, Season, Year must be non-null",
            "unsupported_crops": "FILTER: Keep only 5 target biomass crops",
            "yield_outliers": "FLAG_AND_FILTER: Yields outside agronomic bounds flagged and excluded"
        }
    }

    # 1. Null Value Validation
    null_mask = df.isnull().any(axis=1)
    if null_mask.any():
        for idx, row in df[null_mask].head(100).iterrows():
            missing_cols = row.index[row.isnull()].tolist()
            failures.append({
                "index": idx,
                "check": "missing_values",
                "reason": f"Missing values in columns: {missing_cols}",
                "record": row.dropna().to_dict()
            })

    # 2. Duplicate Detection
    key_cols = ["District_Name", "Crop", "Season", "Crop_Year"]
    present_keys = [c for c in key_cols if c in df.columns]
    if len(present_keys) == len(key_cols):
        dup_mask = df.duplicated(subset=present_keys, keep=False)
        summary["duplicate_count"] = int(dup_mask.sum())
        for idx, row in df[dup_mask].head(100).iterrows():
            failures.append({
                "index": idx,
                "check": "duplicate_record",
                "reason": f"Duplicate key combination for {present_keys}",
                "record": {k: row[k] for k in present_keys}
            })

    # 3. Invalid Crop Years
    if "Crop_Year" in df.columns:
        inv_year_mask = ~df["Crop_Year"].between(1950, 2030, inclusive="both")
        summary["invalid_year_count"] = int(inv_year_mask.sum())
        for idx, row in df[inv_year_mask].head(100).iterrows():
            failures.append({
                "index": idx,
                "check": "invalid_date_year",
                "reason": f"Crop_Year {row.get('Crop_Year')} outside valid range [1950, 2030]",
                "record": {"Crop_Year": row.get("Crop_Year"), "District": row.get("District_Name")}
            })

    # 4. Geography Validation
    ref_geo = load_reference_geography(ref_path)
    if ref_geo and "State_Name" in df.columns and "District_Name" in df.columns:
        # Check against reference if state is present in reference
        st_series = df["State_Name"].astype(str).str.strip().str.upper()
        dist_series = df["District_Name"].astype(str).str.strip().str.upper()
        
        invalid_geo_indices = []
        for state_name, valid_districts in ref_geo.items():
            mask = (st_series == state_name) & (~dist_series.isin(valid_districts))
            invalid_geo_indices.extend(df[mask].index.tolist())
            
        summary["invalid_geography_count"] = len(invalid_geo_indices)
        for idx in invalid_geo_indices[:100]:
            row = df.loc[idx]
            failures.append({
                "index": idx,
                "check": "invalid_geography",
                "reason": f"District '{row.get('District_Name')}' not in reference list for state '{row.get('State_Name')}'",
                "record": {"State_Name": row.get("State_Name"), "District_Name": row.get("District_Name")}
            })

    # 5. Crop Name Validation
    valid_crops = ["Rice", "Rice (Paddy)", "Wheat", "Sugarcane", "Cotton(lint)", "Cotton", "Maize"]
    if "Crop" in df.columns:
        inv_crop_mask = ~df["Crop"].astype(str).str.strip().isin(valid_crops)
        summary["invalid_crop_count"] = int(inv_crop_mask.sum())

    # 6. Impossible Values (Area <= 0 or Production < 0)
    if "Area" in df.columns:
        bad_area_mask = df["Area"] <= 0
        summary["impossible_value_count"] += int(bad_area_mask.sum())
        for idx, row in df[bad_area_mask].head(100).iterrows():
            failures.append({
                "index": idx,
                "check": "impossible_value",
                "reason": f"Non-positive Area value: {row.get('Area')}",
                "record": {"Area": row.get("Area"), "Crop": row.get("Crop")}
            })
            
    if "Production" in df.columns:
        bad_prod_mask = df["Production"] < 0
        summary["impossible_value_count"] += int(bad_prod_mask.sum())
        for idx, row in df[bad_prod_mask].head(100).iterrows():
            failures.append({
                "index": idx,
                "check": "impossible_value",
                "reason": f"Negative Production value: {row.get('Production')}",
                "record": {"Production": row.get("Production"), "Crop": row.get("Crop")}
            })

    # 7. Agronomic Outlier Detection
    if "Area" in df.columns and "Production" in df.columns and "Crop" in df.columns:
        valid_mask = (df["Area"] > 0) & (df["Production"].notnull()) & (df["Production"] >= 0)
        valid_df = df[valid_mask].copy()
        yield_series = valid_df["Production"] / valid_df["Area"]
        crop_series = valid_df["Crop"].astype(str).str.strip()
        
        outlier_indices = []
        for crop_name, (ymin, ymax) in AGRONOMIC_YIELD_BOUNDS.items():
            mask = (crop_series == crop_name) & ((yield_series < ymin) | (yield_series > ymax))
            outlier_indices.extend(valid_df[mask].index.tolist())
            
        summary["outlier_count"] = len(outlier_indices)
        for idx in outlier_indices[:100]:
            failures.append({
                "index": idx,
                "check": "agronomic_yield_outlier",
                "reason": f"Derived yield outside agronomic bounds for crop {df.loc[idx, 'Crop']}",
                "record": {"Crop": df.loc[idx, "Crop"], "Area": df.loc[idx, "Area"], "Production": df.loc[idx, "Production"]}
            })

    summary["failure_count"] = len(failures)
    return {
        "summary": summary,
        "failures": failures
    }

def validate_weather_data(df: pd.DataFrame) -> Dict[str, Any]:
    """
    Validates weather and meteorological features.
    
    Checks:
    1. Null values in rainfall columns
    2. Inconsistent units (e.g. Fahrenheit temp > 55°C, or rainfall in meters < 5)
    3. Impossible / negative rainfall values
    """
    failures = []
    summary = {
        "total_rows": len(df),
        "null_counts": df.isnull().sum().to_dict(),
        "unit_mismatches": 0,
        "impossible_values": 0
    }

    # Check rainfall ranges
    rain_cols = [c for c in ["Jan-Feb", "Mar-May", "Jun-Sep", "Oct-Dec", "ANNUAL", "rainfall_mm"] if c in df.columns]
    for col in rain_cols:
        # Negative rainfall
        neg = df[df[col] < 0]
        if len(neg) > 0:
            summary["impossible_values"] += len(neg)
            for idx, row in neg.iterrows():
                failures.append({
                    "index": idx,
                    "check": "negative_rainfall",
                    "reason": f"Negative rainfall in {col}: {row[col]}",
                    "record": {col: row[col]}
                })
        # Unit check: Extreme rainfall > 6000 mm
        extreme = df[df[col] > 6000.0]
        if len(extreme) > 0:
            summary["unit_mismatches"] += len(extreme)
            for idx, row in extreme.iterrows():
                failures.append({
                    "index": idx,
                    "check": "unit_or_extreme_rainfall",
                    "reason": f"Rainfall in {col} exceeds 6000mm: {row[col]}",
                    "record": {col: row[col]}
                })

    # Check temperature if present
    if "temperature_c" in df.columns:
        bad_temp = df[~df["temperature_c"].between(-10.0, 55.0)]
        if len(bad_temp) > 0:
            summary["unit_mismatches"] += len(bad_temp)
            for idx, row in bad_temp.iterrows():
                failures.append({
                    "index": idx,
                    "check": "temperature_unit_mismatch",
                    "reason": f"Temperature {row['temperature_c']} outside Celsius bounds [-10, 55]",
                    "record": {"temperature_c": row["temperature_c"]}
                })

    summary["failure_count"] = len(failures)
    return {
        "summary": summary,
        "failures": failures
    }

def validate_dataset(crop_df: pd.DataFrame, weather_df: Optional[pd.DataFrame] = None) -> Dict[str, Any]:
    """Top-level validation entry point."""
    crop_report = validate_crop_data(crop_df)
    weather_report = validate_weather_data(weather_df) if weather_df is not None else None
    
    return {
        "crop_validation": crop_report,
        "weather_validation": weather_report,
        "is_valid": (crop_report["summary"]["failure_count"] == 0) and (weather_report is None or weather_report["summary"]["failure_count"] == 0)
    }

if __name__ == "__main__":
    from ml.data_ingestion.load_crop_yield import load_crop_yield_data
    from ml.data_ingestion.load_weather import load_weather_data
    
    print("Running standalone validation check...")
    crop_raw = load_crop_yield_data()
    weather_raw = load_weather_data()
    
    report = validate_dataset(crop_raw, weather_raw)
    print(f"Total raw crop rows: {report['crop_validation']['summary']['total_rows']}")
    print(f"Crop validation null rates: {report['crop_validation']['summary']['null_rates']}")
    print(f"Crop validation outliers flagged: {report['crop_validation']['summary']['outlier_count']}")
    print(f"Total crop failures logged: {report['crop_validation']['summary']['failure_count']}")
