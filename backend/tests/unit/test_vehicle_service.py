from datetime import datetime, timezone
from urllib.parse import parse_qs

import httpx
from fastapi.testclient import TestClient

from app.gateways.wialon.dto import WialonPosition, WialonUnit, WialonUnitSearchResult
from app.gateways.wialon.client import WialonClient
from app.api.v1.vehicles import get_wialon_gateway
from app.main import app
from app.models import User
from app.schemas.vehicle import VehicleStatus
from tests.conftest import (
    ADMIN_EMAIL,
    ADMIN_PASSWORD,
    OPERATOR_EMAIL,
    OPERATOR_PASSWORD,
    VIEWER_EMAIL,
    VIEWER_PASSWORD,
    login,
)


class FakeGateway:
    def __init__(self, units):
        self.units = units
        self.calls = []

    def search_items(self, query, offset, limit):
        self.calls.append((query, offset, limit))
        matching = [unit for unit in self.units if query is None or query.lower() in unit.name.lower()]
        return WialonUnitSearchResult(matching[offset : offset + limit], len(matching))


def make_unit(unit_id: int, name: str, *, speed: float = 0) -> WialonUnit:
    timestamp = int(datetime.now(timezone.utc).timestamp())
    return WialonUnit(
        unit_id,
        name,
        WialonPosition(timestamp, 4.7, -74.1, speed, 180),
        timestamp,
    )


