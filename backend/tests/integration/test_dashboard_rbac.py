from fastapi.testclient import TestClient

from app.api.v1.vehicles import get_wialon_gateway
from app.gateways.wialon.dto import WialonResourceSearchResult, WialonUnitSearchResult
from tests.conftest import (
    ADMIN_EMAIL,
    ADMIN_PASSWORD,
    OPERATOR_EMAIL,
    OPERATOR_PASSWORD,
    VIEWER_EMAIL,
    VIEWER_PASSWORD,
    login,
)


class EmptyDashboardGateway:
    def search_items(self, query, offset, limit):
        return WialonUnitSearchResult([], 0)

    def search_resources(self, offset, limit):
        return WialonResourceSearchResult([], 0)


def test_dashboard_is_available_to_all_read_roles(client: TestClient):
    client.app.dependency_overrides[get_wialon_gateway] = EmptyDashboardGateway
    accounts = [
        (ADMIN_EMAIL, ADMIN_PASSWORD),
        (OPERATOR_EMAIL, OPERATOR_PASSWORD),
        (VIEWER_EMAIL, VIEWER_PASSWORD),
    ]
    try:
        for email, password in accounts:
            auth = login(client, email, password)
            response = client.get(
                "/api/v1/dashboard",
                headers={"Authorization": f"Bearer {auth['access_token']}"},
            )
            assert response.status_code == 200
            assert response.json()["total_vehicles"] == 0
            assert response.json()["generated_at"].endswith("Z") or "+00:00" in response.json()["generated_at"]
    finally:
        client.app.dependency_overrides.pop(get_wialon_gateway, None)


def test_dashboard_requires_authentication(client: TestClient):
    assert client.get("/api/v1/dashboard").status_code == 401
