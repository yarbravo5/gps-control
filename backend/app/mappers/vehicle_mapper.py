from datetime import datetime, timedelta, timezone

from app.dto.vehicle import VehicleDTO, VehicleStatus
from app.gateways.wialon.dto import WialonUnit


DIRECTIONS = ("N", "NE", "E", "SE", "S", "SO", "O", "NO")
MOVING_SPEED_THRESHOLD_KMH = 3.0


def heading_to_direction(degrees: float | None) -> str | None:
    if degrees is None:
        return None
    sector = int(((degrees % 360) + 22.5) // 45) % len(DIRECTIONS)
    return DIRECTIONS[sector]


def map_vehicle(
    unit: WialonUnit,
    *,
    now: datetime,
    no_signal_after_seconds: int,
) -> VehicleDTO:
    now_utc = now.astimezone(timezone.utc) if now.tzinfo else now.replace(tzinfo=timezone.utc)
    position = unit.position
    timestamp = None
    latitude = longitude = speed = heading = None
    if position is not None:
        if unit.last_message_timestamp is not None:
            try:
                timestamp = datetime.fromtimestamp(
                    unit.last_message_timestamp, tz=timezone.utc
                )
            except (OverflowError, OSError, ValueError):
                timestamp = None
        latitude = position.latitude
        longitude = position.longitude
        speed = position.speed_kmh
        heading = position.heading_degrees

    valid_coordinates = (
        latitude is not None
        and longitude is not None
        and -90 <= latitude <= 90
        and -180 <= longitude <= 180
    )
    if not valid_coordinates:
        latitude = longitude = None

    is_stale = (
        timestamp is None
        or timestamp > now_utc
        or now_utc - timestamp > timedelta(seconds=no_signal_after_seconds)
    )
    if not valid_coordinates or is_stale:
        status = VehicleStatus.NO_SIGNAL
    elif (speed or 0.0) > MOVING_SPEED_THRESHOLD_KMH:
        status = VehicleStatus.MOVING
    else:
        status = VehicleStatus.STOPPED

    return VehicleDTO(
        id=unit.id,
        name=unit.name,
        latitude=latitude,
        longitude=longitude,
        speed_kmh=speed,
        heading_degrees=heading,
        direction=heading_to_direction(heading),
        last_communication=timestamp,
        status=status,
    )
