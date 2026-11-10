"""
Pydantic data schemas for VOLTIX API request and response validation.
"""

from app.schemas.health import HealthResponse
from app.schemas.root import RootResponse
from app.schemas.device import (
    DeviceType,
    DeviceStatus,
    DeviceBase,
    DeviceCreate,
    DeviceUpdate,
    DeviceResponse,
    DeviceStatsResponse,
    DeviceDeleteResponse,
)
from app.schemas.telemetry import (
    SourceType,
    TelemetryBase,
    TelemetryCreate,
    TelemetryResponse,
    EnergyCalculationResponse,
    SimulationRequest,
    SimulationResponse,
)
from app.schemas.ai import (
    ForecastStep,
    ForecastMetrics,
    AnomalyMetrics,
    TrainResponse,
    ForecastResponse,
    AnomalyItem,
    AnomalyResponse,
    ModelStatusResponse,
)

__all__ = [
    "HealthResponse",
    "RootResponse",
    "DeviceType",
    "DeviceStatus",
    "DeviceBase",
    "DeviceCreate",
    "DeviceUpdate",
    "DeviceResponse",
    "DeviceStatsResponse",
    "DeviceDeleteResponse",
    "SourceType",
    "TelemetryBase",
    "TelemetryCreate",
    "TelemetryResponse",
    "EnergyCalculationResponse",
    "SimulationRequest",
    "SimulationResponse",
    "ForecastStep",
    "ForecastMetrics",
    "AnomalyMetrics",
    "TrainResponse",
    "ForecastResponse",
    "AnomalyItem",
    "AnomalyResponse",
    "ModelStatusResponse",
]
