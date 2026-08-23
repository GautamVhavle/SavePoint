import re
import uuid
from datetime import date, datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, HttpUrl, field_validator, model_validator

from app.models import GameStatus, ThemePreference

HANDLE_RE = re.compile(r"^[a-z0-9](?:[a-z0-9_-]{1,28}[a-z0-9])?$")


class APIModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class ProfileBase(APIModel):
    handle: str = Field(min_length=3, max_length=30)
    display_name: str = Field(min_length=1, max_length=80)
    bio: str | None = Field(default=None, max_length=2000)
    avatar_url: HttpUrl | None = None
    theme_preference: ThemePreference = ThemePreference.system
    location: str | None = Field(default=None, max_length=120)
    social_links: dict[str, HttpUrl] = Field(default_factory=dict)
    is_public: bool = True

    @field_validator("handle", mode="before")
    @classmethod
    def normalize_handle(cls, value: str) -> str:
        normalized = value.strip().lower()
        if not HANDLE_RE.fullmatch(normalized):
            raise ValueError("handle must be 3-30 lowercase letters, numbers, _ or -")
        return normalized

    @field_validator("social_links")
    @classmethod
    def limited_socials(cls, value: dict[str, HttpUrl]) -> dict[str, HttpUrl]:
        if len(value) > 10:
            raise ValueError("at most 10 social links are allowed")
        return value


class ProfileCreate(ProfileBase):
    pass


