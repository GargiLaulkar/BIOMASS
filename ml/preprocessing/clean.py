"""
Data Cleaning Module
Performs documented cleaning transformations, unit normalization,
district-name reconciliation, and explicit missing-value handling.
"""

import pandas as pd
import numpy as np
from typing import Optional, Dict

# Standard crop name mapping to platform entities
CROP_NAME_MAPPING = {
    "Rice": "Rice (Paddy)",
    "Rice (Paddy)": "Rice (Paddy)",
    "Wheat": "Wheat",
    "Sugarcane": "Sugarcane",
    "Cotton(lint)": "Cotton",
    "Cotton": "Cotton",
    "Maize": "Maize"
}

# District name reconciliation from DES APY names to IMD Weather Normals
DISTRICT_NAME_RECONCILIATION = {
    # Punjab
    "S.A.S NAGAR": "SAS NAGAR(MGA)",
    "SAS NAGAR": "SAS NAGAR(MGA)",
    "FIROZEPUR": "FEROZEPUR",
    "FEROZEPUR": "FEROZEPUR",
    "FATEHGARH SAHIB": "FATEHGARH SAH",
    "FATEHGARH SAH": "FATEHGARH SAH",
    "FAZILKA": "FEROZEPUR",         # Bifurcated from Firozepur in 2011; parent IMD station
    "PATHANKOT": "GURDASPUR",       # Bifurcated from Gurdaspur in 2011; parent IMD station
    "BARNALA": "BARNALA",
    "MUKTSAR": "MUKTSAR",
    "TARN TARAN": "TARN TARAN",
    "NAWANSHAHR": "NAWANSHAHR",
    
    # Haryana
    "SONIPAT": "SONEPAT(RTK)",
    "SONEPAT": "SONEPAT(RTK)",
    "PALWAL": "PALWAL(FRD)",
    "GURGAON": "GURGAON",
    "GURUGRAM": "GURGAON",
    "MEWAT": "MEWAT",
    "NUH": "MEWAT",
    "CHARKHI DADRI": "BHIWANI",     # Bifurcated from Bhiwani; parent IMD station
}

# Agronomic plausible yield thresholds (MT/ha) per crop
AGRONOMIC_YIELD_BOUNDS = {
    "Rice (Paddy)": (0.1, 8.0),
    "Wheat": (0.1, 8.0),
    "Sugarcane": (5.0, 160.0),
    "Cotton": (0.05, 6.0),
    "Maize": (0.1, 10.0)
}

def clean_crop_data(
    df: pd.DataFrame,
    target_crops_only: bool = True,
    filter_outliers: bool = True
) -> pd.DataFrame:
    """
    Cleans raw crop production statistics DataFrame according to explicit policies:
    1. Strips all string whitespace.
    2. Maps crop names to standard BioPlan nomenclature.
    3. Filters for target biomass crops.
    4. Drops null production (missing target values) and non-positive area.
    5. Normalizes district names to ensure weather station joinability.
    6. Filters agronomic yield outliers.
    """
    cleaned = df.copy()
    
    # 1. Strip whitespace on string columns
    str_cols = cleaned.select_dtypes(include=["object"]).columns
    for col in str_cols:
        cleaned[col] = cleaned[col].astype(str).str.strip()
        
    # 2. Crop mapping & filtering
    cleaned["Crop"] = cleaned["Crop"].map(CROP_NAME_MAPPING)
    if target_crops_only:
        cleaned = cleaned[cleaned["Crop"].notnull()].copy()
        
    # 3. Missing Value Policy
    # Coerce to numeric first — concat/mixed-type DataFrames may produce string "None"
    cleaned["Production"] = pd.to_numeric(cleaned["Production"], errors="coerce")
    cleaned["Area"] = pd.to_numeric(cleaned["Area"], errors="coerce")
    # - Drop records where Production is NaN or negative
    cleaned = cleaned[cleaned["Production"].notnull() & (cleaned["Production"] >= 0)].copy()
    # - Drop records where Area is non-positive
    cleaned = cleaned[cleaned["Area"] > 0].copy()
    # - Ensure key categorical columns are present
    cleaned = cleaned[cleaned["State_Name"].notnull() & cleaned["District_Name"].notnull()].copy()

    # 4. District reconciliation (standardize to upper case and reconcile aliases)
    cleaned["District_Raw"] = cleaned["District_Name"].str.upper()
    cleaned["District_Reconciled"] = cleaned["District_Raw"].apply(
        lambda d: DISTRICT_NAME_RECONCILIATION.get(d, d)
    )

    # 5. Outlier Filtering
    if filter_outliers:
        cleaned["derived_yield"] = cleaned["Production"] / cleaned["Area"]
        valid_indices = []
        for idx, row in cleaned.iterrows():
            crop = row["Crop"]
            y_val = row["derived_yield"]
            if crop in AGRONOMIC_YIELD_BOUNDS:
                ymin, ymax = AGRONOMIC_YIELD_BOUNDS[crop]
                if ymin <= y_val <= ymax:
                    valid_indices.append(idx)
            else:
                valid_indices.append(idx)
        cleaned = cleaned.loc[valid_indices].drop(columns=["derived_yield"]).copy()

    return cleaned.reset_index(drop=True)

def clean_weather_data(df: pd.DataFrame) -> pd.DataFrame:
    """
    Cleans and standardizes IMD district weather normals DataFrame.
    """
    cleaned = df.copy()
    
    # Strip string columns
    str_cols = cleaned.select_dtypes(include=["object"]).columns
    for col in str_cols:
        cleaned[col] = cleaned[col].astype(str).str.strip()
        
    if "STATE_UT_NAME" in cleaned.columns:
        cleaned["STATE_UT_NAME"] = cleaned["STATE_UT_NAME"].str.upper()
    if "DISTRICT" in cleaned.columns:
        cleaned["DISTRICT"] = cleaned["DISTRICT"].str.upper()
        
    # Replace negative rainfall values with 0.0 (imputation policy for missing/negative traces)
    rain_cols = [c for c in ["Jan-Feb", "Mar-May", "Jun-Sep", "Oct-Dec", "ANNUAL"] if c in cleaned.columns]
    for col in rain_cols:
        cleaned[col] = cleaned[col].apply(lambda x: max(0.0, float(x)) if pd.notnull(x) else np.nan)
        
    return cleaned.reset_index(drop=True)
