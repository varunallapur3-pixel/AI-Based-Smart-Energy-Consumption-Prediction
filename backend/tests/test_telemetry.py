import math
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.models.telemetry import Telemetry
from app.services.energy_calculator import calculate_trapezoidal_energy


def _register_device(client: TestClient, device_id: str = "SIM-METER-01", device_type: str = "SIMULATED") -> dict:
    """Helper fixture to register a test device."""
    payload = {
        "device_id": device_id,
        "name": f"Test Node {device_id}",
        "device_type": device_type,
        "location": "Test Laboratory Bay",
        "status": "ONLINE",
        "firmware_version": "2.1.4_STABLE",
    }
    res = client.post("/api/devices", json=payload)
    assert res.status_code == 201
    return res.json()


# ==============================================================================
# 1. Telemetry Ingestion Tests
# ==============================================================================

def test_successful_telemetry_ingestion(client: TestClient):
    """
    Verify POST /api/telemetry ingests a valid reading, stores it,
    and returns HTTP 201 with verified source_type and updated device last_seen.
    """
    _register_device(client, device_id="SIM-INGEST-01", device_type="SIMULATED")

    payload = {
        "device_id": "SIM-INGEST-01",
        "voltage_v": 230.4,
        "current_a": 5.25,
        "power_w": 1150.0,
        "power_factor": 0.95,
        "frequency_hz": 50.02,
        "energy_kwh": 3.45,
        "source_type": "SIMULATED",
    }
    response = client.post("/api/telemetry", json=payload)
    assert response.status_code == 201
    data = response.json()

    assert isinstance(data["id"], int)
    assert data["device_id"] == "SIM-INGEST-01"
    assert data["voltage_v"] == 230.4
    assert data["current_a"] == 5.25
    assert data["power_w"] == 1150.0
    assert data["power_factor"] == 0.95
    assert data["frequency_hz"] == 50.02
    assert data["energy_kwh"] == 3.45
    assert data["source_type"] == "SIMULATED"
    assert "timestamp" in data

    # Verify device last_seen was updated
    dev_res = client.get("/api/devices/SIM-INGEST-01")
    assert dev_res.status_code == 200
    assert dev_res.json()["last_seen"] is not None


def test_telemetry_ingestion_rejects_missing_device(client: TestClient):
    """
    Verify POST /api/telemetry returns HTTP 404 if the target device does not exist.
    """
    payload = {
        "device_id": "NON_EXISTENT_DEVICE",
        "voltage_v": 230.0,
        "current_a": 4.0,
        "power_w": 920.0,
    }
    response = client.post("/api/telemetry", json=payload)
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()


def test_telemetry_ingestion_rejects_negative_values(client: TestClient):
    """
    Verify POST /api/telemetry rejects negative voltage, current, power, frequency, or energy.
    """
    _register_device(client, device_id="SIM-NEG-01")

    # 1. Negative voltage
    r1 = client.post("/api/telemetry", json={"device_id": "SIM-NEG-01", "voltage_v": -230.0, "current_a": 1.0, "power_w": 230.0})
    assert r1.status_code == 422

    # 2. Negative current
    r2 = client.post("/api/telemetry", json={"device_id": "SIM-NEG-01", "voltage_v": 230.0, "current_a": -2.0, "power_w": 230.0})
    assert r2.status_code == 422

    # 3. Negative power
    r3 = client.post("/api/telemetry", json={"device_id": "SIM-NEG-01", "voltage_v": 230.0, "current_a": 1.0, "power_w": -100.0})
    assert r3.status_code == 422

    # 4. Negative frequency
    r4 = client.post("/api/telemetry", json={"device_id": "SIM-NEG-01", "voltage_v": 230.0, "current_a": 1.0, "power_w": 230.0, "frequency_hz": -50.0})
    assert r4.status_code == 422


