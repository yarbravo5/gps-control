from dataclasses import dataclass
from datetime import datetime

from app.dto.vehicle import VehicleStatus


@dataclass(frozen=True)
class HistoryPointDTO:
    timestamp: datetime
    latitude: float
    longitude: float
    speed_kmh: float | None
    heading_degrees: float | None
    heading_cardinal: str | None
    status: VehicleStatus


@dataclass(frozen=True)
class VehicleHistoryDTO:
    vehicle_id: int
    start_at: datetime
    end_at: datetime
    points: list[HistoryPointDTO]
    total_points: int
