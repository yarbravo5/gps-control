from typing import Protocol

from app.dto.people import (
    AutomaticUnitsDTO,
    BindingDTO,
    DriverDTO,
    PassengerDTO,
    UnitPersonDTO,
)
from app.mappers.people_mapper import map_binding, map_driver, map_passenger


class PeopleGateway(Protocol):
    def search_item(self, unit_id: int): ...
    def list_drivers(self, resource_id: int, query: str | None, offset: int, limit: int): ...
    def get_driver(self, resource_id: int, driver_id: int): ...
    def create_driver(self, resource_id: int, **fields): ...
    def update_driver(self, resource_id: int, driver_id: int, **fields): ...
    def delete_driver(self, resource_id: int, driver_id: int) -> None: ...
    def get_unit_drivers(self, unit_id: int, resource_id: int): ...
    def bind_driver(self, resource_id: int, driver_id: int, unit_id: int, *, bind: bool, time: int = 0) -> None: ...
    def get_driver_bindings(self, resource_id: int, **filters): ...
    def set_driver_auto_units(self, resource_id: int, unit_ids: list[int]): ...
    def get_driver_auto_units(self, resource_id: int) -> tuple[bool, list[int]]: ...
    def list_passengers(self, resource_id: int, query: str | None, offset: int, limit: int): ...
    def get_passenger(self, resource_id: int, passenger_id: int): ...
    def create_passenger(self, resource_id: int, **fields): ...
    def update_passenger(self, resource_id: int, passenger_id: int, **fields): ...
    def delete_passenger(self, resource_id: int, passenger_id: int) -> None: ...
    def get_unit_passengers(self, unit_id: int, resource_id: int): ...
    def bind_passenger(self, resource_id: int, passenger_id: int, unit_id: int, *, bind: bool, time: int = 0) -> None: ...
    def get_passenger_bindings(self, resource_id: int, **filters): ...


class PersonNotFoundError(Exception):
    pass


class PersonAlreadyBoundError(Exception):
    pass


class VehicleNotFoundError(Exception):
    pass


class BindingConflictError(Exception):
    pass


class UnsafePartialUpdateError(Exception):
    pass


class InvalidAutomaticUnitUpdateError(Exception):
    pass


def list_drivers(
    gateway: PeopleGateway, *, resource_id: int, query: str | None,
    offset: int, limit: int,
) -> tuple[list[DriverDTO], int]:
    drivers, total = gateway.list_drivers(resource_id, query, offset, limit)
    return [map_driver(resource_id, driver) for driver in drivers], total


def get_driver(gateway: PeopleGateway, *, resource_id: int, driver_id: int) -> DriverDTO:
    driver = gateway.get_driver(resource_id, driver_id)
    if driver is None:
        raise PersonNotFoundError("Conductor no encontrado.")
    return map_driver(resource_id, driver)


def create_driver(gateway: PeopleGateway, *, resource_id: int, fields: dict) -> DriverDTO:
    driver = gateway.create_driver(resource_id, **fields)
    return map_driver(resource_id, driver)


def update_driver(
    gateway: PeopleGateway, *, resource_id: int, driver_id: int,
    changes: dict[str, object],
) -> DriverDTO:
    current = gateway.get_driver(resource_id, driver_id)
    if current is None:
        raise PersonNotFoundError("Conductor no encontrado.")

    required = {"n": "name", "c": "code", "ds": "description", "p": "phone", "f": "flags"}
    missing = [wire_name for wire_name in required if wire_name not in current.available_fields]
    if missing:
        raise UnsafePartialUpdateError(
            "Wialon no devolvió todos los campos necesarios para preservar el conductor."
        )
    if "pwd" not in current.available_fields and "mobile_password" not in changes:
        raise UnsafePartialUpdateError(
            "Para preservar la contraseña móvil, inclúyela explícitamente en la actualización."
        )

    should_update_custom = "custom_fields" in changes or "remove_custom_fields" in changes
    if should_update_custom and "jp" not in current.available_fields:
        raise UnsafePartialUpdateError(
            "Wialon no devolvió los campos personalizados actuales del conductor."
        )

    custom_fields = dict(current.custom_fields)
    custom_fields.update(changes.get("custom_fields", {}))
    for field_name in changes.get("remove_custom_fields", []):
        custom_fields.pop(field_name, None)

    updated = gateway.update_driver(
        resource_id,
        driver_id,
        name=changes.get("name", current.name),
        code=changes.get("code", current.code),
        description=changes.get("description", current.description),
        phone=changes.get("phone", current.phone),
        mobile_password=changes.get("mobile_password", current.mobile_password or ""),
        custom_fields=custom_fields if should_update_custom else None,
        flags=current.flags,
    )
    return map_driver(resource_id, updated)


