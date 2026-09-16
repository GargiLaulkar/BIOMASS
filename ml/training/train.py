"""
ml/training/train.py — BioPlan AI Yield Model Training

Production path: loads from ml/data/processed/crop_yield_weather_processed.csv
(empirical DES APY + IMD climate normals, 48 k+ real rows).

The generate_agricultural_data() function below is DEPRECATED from the
production training path. It exists ONLY to support test-fixture generation
in tests/test_data_ingestion.py and must NEVER be called from main().
"""

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

# ---------------------------------------------------------------------------
# DEPRECATED — TEST FIXTURE GENERATION ONLY — NOT CALLED BY main()
# ---------------------------------------------------------------------------
def generate_agricultural_data():
    """
    DEPRECATED: FOR TEST-FIXTURE GENERATION ONLY.

    This function produced the original 5,000-row synthetic dataset used
    before Prompt 01b.  It is retained here solely so that test helpers in
    tests/test_data_ingestion.py can reference a known-shape generator
    without touching production data paths.

    DO NOT call this function from main() or any production code path.
    Production training uses ml/data/processed/crop_yield_weather_processed.csv
    (empirical DES + IMD data) loaded by load_processed_data() below.
    """
    np.random.seed(42)
    num_samples = 5000

    districts = ["Ludhiana", "Amritsar", "Jalandhar", "Patiala", "Bathinda",
                 "Khanna", "Phagwara", "Samrala", "Malerkotla", "Doraha"]
    states = ["Punjab", "Haryana"]
    crops = ["Rice (Paddy)", "Wheat", "Sugarcane", "Cotton", "Maize"]
    seasons = ["Kharif", "Rabi"]

    data = []

    for i in range(num_samples):
        state = np.random.choice(states)
        district = np.random.choice(districts)
        crop = np.random.choice(crops)
        area = np.random.uniform(1.0, 50.0)
        year = np.random.randint(2015, 2026)

        if crop == "Rice (Paddy)":
            season = "Kharif"
            rainfall = np.random.normal(800.0, 150.0)
            temp = np.random.normal(30.0, 2.5)
            base_yield = 4.2
            yield_val = base_yield + (rainfall - 800.0) * 0.001 - abs(temp - 30.0) * 0.1
        elif crop == "Wheat":
            season = "Rabi"
            rainfall = np.random.normal(150.0, 40.0)
            temp = np.random.normal(18.0, 2.0)
            base_yield = 3.8
            yield_val = base_yield + (rainfall - 150.0) * 0.002 - (temp - 18.0)**2 * 0.05
        elif crop == "Sugarcane":
            season = "Kharif"
            rainfall = np.random.normal(1000.0, 200.0)
            temp = np.random.normal(28.0, 3.0)
            base_yield = 75.0
            yield_val = base_yield + (rainfall - 1000.0) * 0.015 - abs(temp - 28.0) * 0.5
        elif crop == "Cotton":
            season = "Kharif"
            rainfall = np.random.normal(450.0, 100.0)
            temp = np.random.normal(32.0, 2.0)
            base_yield = 2.1
            yield_val = base_yield + (rainfall - 450.0) * 0.0005 - (temp - 32.0)**2 * 0.03
        else:  # Maize
            season = "Kharif"
            rainfall = np.random.normal(500.0, 120.0)
            temp = np.random.normal(27.0, 3.0)
            base_yield = 3.2
            yield_val = base_yield + (rainfall - 500.0) * 0.001 - abs(temp - 27.0) * 0.05

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
# ---------------------------------------------------------------------------
# END DEPRECATED SECTION
# ---------------------------------------------------------------------------


# ---------------------------------------------------------------------------
# PRODUCTION DATA LOADER
# ---------------------------------------------------------------------------
DEFAULT_PROCESSED_PATH = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "data", "processed",
                 "crop_yield_weather_processed.csv")
)

def load_processed_data(processed_path: str = None) -> pd.DataFrame:
    """
    Loads the empirical, cleaned, feature-engineered dataset from
    ml/data/processed/crop_yield_weather_processed.csv.

    The processed file is produced by ml/preprocessing/feature_engineering.py
    run_pipeline() and is sourced from:
      - DES APY crop production statistics (246 k raw rows, 1997–2015)
      - IMD district rainfall normals (641 districts)

    Args:
        processed_path: Optional override. Defaults to DEFAULT_PROCESSED_PATH.

    Returns:
        pd.DataFrame with columns:
            state, district, crop, season, area_ha,
            temperature_c, rainfall_mm, yield_tons_per_ha

    Raises:
        FileNotFoundError: if the processed CSV does not exist.
        ValueError: if required columns are missing.
    """
    target = processed_path if processed_path is not None else DEFAULT_PROCESSED_PATH

    if not os.path.exists(target):
        raise FileNotFoundError(
            f"Processed training dataset not found at: {target}\n"
            "Run ml/preprocessing/feature_engineering.py (run_pipeline) first."
        )

    df = pd.read_csv(target)

    required_cols = [
        "state", "district", "crop", "season",
        "area_ha", "temperature_c", "rainfall_mm", "yield_tons_per_ha"
    ]
    missing = [c for c in required_cols if c not in df.columns]
    if missing:
        raise ValueError(
            f"Processed dataset missing required columns: {missing}"
        )

    return df


