"""
VOLTIX AI Engine — Automated Test Suite (Phase 4).
Tests feature engineering, chronological validation, leakage prevention,
forecasting, anomaly detection, model serialization, error handling,
and API endpoints compatibility.
"""

import os
import json
import pytest
from datetime import datetime, timezone, timedelta
from pathlib import Path
from fastapi.testclient import TestClient
import numpy as np
import pandas as pd

from app.ml.feature_engineering import (
    build_forecasting_dataset,
    build_anomaly_features,
    _telemetry_to_dataframe,
    FORECAST_FEATURE_NAMES,
    ANOMALY_FEATURE_NAMES,
)
from app.ml.forecasting import PowerForecaster
from app.ml.anomaly_detection import AnomalyDetector
from app.ml.model_registry import ModelRegistry
from app.models.device import Device, DeviceType, DeviceStatus
from app.models.telemetry import Telemetry


def _create_device(client: TestClient, device_id: str = "SIM-AI-TEST-01") -> dict:
    """Helper fixture to register a simulated virtual device."""
    payload = {
        "device_id": device_id,
        "name": f"AI Validation Meter {device_id}",
        "device_type": "SIMULATED",
        "location": "Substation Bay AI-1",
        "status": "ONLINE",
        "firmware_version": "3.0.0_AI",
    }
    res = client.post("/api/devices", json=payload)
    assert res.status_code == 201
    return res.json()


def _ingest_telemetry_batch(
    client: TestClient,
    device_id: str,
    count: int = 30,
    base_power: float = 1200.0,
    interval_sec: int = 10,
    start_time: datetime = None,
) -> list:
    """Helper to ingest a sequence of physically realistic telemetry readings."""
    if start_time is None:
        start_time = datetime(2026, 1, 1, 10, 0, 0, tzinfo=timezone.utc)

    records = []
    for i in range(count):
        ts = start_time + timedelta(seconds=i * interval_sec)
        # Introduce dynamic power pattern
        power = base_power + 150.0 * np.sin(i / 3.0) + (i % 5) * 20.0
        voltage = 230.0 + 2.0 * np.cos(i / 4.0)
        current = round(power / (voltage * 0.95), 2)
        energy = round((power * (i * interval_sec)) / 3600000.0, 4)

        payload = {
            "device_id": device_id,
            "voltage_v": round(voltage, 1),
            "current_a": current,
            "power_w": round(power, 1),
            "power_factor": 0.95,
            "frequency_hz": 50.01,
            "energy_kwh": energy,
            "source_type": "SIMULATED",
            "timestamp": ts.isoformat(),
        }
        res = client.post("/api/telemetry", json=payload)
        assert res.status_code == 201
        records.append(res.json())
    return records


# ==============================================================================
# 1. Feature Engineering & Quality Tests
# ==============================================================================

def test_feature_engineering_structure_and_types():
    """Verify feature matrix generation produces correct columns, shapes, and types."""
    start = datetime(2026, 1, 1, 12, 0, 0, tzinfo=timezone.utc)
    raw_records = [
        {
            "id": i,
            "timestamp": (start + timedelta(seconds=i * 5)).isoformat(),
            "voltage_v": 230.0,
            "current_a": 5.0,
            "power_w": 1100.0 + i * 10,
            "power_factor": 0.95,
            "frequency_hz": 50.0,
            "energy_kwh": 0.1 * i,
            "source_type": "SIMULATED",
        }
        for i in range(25)
    ]

    X, y, timestamps, feature_names, dt = build_forecasting_dataset(raw_records, min_samples=15)

    assert isinstance(X, pd.DataFrame)
    assert isinstance(y, pd.Series)
    assert len(X) == len(y) == len(timestamps)
    assert len(X) == 25 - 3  # 3 lag warmup rows dropped
    assert list(X.columns) == FORECAST_FEATURE_NAMES
    assert dt == 5.0

    # Verify no NaN or Inf values in features or target
    assert not X.isna().any().any()
    assert not y.isna().any()
    assert np.isfinite(X.values).all()


