from datetime import datetime, timezone

from fastapi.testclient import TestClient

from app.api.v1.vehicles import get_wialon_gateway
from app.gateways.wialon.dto import (
    WialonCustomField,
    WialonPosition,
    WialonResourceSearchResult,
    WialonUnit,
)
from tests.conftest import (
    OPERATOR_EMAIL,
    OPERATOR_PASSWORD,
    VIEWER_EMAIL,
    VIEWER_PASSWORD,
    login,
)


class FakeVehicleCustomFieldsGateway:
    def __init__(self, fields=None, *, has_custom_fields=True):
        self.fields = {field.id: field for field in (fields or [])}
        self.has_custom_fields = has_custom_fields
        self.calls = []
        self._next_id = max(self.fields, default=0) + 1

    def search_item(self, unit_id):
        timestamp = int(datetime.now(timezone.utc).timestamp())
        available = {"id", "nm", "pos", "lmsg"}
        if self.has_custom_fields:
            available.add("flds")
        return WialonUnit(
            unit_id,
            "Camión norte",
            WialonPosition(timestamp, 4.7, -74.1, 38, 90),
            timestamp,
            custom_fields=tuple(self.fields.values()),
            available_fields=frozenset(available),
        )

    def get_unit_drivers_for_all_resources(self, unit_id):
        return []

    def search_resources(self, offset, limit):
        return WialonResourceSearchResult([], 0)

    def update_unit_custom_field(
        self, unit_id, *, field_id, call_mode, name=None, value=None
    ):
        self.calls.append((unit_id, field_id, call_mode, name, value))
        if call_mode == "delete":
            self.fields.pop(field_id, None)
        elif call_mode == "create":
            self.fields[self._next_id] = WialonCustomField(
                self._next_id, name or "", value or ""
            )
            self._next_id += 1
        elif call_mode == "update":
            self.fields[field_id] = WialonCustomField(
                field_id, name or "", value or ""
            )


def _headers(client: TestClient, email: str, password: str) -> dict[str, str]:
    auth = login(client, email, password)
    return {"Authorization": f"Bearer {auth['access_token']}"}


def test_operator_can_create_update_and_delete_vehicle_custom_fields(client: TestClient):
    gateway = FakeVehicleCustomFieldsGateway([
        WialonCustomField(5, "Placa", "ABC123"),
        WialonCustomField(6, "Odometro", "1200"),
    ])
    client.app.dependency_overrides[get_wialon_gateway] = lambda: gateway
    headers = _headers(client, OPERATOR_EMAIL, OPERATOR_PASSWORD)

    response = client.patch(
        "/api/v1/vehicles/42/custom-fields",
        json={
            "fields": [
                {"id": 5, "name": "Placa", "value": "XYZ789"},
                {"name": "Color", "value": "Rojo"},
            ],
            "remove_field_ids": [6],
        },
        headers=headers,
    )

    assert response.status_code == 200
    payload = response.json()
    assert {(item["id"], item["name"], item["value"]) for item in payload["custom_fields"]} == {
        (5, "Placa", "XYZ789"),
        (7, "Color", "Rojo"),
    }
    assert gateway.calls == [
        (42, 6, "delete", None, None),
        (42, 5, "update", "Placa", "XYZ789"),
        (42, 0, "create", "Color", "Rojo"),
    ]
    client.app.dependency_overrides.pop(get_wialon_gateway, None)


def test_viewer_cannot_edit_vehicle_custom_fields(client: TestClient):
    gateway = FakeVehicleCustomFieldsGateway([WialonCustomField(5, "Placa", "ABC123")])
    client.app.dependency_overrides[get_wialon_gateway] = lambda: gateway
    headers = _headers(client, VIEWER_EMAIL, VIEWER_PASSWORD)

    response = client.patch(
        "/api/v1/vehicles/42/custom-fields",
        json={"fields": [{"id": 5, "name": "Placa", "value": "XYZ"}]},
        headers=headers,
    )

    assert response.status_code == 403
    assert gateway.calls == []
    client.app.dependency_overrides.pop(get_wialon_gateway, None)


def test_update_fails_closed_when_wialon_does_not_return_current_fields(client: TestClient):
    gateway = FakeVehicleCustomFieldsGateway(has_custom_fields=False)
    client.app.dependency_overrides[get_wialon_gateway] = lambda: gateway
    headers = _headers(client, OPERATOR_EMAIL, OPERATOR_PASSWORD)

    response = client.patch(
        "/api/v1/vehicles/42/custom-fields",
        json={"fields": [{"name": "Color", "value": "Rojo"}]},
        headers=headers,
    )

    assert response.status_code == 409
    assert gateway.calls == []
    client.app.dependency_overrides.pop(get_wialon_gateway, None)


def test_update_rejects_unknown_or_conflicting_fields(client: TestClient):
    gateway = FakeVehicleCustomFieldsGateway([WialonCustomField(5, "Placa", "ABC123")])
    client.app.dependency_overrides[get_wialon_gateway] = lambda: gateway
    headers = _headers(client, OPERATOR_EMAIL, OPERATOR_PASSWORD)

    unknown = client.patch(
        "/api/v1/vehicles/42/custom-fields",
        json={"fields": [{"id": 99, "name": "Placa", "value": "XYZ"}]},
        headers=headers,
    )
    conflict = client.patch(
        "/api/v1/vehicles/42/custom-fields",
        json={"fields": [{"name": "Placa", "value": "XYZ"}]},
        headers=headers,
    )

    assert unknown.status_code == 404
    assert conflict.status_code == 409
    assert gateway.calls == []
    client.app.dependency_overrides.pop(get_wialon_gateway, None)