def test_telemetry_ingestion_rejects_non_finite_values(client: TestClient):
    """
    Verify POST /api/telemetry rejects non-finite values (NaN, Infinity, -Infinity).
    """
    _register_device(client, device_id="SIM-FINITE-01")

    for bad_val in ["NaN", "Infinity", "-Infinity"]:
        res = client.post(
            "/api/telemetry",
            json={
                "device_id": "SIM-FINITE-01",
                "voltage_v": bad_val,
                "current_a": 1.0,
                "power_w": 230.0,
            },
        )
        assert res.status_code == 422


def test_telemetry_power_factor_validation(client: TestClient):
    """
    Verify power factor is strictly validated between 0.0 and 1.0 inclusive.
    """
    _register_device(client, device_id="SIM-PF-01")

    # PF > 1.0 -> 422
    r_high = client.post(
        "/api/telemetry",
        json={"device_id": "SIM-PF-01", "voltage_v": 230.0, "current_a": 1.0, "power_w": 230.0, "power_factor": 1.05},
    )
    assert r_high.status_code == 422

    # PF < 0.0 -> 422
    r_low = client.post(
        "/api/telemetry",
        json={"device_id": "SIM-PF-01", "voltage_v": 230.0, "current_a": 1.0, "power_w": 230.0, "power_factor": -0.05},
    )
    assert r_low.status_code == 422

    # PF boundary values (0.0 and 1.0) -> Valid 201
    r_zero = client.post(
        "/api/telemetry",
        json={"device_id": "SIM-PF-01", "voltage_v": 230.0, "current_a": 1.0, "power_w": 0.0, "power_factor": 0.0},
    )
    assert r_zero.status_code == 201
    assert r_zero.json()["power_factor"] == 0.0

    r_one = client.post(
        "/api/telemetry",
        json={"device_id": "SIM-PF-01", "voltage_v": 230.0, "current_a": 1.0, "power_w": 230.0, "power_factor": 1.0},
    )
    assert r_one.status_code == 201
    assert r_one.json()["power_factor"] == 1.0


def test_simulated_device_cannot_claim_physical_telemetry(client: TestClient):
    """
    Strict rule: Never label simulated readings as genuine hardware data.
    Never automatically convert SIMULATED to PHYSICAL.
    """
    _register_device(client, device_id="SIM-GUARD-01", device_type="SIMULATED")

    # Sending source_type="PHYSICAL" for a SIMULATED device must be rejected
    res = client.post(
        "/api/telemetry",
        json={
            "device_id": "SIM-GUARD-01",
            "voltage_v": 230.0,
            "current_a": 2.0,
            "power_w": 460.0,
            "source_type": "PHYSICAL",
        },
    )
    assert res.status_code == 422
    assert "cannot label reading as physical" in res.json()["detail"].lower()

    # When source_type is omitted, it defaults to SIMULATED, never PHYSICAL
    res_default = client.post(
        "/api/telemetry",
        json={
            "device_id": "SIM-GUARD-01",
            "voltage_v": 230.0,
            "current_a": 2.0,
            "power_w": 460.0,
        },
    )
    assert res_default.status_code == 201
    assert res_default.json()["source_type"] == "SIMULATED"


def test_physical_device_telemetry_ingestion(client: TestClient):
    """
    Verify physical devices accept and persist readings with source_type PHYSICAL.
    """
    _register_device(client, device_id="PHYS-METER-01", device_type="PHYSICAL")

    res = client.post(
        "/api/telemetry",
        json={
            "device_id": "PHYS-METER-01",
            "voltage_v": 229.5,
            "current_a": 10.2,
            "power_w": 2315.0,
            "source_type": "PHYSICAL",
        },
    )
    assert res.status_code == 201
    assert res.json()["source_type"] == "PHYSICAL"


# ==============================================================================
# 2. Telemetry Retrieval Tests
# ==============================================================================

