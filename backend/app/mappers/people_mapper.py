from app.dto.people import BindingDTO, DriverDTO, PassengerDTO
from app.gateways.wialon.dto import (
    WialonBindingEvent,
    WialonDriver,
    WialonPassenger,
)


def map_driver(resource_id: int, driver: WialonDriver) -> DriverDTO:
    return DriverDTO(
        id=driver.id,
        resource_id=resource_id,
        name=driver.name,
        code=driver.code,
        description=driver.description,
        phone=driver.phone,
        custom_fields=dict(driver.custom_fields),
        bound_unit_id=driver.bound_unit_id,
    )


def map_passenger(resource_id: int, passenger: WialonPassenger) -> PassengerDTO:
    return PassengerDTO(
        id=passenger.id,
        resource_id=resource_id,
        name=passenger.name,
        code=passenger.code,
        timezone=passenger.timezone,
        custom_fields=dict(passenger.custom_fields),
        bound_unit_id=passenger.bound_unit_id,
    )


def map_binding(event: WialonBindingEvent) -> BindingDTO:
    return BindingDTO(
        subject_id=event.subject_id or 0,
        timestamp=event.timestamp,
        unit_id=event.unit_id,
        previous_unit_id=event.previous_unit_id,
    )
