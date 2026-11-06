from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.core.config import settings
from app.core.dependencies import require_permission
from app.gateways.wialon import WialonClient
from app.gateways.wialon.exceptions import WialonIntegrationError
from app.models import User
from app.schemas.vehicle import VehicleListResponse, VehicleResponse, VehicleStatus
from app.services import vehicle_service


router = APIRouter(prefix="/vehicles", tags=["vehicles"])

_wialon_gateway = WialonClient(
    token=settings.wialon_token,
    host=settings.wialon_host,
    timeout_seconds=settings.wialon_http_timeout_seconds,
)


def get_wialon_gateway() -> WialonClient:
    return _wialon_gateway


@router.get("", response_model=VehicleListResponse)
def list_vehicles(
    query: str | None = Query(
        default=None,
        alias="q",
        max_length=100,
        pattern=r"^[^*|,><=]*$",
    ),
    vehicle_status: VehicleStatus | None = Query(default=None, alias="status"),
    offset: int = Query(default=0, ge=0, le=100_000),
    limit: int = Query(default=50, ge=1, le=100),
    _current_user: User = Depends(require_permission("vehicles:view")),
    gateway: WialonClient = Depends(get_wialon_gateway),
) -> VehicleListResponse:
    try:
        result = vehicle_service.list_vehicles(
            gateway,
            query=query.strip() if query and query.strip() else None,
            status=vehicle_status,
            offset=offset,
            limit=limit,
        )
        return VehicleListResponse(
            items=[VehicleResponse.model_validate(vehicle) for vehicle in result.items],
            total=result.total,
            offset=result.offset,
            limit=result.limit,
        )
    except WialonIntegrationError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="No fue posible consultar la flota en este momento.",
        ) from exc
