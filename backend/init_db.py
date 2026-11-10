"""
CLI utility to initialize the VOLTIX database schema independently.
Usage:
    python init_db.py
"""

import sys
from pathlib import Path

# Add backend directory to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent))

from app.core.config import settings
from app.core.database import init_db, check_db_connectivity


def main():
    print("=" * 60)
    print("VOLTIX Smart Energy Platform - Database Initialization")
    print("=" * 60)
    print(f"Target Database URL: {settings.DATABASE_URL}")
    print("Creating tables...")
    try:
        init_db()
        print("Schema creation complete.")
        connected, msg, latency = check_db_connectivity()
        print(f"Connectivity check: {msg} (probe latency: {latency} ms)")
        if connected:
            print("[SUCCESS] Database is ready for VOLTIX operations.")
            sys.exit(0)
        else:
            print("[ERROR] Database connectivity check failed.")
            sys.exit(1)
    except Exception as exc:
        print(f"[FAILED] Error initializing database: {exc}")
        sys.exit(1)


if __name__ == "__main__":
    main()
