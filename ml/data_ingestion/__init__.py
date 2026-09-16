"""
Data Ingestion Package for BioPlan ML Pipeline.
Loads empirical agricultural and meteorological datasets from raw sources or test fixtures.
"""

from .load_crop_yield import load_crop_yield_data
from .load_weather import load_weather_data

__all__ = [
    "load_crop_yield_data",
    "load_weather_data"
]