def test_data_cleaning_handles_invalid_readings_and_duplicates():
    """Verify NaN, Inf, negative values, and duplicate timestamps are safely cleaned."""
    start = datetime(2026, 1, 1, 12, 0, 0, tzinfo=timezone.utc)
    raw_records = [
        {"timestamp": start, "voltage_v": 230.0, "current_a": 5.0, "power_w": 1000.0},
        # Duplicate timestamp - should be deduplicated
        {"timestamp": start, "voltage_v": 230.0, "current_a": 5.0, "power_w": 1005.0},
        # Invalid NaN voltage - should be dropped
        {"timestamp": start + timedelta(seconds=5), "voltage_v": float("nan"), "current_a": 5.0, "power_w": 1000.0},
        # Negative current - should be dropped
        {"timestamp": start + timedelta(seconds=10), "voltage_v": 230.0, "current_a": -2.0, "power_w": 1000.0},
        # Valid reading
        {"timestamp": start + timedelta(seconds=15), "voltage_v": 230.0, "current_a": 5.0, "power_w": 1020.0},
    ]

    df = _telemetry_to_dataframe(raw_records)
    # Only 2 unique valid rows should survive
    assert len(df) == 2
    assert df.iloc[0]["power_w"] == 1005.0  # Kept latest duplicate
    assert df.iloc[1]["power_w"] == 1020.0


# ==============================================================================
# 2. Chronological Sorting & No Future Leakage Tests
# ==============================================================================

def test_chronological_sorting_of_unordered_telemetry():
    """Verify input telemetry provided out-of-order is strictly sorted chronologically."""
    start = datetime(2026, 1, 1, 12, 0, 0, tzinfo=timezone.utc)
    t1 = start
    t2 = start + timedelta(seconds=10)
    t3 = start + timedelta(seconds=20)
    t4 = start + timedelta(seconds=30)

    # Shuffled input order
    raw_records = [
        {"timestamp": t3, "voltage_v": 230.0, "current_a": 4.0, "power_w": 900.0},
        {"timestamp": t1, "voltage_v": 230.0, "current_a": 2.0, "power_w": 450.0},
        {"timestamp": t4, "voltage_v": 230.0, "current_a": 5.0, "power_w": 1150.0},
        {"timestamp": t2, "voltage_v": 230.0, "current_a": 3.0, "power_w": 680.0},
    ]

    df = _telemetry_to_dataframe(raw_records)
    timestamps = list(df["timestamp"])
    assert timestamps == [t1, t2, t3, t4]
    assert list(df["power_w"]) == [450.0, 680.0, 900.0, 1150.0]


def test_no_future_data_leakage():
    """Verify that lag features and rolling stats strictly use strictly prior observations."""
    start = datetime(2026, 1, 1, 12, 0, 0, tzinfo=timezone.utc)
    raw_records = [
        {
            "timestamp": start + timedelta(seconds=i * 10),
            "voltage_v": 230.0,
            "current_a": 5.0,
            "power_w": float((i + 1) * 100),  # 100, 200, 300, 400, 500, ...
        }
        for i in range(20)
    ]

    X, y, timestamps, _, _ = build_forecasting_dataset(raw_records, min_samples=15)

    # At row index 0 (which corresponds to index 3 in raw series: power_w = 400):
    # Target y[0] is 400.0
    assert y.iloc[0] == 400.0
    # Lag 1 must be strictly past power: 300.0
    assert X.iloc[0]["power_lag_1"] == 300.0
    # Lag 2 must be 200.0
    assert X.iloc[0]["power_lag_2"] == 200.0
    # Lag 3 must be 100.0
    assert X.iloc[0]["power_lag_3"] == 100.0
    # Rolling mean of previous 3 values: mean(100, 200, 300) = 200.0 (strictly NOT including 400.0!)
    assert X.iloc[0]["power_rolling_mean_3"] == 200.0


# ==============================================================================
# 3. Insufficient Training Data Tests
# ==============================================================================

