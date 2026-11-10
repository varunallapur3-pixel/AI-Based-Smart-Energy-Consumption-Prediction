from unittest.mock import patch
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from app.core.config import settings
from app.core.database import check_db_connectivity


def test_backend_starts_and_root_responds(client: TestClient):
    """
    Verify backend starts successfully and GET / responds correctly.
    """
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "message" in data
    assert "VOLTIX" in data["message"]
    assert data["application_name"] == settings.PROJECT_NAME
    assert data["version"] == settings.VERSION
    assert data["docs_url"] == "/docs"
    assert data["health_url"] == "/api/health"
    assert data["status"] == "online"


def test_health_endpoint_healthy(client: TestClient):
    """
    Verify GET /api/health responds correctly with healthy status
    and active database connectivity.
    """
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()

    assert data["status"] == "healthy"
    assert data["application_name"] == settings.PROJECT_NAME
    assert data["backend_version"] == settings.VERSION
    assert data["database_connectivity"] == "connected"
    assert data["database_status"] == "connected"
    assert isinstance(data["database_latency_ms"], (int, float))
    assert data["database_latency_ms"] >= 0


def test_database_connectivity_direct_check():
    """
    Verify direct database connectivity probe returns accurate status and timing.
    """
    is_connected, status_msg, latency_ms = check_db_connectivity()
    assert is_connected is True
    assert status_msg == "connected"
    assert latency_ms is not None
    assert latency_ms >= 0


def test_invalid_database_engine_direct_check():
    """
    Verify an invalid/broken database configuration does not report connected.
    """
    # Create an invalid engine with non-existent unreachable database path
    invalid_engine = create_engine("sqlite:////non_existent_path_xyz123/unwritable/broken.db")
    is_connected, status_msg, latency_ms = check_db_connectivity(invalid_engine)

    assert is_connected is False
    assert "disconnected" in status_msg
    assert latency_ms is None


def test_health_endpoint_reports_unhealthy_when_database_fails(client: TestClient):
    """
    Verify GET /api/health does NOT falsely report healthy when DB check fails.
    Must return HTTP 503 and status 'unhealthy'.
    """
    with patch("app.api.health.check_db_connectivity") as mock_check:
        mock_check.return_value = (False, "disconnected: OperationalError", None)

        response = client.get("/api/health")
        assert response.status_code == 503
        data = response.json()

        assert data["status"] == "unhealthy"
        assert data["database_connectivity"] == "disconnected"
        assert "disconnected" in data["database_status"]
        assert data["database_latency_ms"] is None


def test_swagger_and_openapi_docs(client: TestClient):
    """
    Verify Swagger UI docs (/docs) and OpenAPI JSON schema (/openapi.json) are accessible.
    """
    docs_response = client.get("/docs")
    assert docs_response.status_code == 200
    assert "text/html" in docs_response.headers.get("content-type", "")

    openapi_response = client.get("/openapi.json")
    assert openapi_response.status_code == 200
    openapi_data = openapi_response.json()
    assert "openapi" in openapi_data
    assert openapi_data["info"]["title"] == settings.PROJECT_NAME


def test_cors_development_headers(client: TestClient):
    """
    Verify development CORS allows requests originating from Vite frontend (ports 3000, 5173).
    """
    for origin in ["http://localhost:3000", "http://localhost:5173"]:
        response = client.get(
            "/api/health",
            headers={"Origin": origin},
        )
        assert response.status_code == 200
        assert response.headers.get("access-control-allow-origin") == origin
