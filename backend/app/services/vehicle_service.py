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
    def update_unit_custom_field(
        self,
        unit_id: int,
        *,
        field_id: int,
        call_mode: str,
        name: str | None = None,
        value: str | None = None,
    ) -> None: ...


class VehicleNotFoundError(Exception):
    pass


class CustomFieldNotFoundError(Exception):
    pass


class CustomFieldConflictError(Exception):
    pass


class UnsafeCustomFieldUpdateError(Exception):
    pass


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


def update_vehicle_custom_fields(
    gateway: VehicleGateway,
    *,
    vehicle_id: int,
    fields: list[dict[str, object]],
    remove_field_ids: list[int],
) -> VehicleDetailDTO:
    unit = gateway.search_item(vehicle_id)
    if unit is None:
        raise VehicleNotFoundError("Vehículo no encontrado.")
    if "flds" not in unit.available_fields:
        raise UnsafeCustomFieldUpdateError(
            "Wialon no devolvió los campos personalizados actuales del vehículo."
        )

    existing = {field.id: field for field in unit.custom_fields}
    remove_set = set(remove_field_ids)
    update_ids = {
        field_id
        for field in fields
        if (field_id := field.get("id")) is not None and field_id != 0
    }
    missing = (remove_set | update_ids) - set(existing)
    if missing:
        raise CustomFieldNotFoundError(
            "Uno de los campos personalizados ya no existe en Wialon."
        )

    reserved_names = {
        field.name.casefold()
        for field in existing.values()
        if field.id not in update_ids and field.id not in remove_set
    }
    for field in fields:
        name = str(field["name"]).strip()
        if name.casefold() in reserved_names:
            raise CustomFieldConflictError(
                "Ya existe un campo personalizado con ese nombre en el vehículo."
            )
        reserved_names.add(name.casefold())

    for field_id in remove_set:
        gateway.update_unit_custom_field(
            vehicle_id, field_id=field_id, call_mode="delete"
        )
    for field in fields:
        field_id = field.get("id")
        gateway.update_unit_custom_field(
            vehicle_id,
            field_id=field_id if isinstance(field_id, int) and field_id > 0 else 0,
            call_mode="update" if field_id else "create",
            name=str(field["name"]).strip(),
            value=str(field["value"]),
        )

    detail = get_vehicle_detail(gateway, vehicle_id=vehicle_id)
    if detail is None:
        raise VehicleNotFoundError("Vehículo no encontrado.")
    return detail
