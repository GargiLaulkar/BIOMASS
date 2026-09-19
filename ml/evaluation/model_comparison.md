# Model Comparison Report

## Data Source

**Training data**: Empirical DES APY crop production statistics (1997–2015) merged with IMD district rainfall normals.
**NOT synthetic** — `generate_agricultural_data()` was retired from the production path in Prompt 01b.

Trained on **38571** samples, evaluated on **9643** samples (80/20 split, random_state=42).

## Results

```
            Model    MAE   RMSE  R2 Score
Linear Regression 4.8819 9.5629    0.8186
    Random Forest 1.7841 5.7114    0.9353
          XGBoost 1.8917 5.5328    0.9393
```

**Selected Model:** XGBoost (R² Score: 0.9393)

## Notes on Real-Data R²

The R² on empirical data is expected to be substantially lower than the prior synthetic-data result (R²=0.9911). This is correct behaviour and not a regression:

- The synthetic generator encoded a direct analytical relationship between rainfall/temperature and yield, making regression trivially easy.
- Real DES data reflects genuine agronomic variability — soil type, variety, irrigation access, pest pressure, input quality — none of which are captured in the 7-feature schema.
- Sugarcane (5–160 MT/ha) and low-yield grain crops (1–8 MT/ha) coexist in the same dataset, producing high inter-crop variance that inflates MSE without implying model failure.
- Temperature is assigned from climatological seasonal baselines (not measured IMD temperature data), reducing its predictive signal.
- A lower honest R² is the correct outcome of using real data. Do not re-tune to inflate this figure artificially.
