from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Path, Query, status

from app.core.config import settings
from app.core.dependencies import require_permission
from app.gateways.wialon import WialonClient
from app.gateways.wialon.exceptions import WialonIntegrationError
from app.models import User
from app.schemas.history import VehicleHistoryQuery, VehicleHistoryResponse
from app.schemas.vehicle import (
    VehicleCustomFieldsUpdate,
    VehicleDetailResponse,
    VehicleListResponse,
    VehicleResponse,
    VehicleStatus,
)
from app.services import history_service, vehicle_service


router = APIRouter(prefix="/vehicles", tags=["vehicles"])

_wialon_gateway = WialonClient(
    token=settings.wialon_token.get_secret_value(),
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


@router.get("/{vehicle_id}/history", response_model=VehicleHistoryResponse)
def get_vehicle_history(
    filters: Annotated[VehicleHistoryQuery, Query()],
    vehicle_id: int = Path(gt=0),
    _current_user: User = Depends(require_permission("history:view")),
    gateway: WialonClient = Depends(get_wialon_gateway),
) -> VehicleHistoryResponse:
    try:
        result = history_service.get_vehicle_history(
            gateway,
            vehicle_id=vehicle_id,
            start_at=filters.start_at,
            end_at=filters.end_at,
        )
        return VehicleHistoryResponse.model_validate(result)
    except history_service.VehicleUnavailableError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except history_service.HistoryPointLimitExceeded as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except WialonIntegrationError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="No fue posible consultar el historial del vehículo.",
        ) from exc


@router.patch("/{vehicle_id}/custom-fields", response_model=VehicleDetailResponse)
def update_vehicle_custom_fields(
    payload: VehicleCustomFieldsUpdate,
    vehicle_id: int = Path(gt=0),
    _current_user: User = Depends(require_permission("vehicles:custom_fields:write")),
    gateway: WialonClient = Depends(get_wialon_gateway),
) -> VehicleDetailResponse:
    try:
        detail = vehicle_service.update_vehicle_custom_fields(
            gateway,
            vehicle_id=vehicle_id,
            fields=[field.model_dump() for field in payload.fields],
            remove_field_ids=payload.remove_field_ids,
        )
        return _detail_response(detail)
    except (
        vehicle_service.VehicleNotFoundError,
        vehicle_service.CustomFieldNotFoundError,
    ) as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except (
        vehicle_service.CustomFieldConflictError,
        vehicle_service.UnsafeCustomFieldUpdateError,
    ) as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except WialonIntegrationError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="No fue posible actualizar los campos personalizados del vehículo.",
        ) from exc


@router.get("/{vehicle_id}", response_model=VehicleDetailResponse)
def get_vehicle(
    vehicle_id: int = Path(gt=0),
    _current_user: User = Depends(require_permission("vehicles:view")),
    gateway: WialonClient = Depends(get_wialon_gateway),
) -> VehicleDetailResponse:
    try:
        detail = vehicle_service.get_vehicle_detail(gateway, vehicle_id=vehicle_id)
        if detail is None:
            raise HTTPException(status_code=404, detail="Vehículo no encontrado.")
        return _detail_response(detail)
    except WialonIntegrationError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="No fue posible consultar el detalle del vehículo.",
        ) from exc


def _detail_response(detail: vehicle_service.VehicleDetailDTO) -> VehicleDetailResponse:
    return VehicleDetailResponse.model_validate({
        **detail.vehicle.__dict__,
        "drivers": [driver.__dict__ for driver in detail.drivers],
        "passengers": [passenger.__dict__ for passenger in detail.passengers],
    })
