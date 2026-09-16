"""
Weather Data Loader
Reads IMD rainfall and climate datasets and structures them into a district-level DataFrame.
"""

import os
from typing import Optional
import pandas as pd

DEFAULT_DISTRICT_RAINFALL_PATH = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "data", "raw", "imd_weather", "district_wise_rainfall_normal.csv")
)

EXPECTED_WEATHER_COLUMNS = [
    "STATE_UT_NAME",
    "DISTRICT",
    "Jan-Feb",
    "Mar-May",
    "Jun-Sep",
    "Oct-Dec",
    "ANNUAL"
]

def load_weather_data(file_path: Optional[str] = None) -> pd.DataFrame:
    """
    Loads IMD district-wise rainfall and weather normals from a CSV file.
    
    Args:
        file_path: Optional path to the weather CSV file. If None, uses default IMD raw data.
        
    Returns:
        pd.DataFrame containing the structured district weather records.
        
    Raises:
        FileNotFoundError: If the specified file does not exist.
        ValueError: If required columns are missing in the dataset.
    """
    target_path = file_path if file_path is not None else DEFAULT_DISTRICT_RAINFALL_PATH
    
    if not os.path.exists(target_path):
        raise FileNotFoundError(f"Weather data file not found at: {target_path}")
        
    df = pd.read_csv(target_path)
    
    # Check minimum required schema for seasonal district rainfall
    missing_cols = [col for col in EXPECTED_WEATHER_COLUMNS if col not in df.columns]
    if missing_cols:
        raise ValueError(f"Weather dataset missing required columns: {missing_cols}")
        
    return df
