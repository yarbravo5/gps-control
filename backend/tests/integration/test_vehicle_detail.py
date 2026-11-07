from datetime import datetime, timezone

from fastapi.testclient import TestClient

from app.api.v1.vehicles import get_wialon_gateway
from app.gateways.wialon.dto import WialonPosition, WialonUnit, WialonUnitDriver
from tests.conftest import ADMIN_EMAIL, ADMIN_PASSWORD, VIEWER_EMAIL, VIEWER_PASSWORD, login


class FakeVehicleDetailGateway:
    def __init__(self, *, drivers=None, unit_exists=True):
        self.drivers = drivers or []
        self.unit_exists = unit_exists
        self.requested_ids = []

    def search_item(self, unit_id):
        self.requested_ids.append(unit_id)
        if not self.unit_exists:
            return None
        timestamp = int(datetime.now(timezone.utc).timestamp())
        return WialonUnit(
            unit_id,
            "Camión norte",
            WialonPosition(timestamp, 4.7, -74.1, 38, 90),
            timestamp,
        )

    def get_unit_drivers_for_all_resources(self, unit_id):
        self.requested_ids.append(unit_id)
        return self.drivers


def test_vehicle_detail_returns_transformed_data_and_linked_driver(client: TestClient):
    gateway = FakeVehicleDetailGateway(
        drivers=[WialonUnitDriver(7, "Ana", "555", 20)]
    )
    client.app.dependency_overrides[get_wialon_gateway] = lambda: gateway
    auth = login(client, VIEWER_EMAIL, VIEWER_PASSWORD)
    headers = {"Authorization": f"Bearer {auth['access_token']}"}

    response = client.get("/api/v1/vehicles/42?resource_id=999", headers=headers)

    assert response.status_code == 200
    payload = response.json()
    assert payload["id"] == 42
    assert payload["status"] == "moving"
    assert payload["direction"] == "E"
    assert payload["drivers"] == [{"id": 7, "name": "Ana", "phone": "555"}]
    assert gateway.requested_ids == [42, 42]
    client.app.dependency_overrides.pop(get_wialon_gateway, None)


def test_vehicle_detail_returns_empty_driver_list_when_unassigned(client: TestClient):
    gateway = FakeVehicleDetailGateway()
    client.app.dependency_overrides[get_wialon_gateway] = lambda: gateway
    auth = login(client, ADMIN_EMAIL, ADMIN_PASSWORD)
    headers = {"Authorization": f"Bearer {auth['access_token']}"}

    response = client.get("/api/v1/vehicles/42", headers=headers)

    assert response.status_code == 200
    assert response.json()["drivers"] == []
    client.app.dependency_overrides.pop(get_wialon_gateway, None)


def test_vehicle_detail_requires_vehicle_read_permission(client: TestClient):
    response = client.get("/api/v1/vehicles/42")
    assert response.status_code == 401


def test_vehicle_detail_returns_not_found_for_inaccessible_or_missing_unit(client: TestClient):
    gateway = FakeVehicleDetailGateway(unit_exists=False)
    client.app.dependency_overrides[get_wialon_gateway] = lambda: gateway
    auth = login(client, ADMIN_EMAIL, ADMIN_PASSWORD)
    headers = {"Authorization": f"Bearer {auth['access_token']}"}

    response = client.get("/api/v1/vehicles/999", headers=headers)

    assert response.status_code == 404
    assert gateway.requested_ids == [999]
    client.app.dependency_overrides.pop(get_wialon_gateway, None)