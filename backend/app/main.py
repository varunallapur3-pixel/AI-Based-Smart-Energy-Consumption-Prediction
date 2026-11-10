from contextlib import asynccontextmanager
from fastapi import FastAPI, status
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import init_db
from app.api import api_router
from app.schemas.root import RootResponse


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan handler.
    Ensures database tables are initialized on startup.
    """
    # Initialize database tables
    init_db()
    yield


def create_application() -> FastAPI:
    """
    Application factory for the VOLTIX backend.
    """
    app = FastAPI(
        title=settings.PROJECT_NAME,
        version=settings.VERSION,
        description=(
            "VOLTIX Smart Energy Platform Backend API. "
            "Provides device telemetry aggregation, hardware connectivity, "
            "and real-time electrical analytics for the VOLTIX dashboard."
        ),
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
        lifespan=lifespan,
    )

    # Configure CORS for Vite frontend and local development
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Mount API routers (e.g. /api/health)
    app.include_router(api_router, prefix="/api")

    # Root welcome endpoint
    @app.get(
        "/",
        response_model=RootResponse,
        summary="API Root Welcome",
        description="Returns basic application status and navigation links to API documentation and health status.",
        status_code=status.HTTP_200_OK,
        tags=["General"],
    )
    def root() -> RootResponse:
        return RootResponse(
            message="Welcome to the VOLTIX Smart Energy Platform API",
            application_name=settings.PROJECT_NAME,
            version=settings.VERSION,
            docs_url="/docs",
            health_url="/api/health",
            status="online",
        )

    # Convenience alias for top-level /health
    @app.get(
        "/health",
        include_in_schema=False,
    )
    def health_redirect():
        from app.api.health import get_health
        from fastapi import Response
        return get_health(Response())

    return app


app = create_application()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
    )
