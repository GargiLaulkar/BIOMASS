"""
Crop Yield Data Loader
Reads DES Crop Production Statistics (APY) dataset and structures it into a Pandas DataFrame.
"""

import os
from typing import Optional
import pandas as pd

DEFAULT_RAW_CROP_PATH = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "data", "raw", "crop_yield_des", "crop_production.csv")
)

EXPECTED_COLUMNS = [
    "State_Name",
    "District_Name",
    "Crop_Year",
    "Season",
    "Crop",
    "Area",
    "Production"
]

def load_crop_yield_data(file_path: Optional[str] = None) -> pd.DataFrame:
    """
    Loads raw agricultural crop production statistics from a CSV file.
    
    Args:
        file_path: Optional path to the CSV file. If None, uses default raw DES data path.
        
    Returns:
        pd.DataFrame containing the raw crop production records.
        
    Raises:
        FileNotFoundError: If the specified file does not exist.
        ValueError: If required columns are missing in the dataset.
    """
    target_path = file_path if file_path is not None else DEFAULT_RAW_CROP_PATH
    
    if not os.path.exists(target_path):
        raise FileNotFoundError(f"Crop production data file not found at: {target_path}")
        
    df = pd.read_csv(target_path)
    
    missing_cols = [col for col in EXPECTED_COLUMNS if col not in df.columns]
    if missing_cols:
        raise ValueError(f"Crop production dataset missing required columns: {missing_cols}")
        
    return df
