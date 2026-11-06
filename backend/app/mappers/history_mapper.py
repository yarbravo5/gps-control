import math
from datetime import datetime, timezone

from app.dto.history import HistoryPointDTO
from app.gateways.wialon.dto import WialonHistoryMessage
from app.mappers.vehicle_mapper import heading_to_direction, motion_status


def map_history_point(message: WialonHistoryMessage) -> HistoryPointDTO | None:
    latitude, longitude = message.latitude, message.longitude
    if (
        latitude is None
        or longitude is None
        or not math.isfinite(latitude)
        or not math.isfinite(longitude)
        or not -90 <= latitude <= 90
        or not -180 <= longitude <= 180
    ):
        return None
    try:
        timestamp = datetime.fromtimestamp(message.timestamp, tz=timezone.utc)
    except (OverflowError, OSError, ValueError):
        return None
    speed = message.speed_kmh
    if speed is not None and (not math.isfinite(speed) or speed < 0):
        speed = None
    heading = message.heading_degrees
    if heading is not None and not math.isfinite(heading):
        heading = None
    return HistoryPointDTO(
        timestamp=timestamp,
        latitude=latitude,
        longitude=longitude,
        speed_kmh=speed,
        heading_degrees=heading,
        heading_cardinal=heading_to_direction(heading),
        status=motion_status(speed),
    )