def test_vehicle_listing_uses_search_pagination_and_own_response(client: TestClient):
    gateway = FakeGateway([make_unit(1, "Bus Norte"), make_unit(2, "Camión", speed=20)])
    app.dependency_overrides[get_wialon_gateway] = lambda: gateway
    auth = login(client, ADMIN_EMAIL, ADMIN_PASSWORD)

    response = client.get(
        "/api/v1/vehicles?q=Bus&offset=0&limit=5",
        headers={"Authorization": f"Bearer {auth['access_token']}"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["total"] == 1
    assert payload["items"][0]["name"] == "Bus Norte"
    assert payload["items"][0]["status"] == "stopped"
    assert "sid" not in payload
    assert gateway.calls == [("Bus", 0, 5)]
    app.dependency_overrides.pop(get_wialon_gateway, None)


def test_vehicle_listing_maps_real_gateway_response_without_session_or_raw_json(
    client: TestClient,
):
    seen_hosts = []

    def handler(request: httpx.Request) -> httpx.Response:
        seen_hosts.append(request.url.host)
        form = parse_qs(request.content.decode())
        service = form["svc"][0]
        if service == "token/login":
            return httpx.Response(200, json={"eid": "private-session-id"})
        return httpx.Response(
            200,
            json={
                "totalItemsCount": 1,
                "items": [
                    {
                        "id": 12,
                        "nm": "Unidad de prueba",
                        "pos": {"t": 1_800_000_000, "y": 4.7, "x": -74.1, "s": 14, "c": 90},
                        "lmsg": {"t": int(datetime.now(timezone.utc).timestamp())},
                    }
                ],
            },
        )

    http_client = httpx.Client(transport=httpx.MockTransport(handler))
    gateway = WialonClient(
        token="private-wialon-token",
        host="wialon.test.invalid",
        timeout_seconds=1,
        http_client=http_client,
    )
    app.dependency_overrides[get_wialon_gateway] = lambda: gateway
    auth = login(client, ADMIN_EMAIL, ADMIN_PASSWORD)
    response = client.get(
        "/api/v1/vehicles?host=attacker.invalid",
        headers={"Authorization": f"Bearer {auth['access_token']}"},
    )

    assert response.status_code == 200
    assert response.json()["items"][0]["direction"] == "E"
    assert "private-session-id" not in response.text
    assert "private-wialon-token" not in response.text
    assert seen_hosts == ["wialon.test.invalid", "wialon.test.invalid"]
    http_client.close()
    app.dependency_overrides.pop(get_wialon_gateway, None)


def test_wialon_api_error_details_are_hidden_from_client(client: TestClient):
    def handler(request: httpx.Request) -> httpx.Response:
        form = parse_qs(request.content.decode())
        if form["svc"][0] == "token/login":
            return httpx.Response(200, json={"eid": "private-session-id"})
        return httpx.Response(200, json={"error": 7, "reason": "private Wialon details"})

    http_client = httpx.Client(transport=httpx.MockTransport(handler))
    gateway = WialonClient("private-wialon-token", "wialon.test.invalid", 1, http_client)
    app.dependency_overrides[get_wialon_gateway] = lambda: gateway
    auth = login(client, ADMIN_EMAIL, ADMIN_PASSWORD)
    response = client.get(
        "/api/v1/vehicles",
        headers={"Authorization": f"Bearer {auth['access_token']}"},
    )
    assert response.status_code == 502
    assert "private Wialon details" not in response.text
    assert "private-session-id" not in response.text
    assert "private-wialon-token" not in response.text
    http_client.close()
    app.dependency_overrides.pop(get_wialon_gateway, None)


def test_vehicle_status_filter_is_derived_and_paginates_results(client: TestClient):
    gateway = FakeGateway([make_unit(1, "Stopped"), make_unit(2, "Moving", speed=4)])
    app.dependency_overrides[get_wialon_gateway] = lambda: gateway
    auth = login(client, ADMIN_EMAIL, ADMIN_PASSWORD)
    response = client.get(
        "/api/v1/vehicles?status=moving",
        headers={"Authorization": f"Bearer {auth['access_token']}"},
    )
    assert response.status_code == 200
    assert response.json()["total"] == 1
    assert response.json()["items"][0]["status"] == VehicleStatus.MOVING.value
    assert gateway.calls[0] == (None, 0, 100)
    app.dependency_overrides.pop(get_wialon_gateway, None)


def test_vehicle_listing_applies_offset_to_requested_page(client: TestClient):
    gateway = FakeGateway([make_unit(1, "First"), make_unit(2, "Second")])
    app.dependency_overrides[get_wialon_gateway] = lambda: gateway
    auth = login(client, ADMIN_EMAIL, ADMIN_PASSWORD)
    response = client.get(
        "/api/v1/vehicles?offset=1&limit=1",
        headers={"Authorization": f"Bearer {auth['access_token']}"},
    )
    assert response.status_code == 200
    assert response.json()["total"] == 2
    assert [item["name"] for item in response.json()["items"]] == ["Second"]
    assert gateway.calls == [(None, 1, 1)]
    app.dependency_overrides.pop(get_wialon_gateway, None)


def test_viewer_can_list_vehicles(client: TestClient):
    app.dependency_overrides[get_wialon_gateway] = lambda: FakeGateway([])
    auth = login(client, VIEWER_EMAIL, VIEWER_PASSWORD)
    response = client.get(
        "/api/v1/vehicles",
        headers={"Authorization": f"Bearer {auth['access_token']}"},
    )
    assert response.status_code == 200
    app.dependency_overrides.pop(get_wialon_gateway, None)


def test_operator_can_list_vehicles_with_catalog_permission(client: TestClient):
    app.dependency_overrides[get_wialon_gateway] = lambda: FakeGateway([])
    auth = login(client, OPERATOR_EMAIL, OPERATOR_PASSWORD)
    response = client.get(
        "/api/v1/vehicles",
        headers={"Authorization": f"Bearer {auth['access_token']}"},
    )
    assert response.status_code == 200
    app.dependency_overrides.pop(get_wialon_gateway, None)


def test_vehicle_listing_enforces_missing_permission(client: TestClient, database_session):
    viewer = database_session.query(User).filter_by(email=VIEWER_EMAIL).one()
    viewer.role.permissions = []
    database_session.commit()
    app.dependency_overrides[get_wialon_gateway] = lambda: FakeGateway([])
    auth = login(client, VIEWER_EMAIL, VIEWER_PASSWORD)
    response = client.get(
        "/api/v1/vehicles",
        headers={"Authorization": f"Bearer {auth['access_token']}"},
    )
    assert response.status_code == 403
    app.dependency_overrides.pop(get_wialon_gateway, None)


def test_vehicle_listing_requires_authentication(client: TestClient):
    response = client.get("/api/v1/vehicles")
    assert response.status_code == 401


def test_vehicle_query_validation_rejects_wialon_wildcards(client: TestClient):
    auth = login(client, ADMIN_EMAIL, ADMIN_PASSWORD)
    response = client.get(
        "/api/v1/vehicles?q=*",
        headers={"Authorization": f"Bearer {auth['access_token']}"},
    )
    assert response.status_code == 422
