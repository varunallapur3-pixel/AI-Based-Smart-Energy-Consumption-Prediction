# VOLTIX — Backend API (Phases 1, 2, 3 & 4)

FastAPI-based modular backend for the **VOLTIX Smart Energy Management Platform**.
Includes backend foundation (Phase 1), Device Management APIs (Phase 2), Telemetry Ingestion & Storage Pipeline (Phase 3), and AI Intelligence Engine (Phase 4).

---

## 1. Prerequisites

- **Python**: 3.12+ (tested on Python 3.12.10)
- **OS**: Windows (PowerShell) / Linux / macOS
- **Package Manager**: `pip`

---

## 2. Directory Structure

```text
backend/
├── app/
│   ├── __init__.py
│   ├── main.py              # Application entry point & CORS configuration
│   ├── api/
│   │   ├── __init__.py      # Router aggregation (/api/health, /api/devices, /api/telemetry, /api/ai)
│   │   ├── health.py        # Health probe endpoint (/api/health)
│   │   ├── devices.py       # Device Management CRUD, Stats & Device Telemetry endpoints
│   │   ├── telemetry.py     # Telemetry Ingestion, Retrieval & Simulation endpoints
│   │   └── ai.py            # AI Engine endpoints (/api/ai/train, forecast, anomalies, model/status)
│   ├── core/
│   │   ├── __init__.py
│   │   ├── config.py        # Pydantic BaseSettings environment loader
│   │   └── database.py      # SQLAlchemy engine, session generator & DB health probe
│   ├── ml/
│   │   ├── __init__.py      # ML package exports
│   │   ├── feature_engineering.py # Leakage-free lag, rolling, and temporal feature pipeline
│   │   ├── forecasting.py   # RandomForestRegressor power forecaster & recursive inference
│   │   ├── anomaly_detection.py # IsolationForest detector & explainable factor attribution
│   │   ├── model_registry.py # Joblib serialization, versioning & corruption handling
│   │   └── evaluation.py    # Chronological metrics (MAE, RMSE, R², Baseline MAE, anomaly counts)
│   ├── models/
│   │   ├── __init__.py      # ORM metadata registration
│   │   ├── device.py        # Device model (SIMULATED / PHYSICAL categorization)
│   │   ├── telemetry.py     # Telemetry model (high-resolution electrical time-series)
│   │   └── incident.py      # AnomalyIncident model
│   ├── schemas/
│   │   ├── __init__.py      # Schema exports
│   │   ├── health.py        # HealthResponse schema
│   │   ├── root.py          # RootResponse schema
│   │   ├── device.py        # Pydantic schemas (Create, Update, Response, Stats)
│   │   ├── telemetry.py     # Pydantic schemas (Ingest, Response, Energy, Simulation)
│   │   └── ai.py            # Pydantic schemas (Train, Forecast, Anomalies, Status)
│   └── services/
│       ├── __init__.py
│       ├── device_service.py     # Device business logic & fleet stats
│       ├── telemetry_service.py  # Ingestion & retrieval business logic
│       ├── energy_calculator.py  # Trapezoidal numerical integration engine
│       ├── simulator_service.py  # Synthetic electrical telemetry generator
│       └── ai_service.py         # AI coordination, model orchestration & status
├── model_artifacts/         # Serialized Joblib models and JSON metadata per device
├── tests/
│   ├── __init__.py
│   ├── conftest.py          # Pytest fixtures & isolated in-memory test database
│   ├── test_health.py       # Automated tests (health, root, DB probe, CORS, docs)
│   ├── test_devices.py      # Automated tests for Phase 2 device management APIs
│   ├── test_telemetry.py    # Automated tests for Phase 3 telemetry ingestion & calculations
│   └── test_ai.py           # Automated tests for Phase 4 AI engine & ML pipelines
├── .env.example             # Template environment variables
├── .env                     # Local environment settings
├── .gitignore               # Python/venv/DB ignores
├── init_db.py               # Standalone database initialization utility
├── pytest.ini               # Test configuration
├── requirements.txt         # Pinned production & test dependencies
└── README.md                # Documentation & PowerShell commands
```

---

## 3. Installation & Setup (Windows PowerShell)

Open PowerShell and navigate to the `backend` folder:

```powershell
cd c:\Users\Varun\Desktop\stitch_voltix_smart_energy_platform\backend
```

### 3.1. Activate the Virtual Environment

```powershell
.\.venv\Scripts\Activate.ps1
```

### 3.2. Install Dependencies

```powershell
python -m pip install -r requirements.txt
```

