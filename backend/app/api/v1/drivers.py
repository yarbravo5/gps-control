from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status
from sqlalchemy.orm import Session

from app.api.v1.vehicles import get_wialon_gateway
from app.core.dependencies import require_permission
from app.core.request import get_client_ip
from app.db.session import get_database_session
from app.dto.people import DriverDTO
from app.gateways.wialon import WialonClient
from app.gateways.wialon.exceptions import WialonIntegrationError
from app.models import User
from app.schemas.people import (
    AutomaticUnitsResponse,
    AutomaticUnitsUpdate,
    BindingHistoryQuery,
    BindingRequest,
    BindingResponse,
    DriverCreate,
    DriverListResponse,
    DriverResponse,
    DriverUpdate,
    UnitPersonResponse,
)
from app.services import audit_service, people_service


router = APIRouter(prefix="/drivers", tags=["drivers"])


def _raise_people_error(exc: Exception) -> HTTPException:
    if isinstance(exc, people_service.PersonNotFoundError):
        return HTTPException(status_code=404, detail=str(exc))
    if isinstance(exc, people_service.PersonAlreadyBoundError):
        return HTTPException(status_code=409, detail=str(exc))
    if isinstance(exc, people_service.BindingConflictError):
        return HTTPException(status_code=409, detail=str(exc))
    if isinstance(exc, people_service.VehicleNotFoundError):
        return HTTPException(status_code=404, detail=str(exc))
    if isinstance(exc, people_service.UnsafePartialUpdateError):
        return HTTPException(status_code=409, detail=str(exc))
    if isinstance(exc, people_service.InvalidAutomaticUnitUpdateError):
        return HTTPException(status_code=422, detail=str(exc))
    if isinstance(exc, WialonIntegrationError):
        return HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="No fue posible completar la operación de conductores.",
        )
    return HTTPException(status_code=500, detail="No fue posible completar la operación.")


def _driver_response(driver: DriverDTO) -> DriverResponse:
    return DriverResponse.model_validate(driver)


@router.get("", response_model=DriverListResponse)
def list_drivers(
    resource_id: int = Query(gt=0),
    q: str | None = Query(default=None, max_length=100),
    offset: int = Query(default=0, ge=0, le=100_000),
    limit: int = Query(default=50, ge=1, le=100),
    _current_user: User = Depends(require_permission("drivers:view")),
    gateway: WialonClient = Depends(get_wialon_gateway),
) -> DriverListResponse:
    try:
        items, total = people_service.list_drivers(
            gateway,
            resource_id=resource_id,
            query=q.strip() if q and q.strip() else None,
            offset=offset,
            limit=limit,
        )
        return DriverListResponse(
            items=[_driver_response(item) for item in items],
            total=total,
            offset=offset,
            limit=limit,
        )
    except Exception as exc:
        raise _raise_people_error(exc) from exc


@router.post("", response_model=DriverResponse, status_code=status.HTTP_201_CREATED)
def create_driver(
    payload: DriverCreate,
    request: Request,
    current_user: User = Depends(require_permission("drivers:write")),
    gateway: WialonClient = Depends(get_wialon_gateway),
    database_session: Session = Depends(get_database_session),
) -> DriverResponse:
    try:
        driver = people_service.create_driver(
            gateway,
            resource_id=payload.resource_id,
            fields=payload.model_dump(exclude={"resource_id"}),
        )
        audit_service.record_audit_best_effort(
            database_session,
            user_id=current_user.id,
            action="driver.created",
            entity="driver",
            entity_id=str(driver.id),
            details={
                "resource_id": payload.resource_id,
                "name": driver.name,
                "custom_fields": sorted(driver.custom_fields),
            },
            ip_address=get_client_ip(request),
        )
        return _driver_response(driver)
    except Exception as exc:
        raise _raise_people_error(exc) from exc


@router.get("/{driver_id}", response_model=DriverResponse)
def get_driver(
    driver_id: int,
    resource_id: int = Query(gt=0),
    _current_user: User = Depends(require_permission("drivers:view")),
    gateway: WialonClient = Depends(get_wialon_gateway),
) -> DriverResponse:
    try:
        return _driver_response(
            people_service.get_driver(gateway, resource_id=resource_id, driver_id=driver_id)
        )
    except Exception as exc:
        raise _raise_people_error(exc) from exc


@router.patch("/{driver_id}", response_model=DriverResponse)
def update_driver(
    driver_id: int,
    payload: DriverUpdate,
    request: Request,
    resource_id: int = Query(gt=0),
    current_user: User = Depends(require_permission("drivers:write")),
    gateway: WialonClient = Depends(get_wialon_gateway),
    database_session: Session = Depends(get_database_session),
) -> DriverResponse:
    try:
        changes = {
            field: getattr(payload, field)
            for field in payload.model_fields_set
        }
        driver = people_service.update_driver(
            gateway,
            resource_id=resource_id,
            driver_id=driver_id,
            changes=changes,
        )
        audit_service.record_audit_best_effort(
            database_session,
            user_id=current_user.id,
            action="driver.updated",
            entity="driver",
            entity_id=str(driver_id),
            details={
                "resource_id": resource_id,
                "changed_fields": sorted(changes),
                "custom_fields": sorted(driver.custom_fields),
            },
            ip_address=get_client_ip(request),
        )
        return _driver_response(driver)
    except Exception as exc:
        raise _raise_people_error(exc) from exc


