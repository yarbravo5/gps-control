from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session

from app.core.dependencies import require_permission
from app.core.request import get_client_ip
from app.db.session import get_database_session
from app.models import User
from app.schemas.user import (
    PasswordResetRequest,
    UserCreate,
    UserPageResponse,
    UserResponse,
    UserUpdate,
)
from app.services import user_service


router = APIRouter(prefix="/users", tags=["users"])


def _map_user_service_error(exc: Exception) -> HTTPException:
    if isinstance(exc, user_service.UserNotFoundError):
        return HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado.",
        )
    if isinstance(exc, user_service.UserEmailAlreadyExistsError):
        return HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ya existe un usuario con ese correo.",
        )
    if isinstance(exc, user_service.RoleNotFoundError):
        return HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El rol indicado no existe.",
        )
    if isinstance(exc, user_service.InvalidUserOperationError):
        return HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )
    return HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail="No se pudo completar la operación.",
    )


@router.get("", response_model=UserPageResponse)
def list_users(
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=200),
    sort_by: Literal["id", "name", "email", "role"] = Query(default="id"),
    sort_order: Literal["asc", "desc"] = Query(default="asc"),
    query: str | None = Query(default=None, max_length=100, alias="q"),
    role: Literal["admin", "operator", "viewer"] | None = Query(default=None),
    _current_user: User = Depends(require_permission("users:manage")),
    database_session: Session = Depends(get_database_session),
) -> UserPageResponse:
    normalized_query = query.strip() if query and query.strip() else None
    items = user_service.list_users(
        database_session,
        offset=offset,
        limit=limit,
        sort_by=sort_by,
        sort_order=sort_order,
        query=normalized_query,
        role_name=role,
    )
    return UserPageResponse(
        items=items,
        total=user_service.count_users(database_session, normalized_query, role),
        offset=offset,
        limit=limit,
    )


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(
    payload: UserCreate,
    request: Request,
    current_user: User = Depends(require_permission("users:manage")),
    database_session: Session = Depends(get_database_session),
) -> User:
    try:
        return user_service.create_user(
            database_session,
            user_data=payload,
            actor=current_user,
            ip_address=get_client_ip(request),
        )
    except Exception as exc:
        raise _map_user_service_error(exc) from exc


@router.patch("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    payload: UserUpdate,
    request: Request,
    current_user: User = Depends(require_permission("users:manage")),
    database_session: Session = Depends(get_database_session),
) -> User:
    try:
        return user_service.update_user(
            database_session,
            user_id=user_id,
            user_data=payload,
            actor=current_user,
            ip_address=get_client_ip(request),
        )
    except Exception as exc:
        raise _map_user_service_error(exc) from exc


@router.post("/{user_id}/reset-password", response_model=UserResponse)
def reset_user_password(
    user_id: int,
    payload: PasswordResetRequest,
    request: Request,
    current_user: User = Depends(require_permission("users:manage")),
    database_session: Session = Depends(get_database_session),
) -> User:
    try:
        return user_service.reset_password(
            database_session,
            user_id=user_id,
            new_password=payload.new_password,
            actor=current_user,
            ip_address=get_client_ip(request),
        )
    except Exception as exc:
        raise _map_user_service_error(exc) from exc


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def deactivate_user(
    user_id: int,
    request: Request,
    current_user: User = Depends(require_permission("users:manage")),
    database_session: Session = Depends(get_database_session),
) -> None:
    try:
        user_service.update_user(
            database_session,
            user_id=user_id,
            user_data=UserUpdate(is_active=False),
            actor=current_user,
            ip_address=get_client_ip(request),
        )
    except Exception as exc:
        raise _map_user_service_error(exc) from exc
