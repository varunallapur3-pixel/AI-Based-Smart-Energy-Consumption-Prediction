"""
API router aggregation for VOLTIX Backend endpoints.
"""

from fastapi import APIRouter
from app.api.health import router as health_router
from app.api.devices import router as devices_router
from app.api.telemetry import router as telemetry_router
from app.api.ai import router as ai_router

api_router = APIRouter()

# Mount health check endpoints under /api/health
api_router.include_router(health_router, tags=["Health"])

# Mount device management endpoints under /api/devices
api_router.include_router(devices_router, prefix="/devices", tags=["Devices"])

# Mount telemetry ingestion and retrieval endpoints under /api/telemetry
api_router.include_router(telemetry_router, prefix="/telemetry", tags=["Telemetry"])

# Mount AI intelligence engine endpoints under /api/ai
api_router.include_router(ai_router, prefix="/ai", tags=["AI Engine"])

__all__ = ["api_router"]