def delete_driver(gateway: PeopleGateway, *, resource_id: int, driver_id: int) -> None:
    current = gateway.get_driver(resource_id, driver_id)
    if current is None:
        raise PersonNotFoundError("Conductor no encontrado.")
    if "bu" not in current.available_fields:
        raise UnsafePartialUpdateError(
            "Wialon no confirmó el estado de vinculación del conductor; se canceló la eliminación."
        )
    if current.bound_unit_id is not None:
        raise PersonAlreadyBoundError(
            "Desvincula el conductor del vehículo antes de eliminarlo."
        )
    gateway.delete_driver(resource_id, driver_id)


def list_unit_drivers(
    gateway: PeopleGateway, *, resource_id: int, unit_id: int
) -> list[UnitPersonDTO]:
    return [
        UnitPersonDTO(resource_id, unit_id, driver.id, driver.name, driver.phone)
        for driver in gateway.get_unit_drivers(unit_id, resource_id)
    ]


def bind_driver(
    gateway: PeopleGateway, *, resource_id: int, driver_id: int,
    unit_id: int, bind: bool, time: int = 0,
) -> None:
    current = gateway.get_driver(resource_id, driver_id)
    if current is None:
        raise PersonNotFoundError("Conductor no encontrado.")
    if "bu" not in current.available_fields:
        raise UnsafePartialUpdateError(
            "Wialon no confirmó la unidad vinculada del conductor; se canceló el cambio."
        )
    if gateway.search_item(unit_id) is None:
        raise VehicleNotFoundError("Vehículo no encontrado.")
    if bind and current.bound_unit_id is not None:
        raise PersonAlreadyBoundError(
            "Desvincula el conductor de su vehículo actual antes de asignarlo a otro."
        )
    if not bind and current.bound_unit_id != unit_id:
        raise BindingConflictError("El conductor no está vinculado a este vehículo.")
    gateway.bind_driver(resource_id, driver_id, unit_id, bind=bind, time=time)


def driver_binding_history(
    gateway: PeopleGateway, *, resource_id: int, unit_id: int,
    driver_id: int, time_from: int, time_to: int,
) -> list[BindingDTO]:
    return [
        map_binding(event)
        for event in gateway.get_driver_bindings(
            resource_id,
            unit_id=unit_id,
            driver_id=driver_id,
            time_from=time_from,
            time_to=time_to,
        )
    ]


def update_driver_automatic_units(
    gateway: PeopleGateway, *, resource_id: int,
    add_unit_ids: list[int], remove_unit_ids: list[int],
) -> AutomaticUnitsDTO:
    has_current_list, existing_unit_ids = gateway.get_driver_auto_units(resource_id)
    if not has_current_list:
        raise UnsafePartialUpdateError(
            "Wialon no devolvió la lista actual de unidades automáticas; se canceló el cambio."
        )
    current = set(existing_unit_ids)
    if set(add_unit_ids) & set(remove_unit_ids):
        raise InvalidAutomaticUnitUpdateError("Una unidad no puede agregarse y quitarse a la vez.")
    current.update(add_unit_ids)
    current.difference_update(remove_unit_ids)
    unit_ids = gateway.set_driver_auto_units(resource_id, sorted(current))
    return AutomaticUnitsDTO(resource_id, unit_ids)


def get_driver_automatic_units(
    gateway: PeopleGateway, *, resource_id: int
) -> AutomaticUnitsDTO:
    has_current_list, unit_ids = gateway.get_driver_auto_units(resource_id)
    if not has_current_list:
        raise UnsafePartialUpdateError(
            "Wialon no devolvió la lista de unidades automáticas."
        )
    return AutomaticUnitsDTO(resource_id, unit_ids)


