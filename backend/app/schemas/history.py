from datetime import datetime, timezone

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.core.history import MAX_HISTORY_RANGE
from app.dto.vehicle import VehicleStatus


class VehicleHistoryQuery(BaseModel):
    start_at: datetime = Field(alias="start")
    end_at: datetime = Field(alias="end")

    @model_validator(mode="after")
    def validate_interval(self):
        if self.start_at.tzinfo is None or self.start_at.utcoffset() is None:
            raise ValueError("start debe incluir una zona horaria.")
        if self.end_at.tzinfo is None or self.end_at.utcoffset() is None:
            raise ValueError("end debe incluir una zona horaria.")
        start = self.start_at.astimezone(timezone.utc)
        end = self.end_at.astimezone(timezone.utc)
        if start >= end:
            raise ValueError("start debe ser anterior a end.")
        if end - start > MAX_HISTORY_RANGE:
            raise ValueError("El rango de historial no puede superar 7 días.")
        return self


class HistoryPointResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    timestamp: datetime
    latitude: float
    longitude: float
    speed_kmh: float | None
    heading_degrees: float | None
    heading_cardinal: str | None
    status: VehicleStatus


class VehicleHistoryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    vehicle_id: int
    start_at: datetime
    end_at: datetime
    total_points: int
    points: list[HistoryPointResponse]
