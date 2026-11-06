from datetime import datetime, timedelta, timezone

import pytest

from app.core.history import MAX_HISTORY_POINTS, MAX_HISTORY_RANGE
from app.dto.vehicle import VehicleStatus
from app.gateways.wialon.dto import WialonHistoryMessage, WialonHistoryResult, WialonUnit
from app.mappers.history_mapper import map_history_point
from app.schemas.history import VehicleHistoryQuery
from app.services import history_service


START = datetime(2026, 11, 1, 12, 0, tzinfo=timezone.utc)
END = START + timedelta(hours=1)


class FakeHistoryGateway:
    def __init__(self, result=None, unit=None):
        self.result = result or WialonHistoryResult([], 0)
        self.unit = unit or WialonUnit(42, "Camión", None)
        self.request = None

    def search_item(self, unit_id):
        return self.unit

    def load_vehicle_history(self, unit_id, time_from, time_to, *, load_count):
        self.request = (unit_id, time_from, time_to, load_count)
        return self.result


def msg(timestamp, latitude=4.7, longitude=-74.1, speed=0, heading=0):
    return WialonHistoryMessage(timestamp, latitude, longitude, speed, heading)


def test_history_query_requires_timezone_order_and_max_range():
    valid = VehicleHistoryQuery(start=START.isoformat(), end=END.isoformat())
    assert valid.start_at.tzinfo is not None
    with pytest.raises(ValueError, match="zona horaria"):
        VehicleHistoryQuery(start="2026-11-01T12:00:00", end="2026-11-01T13:00:00")
    with pytest.raises(ValueError, match="anterior"):
        VehicleHistoryQuery(start=END.isoformat(), end=START.isoformat())
    with pytest.raises(ValueError, match="7 días"):
        VehicleHistoryQuery(start=START.isoformat(), end=(START + MAX_HISTORY_RANGE + timedelta(seconds=1)).isoformat())


def test_history_is_ordered_and_maps_utc_speed_heading_and_status():
    later = int((START + timedelta(minutes=10)).timestamp())
    earlier = int(START.timestamp())
    gateway = FakeHistoryGateway(WialonHistoryResult([
        msg(later, speed=3.1, heading=90),
        msg(earlier, speed=2, heading=225),
    ], 2))
    result = history_service.get_vehicle_history(
        gateway, vehicle_id=42, start_at=START, end_at=END
    )
    assert gateway.request == (42, int(START.timestamp()), int(END.timestamp()), MAX_HISTORY_POINTS + 1)
    assert [point.timestamp for point in result.points] == [
        datetime.fromtimestamp(earlier, timezone.utc),
        datetime.fromtimestamp(later, timezone.utc),
    ]
    assert result.points[0].timestamp.tzinfo == timezone.utc
    assert result.points[0].speed_kmh == 2
    assert result.points[0].heading_cardinal == "SO"
    assert result.points[0].status is VehicleStatus.STOPPED
    assert result.points[1].status is VehicleStatus.MOVING


@pytest.mark.parametrize("latitude,longitude", [(91, 0), (0, 181), (None, -74)])
def test_mapper_discards_invalid_coordinates(latitude, longitude):
    assert map_history_point(msg(int(START.timestamp()), latitude, longitude)) is None


def test_empty_history_returns_empty_ordered_list():
    result = history_service.get_vehicle_history(
        FakeHistoryGateway(), vehicle_id=42, start_at=START, end_at=END
    )
    assert result.points == []
    assert result.total_points == 0


def test_wialon_count_above_limit_is_rejected():
    gateway = FakeHistoryGateway(WialonHistoryResult([], MAX_HISTORY_POINTS + 1))
    with pytest.raises(history_service.HistoryPointLimitExceeded):
        history_service.get_vehicle_history(
            gateway, vehicle_id=42, start_at=START, end_at=END
        )


def test_vehicle_missing_or_unavailable_is_not_found():
    gateway = FakeHistoryGateway(unit=None)
    gateway.unit = None
    with pytest.raises(history_service.VehicleUnavailableError):
        history_service.get_vehicle_history(
            gateway, vehicle_id=42, start_at=START, end_at=END
        )


def test_service_validates_dates_independently_of_http_schema():
    with pytest.raises(ValueError):
        history_service.get_vehicle_history(
            FakeHistoryGateway(), vehicle_id=42,
            start_at=START, end_at=START + MAX_HISTORY_RANGE + timedelta(seconds=1),
        )
