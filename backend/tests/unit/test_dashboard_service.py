from datetime import datetime, timezone

from app.gateways.wialon.dto import (
    WialonPosition,
    WialonResourceSearchResult,
    WialonUnit,
    WialonUnitSearchResult,
    resource_from_wialon,
)
from app.services.dashboard_service import get_fleet_dashboard


NOW = datetime(2026, 11, 7, 12, 0, tzinfo=timezone.utc)
FRESH = int(NOW.timestamp()) - 30


class FakeDashboardGateway:
    def search_items(self, query, offset, limit):
        units = [
            WialonUnit(1, "En movimiento", WialonPosition(FRESH, 4.7, -74.1, 25, 90), FRESH),
            WialonUnit(2, "Detenido", WialonPosition(FRESH, 4.8, -74.2, 0, 180), FRESH),
            WialonUnit(3, "Sin señal", WialonPosition(FRESH - 700, 4.9, -74.3, 0, 0), FRESH - 700),
        ]
        page = units[offset : offset + limit]
        return WialonUnitSearchResult(page, len(units))

    def search_resources(self, offset, limit):
        resource = resource_from_wialon({
            "id": 20,
            "nm": "Flota",
            "drvrs": {
                "7": {"id": 7, "n": "Ana", "bu": 1},
                "8": {"id": 8, "n": "Sin unidad"},
            },
            "tags": {"9": {"id": 9, "n": "Luis", "tz": 0, "ck": 0, "f": 0, "art": 0}},
        })
        return WialonResourceSearchResult([resource] if offset == 0 else [], 1)


def test_dashboard_aggregates_live_vehicle_states_and_resource_people() -> None:
    result = get_fleet_dashboard(FakeDashboardGateway(), now=NOW)

    assert result.total_vehicles == 3
    assert result.moving_vehicles == 1
    assert result.stopped_vehicles == 1
    assert result.no_signal_vehicles == 1
    assert result.vehicles_with_driver == 1
    assert result.vehicles_without_driver == 2
    assert result.total_drivers == 2
    assert result.total_passengers == 1


def test_dashboard_returns_zero_totals_for_empty_wialon_account() -> None:
    class EmptyGateway(FakeDashboardGateway):
        def search_items(self, query, offset, limit):
            return WialonUnitSearchResult([], 0)

        def search_resources(self, offset, limit):
            return WialonResourceSearchResult([], 0)

    result = get_fleet_dashboard(EmptyGateway(), now=NOW)

    assert result.total_vehicles == 0
    assert result.vehicles_without_driver == 0
    assert result.total_drivers == 0
    assert result.total_passengers == 0