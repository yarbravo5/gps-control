from dataclasses import dataclass


@dataclass(frozen=True)
class DriverDTO:
    id: int
    resource_id: int
    name: str
    code: str
    description: str
    phone: str
    custom_fields: dict[str, str]
    bound_unit_id: int | None


@dataclass(frozen=True)
class PassengerDTO:
    id: int
    resource_id: int
    name: str
    code: str
    timezone: int
    custom_fields: dict[str, str]
    bound_unit_id: int | None


@dataclass(frozen=True)
class BindingDTO:
    subject_id: int
    timestamp: int
    unit_id: int
    previous_unit_id: int | None = None


@dataclass(frozen=True)
class AutomaticUnitsDTO:
    resource_id: int
    unit_ids: list[int]


@dataclass(frozen=True)
class UnitPersonDTO:
    resource_id: int
    unit_id: int
    person_id: int
    name: str
    phone: str | None = None
