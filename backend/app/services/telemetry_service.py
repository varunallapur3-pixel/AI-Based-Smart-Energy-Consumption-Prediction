from datetime import datetime, timezone
from typing import Optional, List
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.models.device import Device, DeviceType
from app.models.telemetry import Telemetry
from app.schemas.telemetry import (
    TelemetryCreate,
    SourceType,
    EnergyCalculationResponse,
)
from app.services.energy_calculator import calculate_trapezoidal_energy


class TelemetryService:
    """
    Business logic and database persistence for VOLTIX telemetry ingestion and retrieval.
    Enforces hardware vs simulation integrity and provides numerical energy integration.
    """

    @staticmethod
    def ingest_telemetry(db: Session, telemetry_in: TelemetryCreate) -> Telemetry:
        """
        Store a validated telemetry reading in the database.
        Validates originating device existence, guards against pretending simulated data is physical,
        and updates device last_seen timestamp.
        """
        device = db.query(Device).filter(Device.device_id == telemetry_in.device_id).first()
        if not device:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Device '{telemetry_in.device_id}' not found. Cannot ingest telemetry for an unregistered device.",
            )

        # Integrity guard: Never allow simulated readings to be labeled as physical hardware data
        if device.device_type == DeviceType.SIMULATED.value:
            if telemetry_in.source_type == DeviceType.PHYSICAL:
                raise HTTPException(
                    status_code=422,
                    detail=(
                        f"Cannot label reading as PHYSICAL: device '{telemetry_in.device_id}' is registered as SIMULATED. "
                        "Virtual devices must never produce genuine physical hardware data."
                    ),
                )
            resolved_source = DeviceType.SIMULATED.value
        else:
            resolved_source = (
                telemetry_in.source_type.value
                if telemetry_in.source_type is not None
                else DeviceType.PHYSICAL.value
            )

        # Normalize timestamp to UTC regardless of input timezone offset or DST status
        if telemetry_in.timestamp is not None:
            if telemetry_in.timestamp.tzinfo is not None:
                reading_timestamp = telemetry_in.timestamp.astimezone(timezone.utc)
            else:
                reading_timestamp = telemetry_in.timestamp.replace(tzinfo=timezone.utc)
        else:
            reading_timestamp = datetime.now(timezone.utc)

        db_telemetry = Telemetry(
            device_id=device.device_id,
            voltage_v=telemetry_in.voltage_v,
            current_a=telemetry_in.current_a,
            power_w=telemetry_in.power_w,
            power_factor=telemetry_in.power_factor,
            frequency_hz=telemetry_in.frequency_hz,
            energy_kwh=telemetry_in.energy_kwh,
            source_type=resolved_source,
            timestamp=reading_timestamp,
        )

        db.add(db_telemetry)

        # Update last_seen on originating device
        device.last_seen = reading_timestamp
        device.updated_at = datetime.now(timezone.utc)

        db.commit()
        db.refresh(db_telemetry)
        return db_telemetry

    @staticmethod
    def get_telemetry_reading(db: Session, reading_id: int) -> Telemetry:
        """
        Retrieve a single telemetry record by primary key id.
        Raises HTTP 404 if missing.
        """
        reading = db.query(Telemetry).filter(Telemetry.id == reading_id).first()
        if not reading:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Telemetry reading with id '{reading_id}' not found.",
            )
        return reading

    @staticmethod
    def list_telemetry(
        db: Session,
        device_id: Optional[str] = None,
        source_type: Optional[SourceType] = None,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
        skip: int = 0,
        limit: int = 100,
        order: str = "desc",
    ) -> List[Telemetry]:
        """
        Retrieve telemetry records supporting range filtering and pagination.
        """
        query = db.query(Telemetry)

        if device_id:
            query = query.filter(Telemetry.device_id == device_id)

        if source_type:
            query = query.filter(Telemetry.source_type == source_type.value)

        if start_time:
            query = query.filter(Telemetry.timestamp >= start_time)

        if end_time:
            query = query.filter(Telemetry.timestamp <= end_time)

        if order == "asc":
            query = query.order_by(Telemetry.timestamp.asc(), Telemetry.id.asc())
        else:
            query = query.order_by(Telemetry.timestamp.desc(), Telemetry.id.desc())

        return query.offset(skip).limit(limit).all()

    @staticmethod
    def get_device_telemetry(
        db: Session,
        device_id: str,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
        skip: int = 0,
        limit: int = 100,
        order: str = "desc",
    ) -> List[Telemetry]:
        """
        Retrieve historical telemetry records specifically for a device.
        Raises HTTP 404 if the device does not exist.
        """
        device = db.query(Device).filter(Device.device_id == device_id).first()
        if not device:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Device with device_id '{device_id}' not found.",
            )

        return TelemetryService.list_telemetry(
            db=db,
            device_id=device_id,
            start_time=start_time,
            end_time=end_time,
            skip=skip,
            limit=limit,
            order=order,
        )

    @staticmethod
    def calculate_device_energy(
        db: Session,
        device_id: str,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
        max_gap_seconds: float = 300.0,
    ) -> EnergyCalculationResponse:
        """
        Compute integrated energy consumption (kWh) using trapezoidal numerical integration.
        """
        device = db.query(Device).filter(Device.device_id == device_id).first()
        if not device:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Device with device_id '{device_id}' not found.",
            )

        query = db.query(Telemetry).filter(Telemetry.device_id == device_id)

        if start_time:
            query = query.filter(Telemetry.timestamp >= start_time)

        if end_time:
            query = query.filter(Telemetry.timestamp <= end_time)

        readings = query.order_by(Telemetry.timestamp.asc()).all()

        calc_result = calculate_trapezoidal_energy(readings, max_gap_seconds=max_gap_seconds)

        return EnergyCalculationResponse(
            device_id=device_id,
            total_energy_kwh=calc_result.total_energy_kwh,
            samples_count=calc_result.samples_count,
            valid_intervals_count=calc_result.valid_intervals_count,
            skipped_intervals_count=calc_result.skipped_intervals_count,
            start_time=calc_result.start_time,
            end_time=calc_result.end_time,
            calculation_method=calc_result.calculation_method,
            disclaimer=calc_result.disclaimer,
        )
