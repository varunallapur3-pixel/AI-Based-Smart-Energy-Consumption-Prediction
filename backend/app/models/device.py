import enum
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, DateTime, CheckConstraint
from sqlalchemy.orm import relationship
from app.core.database import Base


class DeviceType(str, enum.Enum):
    """
    Device categorization.
    Strictly distinguishes SIMULATED and PHYSICAL devices.
    Never infer or represent simulated devices as physical hardware.
    """
    SIMULATED = "SIMULATED"
    PHYSICAL = "PHYSICAL"


class DeviceStatus(str, enum.Enum):
    """
    Operational status of an energy monitoring device.
    """
    ONLINE = "ONLINE"
    OFFLINE = "OFFLINE"
    UNKNOWN = "UNKNOWN"


def utc_now() -> datetime:
    """Return current timezone-aware UTC datetime."""
    return datetime.now(timezone.utc)


class Device(Base):
    """
    SQLAlchemy model representing an energy monitoring node / meter in VOLTIX.
    Supports simulated virtual devices for development/testing and physical hardware nodes.
    """
    __tablename__ = "devices"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    device_id = Column(String(64), unique=True, index=True, nullable=False)
    name = Column(String(128), nullable=False)
    device_type = Column(
        String(16),
        CheckConstraint("device_type IN ('SIMULATED', 'PHYSICAL')", name="check_device_type"),
        nullable=False,
        default=DeviceType.SIMULATED.value,
    )
    location = Column(String(128), nullable=False)
    status = Column(
        String(16),
        CheckConstraint("status IN ('ONLINE', 'OFFLINE', 'UNKNOWN')", name="check_device_status"),
        nullable=False,
        default=DeviceStatus.UNKNOWN.value,
    )
    firmware_version = Column(String(64), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)
    last_seen = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    telemetry_readings = relationship(
        "Telemetry",
        back_populates="device",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    def __repr__(self) -> str:
        return (
            f"<Device(id={self.id}, device_id='{self.device_id}', name='{self.name}', "
            f"type='{self.device_type}', status='{self.status}')>"
        )