def list_passengers(
    gateway: PeopleGateway, *, resource_id: int, query: str | None,
    offset: int, limit: int,
) -> tuple[list[PassengerDTO], int]:
    passengers, total = gateway.list_passengers(resource_id, query, offset, limit)
    return [map_passenger(resource_id, passenger) for passenger in passengers], total


def get_passenger(
    gateway: PeopleGateway, *, resource_id: int, passenger_id: int
) -> PassengerDTO:
    passenger = gateway.get_passenger(resource_id, passenger_id)
    if passenger is None:
        raise PersonNotFoundError("Pasajero no encontrado.")
    return map_passenger(resource_id, passenger)


def create_passenger(gateway: PeopleGateway, *, resource_id: int, fields: dict) -> PassengerDTO:
    passenger = gateway.create_passenger(resource_id, **fields)
    return map_passenger(resource_id, passenger)


def update_passenger(
    gateway: PeopleGateway, *, resource_id: int, passenger_id: int,
    changes: dict[str, object], phone: str,
) -> PassengerDTO:
    current = gateway.get_passenger(resource_id, passenger_id)
    if current is None:
        raise PersonNotFoundError("Pasajero no encontrado.")
    required = {"n", "c", "ck", "jp", "tz", "f", "art"}
    if not required.issubset(current.available_fields):
        raise UnsafePartialUpdateError(
            "Wialon no devolvió todos los campos necesarios para preservar el pasajero."
        )
    custom_fields = dict(current.custom_fields)
    custom_fields.update(changes.get("custom_fields", {}))
    for field_name in changes.get("remove_custom_fields", []):
        custom_fields.pop(field_name, None)
    updated = gateway.update_passenger(
        resource_id,
        passenger_id,
        name=changes.get("name", current.name),
        code=changes.get("code", current.code),
        phone=phone,
        timezone=changes.get("timezone", current.timezone),
        custom_fields=custom_fields,
        image_checksum=current.image_checksum,
        flags=current.flags,
        auto_reset_seconds=current.auto_reset_seconds,
    )
    return map_passenger(resource_id, updated)


def delete_passenger(gateway: PeopleGateway, *, resource_id: int, passenger_id: int) -> None:
    current = gateway.get_passenger(resource_id, passenger_id)
    if current is None:
        raise PersonNotFoundError("Pasajero no encontrado.")
    if "bu" not in current.available_fields:
        raise UnsafePartialUpdateError(
            "Wialon no confirmó el estado de vinculación del pasajero; se canceló la eliminación."
        )
    if current.bound_unit_id is not None:
        raise PersonAlreadyBoundError(
            "Desvincula el pasajero del vehículo antes de eliminarlo."
        )
    gateway.delete_passenger(resource_id, passenger_id)


def list_unit_passengers(
    gateway: PeopleGateway, *, resource_id: int, unit_id: int
) -> list[PassengerDTO]:
    return [
        map_passenger(resource_id, passenger)
        for passenger in gateway.get_unit_passengers(unit_id, resource_id)
    ]


def bind_passenger(
    gateway: PeopleGateway, *, resource_id: int, passenger_id: int,
    unit_id: int, bind: bool, time: int = 0,
) -> None:
    current = gateway.get_passenger(resource_id, passenger_id)
    if current is None:
        raise PersonNotFoundError("Pasajero no encontrado.")
    if "bu" not in current.available_fields:
        raise UnsafePartialUpdateError(
            "Wialon no confirmó el vehículo vinculado del pasajero; se canceló el cambio."
        )
    if gateway.search_item(unit_id) is None:
        raise VehicleNotFoundError("Vehículo no encontrado.")
    if bind and current.bound_unit_id is not None:
        raise PersonAlreadyBoundError(
            "Desvincula el pasajero de su vehículo actual antes de asignarlo a otro."
        )
    if not bind and current.bound_unit_id != unit_id:
        raise BindingConflictError("El pasajero no está vinculado a este vehículo.")
    gateway.bind_passenger(resource_id, passenger_id, unit_id, bind=bind, time=time)


def passenger_binding_history(
    gateway: PeopleGateway, *, resource_id: int, unit_id: int,
    passenger_id: int, time_from: int, time_to: int,
) -> list[BindingDTO]:
    return [
        map_binding(event)
        for event in gateway.get_passenger_bindings(
            resource_id,
            unit_id=unit_id,
            passenger_id=passenger_id,
            time_from=time_from,
            time_to=time_to,
        )
    ]


