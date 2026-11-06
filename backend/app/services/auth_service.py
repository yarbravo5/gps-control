from __future__ import annotations

from dataclasses import dataclass
from datetime import timedelta

from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import (
    DUMMY_PASSWORD_HASH,
    TokenError,
    compare_csrf_tokens,
    create_access_token,
    create_refresh_token,
    decode_token,
    generate_csrf_token,
    hash_password,
    verify_password,
)
from app.core.time import ensure_utc, get_current_utc_datetime
from app.models import User
from app.repositories import refresh_token_repository, user_repository
from app.services import audit_service


class AuthenticationError(Exception):
    pass


class InvalidCsrfTokenError(Exception):
    pass


class PasswordChangeError(Exception):
    pass


@dataclass(frozen=True)
class IssuedTokens:
    access_token: str
    refresh_token: str
    csrf_token: str
    expires_in: int


def authenticate_user(
    database_session: Session,
    *,
    email: str,
    password: str,
    ip_address: str | None,
) -> User:
    now = get_current_utc_datetime()
    user = user_repository.get_user_by_email(database_session, email)

    if user is None:
        verify_password(password, DUMMY_PASSWORD_HASH)
        audit_service.record_audit(
            database_session,
            user_id=None,
            action="auth.login_failed",
            entity="user",
            details={"email": email.strip().lower()},
            ip_address=ip_address,
        )
        database_session.commit()
        raise AuthenticationError

    if not user.is_active:
        audit_service.record_audit(
            database_session,
            user_id=user.id,
            action="auth.login_failed",
            entity="user",
            entity_id=str(user.id),
            details={"reason": "inactive"},
            ip_address=ip_address,
        )
        database_session.commit()
        raise AuthenticationError

    if user.locked_until is not None and ensure_utc(user.locked_until) > now:
        audit_service.record_audit(
            database_session,
            user_id=user.id,
            action="auth.login_failed",
            entity="user",
            entity_id=str(user.id),
            details={"reason": "locked"},
            ip_address=ip_address,
        )
        database_session.commit()
        raise AuthenticationError

    if not verify_password(password, user.password_hash):
        user.failed_login_attempts += 1
        if user.failed_login_attempts >= settings.login_max_attempts:
            user.locked_until = now + timedelta(
                minutes=settings.login_lockout_minutes
            )
            user.failed_login_attempts = 0

        audit_service.record_audit(
            database_session,
            user_id=user.id,
            action="auth.login_failed",
            entity="user",
            entity_id=str(user.id),
            details={"reason": "invalid_password"},
            ip_address=ip_address,
        )
        database_session.commit()
        raise AuthenticationError

    user.failed_login_attempts = 0
    user.locked_until = None
    user.last_login_at = now
    audit_service.record_audit(
        database_session,
        user_id=user.id,
        action="auth.login_succeeded",
        entity="user",
        entity_id=str(user.id),
        details={"role": user.role.name},
        ip_address=ip_address,
    )
    database_session.commit()
    return user


def issue_tokens(database_session: Session, user: User) -> IssuedTokens:
    access_token, expires_in = create_access_token(user.id, user.token_version)
    refresh_token, jti, expires_at = create_refresh_token(
        user.id,
        user.token_version,
    )
    refresh_token_repository.create_refresh_token_record(
        database_session,
        jti=jti,
        user_id=user.id,
        expires_at=expires_at,
    )
    database_session.commit()

    return IssuedTokens(
        access_token=access_token,
        refresh_token=refresh_token,
        csrf_token=generate_csrf_token(),
        expires_in=expires_in,
    )


