import os
import pandas as pd
import joblib

# Cache for the model pipeline
_model_pipeline = None

def get_model():
    global _model_pipeline
    if _model_pipeline is None:
        model_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "models/yield_model.pkl"))
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Trained ML model not found at: {model_path}. Please run train.py first.")
        _model_pipeline = joblib.load(model_path)
    return _model_pipeline

def predict_yield(state: str, district: str, season: str, crop: str, area_ha: float, temperature_c: float = 25.0, rainfall_mm: float = 500.0) -> float:
    """
    Predicts the crop yield in tons/hectare using the trained ML model pipeline.
    """
    model = get_model()
    
    # Construct input dataframe matching the exact columns of the training set
    input_data = pd.DataFrame([{
        "state": state,
        "district": district,
        "crop": crop,
        "season": season,
        "area_ha": float(area_ha),
        "temperature_c": float(temperature_c),
        "rainfall_mm": float(rainfall_mm)
    }])
    
    # Run the scikit-learn pipeline (preprocessor + model regressor)
    prediction = model.predict(input_data)
    
    # Return predicted yield, forcing it to be positive
    return float(max(0.1, prediction[0]))
