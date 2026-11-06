from dataclasses import dataclass
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


def _finite_number(value: Any) -> float | None:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        return None
    number = float(value)
    return number if number == number and abs(number) != float("inf") else None


def _optional_int(value: Any) -> int | None:
    if isinstance(value, bool) or not isinstance(value, int):
        return None
    return value


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
