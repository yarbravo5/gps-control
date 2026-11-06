from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "GPS Control API"
    environment: str = "development"

    # Database
    db_host: str
    db_port: int = 5432
    db_name: str
    db_user: str
    db_password: str

    # Security
    jwt_secret: str

    # Wialon
    wialon_token: str
    wialon_host: str = "hst-api.wialon.com"

    # CORS
    cors_origins: str = "http://localhost:5173"

    # Admin seed
    admin_email: str
    admin_name: str
    admin_password: str

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def database_url(self) -> str:
        return (
            f"postgresql+psycopg://"
            f"{self.db_user}:{self.db_password}"
            f"@{self.db_host}:{self.db_port}/{self.db_name}"
        )


settings = Settings()