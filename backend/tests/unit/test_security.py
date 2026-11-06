import pytest

from app.core.security import (
    TokenError,
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)


def test_password_hash_roundtrip() -> None:
    password_hash = hash_password("Password123")
    assert password_hash != "Password123"
    assert verify_password("Password123", password_hash)
    assert not verify_password("WrongPassword123", password_hash)


def test_access_token_roundtrip() -> None:
    token, expires_in = create_access_token(user_id=7, token_version=3)
    payload = decode_token(token, "access")

    assert expires_in > 0
    assert payload["sub"] == "7"
    assert payload["type"] == "access"
    assert payload["token_version"] == 3


def test_refresh_token_roundtrip() -> None:
    token, jti, expires_at = create_refresh_token(user_id=9, token_version=1)
    payload = decode_token(token, "refresh")

    assert payload["sub"] == "9"
    assert payload["type"] == "refresh"
    assert payload["jti"] == jti
    assert expires_at.tzinfo is not None


def test_token_type_is_enforced() -> None:
    token, _ = create_access_token(user_id=1, token_version=0)

    with pytest.raises(TokenError):
        decode_token(token, "refresh")
