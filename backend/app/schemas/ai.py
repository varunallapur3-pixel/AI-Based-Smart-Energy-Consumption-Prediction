from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class ForecastStep(BaseModel):
    """Single predicted time step for active power consumption."""
    step: int = Field(..., description="Forecast horizon step index (1-based).")
    timestamp: datetime = Field(..., description="Projected future UTC timestamp for this prediction.")
    predicted_power_w: float = Field(..., ge=0.0, description="Predicted active power consumption in Watts.")


class ForecastMetrics(BaseModel):
    """Evaluation metrics for the supervised forecasting model evaluated chronologically."""
    mae: float = Field(..., description="Mean Absolute Error in Watts.")
    rmse: float = Field(..., description="Root Mean Squared Error in Watts.")
    r2: Optional[float] = Field(default=None, description="Coefficient of determination (R²), where mathematically meaningful.")
    baseline_mae: float = Field(..., description="Mean Absolute Error of the persistence baseline in Watts.")
    model_name: str = Field(default="RandomForestRegressor", description="Model architecture name.")
    version: str = Field(default="1.0.0", description="Model implementation version.")


class AnomalyMetrics(BaseModel):
    """Summary metrics for the unsupervised anomaly detection model."""
    samples_analyzed: int = Field(..., description="Total training samples evaluated.")
    anomaly_count: int = Field(..., description="Number of samples identified as statistical anomalies.")
    anomaly_percentage: float = Field(..., description="Percentage of training dataset classified as anomalies.")
    model_name: str = Field(default="IsolationForest", description="Anomaly model name.")
    version: str = Field(default="1.0.0", description="Model implementation version.")


class TrainResponse(BaseModel):
    """Response returned upon completing model training for a device."""
    device_id: str = Field(..., description="Target device identifier.")
    status: str = Field(..., description="Training status (e.g. 'trained').")
    training_timestamp: datetime = Field(..., description="UTC timestamp when model training completed.")
    samples_count: int = Field(..., description="Number of valid historical telemetry readings used for training.")
    forecasting_metrics: ForecastMetrics = Field(..., description="Chronological evaluation metrics for forecasting.")
    anomaly_metrics: AnomalyMetrics = Field(..., description="Evaluation metrics for anomaly detection.")
    is_experimental: bool = Field(default=True, description="Indicates model is experimental.")
    disclaimer: str = Field(
        default=(
            "Predictions and anomaly scores are experimental AI outputs generated from available telemetry. "
            "Simulated data does not establish real-world hardware accuracy."
        ),
        description="Operational and legal disclaimer.",
    )


class ForecastResponse(BaseModel):
    """Response containing future active power consumption forecasts."""
    device_id: str = Field(..., description="Target device identifier.")
    model_name: str = Field(..., description="Model architecture used for inference.")
    model_version: str = Field(..., description="Version of the inference model.")
    horizon_steps: int = Field(..., description="Number of predicted steps generated.")
    sampling_interval_seconds: float = Field(..., description="Estimated time step between consecutive predictions.")
    forecast: List[ForecastStep] = Field(..., description="Chronological sequence of predicted power readings.")
    is_experimental: bool = Field(default=True, description="Indicates model is experimental.")
    disclaimer: str = Field(
        default=(
            "Power predictions are algorithmic estimates and must not be used for critical safety or "
            "unsupervised autonomous switching decisions."
        ),
        description="Forecast disclaimer.",
    )


class AnomalyItem(BaseModel):
    """A detected telemetry anomaly with explainable contributing factors."""
    id: int = Field(..., description="Unique database ID of the evaluated telemetry reading.")
    device_id: str = Field(..., description="Device identifier associated with this reading.")
    timestamp: datetime = Field(..., description="UTC timestamp of the anomalous reading.")
    voltage_v: float = Field(..., description="Observed voltage in Volts.")
    current_a: float = Field(..., description="Observed current in Amperes.")
    power_w: float = Field(..., description="Observed active power in Watts.")
    power_factor: Optional[float] = Field(default=None, description="Observed power factor.")
    frequency_hz: Optional[float] = Field(default=None, description="Observed AC frequency in Hz.")
    anomaly_score: float = Field(..., description="Normalized anomaly severity score between 0.0 (normal) and 1.0 (highly anomalous).")
    is_anomaly: bool = Field(default=True, description="True if reading exceeds statistical outlier boundary.")
    contributing_factors: List[str] = Field(default_factory=list, description="Measurements that contributed most to the statistical deviation.")
    disclaimer: str = Field(
        default="This is an AI-detected statistical outlier, not a confirmed hardware or electrical fault.",
        description="Disclaimer on model output.",
    )


class AnomalyResponse(BaseModel):
    """Response listing anomalies identified in device telemetry."""
    device_id: str = Field(..., description="Target device identifier.")
    total_evaluated: int = Field(..., description="Total number of telemetry samples evaluated.")
    anomaly_count: int = Field(..., description="Total number of anomalous readings detected.")
    anomalies: List[AnomalyItem] = Field(..., description="List of detected anomalous readings.")
    is_experimental: bool = Field(default=True, description="Indicates model is experimental.")
    disclaimer: str = Field(
        default=(
            "Model-detected anomalies represent statistical deviations from historical patterns and must "
            "not be treated as confirmed electrical faults without engineering inspection."
        ),
        description="Audit disclaimer.",
    )


class ModelStatusResponse(BaseModel):
    """Status metadata for trained models associated with a device."""
    device_id: str = Field(..., description="Device identifier.")
    forecast_model_status: str = Field(..., description="Status of forecast model: 'ready' or 'not_trained'.")
    anomaly_model_status: str = Field(..., description="Status of anomaly model: 'ready' or 'not_trained'.")
    forecast_model_version: Optional[str] = Field(default=None, description="Version of forecast model.")
    anomaly_model_version: Optional[str] = Field(default=None, description="Version of anomaly model.")
    last_trained: Optional[datetime] = Field(default=None, description="UTC timestamp of last training run.")
    training_sample_count: Optional[int] = Field(default=None, description="Number of samples used in training.")
    evaluation_metrics: Optional[Dict[str, Any]] = Field(default=None, description="Recorded evaluation metrics from training.")
    is_experimental: bool = Field(default=True, description="Indicates model is experimental.")
    disclaimer: str = Field(
        default="Simulated data does not establish real-world accuracy.",
        description="Audit disclaimer.",
    )
