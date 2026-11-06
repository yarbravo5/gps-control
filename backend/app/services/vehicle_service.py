from datetime import datetime, timezone
from typing import Protocol

from app.core.config import settings
from app.core.time import get_current_utc_datetime
from app.dto.vehicle import VehiclePageDTO, VehicleStatus
from app.gateways.wialon.dto import WialonUnitSearchResult
from app.mappers.vehicle_mapper import map_vehicle


class VehicleGateway(Protocol):
    def search_items(
        self, query: str | None, offset: int, limit: int
    ) -> WialonUnitSearchResult: ...


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
