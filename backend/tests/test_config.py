import pytest

from app.core.config import Settings


BASE_VALUES = {
    "JWT_SECRET": "test-secret",
    "WIALON_TOKEN": "test-token",
    "ADMIN_EMAIL": "admin@example.com",
    "ADMIN_NAME": "Admin",
    "ADMIN_PASSWORD": "test-password",
}


@pytest.fixture(autouse=True)
def clear_database_environment(monkeypatch):
    for name in (
        "DATABASE_URL",
        "DB_HOST",
        "DB_PORT",
        "DB_NAME",
        "DB_USER",
        "DB_PASSWORD",
    ):
        monkeypatch.delenv(name, raising=False)


def build_settings(**overrides):
    return Settings(_env_file=None, **BASE_VALUES, **overrides)


def test_database_url_uses_override_without_db_fields():
    settings = build_settings(
        DATABASE_URL="postgresql://user:pass@host:5432/db?sslmode=require"
    )

    assert (
        settings.database_url
        == "postgresql+psycopg://user:pass@host:5432/db?sslmode=require"
    )


def test_database_url_normalizes_postgres_scheme():
    settings = build_settings(
        DATABASE_URL="postgres://user:pass@host:5432/db?sslmode=require"
    )

    assert settings.database_url == (
        "postgresql+psycopg://user:pass@host:5432/db?sslmode=require"
    )


def test_database_url_requires_a_source():
    settings = build_settings()

    with pytest.raises(ValueError, match="DATABASE_URL"):
        _ = settings.database_url
