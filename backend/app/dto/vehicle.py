from dataclasses import dataclass
from datetime import datetime
from enum import StrEnum


class VehicleStatus(StrEnum):
    MOVING = "moving"
    STOPPED = "stopped"
    NO_SIGNAL = "no_signal"


@dataclass(frozen=True)
class VehicleDTO:
    id: int
    name: str
    latitude: float | None
    longitude: float | None
    speed_kmh: float | None
    heading_degrees: float | None
    direction: str | None
    last_communication: datetime | None
    status: VehicleStatus


@dataclass(frozen=True)
class VehiclePageDTO:
    items: list[VehicleDTO]
    total: int
    offset: int
    limit: int


@dataclass(frozen=True)
class VehicleDriverDTO:
    id: int
    name: str
    phone: str | None


@dataclass(frozen=True)
class VehiclePassengerDTO:
    id: int
    name: str
    code: str


@dataclass(frozen=True)
class VehicleDetailDTO:
    vehicle: VehicleDTO
    drivers: list[VehicleDriverDTO]
    passengers: list[VehiclePassengerDTO]
