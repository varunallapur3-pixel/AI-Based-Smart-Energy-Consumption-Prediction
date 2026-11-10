"""
Core configuration and database engine for VOLTIX Backend.
"""

from app.core.config import settings
from app.core.database import Base, engine, SessionLocal, get_db, init_db, check_db_connectivity

__all__ = [
    "settings",
    "Base",
    "engine",
    "SessionLocal",
    "get_db",
    "init_db",
    "check_db_connectivity",
]