Core ML libraries used:
- `numpy>=1.26.0,<3.0.0`
- `pandas>=2.2.0,<3.0.0`
- `scikit-learn>=1.4.0,<2.0.0`
- `joblib>=1.3.0,<2.0.0`

---

## 4. Running the Development Server

Start the backend server using Uvicorn:

```powershell
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Interactive documentation:
- **Interactive Swagger Docs**: `http://localhost:8000/docs`
- **ReDoc Documentation**: `http://localhost:8000/redoc`
- **OpenAPI Schema**: `http://localhost:8000/openapi.json`

---

## 5. Telemetry Ingestion & Storage (Phase 3)

### 5.1. Database Model (`telemetry` table)

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `INTEGER` | Primary Key, Autoincrement | Unique reading ID |
| `device_id` | `VARCHAR(64)` | Foreign Key (`devices.device_id`), Indexed | Originating device identifier |
| `voltage_v` | `FLOAT` | Not Null, CHECK (`voltage_v >= 0`) | Voltage in Volts (RMS) |
| `current_a` | `FLOAT` | Not Null, CHECK (`current_a >= 0`) | Current in Amperes (RMS) |
| `power_w` | `FLOAT` | Not Null, CHECK (`power_w >= 0`) | Active Power in Watts |
| `power_factor` | `FLOAT` | Nullable, CHECK (`0.0 <= pf <= 1.0`) | Dimensionless ratio ($\cos \phi$) |
| `frequency_hz` | `FLOAT` | Nullable, CHECK (`frequency_hz >= 0`) | AC line frequency in Hz |
| `energy_kwh` | `FLOAT` | Nullable, CHECK (`energy_kwh >= 0`) | Energy reading in kWh |
| `source_type` | `VARCHAR(16)` | Not Null, CHECK (`SIMULATED`, `PHYSICAL`) | Strict origin tag |
| `timestamp` | `DATETIME` | Not Null, Indexed | UTC measurement timestamp |

**Indexes**:
- Index on `id`
- Index on `device_id`
- Index on `timestamp`
- Composite Index on `(device_id, timestamp)` for accelerated time-series range slicing.

---

## 6. AI Intelligence Engine (Phase 4)

### 6.1. Architecture Overview

The AI Engine provides supervised active power forecasting and unsupervised anomaly detection:
- `app/ml/feature_engineering.py`: Data cleaning, chronological sorting, lag generation, and rolling statistics with strict future-data leakage prevention.
- `app/ml/forecasting.py`: Supervised `RandomForestRegressor` with chronological validation and recursive multi-step forecasting.
- `app/ml/anomaly_detection.py`: Unsupervised `IsolationForest` with normalized outlier severity scoring and explainable feature attribution.
- `app/ml/model_registry.py`: Filesystem artifact management under `backend/model_artifacts/` using Joblib, with corruption resilience and cleanup hooks.
- `app/ml/evaluation.py`: Chronological out-of-sample metrics (MAE, RMSE, R², Baseline MAE) and anomaly distribution statistics.
- `app/services/ai_service.py`: Orchestration layer coordinating data extraction, training, inference, and serialization.
- `app/api/ai.py`: FastAPI endpoints exposing AI capabilities under `/api/ai`.

### 6.2. Feature Engineering & Leakage Prevention

To predict future active power consumption ($P_t$ in Watts), the feature pipeline constructs:
- **Lag Features**: Past readings $P_{t-1}, P_{t-2}, P_{t-3}$.
- **Rolling Statistics**: Rolling mean and rolling standard deviation over a 3-step window shifted by 1 ($t-1$), ensuring the current-step target value $P_t$ is never visible during feature computation.
- **Electrical Measurements**: Observed voltage ($V$), current ($I$), and power factor ($\text{PF}$).
- **Temporal Features**: Hour of day (`0-23`) and day of week (`0-6`).
- **Sampling Dynamics**: Time elapsed ($\Delta t$) between consecutive readings in seconds.

**Data Quality Safeguards**:
- Drops non-finite values (`NaN`, `Infinity`, `-Infinity`) and negative readings.
- Eliminates duplicate timestamps while preserving chronological order.
- Validates that a configurable minimum number of valid samples (`min_samples`, default 15) remain before model training.

### 6.3. Energy Consumption Forecasting

- **Primary Model**: `RandomForestRegressor(n_estimators=50, max_depth=8, min_samples_leaf=2)`.
- **Baseline Model**: Persistence baseline ($y_t = y_{t-1}$, corresponding to `power_lag_1`).
- **Validation**: Chronological train/test split (earlier 80% for training, latest 20% for testing). Random splits are strictly prohibited to maintain temporal integrity.
- **Inference**: Recursive autoregressive multi-step projection. At each horizon step $k$, predicted power is fed back into the lag buffer to project the subsequent step.

