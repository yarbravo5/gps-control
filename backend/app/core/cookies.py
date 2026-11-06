from fastapi import Response

from app.core.config import settings


REFRESH_TOKEN_COOKIE_NAME = "refresh_token"
CSRF_TOKEN_COOKIE_NAME = "csrf_token"
CSRF_HEADER_NAME = "X-CSRF-Token"
COOKIE_PATH = "/"


def _cookie_options() -> dict[str, object]:
    return {
        "path": COOKIE_PATH,
        "secure": settings.cookie_secure,
        "samesite": settings.cookie_samesite,
        "domain": settings.cookie_domain or None,
    }


def set_auth_cookies(
    response: Response,
    refresh_token: str,
    csrf_token: str,
) -> None:
    max_age = settings.refresh_token_expire_days * 24 * 60 * 60
    options = _cookie_options()

    response.set_cookie(
        key=REFRESH_TOKEN_COOKIE_NAME,
        value=refresh_token,
        max_age=max_age,
        httponly=True,
        **options,
    )
    response.set_cookie(
        key=CSRF_TOKEN_COOKIE_NAME,
        value=csrf_token,
        max_age=max_age,
        httponly=False,
        **options,
    )


def clear_auth_cookies(response: Response) -> None:
    options = _cookie_options()

    response.delete_cookie(
        key=REFRESH_TOKEN_COOKIE_NAME,
        httponly=True,
        **options,
    )
    response.delete_cookie(
        key=CSRF_TOKEN_COOKIE_NAME,
        httponly=False,
        **options,
    )
