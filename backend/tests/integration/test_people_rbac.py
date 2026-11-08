from fastapi.testclient import TestClient

from app.api.v1.vehicles import get_wialon_gateway
from app.gateways.wialon.exceptions import WialonApiError
from app.gateways.wialon.dto import WialonResourceSearchResult, resource_from_wialon
from tests.conftest import ADMIN_EMAIL, ADMIN_PASSWORD, VIEWER_EMAIL, VIEWER_PASSWORD, login


class FakePeopleGateway:
    def list_drivers(self, resource_id, query, offset, limit, sort_by="name", sort_order="asc"):
        raise WialonApiError(4)

    def list_passengers(self, resource_id, query, offset, limit, sort_by="name", sort_order="asc"):
        return [], 0

    def search_resources(self, offset, limit):
        resource = resource_from_wialon({
            "id": 20,
            "nm": "Flota demo",
            "drvrs": {"7": {"id": 7, "n": "Conductor"}},
            "tags": {"9": {"id": 9, "n": "Pasajero"}},
        })
        return WialonResourceSearchResult([resource] if offset == 0 else [], 1)


def test_people_read_endpoints_require_rbac_and_sanitize_wialon_errors(client: TestClient, caplog):
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
        sorted_read = client.get(
            "/api/v1/passengers?resource_id=20&sort_by=timezone&sort_order=desc",
            headers=viewer_headers,
        )
        assert sorted_read.status_code == 200
        invalid_sort = client.get(
            "/api/v1/passengers?resource_id=20&sort_by=phone",
            headers=viewer_headers,
        )
        assert invalid_sort.status_code == 422
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
        assert "Access denied:" in caplog.text
        assert "permission=drivers:bind" in caplog.text
        assert VIEWER_EMAIL not in caplog.text
    finally:
        client.app.dependency_overrides.pop(get_wialon_gateway, None)


def test_viewer_can_list_resource_summaries_without_person_payloads(client: TestClient):
    client.app.dependency_overrides[get_wialon_gateway] = lambda: FakePeopleGateway()
    try:
        viewer = login(client, VIEWER_EMAIL, VIEWER_PASSWORD)
        headers = {"Authorization": f"Bearer {viewer['access_token']}"}

        response = client.get("/api/v1/resources", headers=headers)

        assert response.status_code == 200
        assert response.json() == {
            "items": [{"id": 20, "name": "Flota demo"}],
            "total": 1,
            "offset": 0,
            "limit": 100,
        }
    finally:
        client.app.dependency_overrides.pop(get_wialon_gateway, None)
