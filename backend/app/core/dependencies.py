from collections.abc import Callable
import logging

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.security import TokenError, decode_token
from app.db.session import get_database_session
from app.models import User


bearer_scheme = HTTPBearer(auto_error=False)
security_logger = logging.getLogger("app.security")
AUTHENTICATION_ERROR = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Credenciales inválidas o sesión expirada.",
    headers={"WWW-Authenticate": "Bearer"},
)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    database_session: Session = Depends(get_database_session),
) -> User:
    if credentials is None:
        raise AUTHENTICATION_ERROR

    try:
        payload = decode_token(credentials.credentials, "access")
        user_id = int(payload["sub"])
    except (TokenError, KeyError, TypeError, ValueError) as exc:
        raise AUTHENTICATION_ERROR from exc

    user = database_session.get(User, user_id)
    if user is None or not user.is_active:
        raise AUTHENTICATION_ERROR

    if user.token_version != payload.get("token_version"):
        raise AUTHENTICATION_ERROR

    return user


def require_permission(permission_code: str) -> Callable[..., User]:
    def dependency(request: Request, current_user: User = Depends(get_current_user)) -> User:
        if current_user.must_change_password:
            security_logger.warning(
                "Access denied: user_id=%s permission=%s path=%s reason=password_change_required",
                current_user.id, permission_code, request.url.path,
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Debes cambiar tu contraseña antes de continuar.",
            )

        permission_codes = {
            permission.code for permission in current_user.role.permissions
        }
        if permission_code not in permission_codes:
            security_logger.warning(
                "Access denied: user_id=%s permission=%s path=%s reason=permission_missing",
                current_user.id, permission_code, request.url.path,
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permisos para realizar esta acción.",
            )

        return current_user

    return dependency


def require_roles(*role_names: str) -> Callable[..., User]:
    def dependency(request: Request, current_user: User = Depends(get_current_user)) -> User:
        if current_user.role.name not in role_names:
            security_logger.warning(
                "Access denied: user_id=%s required_roles=%s path=%s reason=role_missing",
                current_user.id, ",".join(role_names), request.url.path,
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permisos para realizar esta acción.",
            )

        return current_user

    return dependency
