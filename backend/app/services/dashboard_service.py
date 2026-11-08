from datetime import datetime, timezone
from typing import Protocol

from app.core.config import settings
from app.core.time import get_current_utc_datetime
from app.dto.dashboard import FleetDashboardDTO
from app.dto.vehicle import VehicleStatus
from app.gateways.wialon.dto import WialonResourceSearchResult, WialonUnitSearchResult
from app.mappers.vehicle_mapper import map_vehicle


class DashboardGateway(Protocol):
    def search_items(
        self, query: str | None, offset: int, limit: int
    ) -> WialonUnitSearchResult: ...

    def search_resources(self, offset: int, limit: int) -> WialonResourceSearchResult: ...


def get_fleet_dashboard(
    gateway: DashboardGateway,
    *,
    now: datetime | None = None,
) -> FleetDashboardDTO:
    current_time = now or get_current_utc_datetime()
    if current_time.tzinfo is None:
        current_time = current_time.replace(tzinfo=timezone.utc)

    units = []
    offset = 0
    while True:
        page = gateway.search_items(None, offset, 100)
        units.extend(page.items)
        if not page.items or offset + len(page.items) >= page.total:
            break
        offset += len(page.items)

    resources = []
    offset = 0
    while True:
        page = gateway.search_resources(offset, 100)
        resources.extend(page.items)
        if not page.items or offset + len(page.items) >= page.total:
            break
        offset += len(page.items)

    vehicles = [
        map_vehicle(
            unit,
            now=current_time,
            no_signal_after_seconds=settings.wialon_no_signal_after_seconds,
        )
        for unit in units
    ]
    vehicle_ids = {vehicle.id for vehicle in vehicles}
    bound_unit_ids = {
        driver.bound_unit_id
        for resource in resources
        for driver in resource.drivers
        if driver.bound_unit_id is not None
    }
    vehicles_with_driver = len(vehicle_ids & bound_unit_ids)

    return FleetDashboardDTO(
        generated_at=current_time.astimezone(timezone.utc),
        total_vehicles=len(vehicles),
        moving_vehicles=sum(vehicle.status is VehicleStatus.MOVING for vehicle in vehicles),
        stopped_vehicles=sum(vehicle.status is VehicleStatus.STOPPED for vehicle in vehicles),
        no_signal_vehicles=sum(vehicle.status is VehicleStatus.NO_SIGNAL for vehicle in vehicles),
        vehicles_with_driver=vehicles_with_driver,
        vehicles_without_driver=len(vehicles) - vehicles_with_driver,
        total_drivers=sum(len(resource.drivers) for resource in resources),
        total_passengers=sum(len(resource.passengers) for resource in resources),
    )
