import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from fastapi.testclient import TestClient

from app.main import app
from app.core.database import Base, get_db

# Isolated in-memory SQLite database dedicated exclusively to automated tests
TEST_DATABASE_URL = "sqlite://"

test_engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


def override_get_db():
    """
    FastAPI database dependency override targeting the isolated test database.
    """
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(autouse=True)
def setup_and_teardown_test_database():
    """
    Recreates all tables prior to each test to guarantee complete test isolation.
    Guarantees development database (voltix.db) is untouched during testing.
    """
    Base.metadata.create_all(bind=test_engine)
    yield
    Base.metadata.drop_all(bind=test_engine)


@pytest.fixture
def db_session():
    """
    Yields an active database session bound to the isolated test database
    for direct database inspection and persistence verification.
    """
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture
def client():
    """
    FastAPI HTTP test client fixture using Starlette/HTTPX.
    """
    with TestClient(app) as test_client:
        yield test_client