def main(processed_path: str = None):
    print("Loading empirical crop yield dataset from ml/data/processed/ ...")
    df = load_processed_data(processed_path)
    print(f"Loaded processed dataset. Shape: {df.shape}")
    print(f"Crops: {sorted(df['crop'].unique())}")
    print(f"Yield summary — mean: {df['yield_tons_per_ha'].mean():.3f}, "
          f"std: {df['yield_tons_per_ha'].std():.3f}, "
          f"min: {df['yield_tons_per_ha'].min():.3f}, "
          f"max: {df['yield_tons_per_ha'].max():.3f}")

    # Split into features (X) and target (y)
    X = df[["state", "district", "crop", "season",
            "area_ha", "temperature_c", "rainfall_mm"]]
    y = df["yield_tons_per_ha"]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    # Preprocessing pipeline — unchanged structure from prior version
    categorical_cols = ["state", "district", "crop", "season"]
    numerical_cols = ["area_ha", "temperature_c", "rainfall_mm"]

    preprocessor = ColumnTransformer(
        transformers=[
            ("cat", OneHotEncoder(handle_unknown="ignore", sparse_output=False),
             categorical_cols)
        ],
        remainder="passthrough"
    )

    # Define models
    models = {
        "Linear Regression": Pipeline(steps=[
            ("preprocessor", preprocessor),
            ("model", LinearRegression())
        ]),
        "Random Forest": Pipeline(steps=[
            ("preprocessor", preprocessor),
            ("model", RandomForestRegressor(n_estimators=100, random_state=42))
        ]),
        "XGBoost": Pipeline(steps=[
            ("preprocessor", preprocessor),
            ("model", XGBRegressor(n_estimators=100, random_state=42, verbosity=0))
        ]),
    }

    comparison_results = []
    best_r2 = -float("inf")
    best_model_name = None
    best_pipeline = None

    print(f"Training and evaluating models on {len(X_train)} train / "
          f"{len(X_test)} test samples ...")
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

        print(f"  {name} — MAE: {mae:.4f}, RMSE: {rmse:.4f}, R²: {r2:.4f}")

        if r2 > best_r2:
            best_r2 = r2
            best_model_name = name
            best_pipeline = pipeline

    # Log results to ml/evaluation/model_comparison.md
    comparison_df = pd.DataFrame(comparison_results)
    n_train = len(X_train)
    n_test = len(X_test)

    with open("ml/evaluation/model_comparison.md", "w", encoding="utf-8") as f:
        f.write("# Model Comparison Report\n\n")
        f.write("## Data Source\n\n")
        f.write("**Training data**: Empirical DES APY crop production statistics "
                "(1997–2015) merged with IMD district rainfall normals.\n")
        f.write("**NOT synthetic** — `generate_agricultural_data()` was retired "
                "from the production path in Prompt 01b.\n\n")
        f.write(f"Trained on **{n_train}** samples, evaluated on **{n_test}** samples "
                f"(80/20 split, random_state=42).\n\n")
        f.write("## Results\n\n")
        f.write("```\n")
        f.write(comparison_df.to_string(index=False))
        f.write("\n```\n\n")
        f.write(f"**Selected Model:** {best_model_name} (R² Score: {best_r2:.4f})\n\n")
        f.write("## Notes on Real-Data R²\n\n")
        f.write("The R² on empirical data is expected to be substantially lower than "
                "the prior synthetic-data result (R²=0.9911). This is correct behaviour "
                "and not a regression:\n\n")
        f.write("- The synthetic generator encoded a direct analytical relationship "
                "between rainfall/temperature and yield, making regression trivially easy.\n")
        f.write("- Real DES data reflects genuine agronomic variability — soil type, "
                "variety, irrigation access, pest pressure, input quality — none of which "
                "are captured in the 7-feature schema.\n")
        f.write("- Sugarcane (5–160 MT/ha) and low-yield grain crops (1–8 MT/ha) "
                "coexist in the same dataset, producing high inter-crop variance that "
                "inflates MSE without implying model failure.\n")
        f.write("- Temperature is assigned from climatological seasonal baselines "
                "(not measured IMD temperature data), reducing its predictive signal.\n")
        f.write("- A lower honest R² is the correct outcome of using real data. "
                "Do not re-tune to inflate this figure artificially.\n")

    print(f"\nSaved model comparison report to ml/evaluation/model_comparison.md")

    # Save the best model
    model_path = "ml/models/yield_model.pkl"
    joblib.dump(best_pipeline, model_path)
    print(f"Saved best model ({best_model_name}, R²={best_r2:.4f}) to {model_path}")


if __name__ == "__main__":
    main()
