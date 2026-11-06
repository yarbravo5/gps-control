from fastapi.testclient import TestClient

from app.api.v1.vehicles import get_wialon_gateway
from app.gateways.wialon.exceptions import WialonApiError
from tests.conftest import ADMIN_EMAIL, ADMIN_PASSWORD, VIEWER_EMAIL, VIEWER_PASSWORD, login


class FakePeopleGateway:
    def list_drivers(self, resource_id, query, offset, limit):
        raise WialonApiError(4)

    def list_passengers(self, resource_id, query, offset, limit):
        return [], 0


def test_people_read_endpoints_require_rbac_and_sanitize_wialon_errors(client: TestClient):
    client.app.dependency_overrides[get_wialon_gateway] = lambda: FakePeopleGateway()
    try:
        admin = login(client, ADMIN_EMAIL, ADMIN_PASSWORD)
        admin_headers = {"Authorization": f"Bearer {admin['access_token']}"}
        failed = client.get("/api/v1/drivers?resource_id=20", headers=admin_headers)
        assert failed.status_code == 502
        assert "código" not in failed.text and "Wialon rechazó" not in failed.text

        viewer = login(client, VIEWER_EMAIL, VIEWER_PASSWORD)
        viewer_headers = {"Authorization": f"Bearer {viewer['access_token']}"}
        read = client.get("/api/v1/passengers?resource_id=20", headers=viewer_headers)
        assert read.status_code == 200 and read.json()["total"] == 0
        denied = client.post(
            "/api/v1/passengers",
            headers=viewer_headers,
            json={"resource_id": 20, "name": "P", "code": "P1", "phone": "123"},
        )
        assert denied.status_code == 403
        denied_binding = client.post(
            "/api/v1/drivers/7/bindings",
            headers=viewer_headers,
            json={"resource_id": 20, "unit_id": 30},
        )
        assert denied_binding.status_code == 403
    finally:
        client.app.dependency_overrides.pop(get_wialon_gateway, None)
