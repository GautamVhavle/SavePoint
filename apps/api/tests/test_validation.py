import pytest
from pydantic import ValidationError

from app.core.config import Settings
from app.schemas import ProfileCreate, ProfileGameInput, UploadRequest


def test_handle_normalization_and_validation() -> None:
    assert ProfileCreate(handle=" Gamer-One ", display_name="Gamer").handle == "gamer-one"
    with pytest.raises(ValidationError):
        ProfileCreate(handle="../bad", display_name="Bad")


def test_game_date_and_rating_validation() -> None:
    with pytest.raises(ValidationError):
        ProfileGameInput(igdb_id=1, status="completed", rating=11)
    with pytest.raises(ValidationError):
        ProfileGameInput(
            igdb_id=1, status="completed", started_on="2024-03-02", completed_on="2024-03-01"
        )


def test_production_rejects_auth_bypass() -> None:
    with pytest.raises(ValidationError):
        Settings(
            environment="production",
            dev_auth_bypass=True,
            auth0_domain="x.auth0.com",
            auth0_audience="api",
            ip_hash_secret="a" * 32,
        )


def test_upload_request_rejects_unknown_purpose() -> None:
    with pytest.raises(ValidationError):
        UploadRequest(
            filename="photo.png", content_type="image/png", size=100, purpose="../../other"
        )


def test_wildcard_cors_is_refused_outside_development(monkeypatch: pytest.MonkeyPatch) -> None:
    """Credentials are always on; a wildcard grant must never reach production."""
    from app.core.config import Settings

    monkeypatch.setenv("ENVIRONMENT", "production")
    monkeypatch.setenv("DEV_AUTH_BYPASS", "false")
    monkeypatch.setenv("AUTH0_DOMAIN", "tenant.auth0.com")
    monkeypatch.setenv("AUTH0_AUDIENCE", "https://api.example")
    monkeypatch.setenv("IP_HASH_SECRET", "x" * 32)
    monkeypatch.setenv("CORS_ORIGINS", '["*"]')
    with pytest.raises(ValueError, match="explicit origins"):
        Settings()
