"""
VOLTIX AI Engine — High-Level AI Service.
Coordinates ML training, forecast inference, anomaly evaluation, and artifact management.
"""

from datetime import datetime, timezone
from typing import Optional, List
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
import numpy as np

from app.models.device import Device
from app.models.telemetry import Telemetry
from app.ml.feature_engineering import (
    build_forecasting_dataset,
    build_anomaly_features,
    _extract_numeric,
    _extract_timestamp,
)
from app.ml.forecasting import PowerForecaster, MODEL_NAME as FC_MODEL_NAME, MODEL_VERSION as FC_VERSION
from app.ml.anomaly_detection import AnomalyDetector, MODEL_NAME as AD_MODEL_NAME, MODEL_VERSION as AD_VERSION
from app.ml.model_registry import registry, ModelRegistry
from app.schemas.ai import (
    TrainResponse,
    ForecastResponse,
    AnomalyResponse,
    ModelStatusResponse,
    ForecastMetrics,
    AnomalyMetrics,
)

MIN_TRAIN_SAMPLES = 15


class AIService:
    """
    Business orchestration for ML training, time-series forecasting, and anomaly detection.
    """

    @staticmethod
    def train_device_models(
        db: Session,
        device_id: str,
        min_samples: int = MIN_TRAIN_SAMPLES,
        custom_registry: Optional[ModelRegistry] = None,
    ) -> TrainResponse:
        """
        Train both supervised forecasting and unsupervised anomaly models on device telemetry.
        Persists serialized artifacts and metadata.
        """
        reg = custom_registry or registry

        device = db.query(Device).filter(Device.device_id == device_id).first()
        if not device:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Device with device_id '{device_id}' not found.",
            )

        # Load all historical telemetry strictly for this device, sorted chronologically
        readings = (
            db.query(Telemetry)
            .filter(Telemetry.device_id == device_id)
            .order_by(Telemetry.timestamp.asc())
            .all()
        )

        if len(readings) < min_samples:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"Insufficient historical telemetry for device '{device_id}'. "
                    f"At least {min_samples} valid readings are required to train models (found {len(readings)})."
                ),
            )

        # 1. Feature Engineering
        try:
            X_fore, y_fore, _, _, median_interval = build_forecasting_dataset(
                readings, min_samples=min_samples
            )
            X_anom, _, _, _ = build_anomaly_features(readings, min_samples=min_samples)
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Data preparation error: {exc}",
            )

        # 2. Train Forecasting Model
        forecaster = PowerForecaster()
        forecast_model, forecast_metrics = forecaster.train_and_evaluate(X_fore, y_fore)

        # 3. Train Anomaly Detection Model
        detector = AnomalyDetector()
        anomaly_model, anomaly_metrics, baseline_stats = detector.train(X_anom)

        # 4. Save Artifacts & Metadata
        now_utc = datetime.now(timezone.utc)
        metadata = {
            "device_id": device_id,
            "device_type": device.device_type,
            "training_timestamp": now_utc.isoformat(),
            "samples_count": len(readings),
            "valid_samples_count": len(X_fore),
            "median_interval_sec": median_interval,
            "forecasting_metrics": forecast_metrics.model_dump(),
            "anomaly_metrics": anomaly_metrics.model_dump(),
            "baseline_stats": baseline_stats,
        }

        reg.save_device_artifacts(
            device_id=device_id,
            forecast_model=forecast_model,
            anomaly_model=anomaly_model,
            metadata=metadata,
        )

        return TrainResponse(
            device_id=device_id,
            status="trained",
            training_timestamp=now_utc,
            samples_count=len(readings),
            forecasting_metrics=forecast_metrics,
            anomaly_metrics=anomaly_metrics,
            is_experimental=True,
        )

    @staticmethod
    def generate_forecast(
        db: Session,
        device_id: str,
        horizon_steps: int = 5,
        custom_registry: Optional[ModelRegistry] = None,
    ) -> ForecastResponse:
        """
        Generate future active power consumption forecasts using trained model.
        """
        reg = custom_registry or registry

        device = db.query(Device).filter(Device.device_id == device_id).first()
        if not device:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Device with device_id '{device_id}' not found.",
            )

        model, metadata = reg.load_forecast_model(device_id)
        if model is None or metadata is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"No valid trained forecasting model found for device '{device_id}'. "
                    f"Please call POST /api/ai/train/{device_id} first."
                ),
            )

        # Retrieve recent readings to initialize autoregressive lag state
        recent_readings = (
            db.query(Telemetry)
            .filter(Telemetry.device_id == device_id)
            .order_by(Telemetry.timestamp.desc())
            .limit(20)
            .all()
        )

        # Filter out invalid readings
        valid_recent = [
            r for r in recent_readings
            if _extract_numeric(r, "power_w") is not None
            and _extract_numeric(r, "voltage_v") is not None
            and _extract_timestamp(r) is not None
        ]

        if len(valid_recent) < 3:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Insufficient recent telemetry for device '{device_id}' to initialize forecast state (requires >= 3 valid readings).",
            )

        median_dt = float(metadata.get("median_interval_sec", 5.0))
        forecast_steps = PowerForecaster.forecast_multistep(
            model=model,
            latest_telemetry=valid_recent,
            horizon_steps=horizon_steps,
            median_interval_sec=median_dt,
        )

        return ForecastResponse(
            device_id=device_id,
            model_name=FC_MODEL_NAME,
            model_version=FC_VERSION,
            horizon_steps=horizon_steps,
            sampling_interval_seconds=median_dt,
            forecast=forecast_steps,
            is_experimental=True,
        )

    @staticmethod
    def detect_anomalies(
        db: Session,
        device_id: str,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
        skip: int = 0,
        limit: int = 100,
        threshold: Optional[float] = None,
        custom_registry: Optional[ModelRegistry] = None,
    ) -> AnomalyResponse:
        """
        Identify telemetry anomalies using the device's trained IsolationForest model.
        """
        reg = custom_registry or registry

        device = db.query(Device).filter(Device.device_id == device_id).first()
        if not device:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Device with device_id '{device_id}' not found.",
            )

        model, metadata = reg.load_anomaly_model(device_id)
        if model is None or metadata is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"No valid trained anomaly model found for device '{device_id}'. "
                    f"Please call POST /api/ai/train/{device_id} first."
                ),
            )

        query = db.query(Telemetry).filter(Telemetry.device_id == device_id)
        if start_time:
            query = query.filter(Telemetry.timestamp >= start_time)
        if end_time:
            query = query.filter(Telemetry.timestamp <= end_time)

        readings = query.order_by(Telemetry.timestamp.desc()).all()

        if not readings:
            return AnomalyResponse(
                device_id=device_id,
                total_evaluated=0,
                anomaly_count=0,
                anomalies=[],
                is_experimental=True,
            )

        try:
            X_anom, ts_anom, ids_anom, _ = build_anomaly_features(readings, min_samples=1)
        except ValueError:
            return AnomalyResponse(
                device_id=device_id,
                total_evaluated=0,
                anomaly_count=0,
                anomalies=[],
                is_experimental=True,
            )

        baseline_stats = metadata.get("baseline_stats", {})

        all_anomalies = AnomalyDetector.detect_and_explain(
            model=model,
            baseline_stats=baseline_stats,
            X=X_anom,
            timestamps=ts_anom,
            ids=ids_anom,
            device_id=device_id,
            threshold=threshold,
        )

        paginated = all_anomalies[skip : skip + limit]

        return AnomalyResponse(
            device_id=device_id,
            total_evaluated=len(readings),
            anomaly_count=len(all_anomalies),
            anomalies=paginated,
            is_experimental=True,
        )

    @staticmethod
    def get_model_status(
        db: Session,
        device_id: str,
        custom_registry: Optional[ModelRegistry] = None,
    ) -> ModelStatusResponse:
        """
        Query status and evaluation metrics for device models.
        """
        reg = custom_registry or registry

        device = db.query(Device).filter(Device.device_id == device_id).first()
        if not device:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Device with device_id '{device_id}' not found.",
            )

        info = reg.get_model_status(device_id)
        metadata = info.get("metadata") or {}

        training_ts = None
        if "training_timestamp" in metadata:
            try:
                training_ts = datetime.fromisoformat(metadata["training_timestamp"])
            except Exception:
                pass

        return ModelStatusResponse(
            device_id=device_id,
            forecast_model_status=info["forecast_model_status"],
            anomaly_model_status=info["anomaly_model_status"],
            forecast_model_version=FC_VERSION if info["forecast_model_status"] == "ready" else None,
            anomaly_model_version=AD_VERSION if info["anomaly_model_status"] == "ready" else None,
            last_trained=training_ts,
            training_sample_count=metadata.get("samples_count"),
            evaluation_metrics={
                "forecasting": metadata.get("forecasting_metrics"),
                "anomaly": metadata.get("anomaly_metrics"),
            } if metadata else None,
            is_experimental=True,
        )
