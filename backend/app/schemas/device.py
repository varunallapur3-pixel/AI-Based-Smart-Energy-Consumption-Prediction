from datetime import datetime
from typing import Optional, Dict
from pydantic import BaseModel, Field, ConfigDict, field_validator
from app.models.device import DeviceType, DeviceStatus


class DeviceBase(BaseModel):
    """
    Base attributes for a VOLTIX device node.
    """
    name: str = Field(
        ...,
        min_length=1,
        max_length=128,
        description="Human-readable name of the device node",
        examples=["Solar Inverter Meter 01"],
    )
    device_type: DeviceType = Field(
        default=DeviceType.SIMULATED,
        description="Categorization of device: SIMULATED (virtual) or PHYSICAL (real hardware).",
        examples=[DeviceType.SIMULATED],
    )
    location: str = Field(
        ...,
        min_length=1,
        max_length=128,
        description="Deployment location or electrical zone",
        examples=["Distribution Panel A - Basement"],
    )
    status: DeviceStatus = Field(
        default=DeviceStatus.UNKNOWN,
        description="Current operational status: ONLINE, OFFLINE, or UNKNOWN",
        examples=[DeviceStatus.ONLINE],
    )
    firmware_version: Optional[str] = Field(
        default=None,
        max_length=64,
        description="Optional firmware version installed on device",
        examples=["2.1.4_STABLE"],
    )
    last_seen: Optional[datetime] = Field(
        default=None,
        description="Optional timestamp of most recent heartbeat or measurement",
    )


class DeviceCreate(DeviceBase):
    """
    Request payload schema for registering a new device in VOLTIX.
    Enforces that SIMULATED devices are never converted or inferred as PHYSICAL.
    """
    device_id: str = Field(
        ...,
        min_length=1,
        max_length=64,
        description="Unique string identifier for the device (e.g. SIM-001, ESP32-PANEL-A)",
        examples=["SIM-GRID-01"],
    )

    @field_validator("device_id", "name", "location")
    @classmethod
    def validate_non_empty_strings(cls, v: str) -> str:
        v_stripped = v.strip()
        if not v_stripped:
            raise ValueError("Field cannot be empty or blank whitespace.")
        return v_stripped

    @field_validator("device_type")
    @classmethod
    def validate_device_type(cls, v: DeviceType) -> DeviceType:
        # Constraint: Clearly distinguish SIMULATED and PHYSICAL; never allow automatic inference
        if v not in (DeviceType.SIMULATED, DeviceType.PHYSICAL):
            raise ValueError("Device type must be explicitly SIMULATED or PHYSICAL.")
        return v


class DeviceUpdate(BaseModel):
    """
    Request payload schema for modifying an existing device.
    All fields are optional; only supplied fields will be updated.
    """
    name: Optional[str] = Field(
        default=None,
        min_length=1,
        max_length=128,
        description="Updated human-readable name",
    )
    device_type: Optional[DeviceType] = Field(
        default=None,
        description="Updated device categorization: SIMULATED or PHYSICAL",
    )
    location: Optional[str] = Field(
        default=None,
        min_length=1,
        max_length=128,
        description="Updated deployment location",
    )
    status: Optional[DeviceStatus] = Field(
        default=None,
        description="Updated operational status: ONLINE, OFFLINE, or UNKNOWN",
    )
    firmware_version: Optional[str] = Field(
        default=None,
        max_length=64,
        description="Updated firmware version string",
    )
    last_seen: Optional[datetime] = Field(
        default=None,
        description="Updated last seen timestamp",
    )

    @field_validator("name", "location")
    @classmethod
    def validate_optional_strings(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v_stripped = v.strip()
            if not v_stripped:
                raise ValueError("Field cannot be empty or blank whitespace.")
            return v_stripped
        return v


class DeviceResponse(DeviceBase):
    """
    Response schema returning complete device entity.
    """
    id: int = Field(..., description="Unique database primary key (integer autoincrement)")
    device_id: str = Field(..., description="Unique device identifier")
    created_at: datetime = Field(..., description="UTC timestamp of device registration")
    updated_at: datetime = Field(..., description="UTC timestamp of device last update")

    model_config = ConfigDict(from_attributes=True)


class DeviceStatsResponse(BaseModel):
    """
    Fleet-wide statistical overview of devices.
    """
    total: int = Field(..., description="Total count of registered devices")
    by_type: Dict[str, int] = Field(
        ...,
        description="Device counts by device type (SIMULATED, PHYSICAL)",
        examples=[{"SIMULATED": 8, "PHYSICAL": 2}],
    )
    by_status: Dict[str, int] = Field(
        ...,
        description="Device counts by status (ONLINE, OFFLINE, UNKNOWN)",
        examples=[{"ONLINE": 5, "OFFLINE": 3, "UNKNOWN": 2}],
    )


class DeviceDeleteResponse(BaseModel):
    """
    Confirmation message upon successful device deletion.
    """
    message: str = Field(..., description="Human-readable deletion confirmation")
    device_id: str = Field(..., description="Identifier of the deleted device")
