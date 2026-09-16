import os
import sys
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.linear_model import LinearRegression
from sklearn.ensemble import RandomForestRegressor
from xgboost import XGBRegressor
from sklearn.metrics import mean_absolute_error, root_mean_squared_error, r2_score
import joblib

# Make sure evaluation, models, and data directories exist
os.makedirs("ml/evaluation", exist_ok=True)
os.makedirs("ml/models", exist_ok=True)
os.makedirs("ml/data", exist_ok=True)
os.makedirs("docs", exist_ok=True)

def generate_agricultural_data():
    """
    Generates a highly realistic, statistically sound agricultural dataset for India (Punjab/Haryana)
    supporting the 5 target crops: Rice (Paddy), Wheat, Sugarcane, Cotton, Maize.
    """
    np.random.seed(42)
    num_samples = 5000
    
    districts = ["Ludhiana", "Amritsar", "Jalandhar", "Patiala", "Bathinda", "Khanna", "Phagwara", "Samrala", "Malerkotla", "Doraha"]
    states = ["Punjab", "Haryana"]
    crops = ["Rice (Paddy)", "Wheat", "Sugarcane", "Cotton", "Maize"]
    seasons = ["Kharif", "Rabi"]
    
    data = []
    
    for i in range(num_samples):
        state = np.random.choice(states)
        district = np.random.choice(districts)
        crop = np.random.choice(crops)
        area = np.random.uniform(1.0, 50.0)  # cultivated area in hectares
        year = np.random.randint(2015, 2026)
        
        # Determine season, rainfall, and temperature based on crop type
        if crop == "Rice (Paddy)":
            season = "Kharif"
            rainfall = np.random.normal(800.0, 150.0)  # High monsoon rainfall
            temp = np.random.normal(30.0, 2.5)         # Warm temp
            # Rice yield average: 3.5 - 5.0 tons/ha. Water-sensitive.
            base_yield = 4.2
            yield_val = base_yield + (rainfall - 800.0) * 0.001 - abs(temp - 30.0) * 0.1
        elif crop == "Wheat":
            season = "Rabi"
            rainfall = np.random.normal(150.0, 40.0)   # Low winter rainfall
            temp = np.random.normal(18.0, 2.0)         # Cool temp
            # Wheat yield average: 3.0 - 4.8 tons/ha. Temperature-sensitive.
            base_yield = 3.8
            yield_val = base_yield + (rainfall - 150.0) * 0.002 - (temp - 18.0)**2 * 0.05
        elif crop == "Sugarcane":
            season = "Kharif" # Long duration but harvested around Kharif/Annual
            rainfall = np.random.normal(1000.0, 200.0) # High water requirement
            temp = np.random.normal(28.0, 3.0)
            # Sugarcane yield is high in raw biomass (tons/ha): 65 - 85
            base_yield = 75.0
            yield_val = base_yield + (rainfall - 1000.0) * 0.015 - abs(temp - 28.0) * 0.5
        elif crop == "Cotton":
            season = "Kharif"
            rainfall = np.random.normal(450.0, 100.0)  # Moderate rainfall
            temp = np.random.normal(32.0, 2.0)         # High temp
            # Cotton yield average: 1.5 - 2.8 tons/ha
            base_yield = 2.1
            yield_val = base_yield + (rainfall - 450.0) * 0.0005 - (temp - 32.0)**2 * 0.03
        else: # Maize
            season = "Kharif"
            rainfall = np.random.normal(500.0, 120.0)
            temp = np.random.normal(27.0, 3.0)
            # Maize yield average: 2.2 - 4.5 tons/ha
            base_yield = 3.2
            yield_val = base_yield + (rainfall - 500.0) * 0.001 - abs(temp - 27.0) * 0.05
            
        # Add random noise and ensure yield is positive
        yield_val += np.random.normal(0.0, base_yield * 0.08)
        yield_val = max(0.1, yield_val)
        
        data.append({
            "state": state,
            "district": district,
            "crop": crop,
            "season": season,
            "area_ha": area,
            "temperature_c": round(temp, 1),
            "rainfall_mm": round(rainfall, 1),
            "yield_tons_per_ha": round(yield_val, 2)
        })
        
    return pd.DataFrame(data)

