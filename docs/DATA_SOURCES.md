# Data Sources & External Dataset Provenance — BioPlan AI

This document details the external datasets researched, verified, and acquired for the BioPlan AI platform. Each entry documents the verified provenance, authoritative publishing organization, geographic coverage, time period, confirmed schema variables, licensing terms, and access methodology.

---

## 1. District-wise, Season-wise Crop Production Statistics (APY)

### Source & Organization
- **Dataset Name**: District-wise, Season-wise Crop Production Statistics (Area, Production and Yield - APY)
- **Publishing Authority**: Directorate of Economics and Statistics (DES), Department of Agriculture & Farmers Welfare, Ministry of Agriculture & Farmers Welfare, Government of India
- **Official Portals**:
  - Open Government Data (OGD) Platform India: [https://data.gov.in/catalog/district-wise-season-wise-crop-production-statistics](https://data.gov.in/catalog/district-wise-season-wise-crop-production-statistics)
  - Department of Agriculture APY Portal: [https://data.desagri.gov.in/website/crops-apy-report-web](https://data.desagri.gov.in/website/crops-apy-report-web)
- **Raw File Repository Mirror**: [https://raw.githubusercontent.com/Jampana-Jagadeesh/Crop-Prediction-in-India/master/crop_production.csv](https://raw.githubusercontent.com/Jampana-Jagadeesh/Crop-Prediction-in-India/master/crop_production.csv)

### Geographic & Temporal Coverage
- **Geographic Coverage**: Pan-India covering 33 States and Union Territories, and 646 districts. Specifically includes all Punjab districts (`LUDHIANA`, `AMRITSAR`, `JALANDHAR`, `PATIALA`, `BATHINDA`, `SANGRUR`, `FIROZEPUR`, `GURDASPUR`, `HOSHIARPUR`, `KAPURTHALA`, `MANSA`, `MOGA`, `MUKTSAR`, `NAWANSHAHR`, `RUPNAGAR`, `TARN TARAN`, `BARNALA`, `FATEHGARH SAHIB`, `FAZILKA`, `PATHANKOT`, `SAS NAGAR`) matching seeded farm locations.
- **Time Period**: 1997 to 2015 (comprising 246,091 empirical agricultural season-crop observations).

### Confirmed Variables & Schema
| Column Name | Data Type | Units / Format | Description |
| :--- | :--- | :--- | :--- |
| `State_Name` | Text | String (Title Case) | Name of the Indian State/UT (e.g., "Punjab", "Haryana") |
| `District_Name` | Text | String (UPPERCASE) | Name of administrative district (e.g., "LUDHIANA", "JALANDHAR") |
| `Crop_Year` | Integer | YYYY (1997–2015) | Agricultural crop harvest year |
| `Season` | Text | String | Cropping season (`Kharif`, `Rabi`, `Whole Year`, `Summer`, `Autumn`, `Winter`) |
| `Crop` | Text | String | Cultivated crop (e.g., `Rice`, `Wheat`, `Sugarcane`, `Cotton(lint)`, `Maize`) |
| `Area` | Float | Hectares (ha) | Total cultivated land area under crop |
| `Production` | Float | Metric Tonnes (MT) | Total agricultural crop production harvested |

> [!NOTE]
> **Yield Derivation Note:** Crop yield is **not** provided as a native direct column in the raw DES dataset. In accordance with standard agronomic methodology, yield will be derived mathematically during preprocessing in Prompt 01b as:
> $$\text{Yield (tonnes/ha)} = \frac{\text{Production (tonnes)}}{\text{Area (hectares)}}$$

### Update Frequency, License & Limitations
- **Update Frequency**: Historical annual reporting by State Agricultural Departments to DES.
- **License**: **National Data Sharing and Accessibility Policy (NDSAP) / Open Government Data (OGD) License India**. Free for public and commercial reuse with attribution.
- **Limitations & Missingness**: Contains ~3,730 records with missing `Production` values where crop was planted but production was unrecorded or experienced total crop failure. Requires missingness filtering and outlier cleaning.

### Access Method Used in this Repository
- **Raw File Location**: [`ml/data/raw/crop_yield_des/crop_production.csv`](file:///c:/BIOMASS/ml/data/raw/crop_yield_des/crop_production.csv)
- **Manifest**: [`ml/data/raw/crop_yield_des/manifest.json`](file:///c:/BIOMASS/ml/data/raw/crop_yield_des/manifest.json)
- **Date Accessed / Downloaded**: September 16, 2026

---

## 2. IMD Historical Subdivision & District-Wise Rainfall Dataset

### Source & Organization
- **Dataset Name**: Monthly and Annual Rainfall in India (1901–2015) & District-Wise Rainfall Normals
- **Publishing Authority**: India Meteorological Department (IMD), Ministry of Earth Sciences, Government of India
- **Official Portals**:
  - IMD Pune Climate Services Portal: [https://imdpune.gov.in/cmpg/Griddata/Rainfall_25_Bin.html](https://imdpune.gov.in/cmpg/Griddata/Rainfall_25_Bin.html)
  - Open Government Data Platform India: [https://data.gov.in/](https://data.gov.in/)
- **Academic Citation**: Pai, D. S., et al. (2014). *Development of a new high spatial resolution (0.25 x 0.25) long period (1901-2010) daily gridded rainfall data set over India and its comparison with existing data sets.* **MAUSAM**, 65(1), 1-18.

### Geographic & Temporal Coverage
- **Geographic Coverage**:
  - `rainfall_in_india_1901_2015.csv`: 36 Meteorological Subdivisions of India (specifically covering `PUNJAB`, `HARYANA CHANDIGARH & DELHI`, `WEST UTTAR PRADESH`, `HIMACHAL PRADESH`, `WEST RAJASTHAN`, etc.).
  - `district_wise_rainfall_normal.csv`: 641 administrative districts across India with monthly climate normals.
- **Time Period**: 1901 to 2015 (115 years of continuous meteorological observations).

### Confirmed Variables & Schema

#### A. Subdivision Historical Time-Series (`rainfall_in_india_1901_2015.csv`):
| Column Name | Data Type | Units / Format | Description |
| :--- | :--- | :--- | :--- |
| `SUBDIVISION` | Text | String | Meteorological subdivision name (e.g., "PUNJAB") |
| `YEAR` | Integer | YYYY (1901–2015) | Observation calendar year |
| `JAN` ... `DEC` | Float | Millimeters (mm) | Monthly accumulated rainfall for months January through December |
| `ANNUAL` | Float | Millimeters (mm) | Total annual rainfall |
| `Jan-Feb` | Float | Millimeters (mm) | Winter seasonal rainfall |
| `Mar-May` | Float | Millimeters (mm) | Pre-monsoon seasonal rainfall |
| `Jun-Sep` | Float | Millimeters (mm) | Southwest Monsoon (Kharif) rainfall |
| `Oct-Dec` | Float | Millimeters (mm) | Post-monsoon (Rabi sowing) rainfall |

#### B. District Rainfall Normals (`district_wise_rainfall_normal.csv`):
| Column Name | Data Type | Units / Format | Description |
| :--- | :--- | :--- | :--- |
| `STATE_UT_NAME` | Text | String | Name of State / Union Territory |
| `DISTRICT` | Text | String | Name of District |
| `JAN` ... `DEC` | Float | Millimeters (mm) | Baseline normal monthly rainfall |
| `ANNUAL` | Float | Millimeters (mm) | Baseline normal annual rainfall |
| `Jan-Feb`, `Mar-May`, `Jun-Sep`, `Oct-Dec` | Float | Millimeters (mm) | Baseline seasonal normals |

### Update Frequency, License & Limitations
- **License**: **Open Government Data (OGD) License India / IMD Data Sharing Policy**. Available for research and operational use with official citation.
- **Limitations**: Aggregated at monthly and seasonal levels. For sub-daily or high-resolution spatial modeling, gridded interpolation or IMDLIB binary extraction is utilized.

### Access Method Used in this Repository
- **Raw File Locations**:
  - [`ml/data/raw/imd_weather/rainfall_in_india_1901_2015.csv`](file:///c:/BIOMASS/ml/data/raw/imd_weather/rainfall_in_india_1901_2015.csv)
  - [`ml/data/raw/imd_weather/district_wise_rainfall_normal.csv`](file:///c:/BIOMASS/ml/data/raw/imd_weather/district_wise_rainfall_normal.csv)
- **Manifest**: [`ml/data/raw/imd_weather/manifest.json`](file:///c:/BIOMASS/ml/data/raw/imd_weather/manifest.json)
- **Date Accessed / Downloaded**: September 16, 2026

---

## 3. Administrative State-District & Crop Reference Lookup

### Source & Organization
- **Name**: Punjab & Haryana State-District Administrative Master & Target Crop Coefficient Reference
- **Location**: [`ml/data/external/state_district_reference.json`](file:///c:/BIOMASS/ml/data/external/state_district_reference.json)
- **Purpose**: Provides official standardized spellings and administrative district name mapping for reconciling spelling discrepancies between DES agricultural data (`LUDHIANA`, `FIROZEPUR`) and IMD climate tables (`Ludhiana`, `Ferozepur`).
- **Variables**: State codes, list of districts, target crop alias mappings, official residue ratios, and recovery factors.

---

## 4. Summary of Data Provenance

```
ml/data/
├── external/
│   └── state_district_reference.json       <- District name & crop mapping master
└── raw/
    ├── crop_yield_des/
    │   ├── crop_production.csv             <- 246,091 DES APY agricultural records (1997-2015)
    │   └── manifest.json                   <- Source URL, license, and schema manifest
    └── imd_weather/
        ├── rainfall_in_india_1901_2015.csv <- 4,116 IMD subdivision time-series records (1901-2015)
        ├── district_wise_rainfall_normal.csv<- 641 IMD district rainfall normals
        └── manifest.json                   <- Source URLs, citation, and schema manifest
```
