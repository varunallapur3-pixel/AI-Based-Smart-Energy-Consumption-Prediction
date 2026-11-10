import math
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict, field_validator
from app.models.device import DeviceType


# Alias SourceType to DeviceType for domain consistency
SourceType = DeviceType


class TelemetryBase(BaseModel):
    """
    Base schema for electrical telemetry metrics.
    Enforces strict physical realism constraints: finite numbers, non-negative electrical magnitudes,
    and power factor bounded in [0.0, 1.0].
    """
    voltage_v: float = Field(
        ...,
        description="Measured line/phase voltage in Volts (RMS). Must be non-negative and finite.",
        examples=[230.5],
    )
    current_a: float = Field(
        ...,
        description="Measured current in Amperes (RMS). Must be non-negative and finite.",
        examples=[4.2],
    )
    power_w: float = Field(
        ...,
        description="Active real power in Watts. Must be non-negative and finite.",
        examples=[968.1],
    )
    power_factor: Optional[float] = Field(
        default=None,
        description="Dimensionless power factor ratio (cos phi) between 0.0 and 1.0.",
        examples=[0.95],
    )
    frequency_hz: Optional[float] = Field(
        default=None,
        description="AC line frequency in Hertz (Hz). Must be positive and finite when provided.",
        examples=[50.0],
    )
    energy_kwh: Optional[float] = Field(
        default=None,
        description="Optional cumulative energy reading in kilowatt-hours (kWh).",
        examples=[12.45],
    )
    source_type: Optional[SourceType] = Field(
        default=None,
        description="Origin classification: SIMULATED or PHYSICAL. Virtual devices must never be marked PHYSICAL.",
        examples=[SourceType.SIMULATED],
    )
    timestamp: Optional[datetime] = Field(
        default=None,
        description="UTC timestamp of the telemetry reading. Defaults to current server UTC time if omitted.",
    )

    @field_validator("voltage_v", "current_a", "power_w")
    @classmethod
    def validate_non_negative_finite(cls, v: float, info) -> float:
        if not math.isfinite(v):
            raise ValueError(f"{info.field_name} must be a finite numerical value (NaN and Inf are prohibited).")
        if v < 0.0:
            raise ValueError(f"{info.field_name} cannot be negative.")
        return float(v)

    @field_validator("power_factor")
    @classmethod
    def validate_power_factor(cls, v: Optional[float]) -> Optional[float]:
        if v is not None:
            if not math.isfinite(v):
                raise ValueError("power_factor must be a finite numerical value.")
            if v < 0.0 or v > 1.0:
                raise ValueError("power_factor must be bounded between 0.0 and 1.0 inclusive.")
            return float(v)
        return v

    @field_validator("frequency_hz", "energy_kwh")
    @classmethod
    def validate_optional_finite(cls, v: Optional[float], info) -> Optional[float]:
        if v is not None:
            if not math.isfinite(v):
                raise ValueError(f"{info.field_name} must be a finite numerical value.")
            if v < 0.0:
                raise ValueError(f"{info.field_name} cannot be negative.")
            return float(v)
        return v


class TelemetryCreate(TelemetryBase):
    """
    Ingestion request payload schema for POST /api/telemetry.
    Requires device_id of a registered device.
    """
    device_id: str = Field(
        ...,
        min_length=1,
        max_length=64,
        description="Unique string identifier of the originating device node.",
        examples=["SIM-INCOMER-01"],
    )

    @field_validator("device_id")
    @classmethod
    def validate_device_id(cls, v: str) -> str:
        v_stripped = v.strip()
        if not v_stripped:
            raise ValueError("device_id cannot be blank or empty whitespace.")
        return v_stripped


class TelemetryResponse(TelemetryBase):
    """
    Response schema returning a persisted telemetry reading.
    """
    id: int = Field(..., description="Unique database identifier for the telemetry reading.")
    device_id: str = Field(..., description="Identifier of the reporting device.")
    source_type: SourceType = Field(..., description="Verified source: SIMULATED or PHYSICAL.")
    timestamp: datetime = Field(..., description="UTC timestamp of the persisted reading.")

    model_config = ConfigDict(from_attributes=True)


class EnergyCalculationResponse(BaseModel):
    """
    Trapezoidal numerical energy calculation response.
    """
    device_id: str = Field(..., description="Identifier of the analyzed device.")
    total_energy_kwh: float = Field(
        ...,
        description="Calculated electrical energy in kilowatt-hours (kWh) using trapezoidal integration.",
    )
    samples_count: int = Field(..., description="Total number of telemetry samples evaluated.")
    valid_intervals_count: int = Field(
        ...,
        description="Number of consecutive intervals successfully integrated.",
    )
    skipped_intervals_count: int = Field(
        ...,
        description="Number of intervals skipped due to outage gaps exceeding maximum interval threshold.",
    )
    start_time: Optional[datetime] = Field(
        default=None,
        description="Timestamp of the earliest sample in the evaluated range.",
    )
    end_time: Optional[datetime] = Field(
        default=None,
        description="Timestamp of the latest sample in the evaluated range.",
    )
    calculation_method: str = Field(
        default="Trapezoidal numerical integration: sum((P_i + P_{i+1})/2 * dt / 3,600,000)",
        description="Mathematical technique employed for energy computation.",
    )
    disclaimer: str = Field(
        default=(
            "Calculated energy is a numerical approximation derived from discrete telemetry power samples. "
            "It is not a utility revenue meter-certified measurement."
        ),
        description="Legal and technical disclaimer regarding calculated energy values.",
    )


class SimulationRequest(BaseModel):
    """
    Request parameters for synthetic telemetry generation.
    """
    count: int = Field(default=1, ge=1, le=1000, description="Number of synthetic samples to produce.")
    interval_seconds: float = Field(
        default=5.0,
        ge=0.1,
        le=3600.0,
        description="Elapsed seconds between consecutive simulated readings.",
    )


class SimulationResponse(BaseModel):
    """
    Summary response after generating synthetic telemetry for a virtual device.
    """
    message: str = Field(..., description="Status summary.")
    device_id: str = Field(..., description="Target device identifier.")
    generated_count: int = Field(..., description="Number of readings created and persisted.")
    readings: List[TelemetryResponse] = Field(..., description="List of generated telemetry records.")