def refresh_tokens(
    database_session: Session,
    *,
    refresh_token: str,
    csrf_cookie: str | None,
    csrf_header: str | None,
) -> IssuedTokens:
    if not compare_csrf_tokens(csrf_cookie, csrf_header):
        raise InvalidCsrfTokenError

    try:
        payload = decode_token(refresh_token, "refresh")
        user_id = int(payload["sub"])
        jti = str(payload["jti"])
        token_version = int(payload["token_version"])
    except (TokenError, KeyError, TypeError, ValueError) as exc:
        raise AuthenticationError from exc

    token_record = refresh_token_repository.get_refresh_token_by_jti(
        database_session,
        jti,
    )
    if token_record is None:
        raise AuthenticationError

    if token_record.revoked_at is not None:
        user = user_repository.get_user_by_id(database_session, user_id)
        if user is not None:
            user.token_version += 1
            refresh_token_repository.revoke_all_refresh_tokens_for_user(
                database_session,
                user.id,
            )
            database_session.commit()
        raise AuthenticationError

    if ensure_utc(token_record.expires_at) <= get_current_utc_datetime():
        raise AuthenticationError

    if token_record.user_id != user_id:
        raise AuthenticationError

    user = user_repository.get_user_by_id(database_session, user_id)
    if user is None or not user.is_active:
        raise AuthenticationError
    if user.token_version != token_version:
        raise AuthenticationError

    refresh_token_repository.revoke_refresh_token(
        database_session,
        token_record,
    )

    new_access_token, expires_in = create_access_token(
        user.id,
        user.token_version,
    )
    new_refresh_token, new_jti, new_expires_at = create_refresh_token(
        user.id,
        user.token_version,
    )
    refresh_token_repository.create_refresh_token_record(
        database_session,
        jti=new_jti,
        user_id=user.id,
        expires_at=new_expires_at,
    )
    database_session.commit()

    return IssuedTokens(
        access_token=new_access_token,
        refresh_token=new_refresh_token,
        csrf_token=generate_csrf_token(),
        expires_in=expires_in,
    )


def logout(
    database_session: Session,
    *,
    refresh_token: str | None,
    csrf_cookie: str | None,
    csrf_header: str | None,
    ip_address: str | None,
) -> None:
    if not refresh_token:
        return

    if not compare_csrf_tokens(csrf_cookie, csrf_header):
        raise InvalidCsrfTokenError

    try:
        payload = decode_token(refresh_token, "refresh")
        user_id = int(payload["sub"])
        jti = str(payload["jti"])
    except (TokenError, KeyError, TypeError, ValueError):
        return

    token_record = refresh_token_repository.get_refresh_token_by_jti(
        database_session,
        jti,
    )
    user = user_repository.get_user_by_id(database_session, user_id)

    if token_record is not None and token_record.revoked_at is None:
        refresh_token_repository.revoke_refresh_token(
            database_session,
            token_record,
        )

    if user is not None:
        user.token_version += 1
        refresh_token_repository.revoke_all_refresh_tokens_for_user(
            database_session,
            user.id,
        )
        audit_service.record_audit(
            database_session,
            user_id=user.id,
            action="auth.logout",
            entity="user",
            entity_id=str(user.id),
            ip_address=ip_address,
        )

    database_session.commit()


def logout_all(
    database_session: Session,
    *,
    user: User,
    ip_address: str | None,
) -> None:
    user.token_version += 1
    refresh_token_repository.revoke_all_refresh_tokens_for_user(
        database_session,
        user.id,
    )
    audit_service.record_audit(
        database_session,
        user_id=user.id,
        action="auth.logout_all",
        entity="user",
        entity_id=str(user.id),
        ip_address=ip_address,
    )
    database_session.commit()


def change_password(
    database_session: Session,
    *,
    user: User,
    current_password: str,
    new_password: str,
    ip_address: str | None,
) -> None:
    if not verify_password(current_password, user.password_hash):
        raise PasswordChangeError("La contraseña actual es incorrecta.")

    if verify_password(new_password, user.password_hash):
        raise PasswordChangeError(
            "La nueva contraseña debe ser diferente a la actual."
        )

    user.password_hash = hash_password(new_password)
    user.must_change_password = False
    user.token_version += 1
    refresh_token_repository.revoke_all_refresh_tokens_for_user(
        database_session,
        user.id,
    )
    audit_service.record_audit(
        database_session,
        user_id=user.id,
        action="auth.password_changed",
        entity="user",
        entity_id=str(user.id),
        ip_address=ip_address,
    )
    database_session.commit()
