from functools import lru_cache
from typing import Literal

from pydantic import Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", case_sensitive=False, extra="ignore")

    app_name: str = "SavePoint API"
    environment: Literal["development", "test", "staging", "production"] = "development"
    database_url: str = "sqlite+aiosqlite:///./savepoint.db"
    cors_origins: list[str] = ["http://localhost:3000"]
    auth0_domain: str = ""
    auth0_audience: str = ""
    auth0_algorithms: list[str] = ["RS256"]
    dev_auth_bypass: bool = False
    dev_auth_sub: str = "auth0|local-developer"
    twitch_client_id: str = ""
    twitch_client_secret: str = ""
    twitch_user_token: str = ""  # public apps: device-flow user token
    supabase_url: str = ""
    supabase_service_role_key: str = ""
    supabase_storage_bucket: str = "savepoint-media"
    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.0-flash"
    ip_hash_secret: str = Field(default="development-only-ip-hash-secret-change-me", min_length=32)
    guide_rate_limit: int = Field(default=10, ge=1, le=1000)
    guide_rate_window_seconds: int = Field(default=3600, ge=60, le=86400)
    igdb_rate_limit: int = Field(default=60, ge=1, le=10000)
    upload_rate_limit: int = Field(default=30, ge=1, le=1000)
    max_upload_bytes: int = Field(default=10 * 1024 * 1024, ge=1, le=100 * 1024 * 1024)
    log_level: str = "INFO"

    @field_validator("database_url")
    @classmethod
    def normalize_database_driver(cls, value: str) -> str:
        if value.startswith("postgres://"):
            return value.replace("postgres://", "postgresql+asyncpg://", 1)
        if value.startswith("postgresql://") and "+" not in value.split("://", 1)[0]:
            return value.replace("postgresql://", "postgresql+asyncpg://", 1)
        return value

    @model_validator(mode="after")
    def production_safety(self) -> "Settings":
        if self.environment in {"staging", "production"}:
            if self.dev_auth_bypass:
                raise ValueError("DEV_AUTH_BYPASS is forbidden outside development/test")
            required = {
                "AUTH0_DOMAIN": self.auth0_domain,
                "AUTH0_AUDIENCE": self.auth0_audience,
                "IP_HASH_SECRET": self.ip_hash_secret,
            }
            missing = [key for key, value in required.items() if not value]
            if missing:
                raise ValueError(f"Missing required settings: {', '.join(missing)}")
            if "development-only" in self.ip_hash_secret:
                raise ValueError("IP_HASH_SECRET must be changed outside development")
        return self

    @property
    def auth0_issuer(self) -> str:
        return f"https://{self.auth0_domain.rstrip('/')}/"


@lru_cache
def get_settings() -> Settings:
    return Settings()