### 6.4. Unsupervised Anomaly Detection

- **Algorithm**: `IsolationForest(contamination=0.05, n_estimators=100)`.
- **Features Analyzed**: Voltage, current, active power, power factor, AC frequency, and energy consumption rate (`energy_rate_kw`).
- **Severity Score**: Normalized to $[0.0, 1.0]$ via logistic sigmoid mapping of the decision function.
- **Explainable Factor Attribution**: Computes z-scores against training baseline statistics. Any feature exhibiting $|z| \ge 2.0$ is explicitly highlighted (e.g. `voltage_v (380.0 is 3.5σ above baseline mean 230.1)`).
- **Safety Distinction**: Every anomaly includes an explicit audit disclaimer: *"This is an AI-detected statistical outlier, not a confirmed hardware or electrical fault."*

### 6.5. Model Registry & Artifact Management

- Models and training metadata are serialized to `backend/model_artifacts/{device_id}/`:
  - `forecast_model.joblib`: Serialized RandomForestRegressor.
  - `anomaly_model.joblib`: Serialized IsolationForest.
  - `metadata.json`: JSON file storing training timestamp, sample counts, feature statistics, and evaluation metrics.
- Corrupted or 0-byte artifact files are intercepted safely, reporting `not_trained` rather than throwing unhandled runtime crashes.
- Device deletion automatically purges associated model artifacts.

### 6.6. AI API Endpoints

| Method | Endpoint | Query Parameters | Description | Status Code |
|---|---|---|---|---|
| `POST` | `/api/ai/train/{device_id}` | `min_samples=15` | Train forecasting and anomaly models on historical telemetry | `200 OK` / `400` / `404` |
| `GET` | `/api/ai/forecast/{device_id}` | `horizon_steps=5` or `horizon=5` | Multi-step active power forecast | `200 OK` / `400` / `404` |
| `GET` | `/api/ai/anomalies/{device_id}` | `start_time`, `end_time`, `skip=0`, `limit=100`, `threshold` | List detected statistical anomalies with factor attribution | `200 OK` / `400` / `404` |
| `GET` | `/api/ai/model/status/{device_id}` | — | Query model readiness, versions, sample counts, and metrics | `200 OK` / `404` |

#### Example: Model Training Response (`POST /api/ai/train/SIM-NODE-01`)

```json
{
  "device_id": "SIM-NODE-01",
  "status": "trained",
  "training_timestamp": "2026-11-10T09:30:00Z",
  "samples_count": 35,
  "forecasting_metrics": {
    "mae": 18.42,
    "rmse": 23.15,
    "r2": 0.8841,
    "baseline_mae": 28.50,
    "model_name": "RandomForestRegressor",
    "version": "1.0.0"
  },
  "anomaly_metrics": {
    "samples_analyzed": 35,
    "anomaly_count": 2,
    "anomaly_percentage": 5.71,
    "model_name": "IsolationForest",
    "version": "1.0.0"
  },
  "is_experimental": true,
  "disclaimer": "Predictions and anomaly scores are experimental AI outputs generated from available telemetry. Simulated data does not establish real-world hardware accuracy."
}
```

#### Example: Forecast Response (`GET /api/ai/forecast/SIM-NODE-01?horizon=3`)

```json
{
  "device_id": "SIM-NODE-01",
  "model_name": "RandomForestRegressor",
  "model_version": "1.0.0",
  "horizon_steps": 3,
  "sampling_interval_seconds": 10.0,
  "forecast": [
    {
      "step": 1,
      "timestamp": "2026-11-10T09:35:10Z",
      "predicted_power_w": 1245.3
    },
    {
      "step": 2,
      "timestamp": "2026-11-10T09:35:20Z",
      "predicted_power_w": 1260.1
    },
    {
      "step": 3,
      "timestamp": "2026-11-10T09:35:30Z",
      "predicted_power_w": 1252.8
    }
  ],
  "is_experimental": true,
  "disclaimer": "Power predictions are algorithmic estimates and must not be used for critical safety or unsupervised autonomous switching decisions."
}
```

#### Example: Anomaly Detection Response (`GET /api/ai/anomalies/SIM-NODE-01`)

