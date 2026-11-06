from datetime import datetime, timezone

from fastapi.testclient import TestClient

from app.api.v1.vehicles import get_wialon_gateway
from app.gateways.wialon.dto import WialonHistoryMessage, WialonHistoryResult, WialonUnit
from app.gateways.wialon.exceptions import WialonApiError
from tests.conftest import VIEWER_EMAIL, VIEWER_PASSWORD, login


class FakeHistoryGateway:
    def __init__(self, *, missing=False, fail=False):
        self.missing = missing
        self.fail = fail

    def search_item(self, unit_id):
        return None if self.missing else WialonUnit(unit_id, "Unidad", None)

    def load_vehicle_history(self, unit_id, time_from, time_to, *, load_count):
        if self.fail:
            raise WialonApiError(6)
        return WialonHistoryResult([
            WialonHistoryMessage(1_800_000_000, 4.7, -74.1, 20, 45),
        ], 1)


def auth_headers(client):
    session = login(client, VIEWER_EMAIL, VIEWER_PASSWORD)
    return {"Authorization": f"Bearer {session['access_token']}"}


def test_viewer_can_read_ordered_history_contract(client: TestClient):
    client.app.dependency_overrides[get_wialon_gateway] = lambda: FakeHistoryGateway()
    try:
        response = client.get(
            "/api/v1/vehicles/42/history",
            params={
                "start": "2027-01-15T00:00:00+00:00",
                "end": "2027-01-15T09:00:00+00:00",
            },
            headers=auth_headers(client),
        )
        assert response.status_code == 200, response.text
        data = response.json()
        assert data["vehicle_id"] == 42
        assert data["points"][0]["timestamp"] == datetime.fromtimestamp(
            1_800_000_000, timezone.utc
        ).isoformat().replace("+00:00", "Z")
        assert data["points"][0]["speed_kmh"] == 20
        assert data["points"][0]["heading_cardinal"] == "NE"
        assert data["points"][0]["status"] == "moving"
    finally:
        client.app.dependency_overrides.pop(get_wialon_gateway, None)


def test_history_query_validation_missing_vehicle_and_sanitized_wialon_error(client: TestClient):
    headers = auth_headers(client)
    params = {"start": "2027-01-15T07:00:00+00:00", "end": "2027-01-15T09:00:00+00:00"}
    try:
        client.app.dependency_overrides[get_wialon_gateway] = lambda: FakeHistoryGateway()
        invalid = client.get("/api/v1/vehicles/42/history", params={"start": "2027-01-15T07:00:00", "end": "2027-01-15T09:00:00"}, headers=headers)
        assert invalid.status_code == 422

        client.app.dependency_overrides[get_wialon_gateway] = lambda: FakeHistoryGateway(missing=True)
        missing = client.get("/api/v1/vehicles/42/history", params=params, headers=headers)
        assert missing.status_code == 404

        client.app.dependency_overrides[get_wialon_gateway] = lambda: FakeHistoryGateway(fail=True)
        failed = client.get("/api/v1/vehicles/42/history", params=params, headers=headers)
        assert failed.status_code == 502
        assert "código" not in failed.text and "Wialon" not in failed.text
    finally:
        client.app.dependency_overrides.pop(get_wialon_gateway, None)
