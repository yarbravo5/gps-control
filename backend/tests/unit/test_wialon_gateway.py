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


def test_people_gateway_operations_use_adapter_and_map_responses() -> None:
    calls = []

    def handler(request: httpx.Request) -> httpx.Response:
        data = form(request)
        if data["svc"] == "token/login":
            return httpx.Response(200, json={"eid": "mock-session"})
        service = data["svc"]
        params = json.loads(data["params"])
        calls.append((service, params))
        if service == "resource/update_driver" and params["callMode"] == "create":
            return httpx.Response(200, json=[3, {"id": 7, "n": "Ana", "c": "A7", "ds": "", "p": "555", "pwd": "pw", "jp": {}, "f": 0}])
        if service == "resource/update_tag" and params["callMode"] == "create":
            return httpx.Response(200, json=[4, {"id": 9, "n": "Luis", "c": "P9", "ck": 0, "jp": {}, "tz": 0, "f": 0, "art": 0}])
        return httpx.Response(200, json={})

    client = make_client(handler)
    created_driver = client.create_driver(
        3, name="Ana", code="A7", description="", phone="555",
        mobile_password="pw", custom_fields={},
    )
    created_passenger = client.create_passenger(
        3, name="Luis", code="P9", phone="555", timezone=0, custom_fields={},
    )
    client.bind_driver(3, 7, 20, bind=True, time=123)
    client.bind_driver(3, 7, 20, bind=False, time=124)
    client.bind_passenger(3, 9, 20, bind=True, time=125)
    client.bind_passenger(3, 9, 20, bind=False, time=126)
    client.delete_driver(3, 7)
    client.delete_passenger(3, 9)

    assert created_driver.id == 7 and created_driver.name == "Ana"
    assert created_passenger.id == 9 and created_passenger.name == "Luis"
    assert calls[2] == (
        "resource/bind_unit_driver",
        {"resourceId": 3, "driverId": 7, "unitId": 20, "time": 123, "mode": 1},
    )
    assert calls[3][1]["mode"] == 0
    assert calls[4][0] == "resource/bind_unit_tag" and calls[4][1]["tagId"] == 9
    assert calls[5][1]["mode"] == 0
    assert calls[6] == ("resource/update_driver", {"itemId": 3, "id": 7, "callMode": "delete"})
    assert calls[7] == ("resource/update_tag", {"itemId": 3, "id": 9, "callMode": "delete"})


def test_people_list_and_detail_parse_wialon_resource_without_raw_payloads() -> None:
    requested = []

    def handler(request: httpx.Request) -> httpx.Response:
        data = form(request)
        if data["svc"] == "token/login":
            return httpx.Response(200, json={"eid": "mock-session"})
        params = json.loads(data["params"])
        requested.append(params)
        return httpx.Response(200, json={"item": {
            "id": 3, "nm": "Fleet",
            "drvrs": {"7": {"id": 7, "n": "Ana", "c": "A7", "ds": "", "p": "555", "pwd": "secret", "jp": {"area": "norte"}, "f": 0}},
            "tags": {"9": {"id": 9, "n": "Luis", "c": "P9", "ck": 0, "jp": {"grupo": "A"}, "tz": -300, "f": 0, "art": 0}},
        }})

    client = make_client(handler)
    drivers, driver_count = client.list_drivers(3, "ana", 0, 10)
    passenger = client.get_passenger(3, 9)
    assert driver_count == 1 and drivers[0].name == "Ana"
    assert drivers[0].custom_fields == {"area": "norte"}
    assert "secret" not in repr(drivers[0])
    assert passenger is not None and passenger.name == "Luis"
    assert passenger.custom_fields == {"grupo": "A"}
    assert "phone" not in passenger.available_fields
    assert requested[0]["flags"] == WialonClient.RESOURCE_DRIVER_FLAGS
    assert requested[1]["flags"] == WialonClient.RESOURCE_PASSENGER_FLAGS


def test_unit_driver_lookup_aggregates_resources_and_ignores_invalid_records() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        data = form(request)
        if data["svc"] == "token/login":
            return httpx.Response(200, json={"eid": "mock-session"})
        assert data["svc"] == "resource/get_unit_drivers"
        assert json.loads(data["params"]) == {"unitId": 42}
        return httpx.Response(200, json={
            "20": [{"id": 7, "nm": "Ana", "ph": "555"}, {"id": "invalid"}],
            "21": [{"id": 8, "nm": "Luis"}],
            "bad-resource": [{"id": 9, "nm": "Ignorado"}],
        })

    client = make_client(handler)
    drivers = client.get_unit_drivers_for_all_resources(42)

    assert [(driver.resource_id, driver.id, driver.name, driver.phone) for driver in drivers] == [
        (20, 7, "Ana", "555"),
        (21, 8, "Luis", None),
    ]


def test_load_vehicle_history_uses_limited_interval_and_maps_dto() -> None:
    calls = []

    def handler(request: httpx.Request) -> httpx.Response:
        data = form(request)
        if data["svc"] == "token/login":
            return httpx.Response(200, json={"eid": "mock-session"})
        params = json.loads(data["params"])
        calls.append((data["svc"], params))
        return httpx.Response(200, json={
            "count": 1,
            "messages": [{
                "t": 1_800_000_000, "f": 1, "tp": "ud",
                "pos": {"y": 4.7, "x": -74.1, "s": 38, "c": 90},
            }],
        })

    client = make_client(handler)
    result = client.load_vehicle_history(
        42, 1_800_000_000, 1_800_003_600, load_count=5001
    )
    assert calls == [("messages/load_interval", {
        "itemId": 42,
        "timeFrom": 1_800_000_000,
        "timeTo": 1_800_003_600,
        "flags": 1,
        "flagsMask": 0xFF01,
        "loadCount": 5001,
    })]
    assert result.total == 1
    assert result.messages[0].latitude == 4.7
    assert result.messages[0].speed_kmh == 38
