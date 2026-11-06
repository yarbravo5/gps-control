from datetime import datetime, timezone

import pytest

from app.gateways.wialon.dto import WialonPosition, WialonUnit
from app.mappers.vehicle_mapper import heading_to_direction, map_vehicle
from app.schemas.vehicle import VehicleStatus


NOW = datetime(2026, 11, 6, 12, 0, tzinfo=timezone.utc)
FRESH_TIMESTAMP = int(NOW.timestamp()) - 30


def unit(*, latitude=4.7, longitude=-74.1, speed=0, heading=0, timestamp=FRESH_TIMESTAMP):
    position = WialonPosition(timestamp, latitude, longitude, speed, heading)
    return WialonUnit(1, "Unidad", position, timestamp)


@pytest.mark.parametrize(
    ("degrees", "expected"),
    [(0, "N"), (22.5, "NE"), (45, "NE"), (90, "E"), (135, "SE"),
     (180, "S"), (225, "SO"), (270, "O"), (315, "NO"), (359, "N"), (-90, "O")],
)
def test_heading_to_cardinal_direction(degrees, expected) -> None:
    assert heading_to_direction(degrees) == expected


def test_timestamp_maps_to_aware_utc_datetime() -> None:
    vehicle = map_vehicle(unit(), now=NOW, no_signal_after_seconds=600)
    assert vehicle.last_communication == datetime.fromtimestamp(FRESH_TIMESTAMP, timezone.utc)
    assert vehicle.last_communication.tzinfo == timezone.utc


def test_last_communication_uses_last_message_time_not_position_time() -> None:
    vehicle_unit = WialonUnit(
        1,
        "Unidad",
        WialonPosition(FRESH_TIMESTAMP - 120, 4.7, -74.1, 0, 0),
        FRESH_TIMESTAMP,
    )
    vehicle = map_vehicle(vehicle_unit, now=NOW, no_signal_after_seconds=600)
    assert vehicle.last_communication == datetime.fromtimestamp(
        FRESH_TIMESTAMP, timezone.utc
    )
    assert vehicle.status is VehicleStatus.STOPPED


def test_no_signal_threshold_uses_last_message_time() -> None:
    vehicle_unit = WialonUnit(
        1,
        "Unidad",
        WialonPosition(FRESH_TIMESTAMP, 4.7, -74.1, 0, 0),
        FRESH_TIMESTAMP - 601,
    )
    vehicle = map_vehicle(vehicle_unit, now=NOW, no_signal_after_seconds=600)
    assert vehicle.status is VehicleStatus.NO_SIGNAL


@pytest.mark.parametrize(
    ("latitude", "longitude"),
    [(None, -74), (91, -74), (-91, -74), (4, 181), (4, -181)],
)
def test_invalid_coordinates_are_omitted_and_marked_no_signal(latitude, longitude) -> None:
    vehicle = map_vehicle(
        unit(latitude=latitude, longitude=longitude),
        now=NOW,
        no_signal_after_seconds=600,
    )
    assert vehicle.latitude is None
    assert vehicle.longitude is None
    assert vehicle.status is VehicleStatus.NO_SIGNAL


def test_speed_above_three_kmh_is_moving() -> None:
    vehicle = map_vehicle(unit(speed=3.1), now=NOW, no_signal_after_seconds=600)
    assert vehicle.status is VehicleStatus.MOVING


def test_speed_at_or_below_three_kmh_is_stopped() -> None:
    vehicle = map_vehicle(unit(speed=3), now=NOW, no_signal_after_seconds=600)
    assert vehicle.status is VehicleStatus.STOPPED


@pytest.mark.parametrize("timestamp", [None, FRESH_TIMESTAMP - 601, int(NOW.timestamp()) + 1])
def test_missing_stale_or_future_timestamp_is_no_signal(timestamp) -> None:
    vehicle = map_vehicle(unit(timestamp=timestamp), now=NOW, no_signal_after_seconds=600)
    assert vehicle.status is VehicleStatus.NO_SIGNAL


def test_missing_position_is_no_signal() -> None:
    vehicle = map_vehicle(
        WialonUnit(2, "Sin posición", None),
        now=NOW,
        no_signal_after_seconds=600,
    )
    assert vehicle.status is VehicleStatus.NO_SIGNAL
    assert vehicle.latitude is None
    assert vehicle.last_communication is None
