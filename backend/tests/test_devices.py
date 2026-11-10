from datetime import datetime, timezone
from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.models.device import Device, DeviceType, DeviceStatus


def test_successful_device_registration_simulated(client: TestClient):
    """
    Verify successful registration of a simulated virtual device node.
    Must return HTTP 201 Created and properly formatted response data.
    """
    payload = {
        "device_id": "SIM-NODE-01",
        "name": "Main Solar Infeed Meter",
        "device_type": "SIMULATED",
        "location": "Substation Basement - Bay 3",
        "status": "ONLINE",
        "firmware_version": "2.1.4_STABLE",
    }
    response = client.post("/api/devices", json=payload)
    assert response.status_code == 201
    data = response.json()

    assert isinstance(data["id"], int)
    assert data["device_id"] == "SIM-NODE-01"
    assert data["name"] == "Main Solar Infeed Meter"
    assert data["device_type"] == "SIMULATED"
    assert data["location"] == "Substation Basement - Bay 3"
    assert data["status"] == "ONLINE"
    assert data["firmware_version"] == "2.1.4_STABLE"
    assert "created_at" in data
    assert "updated_at" in data


def test_successful_device_registration_physical(client: TestClient):
    """
    Verify successful registration of a physical hardware device node.
    Must return HTTP 201 Created and maintain explicit PHYSICAL designation.
    """
    payload = {
        "device_id": "PHYS-NODE-01",
        "name": "Grid Interconnect Transformer",
        "device_type": "PHYSICAL",
        "location": "Substation Yard - Feeder 1",
        "status": "ONLINE",
        "firmware_version": "1.0.8_HW",
    }
    response = client.post("/api/devices", json=payload)
    assert response.status_code == 201
    data = response.json()

    assert data["device_id"] == "PHYS-NODE-01"
    assert data["device_type"] == "PHYSICAL"
    assert data["name"] == "Grid Interconnect Transformer"


def test_duplicate_device_rejection(client: TestClient):
    """
    Verify registering a device with an existing device_id is rejected
    with HTTP 409 Conflict.
    """
    payload = {
        "device_id": "SIM-DUP-01",
        "name": "Initial Register Device",
        "device_type": "SIMULATED",
        "location": "Panel A",
        "status": "ONLINE",
    }
    res1 = client.post("/api/devices", json=payload)
    assert res1.status_code == 201

    # Attempt to register the exact same device_id
    duplicate_payload = {
        "device_id": "SIM-DUP-01",
        "name": "Attempted Duplicate Device",
        "device_type": "SIMULATED",
        "location": "Panel B",
        "status": "OFFLINE",
    }
    res2 = client.post("/api/devices", json=duplicate_payload)
    assert res2.status_code == 409
    data = res2.json()
    assert "already exists" in data["detail"]


def test_list_devices(client: TestClient):
    """
    Verify listing devices returns all registered items and supports query filtering.
    """
    # Empty list initially
    res_empty = client.get("/api/devices")
    assert res_empty.status_code == 200
    assert res_empty.json() == []

    # Register 3 distinct devices
    devices_data = [
        {"device_id": "DEV-01", "name": "Simulated Meter 1", "device_type": "SIMULATED", "location": "Building A", "status": "ONLINE"},
        {"device_id": "DEV-02", "name": "Simulated Meter 2", "device_type": "SIMULATED", "location": "Building B", "status": "OFFLINE"},
        {"device_id": "DEV-03", "name": "Physical Gateway", "device_type": "PHYSICAL", "location": "Building A", "status": "UNKNOWN"},
    ]
    for d in devices_data:
        res = client.post("/api/devices", json=d)
        assert res.status_code == 201

    # Fetch all
    res_all = client.get("/api/devices")
    assert res_all.status_code == 200
    all_items = res_all.json()
    assert len(all_items) == 3

    # Filter by device_type=SIMULATED
    res_sim = client.get("/api/devices?device_type=SIMULATED")
    assert res_sim.status_code == 200
    sim_items = res_sim.json()
    assert len(sim_items) == 2
    assert all(d["device_type"] == "SIMULATED" for d in sim_items)

    # Filter by device_type=PHYSICAL
    res_phys = client.get("/api/devices?device_type=PHYSICAL")
    assert res_phys.status_code == 200
    phys_items = res_phys.json()
    assert len(phys_items) == 1
    assert phys_items[0]["device_id"] == "DEV-03"

    # Filter by status=ONLINE
    res_online = client.get("/api/devices?status=ONLINE")
    assert res_online.status_code == 200
    online_items = res_online.json()
    assert len(online_items) == 1
    assert online_items[0]["device_id"] == "DEV-01"

    # Filter by location partial match
    res_loc = client.get("/api/devices?location=Building%20A")
    assert res_loc.status_code == 200
    loc_items = res_loc.json()
    assert len(loc_items) == 2


