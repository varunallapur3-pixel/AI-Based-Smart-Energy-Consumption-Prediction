from typing import Optional
from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    """
    Schema representing the system health status response.
    """
    status: str = Field(
        ...,
        description="Overall service health state ('healthy' or 'unhealthy')",
        examples=["healthy"],
    )
    application_name: str = Field(
        ...,
        description="Application name",
        examples=["VOLTIX Smart Energy Platform Backend"],
    )
    backend_version: str = Field(
        ...,
        description="Current backend semantic version",
        examples=["0.1.0"],
    )
    database_connectivity: str = Field(
        ...,
        description="Database connectivity indicator ('connected' or 'disconnected')",
        examples=["connected"],
    )
    database_status: str = Field(
        ...,
        description="Detailed database connection status message",
        examples=["connected"],
    )
    database_latency_ms: Optional[float] = Field(
        None,
        description="Database probe round-trip latency in milliseconds",
        examples=[1.42],
    )
    environment: str = Field(
        ...,
        description="Environment mode ('development', 'staging', 'production')",
        examples=["development"],
    )
