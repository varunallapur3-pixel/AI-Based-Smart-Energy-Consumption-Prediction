from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, Query, Path, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas.ai import (
    TrainResponse,
    ForecastResponse,
    AnomalyResponse,
    ModelStatusResponse,
)
from app.services.ai_service import AIService

router = APIRouter()


@router.post(
    "/train/{device_id}",
    response_model=TrainResponse,
    status_code=status.HTTP_200_OK,
    summary="Train AI Models for Device",
    description=(
        "Train or retrain active power forecasting (RandomForestRegressor) and anomaly detection (IsolationForest) "
        "models using the device's historical telemetry records. "
        "Enforces chronological validation to prevent future-data leakage."
    ),
    responses={
        status.HTTP_200_OK: {"description": "Models successfully trained and serialized"},
        status.HTTP_400_BAD_REQUEST: {"description": "Insufficient historical data to train models"},
        status.HTTP_404_NOT_FOUND: {"description": "Device not found"},
    },
)
def train_device_models(
    device_id: str = Path(..., description="Unique string identifier of the target device"),
    min_samples: int = Query(default=15, ge=5, le=1000, description="Minimum required valid telemetry samples"),
    db: Session = Depends(get_db),
) -> TrainResponse:
    """
    Train forecasting and anomaly detection models for a device.
    """
    return AIService.train_device_models(db=db, device_id=device_id, min_samples=min_samples)


@router.get(
    "/forecast/{device_id}",
    response_model=ForecastResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Power Consumption Forecast",
    description=(
        "Generate multi-step future active power predictions (Watts) for the requested device. "
        "Predictions are experimental AI estimates generated using lag and rolling features."
    ),
    responses={
        status.HTTP_200_OK: {"description": "Forecast successfully generated"},
        status.HTTP_400_BAD_REQUEST: {"description": "Model not trained or insufficient recent data"},
        status.HTTP_404_NOT_FOUND: {"description": "Device not found"},
    },
)
def get_forecast(
    device_id: str = Path(..., description="Unique string identifier of the target device"),
    horizon_steps: Optional[int] = Query(default=None, ge=1, le=50, description="Number of forward prediction steps to project"),
    horizon: Optional[int] = Query(default=None, ge=1, le=50, description="Alias for horizon_steps"),
    db: Session = Depends(get_db),
) -> ForecastResponse:
    """
    Obtain multi-step power forecast for a device.
    """
    effective_steps = horizon or horizon_steps or 5
    return AIService.generate_forecast(db=db, device_id=device_id, horizon_steps=effective_steps)


@router.get(
    "/anomalies/{device_id}",
    response_model=AnomalyResponse,
    status_code=status.HTTP_200_OK,
    summary="Detect Telemetry Anomalies",
    description=(
        "Identify statistical outliers in the device's historical telemetry using IsolationForest. "
        "Provides explainable measurement attribution for each detected anomaly. "
        "Distinguishes statistical anomalies from confirmed physical faults."
    ),
    responses={
        status.HTTP_200_OK: {"description": "Anomaly scan completed successfully"},
        status.HTTP_400_BAD_REQUEST: {"description": "Model not trained for this device"},
        status.HTTP_404_NOT_FOUND: {"description": "Device not found"},
    },
)
def get_anomalies(
    device_id: str = Path(..., description="Unique string identifier of the target device"),
    start_time: Optional[datetime] = Query(default=None, description="Start UTC timestamp filter"),
    end_time: Optional[datetime] = Query(default=None, description="End UTC timestamp filter"),
    skip: int = Query(default=0, ge=0, description="Pagination offset"),
    limit: int = Query(default=100, ge=1, le=1000, description="Pagination limit"),
    threshold: Optional[float] = Query(default=None, ge=0.0, le=1.0, description="Optional custom anomaly severity score threshold"),
    db: Session = Depends(get_db),
) -> AnomalyResponse:
    """
    Retrieve detected statistical anomalies for a device.
    """
    return AIService.detect_anomalies(
        db=db,
        device_id=device_id,
        start_time=start_time,
        end_time=end_time,
        skip=skip,
        limit=limit,
        threshold=threshold,
    )


@router.get(
    "/model/status/{device_id}",
    response_model=ModelStatusResponse,
    status_code=status.HTTP_200_OK,
    summary="Get AI Model Status",
    description="Retrieve model readiness, versions, training timestamps, and chronological evaluation metrics.",
    responses={
        status.HTTP_200_OK: {"description": "Model status retrieved"},
        status.HTTP_404_NOT_FOUND: {"description": "Device not found"},
    },
)
def get_model_status(
    device_id: str = Path(..., description="Unique string identifier of the target device"),
    db: Session = Depends(get_db),
) -> ModelStatusResponse:
    """
    Check model training status and metrics for a device.
    """
    return AIService.get_model_status(db=db, device_id=device_id)
