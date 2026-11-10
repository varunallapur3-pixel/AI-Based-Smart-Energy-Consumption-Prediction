import time
from typing import Generator, Tuple, Optional
from sqlalchemy import create_engine, text, Engine, event
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from app.core.config import settings

Base = declarative_base()


@event.listens_for(Engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    """
    Enable SQLite foreign key constraint enforcement on every new database connection.
    By default, SQLite disables foreign keys unless explicitly activated via PRAGMA.
    """
    if hasattr(dbapi_connection, "cursor"):
        cursor = dbapi_connection.cursor()
        try:
            cursor.execute("PRAGMA foreign_keys=ON")
        finally:
            cursor.close()


def get_engine_args(database_url: str) -> dict:
    """
    Build engine arguments compatible with SQLite and prepared for PostgreSQL.
    """
    args = {
        "echo": settings.DB_ECHO,
        "pool_pre_ping": True,
    }
    # SQLite requires check_same_thread=False for multi-threaded FastAPI workers
    if database_url.startswith("sqlite"):
        args["connect_args"] = {"check_same_thread": False}
    return args


# Primary database engine
engine = create_engine(settings.DATABASE_URL, **get_engine_args(settings.DATABASE_URL))

# Session factory for dependencies
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Generator[Session, None, None]:
    """
    FastAPI database session dependency.
    Yields a SQLAlchemy session and ensures clean closure.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db(target_engine: Optional[Engine] = None) -> None:
    """
    Initialize database schema.
    Creates all defined tables if they do not already exist.
    Upgrades legacy Phase 1 device table if necessary.
    """
    # Import all models to ensure metadata registration
    import app.models  # noqa: F401
    from sqlalchemy import inspect

    db_engine = target_engine or engine
    inspector = inspect(db_engine)
    if inspector.has_table("devices"):
        columns = [col["name"] for col in inspector.get_columns("devices")]
        if "device_id" not in columns:
            # Legacy Phase 1 schema without device_id - drop devices to allow recreation with Phase 2 schema
            if inspector.has_table("telemetry_records"):
                db_engine.execute(text("DROP TABLE IF EXISTS telemetry_records"))
            app.models.Device.__table__.drop(bind=db_engine, checkfirst=True)

    # Clean up legacy telemetry_records table if it exists
    if inspector.has_table("telemetry_records") and not inspector.has_table("telemetry"):
        with db_engine.connect() as conn:
            conn.execute(text("DROP TABLE IF EXISTS telemetry_records"))
            conn.commit()

    Base.metadata.create_all(bind=db_engine)


def check_db_connectivity(target_engine: Optional[Engine] = None) -> Tuple[bool, str, Optional[float]]:
    """
    Verify live database connectivity by executing a raw test query.
    Returns:
        (is_connected, status_message, latency_ms)
    """
    db_engine = target_engine or engine
    try:
        start_time = time.perf_counter()
        with db_engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        latency_ms = round((time.perf_counter() - start_time) * 1000, 2)
        return True, "connected", latency_ms
    except Exception as exc:
        return False, f"disconnected: {type(exc).__name__}", None


if __name__ == "__main__":
    print(f"Initializing database schema at: {settings.DATABASE_URL}")
    init_db()
    connected, msg, latency = check_db_connectivity()
    print(f"Database connectivity: {msg} (latency: {latency} ms)")