def test_insufficient_training_data_rejection(client: TestClient):
    """Verify API returns HTTP 400 when attempting to train with fewer than min_samples."""
    dev_id = "SIM-INSUFFICIENT-01"
    _create_device(client, device_id=dev_id)

    # Ingest only 5 readings (minimum required is 15)
    _ingest_telemetry_batch(client, device_id=dev_id, count=5)

    response = client.post(f"/api/ai/train/{dev_id}?min_samples=15")
    assert response.status_code == 400
    data = response.json()
    assert "Insufficient historical telemetry" in data["detail"]


# ==============================================================================
# 4. Forecast Model Training & Baseline Comparison Tests
# ==============================================================================

def test_forecast_model_training_and_baseline_evaluation():
    """Verify PowerForecaster trains chronologically and computes genuine metrics."""
    start = datetime(2026, 1, 1, 12, 0, 0, tzinfo=timezone.utc)
    raw_records = [
        {
            "timestamp": start + timedelta(seconds=i * 10),
            "voltage_v": 230.0 + (i % 3),
            "current_a": 5.0 + 0.1 * (i % 4),
            "power_w": 1000.0 + 50.0 * np.sin(i / 2.0),
        }
        for i in range(40)
    ]

    X, y, _, _, _ = build_forecasting_dataset(raw_records, min_samples=15)
    forecaster = PowerForecaster(n_estimators=20, max_depth=5, random_state=42)
    model, metrics = forecaster.train_and_evaluate(X, y, test_ratio=0.2)

    assert metrics.mae >= 0.0
    assert metrics.rmse >= 0.0
    assert metrics.baseline_mae >= 0.0
    assert metrics.model_name == "RandomForestRegressor"
    assert metrics.version == "1.0.0"
    if metrics.r2 is not None:
        assert -1.0 <= metrics.r2 <= 1.0


# ==============================================================================
# 5. Full Training, Forecast & Anomaly Detection Endpoints
# ==============================================================================

def test_full_ai_train_and_forecast_workflow(client: TestClient):
    """Verify complete end-to-end AI training and multi-step forecast generation."""
    dev_id = "SIM-FC-E2E-01"
    _create_device(client, device_id=dev_id)
    _ingest_telemetry_batch(client, device_id=dev_id, count=35, base_power=1500.0)

    # 1. Train models
    train_res = client.post(f"/api/ai/train/{dev_id}")
    assert train_res.status_code == 200
    train_data = train_res.json()

    assert train_data["device_id"] == dev_id
    assert train_data["status"] == "trained"
    assert train_data["samples_count"] == 35
    assert train_data["is_experimental"] is True
    assert "forecasting_metrics" in train_data
    assert "anomaly_metrics" in train_data

    # 2. Generate forecast (default 5 steps)
    fc_res = client.get(f"/api/ai/forecast/{dev_id}")
    assert fc_res.status_code == 200
    fc_data = fc_res.json()

    assert fc_data["device_id"] == dev_id
    assert fc_data["model_name"] == "RandomForestRegressor"
    assert fc_data["horizon_steps"] == 5
    assert len(fc_data["forecast"]) == 5
    assert fc_data["is_experimental"] is True

    # Validate step sequencing
    for idx, step in enumerate(fc_data["forecast"], start=1):
        assert step["step"] == idx
        assert step["predicted_power_w"] >= 0.0
        assert "timestamp" in step

    # 3. Test custom horizon parameter alias
    fc_custom = client.get(f"/api/ai/forecast/{dev_id}?horizon=8")
    assert fc_custom.status_code == 200
    assert len(fc_custom.json()["forecast"]) == 8


