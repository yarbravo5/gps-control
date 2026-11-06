from fastapi import APIRouter, Depends, HTTPException, Query, Response, status

from app.api.v1.vehicles import get_wialon_gateway
from app.core.dependencies import require_permission
from app.dto.people import PassengerDTO
from app.gateways.wialon import WialonClient
from app.gateways.wialon.exceptions import WialonIntegrationError
from app.models import User
from app.schemas.people import (
    BindingHistoryQuery,
    BindingRequest,
    BindingResponse,
    PassengerCreate,
    PassengerCustomFieldsUpdate,
    PassengerListResponse,
    PassengerResponse,
    PassengerUpdate,
)
from app.services import people_service


router = APIRouter(prefix="/passengers", tags=["passengers"])


def _raise_people_error(exc: Exception) -> HTTPException:
    if isinstance(exc, people_service.PersonNotFoundError):
        return HTTPException(status_code=404, detail=str(exc))
    if isinstance(exc, people_service.PersonAlreadyBoundError):
        return HTTPException(status_code=409, detail=str(exc))
    if isinstance(exc, people_service.UnsafePartialUpdateError):
        return HTTPException(status_code=409, detail=str(exc))
    if isinstance(exc, people_service.InvalidAutomaticUnitUpdateError):
        return HTTPException(status_code=422, detail=str(exc))
    if isinstance(exc, WialonIntegrationError):
        return HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="No fue posible completar la operación de pasajeros.",
        )
    return HTTPException(status_code=500, detail="No fue posible completar la operación.")


def _passenger_response(passenger: PassengerDTO) -> PassengerResponse:
    return PassengerResponse.model_validate(passenger)


@router.get("", response_model=PassengerListResponse)
def list_passengers(
    resource_id: int = Query(gt=0),
    q: str | None = Query(default=None, max_length=100),
    offset: int = Query(default=0, ge=0, le=100_000),
    limit: int = Query(default=50, ge=1, le=100),
    _current_user: User = Depends(require_permission("passengers:view")),
    gateway: WialonClient = Depends(get_wialon_gateway),
) -> PassengerListResponse:
    try:
        items, total = people_service.list_passengers(
            gateway,
            resource_id=resource_id,
            query=q.strip() if q and q.strip() else None,
            offset=offset,
            limit=limit,
        )
        return PassengerListResponse(
            items=[_passenger_response(item) for item in items],
            total=total,
            offset=offset,
            limit=limit,
        )
    except Exception as exc:
        raise _raise_people_error(exc) from exc


@router.post("", response_model=PassengerResponse, status_code=status.HTTP_201_CREATED)
def create_passenger(
    payload: PassengerCreate,
    _current_user: User = Depends(require_permission("passengers:write")),
    gateway: WialonClient = Depends(get_wialon_gateway),
) -> PassengerResponse:
    try:
        passenger = people_service.create_passenger(
            gateway,
            resource_id=payload.resource_id,
            fields=payload.model_dump(exclude={"resource_id"}),
        )
        return _passenger_response(passenger)
    except Exception as exc:
        raise _raise_people_error(exc) from exc


@router.get("/{passenger_id}", response_model=PassengerResponse)
def get_passenger(
    passenger_id: int,
    resource_id: int = Query(gt=0),
    _current_user: User = Depends(require_permission("passengers:view")),
    gateway: WialonClient = Depends(get_wialon_gateway),
) -> PassengerResponse:
    try:
        return _passenger_response(
            people_service.get_passenger(
                gateway, resource_id=resource_id, passenger_id=passenger_id
            )
        )
    except Exception as exc:
        raise _raise_people_error(exc) from exc


@router.patch("/{passenger_id}", response_model=PassengerResponse)
def update_passenger(
    passenger_id: int,
    payload: PassengerUpdate,
    resource_id: int = Query(gt=0),
    _current_user: User = Depends(require_permission("passengers:write")),
    gateway: WialonClient = Depends(get_wialon_gateway),
) -> PassengerResponse:
    try:
        changes = {
            field: getattr(payload, field)
            for field in payload.model_fields_set
            if field != "phone"
        }
        passenger = people_service.update_passenger(
            gateway,
            resource_id=resource_id,
            passenger_id=passenger_id,
            changes=changes,
            phone=payload.phone,
        )
        return _passenger_response(passenger)
    except Exception as exc:
        raise _raise_people_error(exc) from exc


