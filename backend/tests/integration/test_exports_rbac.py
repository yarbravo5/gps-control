from fastapi.testclient import TestClient

from app.api.v1.vehicles import get_wialon_gateway
from tests.conftest import (
    ADMIN_EMAIL,
    ADMIN_PASSWORD,
    OPERATOR_EMAIL,
    OPERATOR_PASSWORD,
    VIEWER_EMAIL,
    VIEWER_PASSWORD,
    login,
)


class EmptyExportGateway:
    def search_items(self, query, offset, limit):
        from app.gateways.wialon.dto import WialonUnitSearchResult

        return WialonUnitSearchResult([], 0)

    def search_resources(self, offset, limit):
        from app.gateways.wialon.dto import WialonResourceSearchResult

        return WialonResourceSearchResult([], 0)


def test_admin_and_operator_can_export_but_viewer_is_denied(client: TestClient):
    client.app.dependency_overrides[get_wialon_gateway] = EmptyExportGateway
    try:
        for email, password in [
            (ADMIN_EMAIL, ADMIN_PASSWORD),
            (OPERATOR_EMAIL, OPERATOR_PASSWORD),
        ]:
            account = login(client, email, password)
            response = client.get(
                "/api/v1/exports/vehicles",
                headers={"Authorization": f"Bearer {account['access_token']}"},
            )
            assert response.status_code == 200
            assert response.headers["content-type"].startswith("text/csv")
            assert "attachment; filename=\"gps-control-vehicles.csv\"" in response.headers["content-disposition"]

        viewer = login(client, VIEWER_EMAIL, VIEWER_PASSWORD)
        denied = client.get(
            "/api/v1/exports/vehicles",
            headers={"Authorization": f"Bearer {viewer['access_token']}"},
        )
        assert denied.status_code == 403
    finally:
        client.app.dependency_overrides.pop(get_wialon_gateway, None)