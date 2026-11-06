from urllib.parse import parse_qs

import httpx
import pytest
import json

from app.gateways.wialon.client import WialonClient
from app.gateways.wialon.exceptions import (
    WialonAuthenticationError,
    WialonConnectionError,
)


def make_client(handler):
    transport = httpx.MockTransport(handler)
    http_client = httpx.Client(transport=transport)
    return WialonClient(
        token="test-token-never-returned",
        host="hst-api.wialon.com",
        timeout_seconds=1,
        http_client=http_client,
    )


def form(request: httpx.Request) -> dict[str, str]:
    return {key: values[0] for key, values in parse_qs(request.content.decode()).items()}


def test_login_then_search_uses_session_and_maps_units() -> None:
    calls = []

    def handler(request: httpx.Request) -> httpx.Response:
        data = form(request)
        calls.append(data)
        if data["svc"] == "token/login":
            assert data["params"] == '{"token":"test-token-never-returned","fl":1}'
            return httpx.Response(200, json={"eid": "session-secret"})
        assert data["sid"] == "session-secret"
        assert data["svc"] == "core/search_items"
        params = json.loads(data["params"])
        assert params == {
            "spec": {
                "itemsType": "avl_unit",
                "propName": "sys_name",
                "propValueMask": "*Tr*",
                "sortType": "sys_name",
            },
            "force": 1,
            "flags": 1025,
            "from": 0,
            "to": 9,
        }
        return httpx.Response(
            200,
            json={
                "totalItemsCount": 1,
                "items": [
                    {
                        "id": 4,
                        "nm": "Truck",
                        "pos": {"t": 1_800_000_000, "y": 4.7, "x": -74.1, "s": 10, "c": 90},
                        "lmsg": {"t": 1_800_000_010},
                    }
                ],
            },
        )

    client = make_client(handler)
    result = client.search_items("Tr", 0, 10)

    assert len(calls) == 2
    assert result.total == 1
    assert result.items[0].name == "Truck"
    assert result.items[0].position is not None
    assert result.items[0].position.speed_kmh == 10
    assert result.items[0].last_message_timestamp == 1_800_000_010
    assert "test-token-never-returned" not in repr(result)
    assert "session-secret" not in repr(result)


def test_login_failure_does_not_leak_wialon_details_or_token(caplog) -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json={"error": 7, "reason": "sensitive detail"})

    client = make_client(handler)
    with pytest.raises(WialonAuthenticationError) as raised:
        client.search_items(None, 0, 10)
    assert "sensitive detail" not in str(raised.value)
    assert "test-token-never-returned" not in repr(raised.value)
    assert "test-token-never-returned" not in caplog.text


def test_invalid_session_reauthenticates_once_and_retries_request() -> None:
    login_count = 0
    search_count = 0

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal login_count, search_count
        data = form(request)
        if data["svc"] == "token/login":
            login_count += 1
            return httpx.Response(200, json={"eid": f"session-{login_count}"})
        search_count += 1
        if search_count == 1:
            return httpx.Response(200, json={"error": 1})
        assert data["sid"] == "session-2"
        return httpx.Response(200, json={"totalItemsCount": 0, "items": []})

    client = make_client(handler)
    assert client.search_items(None, 0, 10).total == 0
    assert (login_count, search_count) == (2, 2)


def test_second_invalid_session_fails_after_one_reauthentication() -> None:
    from app.gateways.wialon.exceptions import WialonSessionError

    login_count = 0
    search_count = 0

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal login_count, search_count
        data = form(request)
        if data["svc"] == "token/login":
            login_count += 1
            return httpx.Response(200, json={"eid": f"secret-session-{login_count}"})
        search_count += 1
        return httpx.Response(200, json={"error": 1, "reason": "private detail"})

    client = make_client(handler)
    with pytest.raises(WialonSessionError) as raised:
        client.search_items(None, 0, 10)
    assert (login_count, search_count) == (2, 2)
    assert "private detail" not in str(raised.value)
    assert "secret-session" not in str(raised.value)


def test_connection_error_is_sanitized() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("private network details", request=request)

    client = make_client(handler)
    with pytest.raises(WialonConnectionError) as raised:
        client.search_items(None, 0, 10)
    assert "private network details" not in str(raised.value)