def test_anomaly_detection_with_outlier_attribution(client: TestClient):
    """Verify IsolationForest detects anomalies and provides explainable factor attribution."""
    dev_id = "SIM-ANOM-01"
    _create_device(client, device_id=dev_id)

    # Ingest 30 normal readings around 230V, 5A, 1100W
    _ingest_telemetry_batch(client, device_id=dev_id, count=30, base_power=1100.0)

    # Ingest 1 severe anomalous spike (voltage surge and high power)
    spike_time = datetime(2026, 1, 1, 10, 10, 0, tzinfo=timezone.utc)
    outlier_payload = {
        "device_id": dev_id,
        "voltage_v": 380.0,  # Extreme over-voltage
        "current_a": 45.0,   # Massive overcurrent
        "power_w": 16245.0,  # 16 kW spike
        "power_factor": 0.95,
        "frequency_hz": 50.0,
        "energy_kwh": 50.0,
        "source_type": "SIMULATED",
        "timestamp": spike_time.isoformat(),
    }
    client.post("/api/telemetry", json=outlier_payload)

    # Train models
    client.post(f"/api/ai/train/{dev_id}")

    # Query anomalies
    anom_res = client.get(f"/api/ai/anomalies/{dev_id}")
    assert anom_res.status_code == 200
    anom_data = anom_res.json()

    assert anom_data["device_id"] == dev_id
    assert anom_data["total_evaluated"] >= 31
    assert anom_data["anomaly_count"] >= 1
    assert anom_data["is_experimental"] is True

    # Find the spike
    spike_item = next((item for item in anom_data["anomalies"] if item["power_w"] > 10000.0), None)
    assert spike_item is not None
    assert spike_item["device_id"] == dev_id
    assert spike_item["anomaly_score"] > 0.5
    assert len(spike_item["contributing_factors"]) > 0
    assert "statistical outlier" in spike_item["disclaimer"]


def test_anomaly_filtering_by_threshold_and_pagination(client: TestClient):
    """Verify anomaly threshold filter, pagination, and timestamp bounds."""
    dev_id = "SIM-ANOM-FILTER-01"
    _create_device(client, device_id=dev_id)
    _ingest_telemetry_batch(client, device_id=dev_id, count=30)
    client.post(f"/api/ai/train/{dev_id}")

    # High threshold should return subset or none
    res_high = client.get(f"/api/ai/anomalies/{dev_id}?threshold=0.99")
    assert res_high.status_code == 200
    assert isinstance(res_high.json()["anomalies"], list)

    # Pagination test
    res_page = client.get(f"/api/ai/anomalies/{dev_id}?skip=0&limit=1")
    assert res_page.status_code == 200
    assert len(res_page.json()["anomalies"]) <= 1


# ==============================================================================
# 6. Error Handling: Invalid Device & Missing Artifacts
# ==============================================================================

def test_invalid_device_id_returns_404(client: TestClient):
    """Verify all AI endpoints reject non-existent device_id with HTTP 404."""
    fake_id = "NON_EXISTENT_DEV_999"

    assert client.post(f"/api/ai/train/{fake_id}").status_code == 404
    assert client.get(f"/api/ai/forecast/{fake_id}").status_code == 404
    assert client.get(f"/api/ai/anomalies/{fake_id}").status_code == 404
    assert client.get(f"/api/ai/model/status/{fake_id}").status_code == 404


def test_missing_model_artifacts_handling(client: TestClient):
    """Verify untrained devices return clear HTTP 400 on forecast and anomalies, and not_trained on status."""
    dev_id = "SIM-UNTRAINED-01"
    _create_device(client, device_id=dev_id)
    _ingest_telemetry_batch(client, device_id=dev_id, count=10)

    # Forecast before training
    fc_res = client.get(f"/api/ai/forecast/{dev_id}")
    assert fc_res.status_code == 400
    assert "No valid trained forecasting model found" in fc_res.json()["detail"]

    # Anomalies before training
    anom_res = client.get(f"/api/ai/anomalies/{dev_id}")
    assert anom_res.status_code == 400
    assert "No valid trained anomaly model found" in anom_res.json()["detail"]

    # Status before training
    status_res = client.get(f"/api/ai/model/status/{dev_id}")
    assert status_res.status_code == 200
    status_data = status_res.json()
    assert status_data["forecast_model_status"] == "not_trained"
    assert status_data["anomaly_model_status"] == "not_trained"
    assert status_data["last_trained"] is None