def test_list_telemetry_and_filtering(client: TestClient):
    """
    Verify GET /api/telemetry supports listing, device filtering, source_type filtering,
    time-range limits, and pagination.
    """
    _register_device(client, device_id="DEV-LIST-A", device_type="SIMULATED")
    _register_device(client, device_id="DEV-LIST-B", device_type="PHYSICAL")

    base_time = datetime(2026, 11, 10, 10, 0, 0, tzinfo=timezone.utc)

    # Ingest 3 readings for DEV-LIST-A
    for i in range(3):
        client.post(
            "/api/telemetry",
            json={
                "device_id": "DEV-LIST-A",
                "voltage_v": 230.0 + i,
                "current_a": 2.0,
                "power_w": 460.0,
                "timestamp": (base_time + timedelta(minutes=i * 5)).isoformat(),
            },
        )

    # Ingest 2 readings for DEV-LIST-B
    for i in range(2):
        client.post(
            "/api/telemetry",
            json={
                "device_id": "DEV-LIST-B",
                "voltage_v": 220.0,
                "current_a": 1.0,
                "power_w": 220.0,
                "source_type": "PHYSICAL",
                "timestamp": (base_time + timedelta(minutes=i * 10)).isoformat(),
            },
        )

    # 1. Total count
    res_all = client.get("/api/telemetry")
    assert res_all.status_code == 200
    assert len(res_all.json()) == 5

    # 2. Filter by device_id
    res_dev_a = client.get("/api/telemetry?device_id=DEV-LIST-A")
    assert res_dev_a.status_code == 200
    assert len(res_dev_a.json()) == 3
    assert all(r["device_id"] == "DEV-LIST-A" for r in res_dev_a.json())

    # 3. Filter by source_type
    res_phys = client.get("/api/telemetry?source_type=PHYSICAL")
    assert res_phys.status_code == 200
    assert len(res_phys.json()) == 2

    # 4. Filter by start_time and end_time
    start_filter = (base_time + timedelta(minutes=4)).isoformat()
    end_filter = (base_time + timedelta(minutes=11)).isoformat()
    res_range = client.get("/api/telemetry", params={"start_time": start_filter, "end_time": end_filter})
    assert res_range.status_code == 200
    # Expected: DEV-LIST-A at +5m, +10m, and DEV-LIST-B at +10m = 3 readings
    assert len(res_range.json()) == 3

    # 5. Pagination: limit=2, skip=1
    res_page = client.get("/api/telemetry?limit=2&skip=1")
    assert res_page.status_code == 200
    assert len(res_page.json()) == 2


def test_get_telemetry_reading_by_id(client: TestClient):
    """
    Verify GET /api/telemetry/{reading_id} returns the specific reading or 404.
    """
    _register_device(client, device_id="SIM-READING-01")

    post_res = client.post(
        "/api/telemetry",
        json={
            "device_id": "SIM-READING-01",
            "voltage_v": 231.0,
            "current_a": 3.0,
            "power_w": 693.0,
        },
    )
    reading_id = post_res.json()["id"]

    # Valid ID
    get_res = client.get(f"/api/telemetry/{reading_id}")
    assert get_res.status_code == 200
    assert get_res.json()["id"] == reading_id
    assert get_res.json()["voltage_v"] == 231.0

    # Non-existent ID -> 404
    missing_res = client.get("/api/telemetry/999999")
    assert missing_res.status_code == 404
    assert "not found" in missing_res.json()["detail"].lower()


def test_get_device_telemetry(client: TestClient):
    """
    Verify GET /api/devices/{device_id}/telemetry returns historical readings for a device.
    """
    _register_device(client, device_id="SIM-HIST-01")

    for i in range(3):
        client.post(
            "/api/telemetry",
            json={
                "device_id": "SIM-HIST-01",
                "voltage_v": 230.0,
                "current_a": float(i + 1),
                "power_w": float((i + 1) * 230),
            },
        )

    res = client.get("/api/devices/SIM-HIST-01/telemetry")
    assert res.status_code == 200
    assert len(res.json()) == 3

    # Missing device -> 404
    res_missing = client.get("/api/devices/NON_EXISTENT_DEV/telemetry")
    assert res_missing.status_code == 404


