from pydantic import BaseModel, Field


class RootResponse(BaseModel):
    """
    Schema for the root welcome endpoint response.
    """
    message: str = Field(
        ...,
        description="Welcome message",
        examples=["Welcome to the VOLTIX Smart Energy Platform API"],
    )
    application_name: str = Field(
        ...,
        description="Application name",
        examples=["VOLTIX Smart Energy Platform Backend"],
    )
    version: str = Field(
        ...,
        description="Backend version",
        examples=["0.1.0"],
    )
    docs_url: str = Field(
        ...,
        description="Interactive Swagger UI endpoint path",
        examples=["/docs"],
    )
    health_url: str = Field(
        ...,
        description="System health check endpoint path",
        examples=["/api/health"],
    )
    status: str = Field(
        default="online",
        description="Service status indicator",
        examples=["online"],
    )
