from datetime import datetime, timezone
from typing import Protocol

from app.core.history import MAX_HISTORY_POINTS, MAX_HISTORY_RANGE
from app.dto.history import VehicleHistoryDTO
from app.gateways.wialon.dto import WialonHistoryResult, WialonUnit
from app.gateways.wialon.exceptions import WialonApiError
from app.mappers.history_mapper import map_history_point


class HistoryGateway(Protocol):
    def search_item(self, unit_id: int) -> WialonUnit | None: ...

    def load_vehicle_history(
        self, unit_id: int, time_from: int, time_to: int, *, load_count: int
    ) -> WialonHistoryResult: ...


class VehicleUnavailableError(Exception):
    pass


class HistoryPointLimitExceeded(Exception):
    pass


def get_vehicle_history(
    gateway: HistoryGateway,
    *,
    vehicle_id: int,
    start_at: datetime,
    end_at: datetime,
) -> VehicleHistoryDTO:
    if start_at.tzinfo is None or start_at.utcoffset() is None:
        raise ValueError("start debe incluir una zona horaria.")
    if end_at.tzinfo is None or end_at.utcoffset() is None:
        raise ValueError("end debe incluir una zona horaria.")
    start_utc = start_at.astimezone(timezone.utc)
    end_utc = end_at.astimezone(timezone.utc)
    if start_utc >= end_utc:
        raise ValueError("start debe ser anterior a end.")
    if end_utc - start_utc > MAX_HISTORY_RANGE:
        raise ValueError("El rango de historial no puede superar 7 días.")
    try:
        unit = gateway.search_item(vehicle_id)
    except WialonApiError as exc:
        if exc.code == 7:
            raise VehicleUnavailableError(
                "Vehículo inexistente o no disponible."
            ) from exc
        raise
    if unit is None or unit.id != vehicle_id:
        raise VehicleUnavailableError("Vehículo inexistente o no disponible.")

    try:
        result = gateway.load_vehicle_history(
            vehicle_id,
            int(start_utc.timestamp()),
            int(end_utc.timestamp()),
            load_count=MAX_HISTORY_POINTS + 1,
        )
    except WialonApiError as exc:
        if exc.code == 7:
            raise VehicleUnavailableError(
                "Vehículo inexistente o sin historial disponible."
            ) from exc
        raise
    if result.total > MAX_HISTORY_POINTS:
        raise HistoryPointLimitExceeded(
            "El periodo contiene demasiados puntos; consulta un rango más corto."
        )

    points = []
    for message in result.messages:
        point = map_history_point(message)
        if point is not None and start_utc <= point.timestamp <= end_utc:
            points.append(point)
    points.sort(key=lambda point: point.timestamp)
    return VehicleHistoryDTO(
        vehicle_id=vehicle_id,
        start_at=start_utc,
        end_at=end_utc,
        points=points,
        total_points=len(points),
    )
