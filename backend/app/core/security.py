from __future__ import annotations

import secrets
from datetime import datetime, timedelta, timezone
from typing import Any

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError, VerifyMismatchError

from app.core.config import settings


password_hasher = PasswordHasher()
DUMMY_PASSWORD_HASH = (
    "$argon2id$v=19$m=65536,t=3,p=4$DR9eoOzzTcpxa8YrVdv1JA$"
    "WTE/5GhYNTv3Fzbf6Zqo/kgLHidaU8cLaR6KRu4gI7o"
)

ACCESS_TOKEN_TYPE = "access"
REFRESH_TOKEN_TYPE = "refresh"
JWT_ALGORITHM = "HS256"


class TokenError(Exception):
    pass


def hash_password(password: str) -> str:
    return password_hasher.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return password_hasher.verify(password_hash, password)
    except (InvalidHashError, VerificationError, VerifyMismatchError):
        return False


def create_access_token(user_id: int, token_version: int) -> tuple[str, int]:
    now = datetime.now(timezone.utc)
    expires_in = settings.access_token_expire_minutes * 60
    payload = {
        "sub": str(user_id),
        "type": ACCESS_TOKEN_TYPE,
        "token_version": token_version,
        "jti": secrets.token_urlsafe(32),
        "iat": now,
        "exp": now + timedelta(seconds=expires_in),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=JWT_ALGORITHM), expires_in


def create_refresh_token(
    user_id: int,
    token_version: int,
) -> tuple[str, str, datetime]:
    now = datetime.now(timezone.utc)
    jti = secrets.token_urlsafe(32)
    expires_at = now + timedelta(days=settings.refresh_token_expire_days)
    payload = {
        "sub": str(user_id),
        "type": REFRESH_TOKEN_TYPE,
        "token_version": token_version,
        "jti": jti,
        "iat": now,
        "exp": expires_at,
    }
    token = jwt.encode(payload, settings.jwt_secret, algorithm=JWT_ALGORITHM)
    return token, jti, expires_at


def decode_token(token: str, expected_type: str) -> dict[str, Any]:
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret,
            algorithms=[JWT_ALGORITHM],
            options={"require": ["exp", "iat", "sub", "type", "jti"]},
        )
    except jwt.InvalidTokenError as exc:
        raise TokenError("Token inválido o expirado.") from exc

    if payload.get("type") != expected_type:
        raise TokenError("Tipo de token inválido.")

    return payload


def generate_csrf_token() -> str:
    return secrets.token_urlsafe(32)


def compare_csrf_tokens(cookie_token: str | None, header_token: str | None) -> bool:
    if not cookie_token or not header_token:
        return False
    return secrets.compare_digest(cookie_token, header_token)