# ==============================================================================
# 3. Energy Calculations (Trapezoidal Integration)
# ==============================================================================

def test_trapezoidal_integration_mathematical_precision():
    """
    Verify trapezoidal integration numerical accuracy:
    Energy (kWh) = average power (W) * elapsed seconds / 3,600,000.
    """
    t0 = datetime(2026, 11, 10, 12, 0, 0, tzinfo=timezone.utc)

    # Case 1: Constant 1,000 W over 1 hour (3600s) -> exactly 1.0 kWh
    readings_constant = [
        {"timestamp": t0, "power_w": 1000.0},
        {"timestamp": t0 + timedelta(hours=1), "power_w": 1000.0},
    ]
    res1 = calculate_trapezoidal_energy(readings_constant, max_gap_seconds=3600.0)
    assert res1.total_energy_kwh == 1.0
    assert res1.valid_intervals_count == 1
    assert res1.skipped_intervals_count == 0

    # Case 2: Linear ramp from 500 W to 1,500 W over 1 hour -> average 1000 W -> 1.0 kWh
    readings_ramp = [
        {"timestamp": t0, "power_w": 500.0},
        {"timestamp": t0 + timedelta(hours=1), "power_w": 1500.0},
    ]
    res2 = calculate_trapezoidal_energy(readings_ramp, max_gap_seconds=3600.0)
    assert res2.total_energy_kwh == 1.0

    # Case 3: Irregular intervals
    # Interval 1: 0 to 1800s (0.5h), 1000W to 2000W (avg 1500W) -> 1500 * 1800 / 3.6e6 = 0.75 kWh
    # Interval 2: 1800s to 5400s (1.0h), 2000W to 2000W (avg 2000W) -> 2000 * 3600 / 3.6e6 = 2.0 kWh
    # Total = 2.75 kWh
    readings_irregular = [
        {"timestamp": t0, "power_w": 1000.0},
        {"timestamp": t0 + timedelta(seconds=1800), "power_w": 2000.0},
        {"timestamp": t0 + timedelta(seconds=5400), "power_w": 2000.0},
    ]
    res3 = calculate_trapezoidal_energy(readings_irregular, max_gap_seconds=4000.0)
    assert res3.total_energy_kwh == 2.75
    assert res3.valid_intervals_count == 2

    # Case 4: Gap handling (outage/missing telemetry)
    # Gap exceeds max_gap_seconds (300s) -> skipped
    readings_with_gap = [
        {"timestamp": t0, "power_w": 1000.0},
        {"timestamp": t0 + timedelta(seconds=100), "power_w": 1000.0},  # dt=100s, valid
        {"timestamp": t0 + timedelta(seconds=2000), "power_w": 1000.0}, # dt=1900s > 300s -> gap skipped
        {"timestamp": t0 + timedelta(seconds=2100), "power_w": 1000.0}, # dt=100s, valid
    ]
    res4 = calculate_trapezoidal_energy(readings_with_gap, max_gap_seconds=300.0)
    # Energy from interval 1: 1000 * 100 / 3.6e6 = 0.027778 kWh
    # Energy from interval 3: 1000 * 100 / 3.6e6 = 0.027778 kWh
    # Total: ~0.055556 kWh
    assert math.isclose(res4.total_energy_kwh, 0.055556, rel_tol=1e-4)
    assert res4.valid_intervals_count == 2
    assert res4.skipped_intervals_count == 1
    assert "not an ANSI C12.20" in res4.disclaimer


