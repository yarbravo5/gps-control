from datetime import datetime, timezone
from typing import Protocol

from app.core.config import settings
from app.core.time import get_current_utc_datetime
from app.dto.vehicle import (
    VehicleDetailDTO,
    VehicleDriverDTO,
    VehiclePageDTO,
    VehiclePassengerDTO,
    VehicleStatus,
)
from app.gateways.wialon.dto import (
    WialonResourceSearchResult,
    WialonUnit,
    WialonUnitDriver,
    WialonUnitSearchResult,
)
from app.mappers.vehicle_mapper import map_vehicle


class VehicleGateway(Protocol):
    def search_items(
        self, query: str | None, offset: int, limit: int
    ) -> WialonUnitSearchResult: ...

    def search_item(self, unit_id: int) -> WialonUnit | None: ...
    def get_unit_drivers_for_all_resources(self, unit_id: int) -> list[WialonUnitDriver]: ...
    def search_resources(self, offset: int, limit: int) -> WialonResourceSearchResult: ...


def list_vehicles(
    gateway: VehicleGateway,
    *,
    query: str | None,
    status: VehicleStatus | None,
    offset: int,
    limit: int,
    now: datetime | None = None,
) -> VehiclePageDTO:
    current_time = now or get_current_utc_datetime()
    if current_time.tzinfo is None:
        current_time = current_time.replace(tzinfo=timezone.utc)

    if status is None:
        result = gateway.search_items(query, offset, limit)
        vehicles = [
            map_vehicle(
                unit,
                now=current_time,
                no_signal_after_seconds=settings.wialon_no_signal_after_seconds,
            )
            for unit in result.items
        ]
        return VehiclePageDTO(
            items=vehicles,
            total=result.total,
            offset=offset,
            limit=limit,
        )

    # Status is derived locally; scan matching units before paginating to keep totals accurate.
    matched = []
    scan_offset = 0
    scan_size = 100
    total = 0
    while True:
        result = gateway.search_items(query, scan_offset, scan_size)
        total = result.total
        if not result.items:
            break
        matched.extend(
            vehicle
            for unit in result.items
            if (
                vehicle := map_vehicle(
                    unit,
                    now=current_time,
                    no_signal_after_seconds=settings.wialon_no_signal_after_seconds,
                )
            ).status
            == status
        )
        scan_offset += len(result.items)
        if scan_offset >= total:
            break
    return VehiclePageDTO(
        items=matched[offset : offset + limit],
        total=len(matched),
        offset=offset,
        limit=limit,
    )


def get_vehicle_detail(
    gateway: VehicleGateway,
    *,
    vehicle_id: int,
    now: datetime | None = None,
) -> VehicleDetailDTO | None:
    unit = gateway.search_item(vehicle_id)
    if unit is None:
        return None
    current_time = now or get_current_utc_datetime()
    if current_time.tzinfo is None:
        current_time = current_time.replace(tzinfo=timezone.utc)
    vehicle = map_vehicle(
        unit,
        now=current_time,
        no_signal_after_seconds=settings.wialon_no_signal_after_seconds,
    )
    drivers = [
        VehicleDriverDTO(id=driver.id, name=driver.name, phone=driver.phone)
        for driver in gateway.get_unit_drivers_for_all_resources(vehicle_id)
    ]
    passengers = []
    offset = 0
    while True:
        resource_page = gateway.search_resources(offset, 100)
        passengers.extend(
            VehiclePassengerDTO(id=passenger.id, name=passenger.name, code=passenger.code)
            for resource in resource_page.items
            for passenger in resource.passengers
            if passenger.bound_unit_id == vehicle_id
        )
        if not resource_page.items or offset + len(resource_page.items) >= resource_page.total:
            break
        offset += len(resource_page.items)
    return VehicleDetailDTO(vehicle=vehicle, drivers=drivers, passengers=passengers)