def test_retrieving_a_device(client: TestClient):
    """
    Verify retrieving a registered device by device_id returns HTTP 200
    and all attributes.
    """
    create_payload = {
        "device_id": "SIM-RETRIEVE-01",
        "name": "Distribution Sub-panel C",
        "device_type": "SIMULATED",
        "location": "Workshop Floor",
        "status": "ONLINE",
        "firmware_version": "2.1.4_STABLE",
    }
    create_res = client.post("/api/devices", json=create_payload)
    assert create_res.status_code == 201

    get_res = client.get("/api/devices/SIM-RETRIEVE-01")
    assert get_res.status_code == 200
    device_data = get_res.json()
    assert device_data["device_id"] == "SIM-RETRIEVE-01"
    assert device_data["name"] == "Distribution Sub-panel C"
    assert device_data["location"] == "Workshop Floor"
    assert device_data["status"] == "ONLINE"
    assert device_data["firmware_version"] == "2.1.4_STABLE"


def test_retrieving_a_missing_device(client: TestClient):
    """
    Verify querying a non-existent device returns HTTP 404 Not Found.
    """
    response = client.get("/api/devices/NON_EXISTENT_ID")
    assert response.status_code == 404
    data = response.json()
    assert "detail" in data
    assert "not found" in data["detail"].lower()


def test_updating_a_device(client: TestClient):
    """
    Verify updating an existing device modifies specified fields and
    updates the updated_at timestamp.
    """
    create_payload = {
        "device_id": "SIM-UPDATE-01",
        "name": "Old Device Name",
        "device_type": "SIMULATED",
        "location": "Old Location",
        "status": "OFFLINE",
        "firmware_version": "1.0.0",
    }
    client.post("/api/devices", json=create_payload)

    update_payload = {
        "name": "Updated Device Name",
        "location": "New Location B",
        "status": "ONLINE",
        "firmware_version": "2.0.0",
    }
    put_res = client.put("/api/devices/SIM-UPDATE-01", json=update_payload)
    assert put_res.status_code == 200
    data = put_res.json()

    assert data["name"] == "Updated Device Name"
    assert data["location"] == "New Location B"
    assert data["status"] == "ONLINE"
    assert data["firmware_version"] == "2.0.0"
    # device_type should remain SIMULATED
    assert data["device_type"] == "SIMULATED"

    # Verify persisted in subsequent GET
    get_res = client.get("/api/devices/SIM-UPDATE-01")
    assert get_res.status_code == 200
    assert get_res.json()["name"] == "Updated Device Name"


def test_updating_a_missing_device(client: TestClient):
    """
    Verify updating a non-existent device returns HTTP 404 Not Found.
    """
    response = client.put("/api/devices/UNKNOWN_DEVICE", json={"name": "New Name"})
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()