def test_device_energy_api(client: TestClient):
    """
    Verify GET /api/devices/{device_id}/energy calculates integrated kWh over stored telemetry.
    """
    _register_device(client, device_id="SIM-ENERGY-API-01")

    base_time = datetime(2026, 11, 10, 8, 0, 0, tzinfo=timezone.utc)
    # Ingest 3 readings: 0s (1000W), 100s (2000W), 200s (2000W)
    for i, (dt, p) in enumerate([(0, 1000.0), (100, 2000.0), (200, 2000.0)]):
        client.post(
            "/api/telemetry",
            json={
                "device_id": "SIM-ENERGY-API-01",
                "voltage_v": 230.0,
                "current_a": p / 230.0,
                "power_w": p,
                "timestamp": (base_time + timedelta(seconds=dt)).isoformat(),
            },
        )

    res = client.get("/api/devices/SIM-ENERGY-API-01/energy")
    assert res.status_code == 200
    data = res.json()

    assert data["device_id"] == "SIM-ENERGY-API-01"
    assert data["samples_count"] == 3
    assert data["valid_intervals_count"] == 2
    assert data["skipped_intervals_count"] == 0
    assert data["total_energy_kwh"] > 0.0
    assert "Trapezoidal numerical integration" in data["calculation_method"]
    assert "meter-certified measurement" in data["disclaimer"].lower()

    # Missing device -> 404
    missing_res = client.get("/api/devices/NON_EXISTENT_DEV/energy")
    assert missing_res.status_code == 404


# ==============================================================================
# 4. Virtual Telemetry Simulator Tests
# ==============================================================================

def test_virtual_telemetry_simulator_single_reading(client: TestClient):
    """
    Verify POST /api/telemetry/simulate/{device_id} generates realistic synthetic telemetry
    for a registered SIMULATED device.
    """
    _register_device(client, device_id="SIM-VIRT-01", device_type="SIMULATED")

    res = client.post("/api/telemetry/simulate/SIM-VIRT-01")
    assert res.status_code == 201
    data = res.json()

    assert data["device_id"] == "SIM-VIRT-01"
    assert data["generated_count"] == 1
    reading = data["readings"][0]

    # Verify realistic AC electrical limits
    assert 218.0 <= reading["voltage_v"] <= 242.0
    assert reading["current_a"] > 0.0
    assert reading["power_w"] > 0.0
    assert 0.80 <= reading["power_factor"] <= 1.0
    assert 49.0 <= reading["frequency_hz"] <= 51.0
    assert reading["source_type"] == "SIMULATED"


def test_simulator_strictly_rejects_physical_devices(client: TestClient):
    """
    Strict rule: Never pretend a virtual device is real hardware, and
    never generate simulated readings for physical hardware devices.
    """
    _register_device(client, device_id="PHYS-HARDWARE-01", device_type="PHYSICAL")

    res = client.post("/api/telemetry/simulate/PHYS-HARDWARE-01")
    assert res.status_code == 400
    assert "physical" in res.json()["detail"].lower()


def test_simulator_batch_generation(client: TestClient):
    """
    Verify batch simulation generates N timestamped readings with progressive energy integration.
    """
    _register_device(client, device_id="SIM-BATCH-01", device_type="SIMULATED")

    res = client.post("/api/telemetry/simulate/SIM-BATCH-01?count=5&interval_seconds=2.0")
    assert res.status_code == 201
    data = res.json()

    assert data["generated_count"] == 5
    readings = data["readings"]
    assert len(readings) == 5

    # Check timestamps and energy progression
    for i in range(1, len(readings)):
        prev_ts = datetime.fromisoformat(readings[i - 1]["timestamp"])
        curr_ts = datetime.fromisoformat(readings[i]["timestamp"])
        assert curr_ts > prev_ts
        # Energy must accumulate
        if readings[i]["energy_kwh"] is not None and readings[i - 1]["energy_kwh"] is not None:
            assert readings[i]["energy_kwh"] >= readings[i - 1]["energy_kwh"]


