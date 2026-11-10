from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, Path, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.device import DeviceType, DeviceStatus
from app.schemas.device import (
    DeviceCreate,
    DeviceUpdate,
    DeviceResponse,
    DeviceStatsResponse,
    DeviceDeleteResponse,
)
from app.schemas.telemetry import TelemetryResponse, EnergyCalculationResponse
from app.services.device_service import DeviceService
from app.services.telemetry_service import TelemetryService

router = APIRouter()


@router.post(
    "",
    response_model=DeviceResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register Device",
    description=(
        "Register a new energy monitoring node or simulated device. "
        "Returns HTTP 409 if a device with the same device_id already exists. "
        "Virtual devices must explicitly use SIMULATED and are never inferred as physical hardware."
    ),
    responses={
        status.HTTP_201_CREATED: {"description": "Device successfully registered"},
        status.HTTP_409_CONFLICT: {"description": "Device with this device_id already exists"},
        422: {"description": "Validation error in request payload"},
    },
)
def register_device(
    device_in: DeviceCreate,
    db: Session = Depends(get_db),
) -> DeviceResponse:
    """
    Register a new device node.
    """
    device = DeviceService.create_device(db=db, device_in=device_in)
    return DeviceResponse.model_validate(device)


@router.get(
    "",
    response_model=List[DeviceResponse],
    status_code=status.HTTP_200_OK,
    summary="List Devices",
    description="Retrieve all registered devices with optional filtering by device_type, status, or location.",
    responses={
        status.HTTP_200_OK: {"description": "List of devices successfully retrieved"},
    },
)
def list_devices(
    device_type: Optional[DeviceType] = Query(
        default=None,
        description="Filter by device categorization (SIMULATED or PHYSICAL)",
    ),
    device_status: Optional[DeviceStatus] = Query(
        default=None,
        alias="status",
        description="Filter by operational status (ONLINE, OFFLINE, UNKNOWN)",
    ),
    location: Optional[str] = Query(
        default=None,
        description="Filter by case-insensitive partial match on location",
    ),
    skip: int = Query(default=0, ge=0, description="Pagination offset"),
    limit: int = Query(default=100, ge=1, le=1000, description="Pagination limit"),
    db: Session = Depends(get_db),
) -> List[DeviceResponse]:
    """
    List registered devices.
    """
    devices = DeviceService.list_devices(
        db=db,
        device_type=device_type,
        status=device_status,
        location=location,
        skip=skip,
        limit=limit,
    )
    return [DeviceResponse.model_validate(d) for d in devices]


@router.get(
    "/stats",
    response_model=DeviceStatsResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Device Statistics",
    description=(
        "Calculate fleet aggregation metrics: total number of registered devices, "
        "and sub-counts partitioned by device_type (SIMULATED, PHYSICAL) and status (ONLINE, OFFLINE, UNKNOWN)."
    ),
    responses={
        status.HTTP_200_OK: {"description": "Device statistics calculated successfully"},
    },
)
def get_device_stats(
    db: Session = Depends(get_db),
) -> DeviceStatsResponse:
    """
    Retrieve fleet-wide device statistics.
    """
    return DeviceService.get_device_stats(db=db)


@router.get(
    "/{device_id}",
    response_model=DeviceResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Device Details",
    description="Retrieve complete metadata and status for a specific device by its unique device_id.",
    responses={
        status.HTTP_200_OK: {"description": "Device details found and returned"},
        status.HTTP_404_NOT_FOUND: {"description": "Device not found"},
    },
)
def get_device(
    device_id: str = Path(..., description="Unique string identifier of the device"),
    db: Session = Depends(get_db),
) -> DeviceResponse:
    """
    Get device details by device_id.
    """
    device = DeviceService.get_device_by_device_id(db=db, device_id=device_id)
    return DeviceResponse.model_validate(device)