class ProfileUpdate(APIModel):
    handle: str | None = Field(default=None, min_length=3, max_length=30)
    display_name: str | None = Field(default=None, min_length=1, max_length=80)
    bio: str | None = Field(default=None, max_length=2000)
    avatar_url: HttpUrl | None = None
    theme_preference: ThemePreference | None = None
    location: str | None = Field(default=None, max_length=120)
    social_links: dict[str, HttpUrl] | None = None
    is_public: bool | None = None

    @field_validator("handle", mode="before")
    @classmethod
    def normalize_handle(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip().lower()
        if not HANDLE_RE.fullmatch(normalized):
            raise ValueError("invalid handle")
        return normalized


class PublicProfileSummary(ProfileBase):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime


class ProfileRead(PublicProfileSummary):
    auth0_sub: str


class MonitorSpec(APIModel):
    display_name: str = Field(min_length=1, max_length=160)
    brand_model: str | None = Field(default=None, max_length=200)
    size_inches: float | None = Field(default=None, gt=0, le=100)
    resolution: str | None = Field(default=None, max_length=40)
    refresh_hz: int | None = Field(default=None, gt=0, le=1000)
    photo_url: HttpUrl | None = None


class RigInput(APIModel):
    name: str = Field(default="Main Rig", min_length=1, max_length=100)
    hero_photo_url: HttpUrl | None = None
    monitors: list[MonitorSpec] = Field(default_factory=list, max_length=8)
    cpu: str | None = Field(default=None, max_length=160)
    gpu: str | None = Field(default=None, max_length=160)
    motherboard: str | None = Field(default=None, max_length=160)
    memory: str | None = Field(default=None, max_length=160)
    storage: str | None = Field(default=None, max_length=250)
    case: str | None = Field(default=None, max_length=160)
    psu: str | None = Field(default=None, max_length=160)
    cooling: str | None = Field(default=None, max_length=160)
    os: str | None = Field(default=None, max_length=100)
    notes: str | None = Field(default=None, max_length=2000)


class RigRead(RigInput):
    id: uuid.UUID
    profile_id: uuid.UUID


class PeripheralInput(APIModel):
    type: str = Field(min_length=1, max_length=60)
    display_name: str = Field(min_length=1, max_length=160)
    brand_model: str | None = Field(default=None, max_length=200)
    photo_url: HttpUrl | None = None
    notes: str | None = Field(default=None, max_length=1000)
    sort_order: int = Field(default=0, ge=0, le=10000)

    @field_validator("type")
    @classmethod
    def normalize_type(cls, value: str) -> str:
        return " ".join(value.strip().lower().split())


class PeripheralRead(PeripheralInput):
    id: uuid.UUID
    profile_id: uuid.UUID


class IGDBGame(APIModel):
    igdb_id: int
    name: str
    slug: str
    summary: str | None = None
    cover_url: str | None = None
    release_date: datetime | None = None
    genres: list[str] = Field(default_factory=list)
    platforms: list[str] = Field(default_factory=list)
    snapshot: dict[str, Any] = Field(default_factory=dict)


class ProfileGameInput(APIModel):
    igdb_id: int = Field(gt=0)
    status: GameStatus
    rating: float | None = Field(default=None, ge=1, le=5, multiple_of=0.5)
    review: str | None = Field(default=None, max_length=10000)
    hours_played: float | None = Field(default=None, ge=0, le=1_000_000)
    started_on: date | None = None
    completed_on: date | None = None
    platform: str | None = Field(default=None, max_length=100)
    featured: bool = False
    featured_order: int | None = Field(default=None, ge=0, le=10000)
    featured_note: str | None = Field(default=None, max_length=1000)

    @model_validator(mode="after")
    def validate_state(self) -> "ProfileGameInput":
        validate_game_state(
            self.status,
            self.started_on,
            self.completed_on,
            self.featured,
            self.featured_order,
            self.featured_note,
        )
        return self


class ProfileGameUpdate(APIModel):
    status: GameStatus | None = None
    rating: float | None = Field(default=None, ge=1, le=5, multiple_of=0.5)
    review: str | None = Field(default=None, max_length=10000)
    hours_played: float | None = Field(default=None, ge=0, le=1_000_000)
    started_on: date | None = None
    completed_on: date | None = None
    platform: str | None = Field(default=None, max_length=100)
    featured: bool | None = None
    featured_order: int | None = Field(default=None, ge=0, le=10000)
    featured_note: str | None = Field(default=None, max_length=1000)


def validate_game_state(
    status: GameStatus,
    started_on: date | None,
    completed_on: date | None,
    featured: bool,
    featured_order: int | None,
    featured_note: str | None,
) -> None:
    if started_on and completed_on and completed_on < started_on:
        raise ValueError("completed_on cannot precede started_on")
    if completed_on and status is not GameStatus.completed:
        raise ValueError("completed_on is only valid for completed games")
    if featured and featured_order is None:
        raise ValueError("featured_order is required when featured is true")
    if not featured and (featured_order is not None or featured_note is not None):
        raise ValueError("featured_order and featured_note require featured=true")


class GameRead(APIModel):
    id: uuid.UUID
    igdb_id: int
    name: str
    slug: str
    summary: str | None
    cover_url: str | None
    release_date: datetime | None
    genres: list[str]
    platforms: list[str]
    snapshot_at: datetime


class ProfileGameRead(APIModel):
    id: uuid.UUID
    profile_id: uuid.UUID
    game: GameRead
    status: GameStatus
    rating: float | None
    review: str | None
    hours_played: float | None
    started_on: date | None
    completed_on: date | None
    platform: str | None
    featured: bool
    featured_order: int | None
    featured_note: str | None


class AwardInput(APIModel):
    profile_game_id: uuid.UUID
    title: str = Field(min_length=1, max_length=100)
    description: str | None = Field(default=None, max_length=2000)
    icon_url: HttpUrl | None = None
    awarded_on: date | None = None
    sort_order: int = Field(default=0, ge=0, le=10000)


class AwardRead(AwardInput):
    id: uuid.UUID
    profile_id: uuid.UUID


class PublicProfile(APIModel):
    profile: PublicProfileSummary
    rig: RigRead | None
    peripherals: list[PeripheralRead]
    games: list[ProfileGameRead]
    awards: list[AwardRead]


class UploadRequest(APIModel):
    filename: str = Field(min_length=1, max_length=200)
    content_type: str
    size: int = Field(gt=0)
    purpose: str = Field(pattern=r"^(avatar|rig|peripheral|game|award)$")


class SignedUpload(APIModel):
    path: str
    token: str
    upload_url: str


class GuideRequest(APIModel):
    question: str = Field(min_length=3, max_length=1000)


class GuideResponse(APIModel):
    answer: str