# ==============================================================================
# 5. SQLite Persistence Verification
# ==============================================================================

def test_telemetry_sqlite_persistence_direct_verification(client: TestClient, db_session: Session):
    """
    Direct verification of SQLite database records via ORM and raw SQL.
    """
    _register_device(client, device_id="SIM-SQLITE-01")

    payload = {
        "device_id": "SIM-SQLITE-01",
        "voltage_v": 232.1,
        "current_a": 6.12,
        "power_w": 1350.5,
        "power_factor": 0.95,
        "frequency_hz": 50.01,
        "energy_kwh": 4.12,
        "source_type": "SIMULATED",
    }
    post_res = client.post("/api/telemetry", json=payload)
    assert post_res.status_code == 201
    reading_id = post_res.json()["id"]

    # 1. ORM inspection
    rec = db_session.query(Telemetry).filter(Telemetry.id == reading_id).first()
    assert rec is not None
    assert rec.device_id == "SIM-SQLITE-01"
    assert rec.voltage_v == 232.1
    assert rec.current_a == 6.12
    assert rec.power_w == 1350.5
    assert rec.source_type == "SIMULATED"

    # 2. Raw SQL inspection
    raw = db_session.execute(
        text("SELECT id, device_id, voltage_v, power_w, source_type FROM telemetry WHERE id = :r_id"),
        {"r_id": reading_id},
    ).fetchone()
    assert raw is not None
    assert raw[1] == "SIM-SQLITE-01"
    assert raw[2] == 232.1
    assert raw[3] == 1350.5
    assert raw[4] == "SIMULATED"


# ==============================================================================
# 6. Phase 3 Audit & Integrity Tests
# ==============================================================================

def test_sqlite_foreign_key_enforcement(db_session: Session):
    """
    Audit Item 4: Verify SQLite foreign key constraint is active and enforced.
    Direct SQL/ORM insertion with non-existent foreign key must fail with IntegrityError.
    """
    import pytest
    from sqlalchemy.exc import IntegrityError

    invalid_reading = Telemetry(
        device_id="NON_EXISTENT_FOREIGN_KEY_DEVICE",
        voltage_v=230.0,
        current_a=1.0,
        power_w=230.0,
        source_type="SIMULATED",
    )
    db_session.add(invalid_reading)
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()


def test_cascade_delete_device_removes_telemetry(client: TestClient, db_session: Session):
    """
    Audit Item 4: Verify deleting a registered device cascades and cleanly removes
    all associated telemetry records from SQLite.
    """
    _register_device(client, device_id="SIM-CASCADE-DEV")

    # Ingest 3 telemetry records
    for i in range(3):
        client.post(
            "/api/telemetry",
            json={
                "device_id": "SIM-CASCADE-DEV",
                "voltage_v": 230.0,
                "current_a": 2.0,
                "power_w": 460.0,
            },
        )

    # Verify records exist
    count_before = db_session.query(Telemetry).filter(Telemetry.device_id == "SIM-CASCADE-DEV").count()
    assert count_before == 3

    # Delete the device via API
    del_res = client.delete("/api/devices/SIM-CASCADE-DEV")
    assert del_res.status_code == 200

    # Verify telemetry records were cascade deleted
    count_after = db_session.query(Telemetry).filter(Telemetry.device_id == "SIM-CASCADE-DEV").count()
    assert count_after == 0


