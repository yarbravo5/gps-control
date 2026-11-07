from typing import Literal

from pydantic import EmailStr, Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy.engine import URL, make_url


class Settings(BaseSettings):
    app_name: str = "GPS Control API"
    environment: str = "development"

    # Database
    database_url_override: str | None = Field(
        default=None,
        validation_alias="DATABASE_URL",
    )
    db_host: str
    db_port: int = 5432
    db_name: str
    db_user: str
    db_password: str

    # Security
    jwt_secret: str
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 7
    login_max_attempts: int = 5
    login_lockout_minutes: int = 15

    # Cookies
    cookie_secure: bool = False
    cookie_samesite: Literal["lax", "strict", "none"] = "lax"
    cookie_domain: str | None = None

    # Wialon
    wialon_token: SecretStr
    wialon_host: str = "hst-api.wialon.com"
    wialon_http_timeout_seconds: float = Field(default=10.0, gt=0)
    wialon_no_signal_after_seconds: int = Field(default=600, gt=0)

    # CORS
    cors_origins: str = "http://localhost:5173"

    # Admin seed
    admin_email: EmailStr
    admin_name: str
    admin_password: str

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def database_url(self) -> str:
        if self.database_url_override:
            raw_url = self.database_url_override.strip()
            if raw_url.startswith("postgres://"):
                raw_url = f"postgresql://{raw_url.removeprefix('postgres://')}"
            parsed_url = make_url(raw_url)
            if parsed_url.drivername.startswith("postgresql"):
                parsed_url = parsed_url.set(drivername="postgresql+psycopg")
            return parsed_url.render_as_string(hide_password=False)

        return URL.create(
            "postgresql+psycopg",
            username=self.db_user,
            password=self.db_password,
            host=self.db_host,
            port=self.db_port,
            database=self.db_name,
        ).render_as_string(hide_password=False)

    @property
    def cors_origins_list(self) -> list[str]:
        return [
            origin.strip()
            for origin in self.cors_origins.split(",")
            if origin.strip()
        ]


settings = Settings()
