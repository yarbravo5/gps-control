from dataclasses import dataclass, field
from typing import Any


@dataclass(frozen=True)
class WialonPosition:
    timestamp: int | None
    latitude: float | None
    longitude: float | None
    speed_kmh: float | None
    heading_degrees: float | None


@dataclass(frozen=True)
class WialonUnit:
    id: int
    name: str
    position: WialonPosition | None
    last_message_timestamp: int | None = None


@dataclass(frozen=True)
class WialonUnitSearchResult:
    items: list[WialonUnit]
    total: int


@dataclass(frozen=True)
class WialonHistoryMessage:
    timestamp: int
    latitude: float | None
    longitude: float | None
    speed_kmh: float | None
    heading_degrees: float | None


@dataclass(frozen=True)
class WialonHistoryResult:
    messages: list[WialonHistoryMessage]
    total: int


@dataclass(frozen=True)
class WialonDriver:
    id: int
    name: str
    code: str
    description: str
    phone: str
    mobile_password: str | None = field(repr=False)
    custom_fields: dict[str, str]
    flags: int
    bound_unit_id: int | None
    available_fields: frozenset[str]


@dataclass(frozen=True)
class WialonPassenger:
    id: int
    name: str
    code: str
    timezone: int
    custom_fields: dict[str, str]
    image_checksum: int
    flags: int
    auto_reset_seconds: int
    bound_unit_id: int | None
    available_fields: frozenset[str]


@dataclass(frozen=True)
class WialonResource:
    id: int
    name: str
    drivers: list[WialonDriver]
    passengers: list[WialonPassenger]
    driver_auto_unit_ids: list[int]
    passenger_auto_unit_ids: list[int]
    available_fields: frozenset[str]


@dataclass(frozen=True)
class WialonBindingEvent:
    timestamp: int
    unit_id: int
    previous_unit_id: int | None = None
    subject_id: int | None = None


@dataclass(frozen=True)
class WialonUnitDriver:
    id: int
    name: str
    phone: str | None
    resource_id: int | None = None


def _finite_number(value: Any) -> float | None:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        return None
    number = float(value)
    return number if number == number and abs(number) != float("inf") else None


def _optional_int(value: Any) -> int | None:
    if isinstance(value, bool) or not isinstance(value, int):
        return None
    return value


def history_from_wialon(payload: Any) -> WialonHistoryResult | None:
    if not isinstance(payload, dict) or not isinstance(payload.get("messages"), list):
        return None
    raw_total = payload.get("count")
    total = raw_total if isinstance(raw_total, int) and not isinstance(raw_total, bool) else len(payload["messages"])
    messages = []
    for raw in payload["messages"]:
        if not isinstance(raw, dict):
            continue
        timestamp = _optional_int(raw.get("t"))
        if timestamp is None:
            continue
        position = raw.get("pos")
        position = position if isinstance(position, dict) else {}
        messages.append(WialonHistoryMessage(
            timestamp=timestamp,
            latitude=_finite_number(position.get("y")),
            longitude=_finite_number(position.get("x")),
            speed_kmh=_finite_number(position.get("s")),
            heading_degrees=_finite_number(position.get("c")),
        ))
    return WialonHistoryResult(messages=messages, total=max(0, total))


def _record_id(record: dict[str, Any], key: str) -> int | None:
    value = _optional_int(record.get("id"))
    if value is not None:
        return value
    try:
        return int(key)
    except (TypeError, ValueError):
        return None


def _text(value: Any) -> str:
    return value if isinstance(value, str) else ""


def _custom_fields(value: Any) -> dict[str, str]:
    if not isinstance(value, dict):
        return {}
    return {
        str(name): text
        for name, raw_value in value.items()
        if isinstance(name, str) and isinstance(raw_value, str)
        for text in [raw_value]
    }


