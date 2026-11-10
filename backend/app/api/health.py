from fastapi import APIRouter, Response, status
from app.core.config import settings
from app.core.database import check_db_connectivity
from app.schemas.health import HealthResponse

router = APIRouter()


@router.get(
    "/health",
    response_model=HealthResponse,
    summary="Backend & Database Health Check",
    description="Validates backend operational readiness, semantic version, and active database connection.",
    status_code=status.HTTP_200_OK,
    responses={
        status.HTTP_200_OK: {"description": "Backend and database are fully operational"},
        status.HTTP_503_SERVICE_UNAVAILABLE: {"description": "Database is unreachable or misconfigured"},
    },
)
def get_health(response: Response) -> HealthResponse:
    """
    Execute health check probe against the configured database engine.
    """
    is_connected, db_status_msg, latency_ms = check_db_connectivity()

    if not is_connected:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        return HealthResponse(
            status="unhealthy",
            application_name=settings.PROJECT_NAME,
            backend_version=settings.VERSION,
            database_connectivity="disconnected",
            database_status=db_status_msg,
            database_latency_ms=None,
            environment=settings.ENVIRONMENT,
        )

    return HealthResponse(
        status="healthy",
        application_name=settings.PROJECT_NAME,
        backend_version=settings.VERSION,
        database_connectivity="connected",
        database_status="connected",
        database_latency_ms=latency_ms,
        environment=settings.ENVIRONMENT,
    )
