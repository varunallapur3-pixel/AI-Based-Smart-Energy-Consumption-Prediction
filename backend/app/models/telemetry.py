from datetime import datetime, timezone
from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    DateTime,
    ForeignKey,
    Index,
    CheckConstraint,
)
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.device import DeviceType


def utc_now() -> datetime:
    """Return current timezone-aware UTC datetime."""
    return datetime.now(timezone.utc)


class Telemetry(Base):
    """
    SQLAlchemy model representing an energy telemetry sample.
    Stores high-resolution electrical telemetry (voltage, current, power, power factor, frequency, energy).
    Enforces strict distinction between SIMULATED and PHYSICAL data sources.
    """
    __tablename__ = "telemetry"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    device_id = Column(
        String(64),
        ForeignKey("devices.device_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    voltage_v = Column(Float, nullable=False)
    current_a = Column(Float, nullable=False)
    power_w = Column(Float, nullable=False)
    power_factor = Column(Float, nullable=True)
    frequency_hz = Column(Float, nullable=True)
    energy_kwh = Column(Float, nullable=True)
    source_type = Column(
        String(16),
        CheckConstraint("source_type IN ('SIMULATED', 'PHYSICAL')", name="check_telemetry_source_type"),
        nullable=False,
        default=DeviceType.SIMULATED.value,
    )
    timestamp = Column(
        DateTime(timezone=True),
        default=utc_now,
        nullable=False,
        index=True,
    )

    # Relationships
    device = relationship("Device", back_populates="telemetry_readings")

    # Composite index for efficient time-series querying by device and range
    __table_args__ = (
        Index("ix_telemetry_device_timestamp", "device_id", "timestamp"),
        CheckConstraint("voltage_v >= 0", name="check_voltage_non_negative"),
        CheckConstraint("current_a >= 0", name="check_current_non_negative"),
        CheckConstraint("power_w >= 0", name="check_power_non_negative"),
        CheckConstraint(
            "power_factor IS NULL OR (power_factor >= 0 AND power_factor <= 1)",
            name="check_power_factor_range",
        ),
    )

    def __repr__(self) -> str:
        return (
            f"<Telemetry(id={self.id}, device_id='{self.device_id}', "
            f"V={self.voltage_v}V, I={self.current_a}A, P={self.power_w}W, "
            f"source={self.source_type}, ts={self.timestamp})>"
        )


# Backward-compatible alias
TelemetryRecord = Telemetry
