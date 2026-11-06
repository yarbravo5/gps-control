from datetime import datetime
from pydantic import BaseModel, ConfigDict

from app.dto.vehicle import VehicleStatus


class VehicleResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    latitude: float | None
    longitude: float | None
    speed_kmh: float | None
    heading_degrees: float | None
    direction: str | None
    last_communication: datetime | None
    status: VehicleStatus


class VehicleListResponse(BaseModel):
    items: list[VehicleResponse]
    total: int
    offset: int
    limit: int