def _parse_driver(key: str, value: Any) -> WialonDriver | None:
    if not isinstance(value, dict):
        return None
    driver_id = _record_id(value, key)
    if driver_id is None:
        return None
    bound_unit_id = _optional_int(value.get("bu"))
    return WialonDriver(
        id=driver_id,
        name=_text(value.get("n")),
        code=_text(value.get("c")),
        description=_text(value.get("ds")),
        phone=_text(value.get("p")),
        mobile_password=_text(value["pwd"]) if isinstance(value.get("pwd"), str) else None,
        custom_fields=_custom_fields(value.get("jp")),
        flags=_optional_int(value.get("f")) or 0,
        bound_unit_id=bound_unit_id if bound_unit_id else None,
        available_fields=frozenset(value.keys()),
    )


def _parse_passenger(key: str, value: Any) -> WialonPassenger | None:
    if not isinstance(value, dict):
        return None
    passenger_id = _record_id(value, key)
    if passenger_id is None:
        return None
    bound_unit_id = _optional_int(value.get("bu"))
    return WialonPassenger(
        id=passenger_id,
        name=_text(value.get("n")),
        code=_text(value.get("c")),
        timezone=_optional_int(value.get("tz")) or 0,
        custom_fields=_custom_fields(value.get("jp")),
        image_checksum=_optional_int(value.get("ck")) or 0,
        flags=_optional_int(value.get("f")) or 0,
        auto_reset_seconds=_optional_int(value.get("art")) or 0,
        bound_unit_id=bound_unit_id if bound_unit_id else None,
        available_fields=frozenset(value.keys()),
    )


def resource_from_wialon(payload: dict[str, Any]) -> WialonResource | None:
    resource_id = _optional_int(payload.get("id"))
    name = payload.get("nm")
    if resource_id is None or not isinstance(name, str):
        return None
    raw_drivers = payload.get("drvrs")
    raw_passengers = payload.get("tags")
    drivers = [
        item
        for key, value in (raw_drivers.items() if isinstance(raw_drivers, dict) else [])
        if (item := _parse_driver(str(key), value)) is not None
    ]
    passengers = [
        item
        for key, value in (raw_passengers.items() if isinstance(raw_passengers, dict) else [])
        if (item := _parse_passenger(str(key), value)) is not None
    ]
    driver_auto = payload.get("drvrun")
    passenger_auto = payload.get("tagrun")
    return WialonResource(
        id=resource_id,
        name=name,
        drivers=drivers,
        passengers=passengers,
        driver_auto_unit_ids=[
            unit_id
            for unit_id in driver_auto
            if isinstance(unit_id, int) and not isinstance(unit_id, bool)
        ] if isinstance(driver_auto, list) else [],
        passenger_auto_unit_ids=[
            unit_id
            for unit_id in passenger_auto
            if isinstance(unit_id, int) and not isinstance(unit_id, bool)
        ] if isinstance(passenger_auto, list) else [],
        available_fields=frozenset(payload.keys()),
    )


def unit_from_wialon(payload: dict[str, Any]) -> WialonUnit | None:
    unit_id = _optional_int(payload.get("id"))
    name = payload.get("nm")
    if unit_id is None or not isinstance(name, str):
        return None

    raw_position = payload.get("pos")
    raw_last_message = payload.get("lmsg")
    position = None
    if isinstance(raw_position, dict):
        position = WialonPosition(
            timestamp=_optional_int(raw_position.get("t")),
            latitude=_finite_number(raw_position.get("y")),
            longitude=_finite_number(raw_position.get("x")),
            speed_kmh=_finite_number(raw_position.get("s")),
            heading_degrees=_finite_number(raw_position.get("c")),
        )
    last_message_timestamp = (
        _optional_int(raw_last_message.get("t"))
        if isinstance(raw_last_message, dict)
        else None
    )
    return WialonUnit(
        id=unit_id,
        name=name,
        position=position,
        last_message_timestamp=last_message_timestamp,
    )