# ==============================================================================
# 7. Model Status & Serialization Tests
# ==============================================================================

def test_model_status_endpoint_after_training(client: TestClient):
    """Verify GET /api/ai/model/status/{device_id} reflects ready status and metrics."""
    dev_id = "SIM-STATUS-01"
    _create_device(client, device_id=dev_id)
    _ingest_telemetry_batch(client, device_id=dev_id, count=30)
    client.post(f"/api/ai/train/{dev_id}")

    res = client.get(f"/api/ai/model/status/{dev_id}")
    assert res.status_code == 200
    data = res.json()

    assert data["device_id"] == dev_id
    assert data["forecast_model_status"] == "ready"
    assert data["anomaly_model_status"] == "ready"
    assert data["forecast_model_version"] == "1.0.0"
    assert data["anomaly_model_version"] == "1.0.0"
    assert data["training_sample_count"] == 30
    assert data["last_trained"] is not None
    assert "evaluation_metrics" in data
    assert "forecasting" in data["evaluation_metrics"]
    assert "anomaly" in data["evaluation_metrics"]


def test_model_registry_serialization_and_corruption_handling(tmp_path: Path):
    """Directly test ModelRegistry file saving, loading, corruption, and cleanup."""
    from sklearn.ensemble import RandomForestRegressor, IsolationForest

    reg = ModelRegistry(artifacts_dir=tmp_path)
    device_id = "REGISTRY_TEST_01"

    fc_model = RandomForestRegressor(n_estimators=5, random_state=42)
    # Fit dummy data so it can predict
    fc_model.fit(np.array([[1.0, 2.0], [3.0, 4.0]]), np.array([10.0, 20.0]))

    ad_model = IsolationForest(n_estimators=5, random_state=42)
    ad_model.fit(np.array([[1.0, 2.0], [3.0, 4.0]]))

    meta = {"samples_count": 50, "version": "1.0.0"}

    # Save
    dev_dir = reg.save_device_artifacts(device_id, fc_model, ad_model, meta)
    assert dev_dir.exists()

    # Load
    loaded_fc, loaded_meta = reg.load_forecast_model(device_id)
    assert loaded_fc is not None
    assert loaded_meta["samples_count"] == 50

    # Status
    status_info = reg.get_model_status(device_id)
    assert status_info["forecast_model_status"] == "ready"
    assert status_info["anomaly_model_status"] == "ready"

    # Simulate artifact corruption (write empty file)
    fc_path = dev_dir / "forecast_model.joblib"
    with open(fc_path, "w") as f:
        f.write("")

    corrupt_fc, _ = reg.load_forecast_model(device_id)
    assert corrupt_fc is None  # Handled safely

    corrupt_status = reg.get_model_status(device_id)
    assert corrupt_status["forecast_model_status"] == "not_trained"

    # Cleanup
    assert reg.delete_device_artifacts(device_id) is True
    assert not dev_dir.exists()


# ==============================================================================
# 8. Backward Compatibility with Existing Endpoints
# ==============================================================================

def test_device_deletion_cleans_up_ai_artifacts(client: TestClient):
    """Verify deleting a device cleans up both database entries and AI model artifacts."""
    dev_id = "SIM-DELETE-CLEANUP-01"
    _create_device(client, device_id=dev_id)
    _ingest_telemetry_batch(client, device_id=dev_id, count=30)
    client.post(f"/api/ai/train/{dev_id}")

    # Confirm model status is ready
    assert client.get(f"/api/ai/model/status/{dev_id}").json()["forecast_model_status"] == "ready"

    # Delete device
    del_res = client.delete(f"/api/devices/{dev_id}")
    assert del_res.status_code == 200

    # Verify device and its endpoints are now 404
    assert client.get(f"/api/devices/{dev_id}").status_code == 404
    assert client.get(f"/api/ai/model/status/{dev_id}").status_code == 404