```json
{
  "device_id": "SIM-NODE-01",
  "total_evaluated": 35,
  "anomaly_count": 1,
  "anomalies": [
    {
      "id": 142,
      "device_id": "SIM-NODE-01",
      "timestamp": "2026-11-10T09:20:00Z",
      "voltage_v": 380.0,
      "current_a": 42.5,
      "power_w": 15350.0,
      "power_factor": 0.95,
      "frequency_hz": 50.0,
      "anomaly_score": 0.942,
      "is_anomaly": true,
      "contributing_factors": [
        "voltage_v (380.0 is 4.1σ above baseline mean 230.2)",
        "current_a (42.5 is 5.2σ above baseline mean 5.1)",
        "power_w (15350.0 is 5.4σ above baseline mean 1120.0)"
      ],
      "disclaimer": "This is an AI-detected statistical outlier, not a confirmed hardware or electrical fault."
    }
  ],
  "is_experimental": true,
  "disclaimer": "Model-detected anomalies represent statistical deviations from historical patterns and must not be treated as confirmed electrical faults without engineering inspection."
}
```

### 6.7. Evaluation Metrics & Real-World Accuracy Limitations

> [!WARNING]
> **Operational Disclaimer**:
> Models trained on simulated virtual telemetry demonstrate algorithmic correctness, feature pipelining, and chronological consistency. **Simulated data does not establish real-world accuracy or proof of performance on genuine industrial power grids.** Predictions and anomaly scores are experimental AI outputs and must not be used for autonomous protective relay trip decisions or safety-critical interlocking.

- **Forecasting Metrics**:
  - **MAE** (Mean Absolute Error): Average magnitude of prediction errors in Watts.
  - **RMSE** (Root Mean Squared Error): Penalizes larger forecasting deviations in Watts.
  - **$R^2$ Score**: Proportion of variance explained on chronological holdout data; bounded between $-1.0$ and $1.0$, reported only when target variance $> 10^{-4}$.
  - **Baseline MAE**: Persistence benchmark ($y_t = y_{t-1}$). Evaluates whether the trained regressor outperforms the persistence heuristic.
- **Anomaly Metrics**:
  - Evaluates sample count, classified anomaly count, and percentage of observations flagged as statistical outliers.

### 6.8. Instructions for Training Models Locally

1. **Register a SIMULATED virtual node**:
   ```powershell
   Invoke-RestMethod -Method Post -Uri "http://localhost:8000/api/devices" `
     -ContentType "application/json" `
     -Body '{"device_id":"SIM-TEST-NODE","name":"Substation Bay 1 Meter","device_type":"SIMULATED","location":"Bay 1","status":"ONLINE"}'
   ```
2. **Generate synthetic telemetry readings** (e.g. batch of 30 readings):
   ```powershell
   1..30 | ForEach-Object {
     Invoke-RestMethod -Method Post -Uri "http://localhost:8000/api/telemetry/simulate/SIM-TEST-NODE"
   }
   ```
3. **Train AI models**:
   ```powershell
   Invoke-RestMethod -Method Post -Uri "http://localhost:8000/api/ai/train/SIM-TEST-NODE"
   ```
4. **Obtain future power forecast**:
   ```powershell
   Invoke-RestMethod -Method Get -Uri "http://localhost:8000/api/ai/forecast/SIM-TEST-NODE?horizon=5"
   ```
5. **Scan for anomalies**:
   ```powershell
   Invoke-RestMethod -Method Get -Uri "http://localhost:8000/api/ai/anomalies/SIM-TEST-NODE"
   ```
6. **Query model status**:
   ```powershell
   Invoke-RestMethod -Method Get -Uri "http://localhost:8000/api/ai/model/status/SIM-TEST-NODE"
   ```

---

## 7. Automated Testing

Run the full pytest suite:

```powershell
python -m pytest -v
```

All **57 tests** execute against an **isolated in-memory SQLite database** (`sqlite://`) with zero failures:

- **Phase 1 tests (7)**: Root welcome, health check, DB latency probe, CORS headers, Swagger docs.
- **Phase 2 tests (15)**: Device registration, duplicate rejection (409), list/filters, update, delete, stats aggregation, SQLite persistence.
- **Phase 3 tests (21)**: Ingestion, device existence validation, non-finite rejection, negative value rejection, power factor bounds, simulation integrity guards, telemetry retrieval & range filtering, trapezoidal numerical integration precision, gap handling, simulator service, and SQLite direct verification.
- **Phase 4 tests (14)**: Feature engineering, chronological sorting, future-data leakage prevention, minimum sample validation, RandomForestRegressor training, persistence baseline comparison, multi-step forecast generation, IsolationForest anomaly detection, factor attribution, invalid device rejection (404), untrained/corrupted artifact safety (400), model status reporting, Joblib serialization/deserialization, and device deletion cleanup.