@router.patch("/{passenger_id}/custom-fields", response_model=PassengerResponse)
def update_passenger_custom_fields(
    passenger_id: int,
    payload: PassengerCustomFieldsUpdate,
    resource_id: int = Query(gt=0),
    _current_user: User = Depends(require_permission("passengers:write")),
    gateway: WialonClient = Depends(get_wialon_gateway),
) -> PassengerResponse:
    try:
        passenger = people_service.update_passenger(
            gateway,
            resource_id=resource_id,
            passenger_id=passenger_id,
            changes={
                "custom_fields": payload.custom_fields,
                "remove_custom_fields": payload.remove_custom_fields,
            },
            phone=payload.phone,
        )
        return _passenger_response(passenger)
    except Exception as exc:
        raise _raise_people_error(exc) from exc


@router.delete("/{passenger_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_passenger(
    passenger_id: int,
    resource_id: int = Query(gt=0),
    _current_user: User = Depends(require_permission("passengers:write")),
    gateway: WialonClient = Depends(get_wialon_gateway),
) -> Response:
    try:
        people_service.delete_passenger(
            gateway, resource_id=resource_id, passenger_id=passenger_id
        )
    except Exception as exc:
        raise _raise_people_error(exc) from exc
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/units/{unit_id}", response_model=list[PassengerResponse])
def list_unit_passengers(
    unit_id: int,
    resource_id: int = Query(gt=0),
    _current_user: User = Depends(require_permission("passengers:view")),
    gateway: WialonClient = Depends(get_wialon_gateway),
) -> list[PassengerResponse]:
    try:
        items = people_service.list_unit_passengers(
            gateway, resource_id=resource_id, unit_id=unit_id
        )
        return [_passenger_response(item) for item in items]
    except Exception as exc:
        raise _raise_people_error(exc) from exc


@router.post("/{passenger_id}/bindings", status_code=status.HTTP_204_NO_CONTENT)
def bind_passenger(
    passenger_id: int,
    payload: BindingRequest,
    _current_user: User = Depends(require_permission("passengers:bind")),
    gateway: WialonClient = Depends(get_wialon_gateway),
) -> Response:
    try:
        people_service.bind_passenger(
            gateway,
            resource_id=payload.resource_id,
            passenger_id=passenger_id,
            unit_id=payload.unit_id,
            bind=True,
            time=payload.time,
        )
    except Exception as exc:
        raise _raise_people_error(exc) from exc
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.delete("/{passenger_id}/bindings", status_code=status.HTTP_204_NO_CONTENT)
def unbind_passenger(
    passenger_id: int,
    payload: BindingRequest,
    _current_user: User = Depends(require_permission("passengers:bind")),
    gateway: WialonClient = Depends(get_wialon_gateway),
) -> Response:
    try:
        people_service.bind_passenger(
            gateway,
            resource_id=payload.resource_id,
            passenger_id=passenger_id,
            unit_id=payload.unit_id,
            bind=False,
            time=payload.time,
        )
    except Exception as exc:
        raise _raise_people_error(exc) from exc
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/{passenger_id}/bindings", response_model=list[BindingResponse])
def passenger_binding_history(
    passenger_id: int,
    filters: BindingHistoryQuery = Depends(),
    _current_user: User = Depends(require_permission("passengers:view")),
    gateway: WialonClient = Depends(get_wialon_gateway),
) -> list[BindingResponse]:
    try:
        events = people_service.passenger_binding_history(
            gateway,
            resource_id=filters.resource_id,
            unit_id=filters.unit_id,
            passenger_id=passenger_id,
            time_from=filters.time_from,
            time_to=filters.time_to,
        )
        return [BindingResponse.model_validate(event) for event in events]
    except Exception as exc:
        raise _raise_people_error(exc) from exc