@router.put(
    "/{device_id}",
    response_model=DeviceResponse,
    status_code=status.HTTP_200_OK,
    summary="Update Device Information",
    description="Update metadata, location, status, or firmware version for an existing device.",
    responses={
        status.HTTP_200_OK: {"description": "Device successfully updated"},
        status.HTTP_404_NOT_FOUND: {"description": "Device not found"},
        422: {"description": "Validation error in request payload"},
    },
)
def update_device(
    device_id: str = Path(..., description="Unique string identifier of the device"),
    device_update: DeviceUpdate = ...,
    db: Session = Depends(get_db),
) -> DeviceResponse:
    """
    Update device information.
    """
    device = DeviceService.update_device(
        db=db,
        device_id=device_id,
        device_update=device_update,
    )
    return DeviceResponse.model_validate(device)


@router.delete(
    "/{device_id}",
    response_model=DeviceDeleteResponse,
    status_code=status.HTTP_200_OK,
    summary="Delete Device",
    description="Permanently remove a device from the database by its device_id.",
    responses={
        status.HTTP_200_OK: {"description": "Device successfully deleted"},
        status.HTTP_404_NOT_FOUND: {"description": "Device not found"},
    },
)
def delete_device(
    device_id: str = Path(..., description="Unique string identifier of the device"),
    db: Session = Depends(get_db),
) -> DeviceDeleteResponse:
    """
    Delete a device by device_id.
    """
    DeviceService.delete_device(db=db, device_id=device_id)
    return DeviceDeleteResponse(
        message=f"Device '{device_id}' deleted successfully.",
        device_id=device_id,
    )


@router.get(
    "/{device_id}/telemetry",
    response_model=List[TelemetryResponse],
    status_code=status.HTTP_200_OK,
    summary="Get Device Historical Telemetry",
    description="Retrieve historical telemetry readings for a specific device with range filtering and pagination.",
    responses={
        status.HTTP_200_OK: {"description": "Device telemetry retrieved successfully"},
        status.HTTP_404_NOT_FOUND: {"description": "Device not found"},
    },
)
def get_device_telemetry(
    device_id: str = Path(..., description="Unique string identifier of the device"),
    start_time: Optional[datetime] = Query(default=None, description="Start timestamp filter"),
    end_time: Optional[datetime] = Query(default=None, description="End timestamp filter"),
    skip: int = Query(default=0, ge=0, description="Pagination offset"),
    limit: int = Query(default=100, ge=1, le=1000, description="Pagination limit"),
    order: str = Query(default="desc", pattern="^(asc|desc)$", description="Sort order"),
    db: Session = Depends(get_db),
) -> List[TelemetryResponse]:
    """
    Retrieve historical telemetry for a single device.
    """
    readings = TelemetryService.get_device_telemetry(
        db=db,
        device_id=device_id,
        start_time=start_time,
        end_time=end_time,
        skip=skip,
        limit=limit,
        order=order,
    )
    return [TelemetryResponse.model_validate(r) for r in readings]


@router.get(
    "/{device_id}/energy",
    response_model=EnergyCalculationResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Device Integrated Energy (kWh)",
    description=(
        "Calculate active energy consumption in kilowatt-hours (kWh) using numerical trapezoidal integration. "
        "Handles irregular intervals and excludes outage gaps exceeding max_gap_seconds."
    ),
    responses={
        status.HTTP_200_OK: {"description": "Energy integrated successfully"},
        status.HTTP_404_NOT_FOUND: {"description": "Device not found"},
    },
)
def get_device_energy(
    device_id: str = Path(..., description="Unique string identifier of the device"),
    start_time: Optional[datetime] = Query(default=None, description="Start timestamp for calculation"),
    end_time: Optional[datetime] = Query(default=None, description="End timestamp for calculation"),
    max_gap_seconds: float = Query(default=300.0, ge=1.0, description="Max allowed gap between consecutive samples"),
    db: Session = Depends(get_db),
) -> EnergyCalculationResponse:
    """
    Calculate trapezoidal energy consumption for a device.
    """
    return TelemetryService.calculate_device_energy(
        db=db,
        device_id=device_id,
        start_time=start_time,
        end_time=end_time,
        max_gap_seconds=max_gap_seconds,
    )