def test_deleting_a_device(client: TestClient):
    """
    Verify deleting a device removes it from the database and returns HTTP 200.
    Subsequent lookups must return 404.
    """
    create_payload = {
        "device_id": "SIM-DELETE-01",
        "name": "Device to Delete",
        "device_type": "SIMULATED",
        "location": "Temporary Rack",
        "status": "UNKNOWN",
    }
    client.post("/api/devices", json=create_payload)

    # Perform delete
    del_res = client.delete("/api/devices/SIM-DELETE-01")
    assert del_res.status_code == 200
    del_data = del_res.json()
    assert del_data["device_id"] == "SIM-DELETE-01"
    assert "deleted successfully" in del_data["message"].lower()

    # Confirm subsequent retrieval returns 404
    get_res = client.get("/api/devices/SIM-DELETE-01")
    assert get_res.status_code == 404


def test_deleting_a_missing_device(client: TestClient):
    """
    Verify deleting a non-existent device returns HTTP 404 Not Found.
    """
    response = client.delete("/api/devices/DOES_NOT_EXIST")
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()


def test_device_statistics(client: TestClient):
    """
    Verify GET /api/devices/stats computes total counts and breakdowns
    by device_type and status.
    """
    # Check stats on empty DB
    stats_res0 = client.get("/api/devices/stats")
    assert stats_res0.status_code == 200
    stats0 = stats_res0.json()
    assert stats0["total"] == 0
    assert stats0["by_type"] == {"SIMULATED": 0, "PHYSICAL": 0}
    assert stats0["by_status"] == {"ONLINE": 0, "OFFLINE": 0, "UNKNOWN": 0}

    # Register mixed device fleet:
    # 3 SIMULATED: 2 ONLINE, 1 OFFLINE
    # 2 PHYSICAL: 1 ONLINE, 1 UNKNOWN
    fleet = [
        {"device_id": "S1", "name": "Sim 1", "device_type": "SIMULATED", "location": "L1", "status": "ONLINE"},
        {"device_id": "S2", "name": "Sim 2", "device_type": "SIMULATED", "location": "L2", "status": "ONLINE"},
        {"device_id": "S3", "name": "Sim 3", "device_type": "SIMULATED", "location": "L3", "status": "OFFLINE"},
        {"device_id": "P1", "name": "Phys 1", "device_type": "PHYSICAL", "location": "L4", "status": "ONLINE"},
        {"device_id": "P2", "name": "Phys 2", "device_type": "PHYSICAL", "location": "L5", "status": "UNKNOWN"},
    ]
    for dev in fleet:
        r = client.post("/api/devices", json=dev)
        assert r.status_code == 201

    stats_res = client.get("/api/devices/stats")
    assert stats_res.status_code == 200
    stats = stats_res.json()

    assert stats["total"] == 5
    assert stats["by_type"]["SIMULATED"] == 3
    assert stats["by_type"]["PHYSICAL"] == 2
    assert stats["by_status"]["ONLINE"] == 3
    assert stats["by_status"]["OFFLINE"] == 1
    assert stats["by_status"]["UNKNOWN"] == 1


def test_correct_persistence_in_sqlite(client: TestClient, db_session: Session):
    """
    Verify that registered device records are authentically persisted
    in the underlying SQLite database with all expected columns.
    """
    payload = {
        "device_id": "SIM-PERSIST-01",
        "name": "Persistence Verification Node",
        "device_type": "SIMULATED",
        "location": "Test Bench SQLite",
        "status": "ONLINE",
        "firmware_version": "2.1.4_STABLE",
    }
    post_res = client.post("/api/devices", json=payload)
    assert post_res.status_code == 201

    # 1. ORM inspection directly against SQLite session
    device = db_session.query(Device).filter(Device.device_id == "SIM-PERSIST-01").first()
    assert device is not None
    assert isinstance(device.id, int)
    assert device.device_id == "SIM-PERSIST-01"
    assert device.name == "Persistence Verification Node"
    assert device.device_type == "SIMULATED"
    assert device.location == "Test Bench SQLite"
    assert device.status == "ONLINE"
    assert device.firmware_version == "2.1.4_STABLE"
    assert device.created_at is not None
    assert device.updated_at is not None

    # 2. Raw SQL inspection directly against SQLite
    raw_query = text("SELECT id, device_id, device_type, status, location FROM devices WHERE device_id = :d_id")
    raw_row = db_session.execute(raw_query, {"d_id": "SIM-PERSIST-01"}).fetchone()
    assert raw_row is not None
    assert raw_row[1] == "SIM-PERSIST-01"
    assert raw_row[2] == "SIMULATED"
    assert raw_row[3] == "ONLINE"
    assert raw_row[4] == "Test Bench SQLite"


