"""
VOLTIX AI Engine — Machine Learning package.
"""

from app.ml.feature_engineering import (
    build_forecasting_dataset,
    build_anomaly_features,
    FORECAST_FEATURE_NAMES,
    ANOMALY_FEATURE_NAMES,
)
from app.ml.forecasting import PowerForecaster
from app.ml.anomaly_detection import AnomalyDetector
from app.ml.evaluation import evaluate_forecast_model, evaluate_anomaly_model
from app.ml.model_registry import ModelRegistry, registry

__all__ = [
    "build_forecasting_dataset",
    "build_anomaly_features",
    "FORECAST_FEATURE_NAMES",
    "ANOMALY_FEATURE_NAMES",
    "PowerForecaster",
    "AnomalyDetector",
    "evaluate_forecast_model",
    "evaluate_anomaly_model",
    "ModelRegistry",
    "registry",
]
