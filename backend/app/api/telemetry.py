from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, Path, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas.telemetry import (
    SourceType,
    TelemetryCreate,
    TelemetryResponse,
    SimulationResponse,
)
from app.services.telemetry_service import TelemetryService
from app.services.simulator_service import SimulatorService

router = APIRouter()


@router.post(
    "",
    response_model=TelemetryResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Ingest Telemetry Reading",
    description=(
        "Store a validated electrical telemetry sample. "
        "Validates that the target device exists and enforces that virtual devices cannot produce PHYSICAL data. "
        "Rejects negative or non-finite values (NaN, Inf) and ensures power factor is between 0.0 and 1.0."
    ),
    responses={
        status.HTTP_201_CREATED: {"description": "Telemetry reading successfully ingested"},
        status.HTTP_404_NOT_FOUND: {"description": "Referenced device does not exist"},
        422: {"description": "Validation error or invalid source type"},
    },
)
def ingest_telemetry(
    telemetry_in: TelemetryCreate,
    db: Session = Depends(get_db),
) -> TelemetryResponse:
    """
    Ingest a new telemetry reading into the platform.
    """
    reading = TelemetryService.ingest_telemetry(db=db, telemetry_in=telemetry_in)
    return TelemetryResponse.model_validate(reading)


@router.get(
    "",
    response_model=List[TelemetryResponse],
    status_code=status.HTTP_200_OK,
    summary="List Telemetry Readings",
    description=(
        "Retrieve time-series telemetry samples with support for device filtering, "
        "source categorization (SIMULATED or PHYSICAL), timestamp range limits, and pagination."
    ),
    responses={
        status.HTTP_200_OK: {"description": "Telemetry readings retrieved successfully"},
    },
)
def list_telemetry(
    device_id: Optional[str] = Query(
        default=None,
        description="Filter readings originating from a specific device identifier",
    ),
    source_type: Optional[SourceType] = Query(
        default=None,
        description="Filter by data origin: SIMULATED or PHYSICAL",
    ),
    start_time: Optional[datetime] = Query(
        default=None,
        description="Filter readings on or after this UTC timestamp",
    ),
    end_time: Optional[datetime] = Query(
        default=None,
        description="Filter readings on or before this UTC timestamp",
    ),
    skip: int = Query(default=0, ge=0, description="Pagination offset"),
    limit: int = Query(default=100, ge=1, le=1000, description="Pagination limit"),
    order: str = Query(
        default="desc",
        pattern="^(asc|desc)$",
        description="Sort direction by timestamp ('asc' or 'desc')",
    ),
    db: Session = Depends(get_db),
) -> List[TelemetryResponse]:
    """
    Retrieve telemetry records according to query filters.
    """
    readings = TelemetryService.list_telemetry(
        db=db,
        device_id=device_id,
        source_type=source_type,
        start_time=start_time,
        end_time=end_time,
        skip=skip,
        limit=limit,
        order=order,
    )
    return [TelemetryResponse.model_validate(r) for r in readings]


@router.post(
    "/simulate/{device_id}",
    response_model=SimulationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Generate Synthetic Telemetry",
    description=(
        "Generate and store realistic synthetic electrical readings for a registered SIMULATED device. "
        "Strictly rejects physical devices."
    ),
    responses={
        status.HTTP_201_CREATED: {"description": "Synthetic readings successfully generated"},
        status.HTTP_400_BAD_REQUEST: {"description": "Device is not SIMULATED"},
        status.HTTP_404_NOT_FOUND: {"description": "Device not found"},
    },
)
def simulate_telemetry(
    device_id: str = Path(..., description="Target SIMULATED device identifier"),
    count: int = Query(default=1, ge=1, le=100, description="Number of readings to generate"),
    interval_seconds: float = Query(default=5.0, ge=0.5, le=3600.0, description="Interval in seconds"),
    db: Session = Depends(get_db),
) -> SimulationResponse:
    """
    Trigger virtual telemetry generation for testing.
    """
    if count == 1:
        rec = SimulatorService.generate_reading_for_device(db=db, device_id=device_id)
        records = [rec]
    else:
        records = SimulatorService.generate_batch_readings(
            db=db,
            device_id=device_id,
            count=count,
            interval_seconds=interval_seconds,
        )

    return SimulationResponse(
        message=f"Generated {len(records)} synthetic reading(s) for virtual device '{device_id}'.",
        device_id=device_id,
        generated_count=len(records),
        readings=[TelemetryResponse.model_validate(r) for r in records],
    )


@router.get(
    "/{reading_id}",
    response_model=TelemetryResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Telemetry Reading by ID",
    description="Retrieve a single telemetry record by its unique database primary key ID.",
    responses={
        status.HTTP_200_OK: {"description": "Telemetry reading found and returned"},
        status.HTTP_404_NOT_FOUND: {"description": "Telemetry reading not found"},
    },
)
def get_telemetry_reading(
    reading_id: int = Path(..., ge=1, description="Primary key identifier of the telemetry reading"),
    db: Session = Depends(get_db),
) -> TelemetryResponse:
    """
    Retrieve one specific telemetry reading.
    """
    reading = TelemetryService.get_telemetry_reading(db=db, reading_id=reading_id)
    return TelemetryResponse.model_validate(reading)
