from datetime import datetime
from sqlalchemy import Column, String, Float, Boolean, Text, DateTime
from app.core.database import Base


class Incident(Base):
    """
    SQLAlchemy model representing an anomaly or electrical incident alert.
    Corresponds to AnomalyIncident frontend contract.
    """
    __tablename__ = "incidents"

    id = Column(String(64), primary_key=True, index=True)
    severity = Column(String(16), nullable=False, default="info")
    badge_label = Column(String(64), nullable=False)
    title = Column(String(256), nullable=False)
    circuit_tag = Column(String(128), nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)
    description = Column(Text, nullable=False)
    measured_watts = Column(Float, nullable=True)
    baseline_watts = Column(Float, nullable=True)
    power_factor = Column(Float, nullable=True)
    auto_action_text = Column(String(256), nullable=True)
    action_button_label = Column(String(64), nullable=False, default="ACKNOWLEDGE")
    action_button_type = Column(String(32), nullable=False, default="primary")
    acknowledged = Column(Boolean, nullable=False, default=False)