@router.delete("/{driver_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_driver(
    driver_id: int,
    request: Request,
    resource_id: int = Query(gt=0),
    current_user: User = Depends(require_permission("drivers:write")),
    gateway: WialonClient = Depends(get_wialon_gateway),
    database_session: Session = Depends(get_database_session),
) -> Response:
    try:
        people_service.delete_driver(gateway, resource_id=resource_id, driver_id=driver_id)
        audit_service.record_audit_best_effort(
            database_session,
            user_id=current_user.id,
            action="driver.deleted",
            entity="driver",
            entity_id=str(driver_id),
            details={"resource_id": resource_id},
            ip_address=get_client_ip(request),
        )
    except Exception as exc:
        raise _raise_people_error(exc) from exc
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/units/{unit_id}", response_model=list[UnitPersonResponse])
def list_unit_drivers(
    unit_id: int,
    resource_id: int = Query(gt=0),
    _current_user: User = Depends(require_permission("drivers:view")),
    gateway: WialonClient = Depends(get_wialon_gateway),
) -> list[UnitPersonResponse]:
    try:
        items = people_service.list_unit_drivers(
            gateway, resource_id=resource_id, unit_id=unit_id
        )
        return [UnitPersonResponse.model_validate(item) for item in items]
    except Exception as exc:
        raise _raise_people_error(exc) from exc


@router.post("/{driver_id}/bindings", status_code=status.HTTP_204_NO_CONTENT)
def bind_driver(
    driver_id: int,
    payload: BindingRequest,
    request: Request,
    current_user: User = Depends(require_permission("drivers:bind")),
    gateway: WialonClient = Depends(get_wialon_gateway),
    database_session: Session = Depends(get_database_session),
) -> Response:
    try:
        people_service.bind_driver(
            gateway,
            resource_id=payload.resource_id,
            driver_id=driver_id,
            unit_id=payload.unit_id,
            bind=True,
            time=payload.time,
        )
        audit_service.record_audit_best_effort(
            database_session,
            user_id=current_user.id,
            action="driver.bound",
            entity="driver",
            entity_id=str(driver_id),
            details={"resource_id": payload.resource_id, "unit_id": payload.unit_id},
            ip_address=get_client_ip(request),
        )
    except Exception as exc:
        raise _raise_people_error(exc) from exc
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.delete("/{driver_id}/bindings", status_code=status.HTTP_204_NO_CONTENT)
def unbind_driver(
    driver_id: int,
    payload: BindingRequest,
    request: Request,
    current_user: User = Depends(require_permission("drivers:bind")),
    gateway: WialonClient = Depends(get_wialon_gateway),
    database_session: Session = Depends(get_database_session),
) -> Response:
    try:
        people_service.bind_driver(
            gateway,
            resource_id=payload.resource_id,
            driver_id=driver_id,
            unit_id=payload.unit_id,
            bind=False,
            time=payload.time,
        )
        audit_service.record_audit_best_effort(
            database_session,
            user_id=current_user.id,
            action="driver.unbound",
            entity="driver",
            entity_id=str(driver_id),
            details={"resource_id": payload.resource_id, "unit_id": payload.unit_id},
            ip_address=get_client_ip(request),
        )
    except Exception as exc:
        raise _raise_people_error(exc) from exc
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/{driver_id}/bindings", response_model=list[BindingResponse])
def driver_binding_history(
    driver_id: int,
    filters: BindingHistoryQuery = Depends(),
    _current_user: User = Depends(require_permission("drivers:view")),
    gateway: WialonClient = Depends(get_wialon_gateway),
) -> list[BindingResponse]:
    try:
        events = people_service.driver_binding_history(
            gateway,
            resource_id=filters.resource_id,
            unit_id=filters.unit_id,
            driver_id=driver_id,
            time_from=filters.time_from,
            time_to=filters.time_to,
        )
        return [BindingResponse.model_validate(event) for event in events]
    except Exception as exc:
        raise _raise_people_error(exc) from exc


@router.get("/resources/{resource_id}/automatic-units", response_model=AutomaticUnitsResponse)
def get_driver_automatic_units(
    resource_id: int,
    _current_user: User = Depends(require_permission("drivers:view")),
    gateway: WialonClient = Depends(get_wialon_gateway),
) -> AutomaticUnitsResponse:
    try:
        result = people_service.get_driver_automatic_units(
            gateway, resource_id=resource_id
        )
        return AutomaticUnitsResponse.model_validate(result)
    except Exception as exc:
        raise _raise_people_error(exc) from exc


@router.patch("/resources/{resource_id}/automatic-units", response_model=AutomaticUnitsResponse)
def update_driver_automatic_units(
    resource_id: int,
    payload: AutomaticUnitsUpdate,
    request: Request,
    current_user: User = Depends(require_permission("drivers:bind")),
    gateway: WialonClient = Depends(get_wialon_gateway),
    database_session: Session = Depends(get_database_session),
) -> AutomaticUnitsResponse:
    try:
        result = people_service.update_driver_automatic_units(
            gateway,
            resource_id=resource_id,
            add_unit_ids=payload.add_unit_ids,
            remove_unit_ids=payload.remove_unit_ids,
        )
        audit_service.record_audit_best_effort(
            database_session,
            user_id=current_user.id,
            action="driver.automatic_units_updated",
            entity="resource",
            entity_id=str(resource_id),
            details={
                "added_unit_ids": payload.add_unit_ids,
                "removed_unit_ids": payload.remove_unit_ids,
            },
            ip_address=get_client_ip(request),
        )
        return AutomaticUnitsResponse.model_validate(result)
    except Exception as exc:
        raise _raise_people_error(exc) from exc
