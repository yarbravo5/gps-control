from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session

from app.core.cookies import (
    CSRF_HEADER_NAME,
    CSRF_TOKEN_COOKIE_NAME,
    REFRESH_TOKEN_COOKIE_NAME,
    clear_auth_cookies,
    set_auth_cookies,
)
from app.core.dependencies import get_current_user
from app.core.request import get_client_ip
from app.db.session import get_database_session
from app.mappers.user_mapper import to_current_user_response
from app.models import User
from app.schemas.auth import (
    ChangePasswordRequest,
    LoginRequest,
    RefreshResponse,
    TokenResponse,
)
from app.schemas.user import CurrentUserResponse
from app.services import auth_service


router = APIRouter(prefix="/auth", tags=["auth"])

AUTHENTICATION_ERROR = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Credenciales inválidas o sesión expirada.",
    headers={"WWW-Authenticate": "Bearer"},
)


@router.post("/login", response_model=TokenResponse)
def login(
    payload: LoginRequest,
    request: Request,
    response: Response,
    database_session: Session = Depends(get_database_session),
) -> TokenResponse:
    try:
        user = auth_service.authenticate_user(
            database_session,
            email=payload.email,
            password=payload.password,
            ip_address=get_client_ip(request),
        )
        tokens = auth_service.issue_tokens(database_session, user)
    except auth_service.AuthenticationError as exc:
        raise AUTHENTICATION_ERROR from exc

    set_auth_cookies(response, tokens.refresh_token, tokens.csrf_token)

    return TokenResponse(
        access_token=tokens.access_token,
        expires_in=tokens.expires_in,
        csrf_token=tokens.csrf_token,
        user=to_current_user_response(user),
    )


@router.post("/refresh", response_model=RefreshResponse)
def refresh_access_token(
    request: Request,
    response: Response,
    database_session: Session = Depends(get_database_session),
) -> RefreshResponse:
    refresh_token = request.cookies.get(REFRESH_TOKEN_COOKIE_NAME)
    if not refresh_token:
        raise AUTHENTICATION_ERROR

    try:
        tokens = auth_service.refresh_tokens(
            database_session,
            refresh_token=refresh_token,
            csrf_cookie=request.cookies.get(CSRF_TOKEN_COOKIE_NAME),
            csrf_header=request.headers.get(CSRF_HEADER_NAME),
        )
    except auth_service.InvalidCsrfTokenError as exc:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Token CSRF inválido.",
        ) from exc
    except auth_service.AuthenticationError as exc:
        raise AUTHENTICATION_ERROR from exc

    set_auth_cookies(response, tokens.refresh_token, tokens.csrf_token)

    return RefreshResponse(
        access_token=tokens.access_token,
        expires_in=tokens.expires_in,
        csrf_token=tokens.csrf_token,
    )


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(
    request: Request,
    response: Response,
    database_session: Session = Depends(get_database_session),
) -> None:
    try:
        auth_service.logout(
            database_session,
            refresh_token=request.cookies.get(REFRESH_TOKEN_COOKIE_NAME),
            csrf_cookie=request.cookies.get(CSRF_TOKEN_COOKIE_NAME),
            csrf_header=request.headers.get(CSRF_HEADER_NAME),
            ip_address=get_client_ip(request),
        )
    except auth_service.InvalidCsrfTokenError as exc:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Token CSRF inválido.",
        ) from exc

    clear_auth_cookies(response)


@router.post("/logout-all", status_code=status.HTTP_204_NO_CONTENT)
def logout_all(
    request: Request,
    response: Response,
    current_user: User = Depends(get_current_user),
    database_session: Session = Depends(get_database_session),
) -> None:
    auth_service.logout_all(
        database_session,
        user=current_user,
        ip_address=get_client_ip(request),
    )
    clear_auth_cookies(response)


@router.get("/me", response_model=CurrentUserResponse)
def get_me(current_user: User = Depends(get_current_user)) -> CurrentUserResponse:
    return to_current_user_response(current_user)


@router.post("/change-password", status_code=status.HTTP_204_NO_CONTENT)
def change_password(
    payload: ChangePasswordRequest,
    request: Request,
    response: Response,
    current_user: User = Depends(get_current_user),
    database_session: Session = Depends(get_database_session),
) -> None:
    try:
        auth_service.change_password(
            database_session,
            user=current_user,
            current_password=payload.current_password,
            new_password=payload.new_password,
            ip_address=get_client_ip(request),
        )
    except auth_service.PasswordChangeError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    clear_auth_cookies(response)
