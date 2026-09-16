# Dataset Notes & Feature Columns

A statistically sound, highly realistic agricultural dataset was generated mimicking the Punjab and Haryana regions in India.

## Features Available:
- **state** (Categorical): state names (`Punjab`, `Haryana`)
- **district** (Categorical): 10 districts including Ludhiana, Jalandhar, Amritsar
- **crop** (Categorical): Target crops (`Rice (Paddy)`, `Wheat`, `Sugarcane`, `Cotton`, `Maize`)
- **season** (Categorical): `Kharif` or `Rabi`
- **area_ha** (Numerical): Cultivated area of the farm in hectares (1.0 to 50.0)
- **temperature_c** (Numerical): Mean seasonal temperature in Celsius
- **rainfall_mm** (Numerical): Total seasonal rainfall in mm
- **yield_tons_per_ha** (Numerical - Target): Crop yield output in metric tons per hectare

```
           area_ha  temperature_c  rainfall_mm  yield_tons_per_ha
count  5000.000000     5000.00000  5000.000000        5000.000000
mean     25.396502       26.92280   577.044100          17.069632
std      14.129686        5.53549   324.017186          28.296897
min       1.001005       11.40000    13.000000           0.100000
25%      13.025447       23.70000   339.025000           2.830000
50%      25.587139       28.30000   536.750000           3.520000
75%      37.558086       31.10000   824.900000           4.300000
max      49.993700       39.90000  1699.200000          96.830000
```