def test_timezone_aware_and_dst_input_handling(client: TestClient):
    """
    Audit Item 3: Verify UTC normalization and chronological sorting across
    different timezone-offset inputs (e.g. IST +05:30, EDT -04:00, UTC Z).
    """
    _register_device(client, device_id="SIM-TZ-AUDIT")

    # Reading 1: 10:00:00 UTC represented in IST (+05:30) as 15:30:00
    r1 = client.post(
        "/api/telemetry",
        json={
            "device_id": "SIM-TZ-AUDIT",
            "voltage_v": 230.0,
            "current_a": 4.348,
            "power_w": 1000.0,
            "timestamp": "2026-11-10T15:30:00+05:30",
        },
    )
    assert r1.status_code == 201

    # Reading 2: 11:00:00 UTC (1 hour later) represented in EDT (-04:00) as 07:00:00
    r2 = client.post(
        "/api/telemetry",
        json={
            "device_id": "SIM-TZ-AUDIT",
            "voltage_v": 230.0,
            "current_a": 4.348,
            "power_w": 1000.0,
            "timestamp": "2026-11-10T07:00:00-04:00",
        },
    )
    assert r2.status_code == 201

    # Reading 3: 12:00:00 UTC (another 1 hour later) in UTC Z
    r3 = client.post(
        "/api/telemetry",
        json={
            "device_id": "SIM-TZ-AUDIT",
            "voltage_v": 230.0,
            "current_a": 4.348,
            "power_w": 1000.0,
            "timestamp": "2026-11-10T12:00:00Z",
        },
    )
    assert r3.status_code == 201

    # Calculate energy over these 3 points (total 2 hours at constant 1000 W = 2.0 kWh)
    energy_res = client.get("/api/devices/SIM-TZ-AUDIT/energy", params={"max_gap_seconds": 3600.0})
    assert energy_res.status_code == 200
    data = energy_res.json()

    assert data["samples_count"] == 3
    assert data["valid_intervals_count"] == 2
    assert data["skipped_intervals_count"] == 0
    # Exactly 2 hours at 1,000 W = 2.0 kWh
    assert math.isclose(data["total_energy_kwh"], 2.0, rel_tol=1e-4)


def test_out_of_order_and_duplicate_timestamps_handling():
    """
    Audit Item 5: Verify energy calculation handles out-of-order readings and duplicate timestamps.
    """
    t0 = datetime(2026, 11, 10, 10, 0, 0, tzinfo=timezone.utc)

    # Shuffled readings containing a duplicate timestamp
    shuffled_readings = [
        {"timestamp": t0 + timedelta(seconds=200), "power_w": 1000.0},
        {"timestamp": t0, "power_w": 1000.0},
        {"timestamp": t0 + timedelta(seconds=100), "power_w": 1000.0},
        {"timestamp": t0 + timedelta(seconds=100), "power_w": 1000.0}, # duplicate!
    ]

    res = calculate_trapezoidal_energy(shuffled_readings, max_gap_seconds=300.0)
    assert res.samples_count == 4
    # Valid intervals: (0s -> 100s, dt=100s) and (100s -> 200s, dt=100s) = 2 intervals
    assert res.valid_intervals_count == 2
    # Duplicate (100s -> 100s, dt=0s) must be counted as skipped
    assert res.skipped_intervals_count == 1
    # 200s at 1000W = 1000 * 200 / 3.6e6 = 0.055556 kWh
    assert math.isclose(res.total_energy_kwh, 0.055556, rel_tol=1e-4)


def test_physical_device_ingestion_unauthenticated_gap_documented(client: TestClient):
    """
    Audit Item 2: Verify whether PHYSICAL devices can submit telemetry without authentication.
    Documents the security gap that POST /api/telemetry currently has no node auth / token check.
    """
    _register_device(client, device_id="PHYS-NOAUTH-01", device_type="PHYSICAL")

    # Ingest physical telemetry without any Authorization header or token
    res = client.post(
        "/api/telemetry",
        json={
            "device_id": "PHYS-NOAUTH-01",
            "voltage_v": 230.0,
            "current_a": 5.0,
            "power_w": 1150.0,
            "source_type": "PHYSICAL",
        },
    )
    # Documents that physical ingestion currently succeeds unauthenticated
    assert res.status_code == 201
    assert res.json()["source_type"] == "PHYSICAL"