def test_simulated_never_inferred_as_physical(client: TestClient):
    """
    Constraint check: Never allow a SIMULATED device to be represented
    as a PHYSICAL device through automatic inference.
    If device_type is omitted, it defaults to SIMULATED, never PHYSICAL.
    """
    # Register without device_type
    payload = {
        "device_id": "DEFAULT-TYPE-01",
        "name": "Inference Guard Test Node",
        "location": "Zone C",
        "firmware_version": "HW-LIKE-VERSION-9.9.9",
    }
    response = client.post("/api/devices", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["device_type"] == "SIMULATED"
    assert data["device_type"] != "PHYSICAL"

    # Update metadata - ensure device_type does NOT promote to PHYSICAL
    update_res = client.put(
        "/api/devices/DEFAULT-TYPE-01",
        json={"location": "High Voltage Yard - Primary Incomer"},
    )
    assert update_res.status_code == 200
    assert update_res.json()["device_type"] == "SIMULATED"


def test_validation_rejects_invalid_data(client: TestClient):
    """
    Verify Pydantic validation rejects malformed data with HTTP 422.
    """
    # 1. Missing required fields
    r1 = client.post("/api/devices", json={"name": "Missing ID"})
    assert r1.status_code == 422

    # 2. Blank whitespace device_id
    r2 = client.post(
        "/api/devices",
        json={"device_id": "   ", "name": "Valid Name", "location": "Valid Loc"},
    )
    assert r2.status_code == 422

    # 3. Invalid device_type
    r3 = client.post(
        "/api/devices",
        json={
            "device_id": "BAD-TYPE-01",
            "name": "Valid Name",
            "location": "Valid Loc",
            "device_type": "QUANTUM_SENSOR",
        },
    )
    assert r3.status_code == 422

    # 4. Invalid status
    r4 = client.post(
        "/api/devices",
        json={
            "device_id": "BAD-STATUS-01",
            "name": "Valid Name",
            "location": "Valid Loc",
            "status": "NON_STANDARD_STATE",
        },
    )
    assert r4.status_code == 422


def test_swagger_and_openapi_documentation(client: TestClient):
    """
    Verify all Phase 2 device endpoints are documented in Swagger OpenAPI schema.
    """
    openapi_res = client.get("/openapi.json")
    assert openapi_res.status_code == 200
    openapi = openapi_res.json()

    paths = openapi["paths"]
    assert "/api/devices" in paths
    assert "post" in paths["/api/devices"]
    assert "get" in paths["/api/devices"]

    assert "/api/devices/stats" in paths
    assert "get" in paths["/api/devices/stats"]

    assert "/api/devices/{device_id}" in paths
    assert "get" in paths["/api/devices/{device_id}"]
    assert "put" in paths["/api/devices/{device_id}"]
    assert "delete" in paths["/api/devices/{device_id}"]

    # Verify DeviceResponse schema is registered in OpenAPI components
    schemas = openapi["components"]["schemas"]
    assert "DeviceResponse" in schemas
    assert "DeviceCreate" in schemas
    assert "DeviceUpdate" in schemas
    assert "DeviceStatsResponse" in schemas
