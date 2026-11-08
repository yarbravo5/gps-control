from fastapi.testclient import TestClient

from app.api.v1.vehicles import get_wialon_gateway
from app.gateways.wialon.dto import WialonDriver, WialonPassenger
from tests.conftest import ADMIN_EMAIL, ADMIN_PASSWORD, OPERATOR_EMAIL, OPERATOR_PASSWORD, login


class FakePeopleMutationGateway:
    def create_driver(self, resource_id, **fields):
        return WialonDriver(
            id=10,
            name=fields["name"],
            code=fields["code"],
            description=fields["description"],
            phone=fields["phone"],
            mobile_password=fields.get("mobile_password"),
            custom_fields=fields.get("custom_fields", {}),
            flags=0,
            bound_unit_id=None,
            available_fields=frozenset({"n", "c", "ds", "p", "pwd", "jp", "f", "bu"}),
        )

    def create_passenger(self, resource_id, **fields):
        return WialonPassenger(
            id=20,
            name=fields["name"],
            code=fields["code"],
            timezone=fields.get("timezone", 0),
            custom_fields=fields.get("custom_fields", {}),
            image_checksum=0,
            flags=0,
            auto_reset_seconds=0,
            bound_unit_id=None,
            available_fields=frozenset(
                {"n", "c", "ck", "jp", "tz", "f", "art", "bu"}
            ),
        )


def test_people_mutations_are_audited_without_sensitive_values(client: TestClient):
    client.app.dependency_overrides[get_wialon_gateway] = (
        lambda: FakePeopleMutationGateway()
    )
    try:
        operator = login(client, OPERATOR_EMAIL, OPERATOR_PASSWORD)
        headers = {"Authorization": f"Bearer {operator['access_token']}"}

        driver_response = client.post(
            "/api/v1/drivers",
            headers=headers,
            json={
                "resource_id": 20,
                "name": "Ana",
                "code": "D1",
                "description": "Turno noche",
                "phone": "3001234567",
                "mobile_password": "secret-value",
                "custom_fields": {"Licencia": "A2"},
            },
        )
        passenger_response = client.post(
            "/api/v1/passengers",
            headers=headers,
            json={
                "resource_id": 20,
                "name": "Luis",
                "code": "P1",
                "phone": "3007654321",
                "custom_fields": {"Ruta": "Norte"},
            },
        )
        assert driver_response.status_code == 201
        assert passenger_response.status_code == 201

        admin = login(client, ADMIN_EMAIL, ADMIN_PASSWORD)
        audit = client.get(
            "/api/v1/audit",
            headers={"Authorization": f"Bearer {admin['access_token']}"},
        )
        assert audit.status_code == 200
        entries = {item["action"]: item for item in audit.json()}

        driver_entry = entries["driver.created"]
        assert driver_entry["entity"] == "driver"
        assert driver_entry["entity_id"] == "10"
        assert driver_entry["details"] == {
            "resource_id": 20,
            "name": "Ana",
            "custom_fields": ["Licencia"],
        }
        assert "secret-value" not in str(driver_entry["details"])

        passenger_entry = entries["passenger.created"]
        assert passenger_entry["entity"] == "passenger"
        assert passenger_entry["entity_id"] == "20"
        assert passenger_entry["details"] == {
            "resource_id": 20,
            "name": "Luis",
            "custom_fields": ["Ruta"],
        }
    finally:
        client.app.dependency_overrides.pop(get_wialon_gateway, None)