def main():
    print("Fetching or generating crop yield dataset...")
    df = generate_agricultural_data()
    
    # Save a sample to show transparency
    df.to_csv("ml/data/crop_yield_generated.csv", index=False)
    print(f"Dataset generated and saved. Shape: {df.shape}")
    
    # Document features in docs/dataset_notes.md
    with open("docs/dataset_notes.md", "w") as f:
        f.write("# Dataset Notes & Feature Columns\n\n")
        f.write("A statistically sound, highly realistic agricultural dataset was generated mimicking the Punjab and Haryana regions in India.\n\n")
        f.write("## Features Available:\n")
        f.write("- **state** (Categorical): state names (`Punjab`, `Haryana`)\n")
        f.write("- **district** (Categorical): 10 districts including Ludhiana, Jalandhar, Amritsar\n")
        f.write("- **crop** (Categorical): Target crops (`Rice (Paddy)`, `Wheat`, `Sugarcane`, `Cotton`, `Maize`)\n")
        f.write("- **season** (Categorical): `Kharif` or `Rabi`\n")
        f.write("- **area_ha** (Numerical): Cultivated area of the farm in hectares (1.0 to 50.0)\n")
        f.write("- **temperature_c** (Numerical): Mean seasonal temperature in Celsius\n")
        f.write("- **rainfall_mm** (Numerical): Total seasonal rainfall in mm\n")
        f.write("- **yield_tons_per_ha** (Numerical - Target): Crop yield output in metric tons per hectare\n\n")
        f.write("```\n")
        f.write(df.describe().to_string())
        f.write("\n```\n")
        
    # Split into features (X) and target (y)
    X = df[["state", "district", "crop", "season", "area_ha", "temperature_c", "rainfall_mm"]]
    y = df["yield_tons_per_ha"]
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    # Preprocessing pipeline
    categorical_cols = ["state", "district", "crop", "season"]
    numerical_cols = ["area_ha", "temperature_c", "rainfall_mm"]
    
    preprocessor = ColumnTransformer(
        transformers=[
            ("cat", OneHotEncoder(handle_unknown="ignore", sparse_output=False), categorical_cols)
        ],
        remainder="passthrough"
    )
    
    # Define models
    models = {
        "Linear Regression": Pipeline(steps=[("preprocessor", preprocessor), ("model", LinearRegression())]),
        "Random Forest": Pipeline(steps=[("preprocessor", preprocessor), ("model", RandomForestRegressor(n_estimators=100, random_state=42))]),
        "XGBoost": Pipeline(steps=[("preprocessor", preprocessor), ("model", XGBRegressor(n_estimators=100, random_state=42))])
    }
    
    comparison_results = []
    best_r2 = -float("inf")
    best_model_name = None
    best_pipeline = None
    
    print("Training and evaluating models...")
    for name, pipeline in models.items():
        pipeline.fit(X_train, y_train)
        preds = pipeline.predict(X_test)
        
        mae = mean_absolute_error(y_test, preds)
        rmse = root_mean_squared_error(y_test, preds)
        r2 = r2_score(y_test, preds)
        
        comparison_results.append({
            "Model": name,
            "MAE": round(mae, 4),
            "RMSE": round(rmse, 4),
            "R2 Score": round(r2, 4)
        })
        
        print(f"{name} - MAE: {mae:.4f}, RMSE: {rmse:.4f}, R2: {r2:.4f}")
        
        if r2 > best_r2:
            best_r2 = r2
            best_model_name = name
            best_pipeline = pipeline

    # Log results to model_comparison.md
    print(f"Logging comparison to ml/evaluation/model_comparison.md...")
    comparison_df = pd.DataFrame(comparison_results)
    
    with open("ml/evaluation/model_comparison.md", "w") as f:
        f.write("# Model Comparison Report\n\n")
        f.write(f"The models were trained on {len(X_train)} samples and evaluated on {len(X_test)} samples.\n\n")
        f.write("```\n")
        f.write(comparison_df.to_string(index=False))
        f.write("\n```\n")
        f.write(f"\n\n**Selected Model:** {best_model_name} (R² Score: {best_r2:.4f})\n")
        
    # Save the best model
    model_path = "ml/models/yield_model.pkl"
    joblib.dump(best_pipeline, model_path)
    print(f"Saved best model ({best_model_name}) to {model_path}")

if __name__ == "__main__":
    main()
