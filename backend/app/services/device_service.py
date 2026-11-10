from datetime import datetime, timezone
from typing import Optional, List
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from app.models.device import Device, DeviceType, DeviceStatus
from app.schemas.device import (
    DeviceCreate,
    DeviceUpdate,
    DeviceStatsResponse,
)


class DeviceService:
    """
    Business logic and database persistence for VOLTIX device management.
    Enforces device uniqueness, integrity, and strict separation between
    virtual (SIMULATED) and hardware (PHYSICAL) devices.
    """

    @staticmethod
    def get_device_by_device_id(db: Session, device_id: str) -> Device:
        """
        Retrieve a single device by its unique device_id string.
        Raises HTTP 404 if not found.
        """
        device = db.query(Device).filter(Device.device_id == device_id).first()
        if not device:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Device with device_id '{device_id}' not found.",
            )
        return device

    @staticmethod
    def create_device(db: Session, device_in: DeviceCreate) -> Device:
        """
        Register a new device node.
        Rejects duplicates with HTTP 409 Conflict.
        Never infers a SIMULATED device as PHYSICAL.
        """
        # Proactively check for existing device_id
        existing = db.query(Device).filter(Device.device_id == device_in.device_id).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Device with device_id '{device_in.device_id}' already exists.",
            )

        now = datetime.now(timezone.utc)
        db_device = Device(
            device_id=device_in.device_id,
            name=device_in.name,
            device_type=device_in.device_type.value,
            location=device_in.location,
            status=device_in.status.value,
            firmware_version=device_in.firmware_version,
            last_seen=device_in.last_seen,
            created_at=now,
            updated_at=now,
        )

        try:
            db.add(db_device)
            db.commit()
            db.refresh(db_device)
            return db_device
        except IntegrityError:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Device with device_id '{device_in.device_id}' already exists.",
            )

    @staticmethod
    def list_devices(
        db: Session,
        device_type: Optional[DeviceType] = None,
        status: Optional[DeviceStatus] = None,
        location: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[Device]:
        """
        Retrieve devices with optional filtering and pagination.
        """
        query = db.query(Device)

        if device_type is not None:
            query = query.filter(Device.device_type == device_type.value)

        if status is not None:
            query = query.filter(Device.status == status.value)

        if location is not None and location.strip():
            query = query.filter(Device.location.ilike(f"%{location.strip()}%"))

        return query.order_by(Device.id.asc()).offset(skip).limit(limit).all()

    @staticmethod
    def update_device(db: Session, device_id: str, device_update: DeviceUpdate) -> Device:
        """
        Update an existing device's details.
        Raises HTTP 404 if missing.
        Never automatically infers SIMULATED to PHYSICAL.
        """
        device = DeviceService.get_device_by_device_id(db, device_id)
        update_data = device_update.model_dump(exclude_unset=True)

        for field, value in update_data.items():
            if hasattr(device, field):
                # If enum, use its string value
                if isinstance(value, (DeviceType, DeviceStatus)):
                    setattr(device, field, value.value)
                else:
                    setattr(device, field, value)

        device.updated_at = datetime.now(timezone.utc)

        try:
            db.commit()
            db.refresh(device)
            return device
        except IntegrityError:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Could not update device '{device_id}' due to a database conflict.",
            )

    @staticmethod
    def delete_device(db: Session, device_id: str) -> Device:
        """
        Delete a device by device_id.
        Raises HTTP 404 if missing.
        """
        device = DeviceService.get_device_by_device_id(db, device_id)
        db.delete(device)
        db.commit()

        # Clean up model artifacts if present
        try:
            from app.ml.model_registry import registry
            registry.delete_device_artifacts(device_id)
        except Exception:
            pass

        return device

    @staticmethod
    def get_device_stats(db: Session) -> DeviceStatsResponse:
        """
        Calculate total devices and counts broken down by device_type and status.
        Guarantees all known types and statuses have explicit integer counts.
        """
        total = db.query(func.count(Device.id)).scalar() or 0

        # Aggregation by device_type
        type_counts_raw = dict(
            db.query(Device.device_type, func.count(Device.id))
            .group_by(Device.device_type)
            .all()
        )
        by_type = {
            DeviceType.SIMULATED.value: type_counts_raw.get(DeviceType.SIMULATED.value, 0),
            DeviceType.PHYSICAL.value: type_counts_raw.get(DeviceType.PHYSICAL.value, 0),
        }

        # Aggregation by status
        status_counts_raw = dict(
            db.query(Device.status, func.count(Device.id))
            .group_by(Device.status)
            .all()
        )
        by_status = {
            DeviceStatus.ONLINE.value: status_counts_raw.get(DeviceStatus.ONLINE.value, 0),
            DeviceStatus.OFFLINE.value: status_counts_raw.get(DeviceStatus.OFFLINE.value, 0),
            DeviceStatus.UNKNOWN.value: status_counts_raw.get(DeviceStatus.UNKNOWN.value, 0),
        }

        return DeviceStatsResponse(
            total=total,
            by_type=by_type,
            by_status=by_status,
        )
