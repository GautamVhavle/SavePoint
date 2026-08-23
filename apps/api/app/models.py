import uuid
from datetime import date, datetime
from enum import StrEnum
from typing import Any

from sqlalchemy import (
    JSON,
    BigInteger,
    CheckConstraint,
    Date,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    ForeignKeyConstraint,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base, TimestampMixin


class GameStatus(StrEnum):
    playing = "playing"
    completed = "completed"
    backlog = "backlog"
    dropped = "dropped"


class ThemePreference(StrEnum):
    system = "system"
    light = "light"
    dark = "dark"


class Profile(TimestampMixin, Base):
    __tablename__ = "profiles"
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    auth0_sub: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    handle: Mapped[str] = mapped_column(String(40), unique=True, index=True)
    display_name: Mapped[str] = mapped_column(String(80))
    bio: Mapped[str | None] = mapped_column(Text)
    avatar_url: Mapped[str | None] = mapped_column(String(2048))
    theme_preference: Mapped[ThemePreference] = mapped_column(
        Enum(ThemePreference, native_enum=False), default=ThemePreference.system
    )
    location: Mapped[str | None] = mapped_column(String(120))
    social_links: Mapped[dict[str, str]] = mapped_column(JSON, default=dict)
    is_public: Mapped[bool] = mapped_column(default=True, index=True)
    rig: Mapped["Rig | None"] = relationship(
        back_populates="profile", cascade="all, delete-orphan", uselist=False
    )
    peripherals: Mapped[list["Peripheral"]] = relationship(
        back_populates="profile", cascade="all, delete-orphan"
    )
    games: Mapped[list["ProfileGame"]] = relationship(
        back_populates="profile", cascade="all, delete-orphan"
    )
    awards: Mapped[list["Award"]] = relationship(
        back_populates="profile", cascade="all, delete-orphan", foreign_keys="Award.profile_id"
    )


class Rig(TimestampMixin, Base):
    __tablename__ = "rigs"
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    profile_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("profiles.id", ondelete="CASCADE"), unique=True
    )
    name: Mapped[str] = mapped_column(String(100), default="Main Rig")
    hero_photo_url: Mapped[str | None] = mapped_column(String(2048))
    monitors: Mapped[list[dict[str, Any]]] = mapped_column(JSON, default=list)
    cpu: Mapped[str | None] = mapped_column(String(160))
    gpu: Mapped[str | None] = mapped_column(String(160))
    motherboard: Mapped[str | None] = mapped_column(String(160))
    memory: Mapped[str | None] = mapped_column(String(160))
    storage: Mapped[str | None] = mapped_column(String(250))
    case: Mapped[str | None] = mapped_column(String(160))
    psu: Mapped[str | None] = mapped_column(String(160))
    cooling: Mapped[str | None] = mapped_column(String(160))
    os: Mapped[str | None] = mapped_column(String(100))
    notes: Mapped[str | None] = mapped_column(Text)
    profile: Mapped[Profile] = relationship(back_populates="rig")


class Peripheral(TimestampMixin, Base):
    __tablename__ = "peripherals"
    __table_args__ = (CheckConstraint("sort_order >= 0", name="peripheral_sort_order"),)
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    profile_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("profiles.id", ondelete="CASCADE"), index=True
    )
    type: Mapped[str] = mapped_column(String(60))
    display_name: Mapped[str] = mapped_column(String(160))
    brand_model: Mapped[str | None] = mapped_column(String(200))
    photo_url: Mapped[str | None] = mapped_column(String(2048))
    notes: Mapped[str | None] = mapped_column(Text)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    profile: Mapped[Profile] = relationship(back_populates="peripherals")


class Game(TimestampMixin, Base):
    __tablename__ = "games"
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    igdb_id: Mapped[int] = mapped_column(BigInteger, unique=True, index=True)
    name: Mapped[str] = mapped_column(String(250), index=True)
    slug: Mapped[str] = mapped_column(String(250))
    summary: Mapped[str | None] = mapped_column(Text)
    cover_url: Mapped[str | None] = mapped_column(String(2048))
    release_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    genres: Mapped[list[str]] = mapped_column(JSON, default=list)
    platforms: Mapped[list[str]] = mapped_column(JSON, default=list)
    snapshot: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    snapshot_at: Mapped[datetime] = mapped_column(server_default=func.now())
    profiles: Mapped[list["ProfileGame"]] = relationship(back_populates="game")


class ProfileGame(TimestampMixin, Base):
    __tablename__ = "profile_games"
    __table_args__ = (
        UniqueConstraint("profile_id", "game_id"),
        UniqueConstraint("id", "profile_id", name="uq_profile_games_id_profile"),
        UniqueConstraint("profile_id", "featured_order", name="uq_profile_featured_order"),
        CheckConstraint(
            "rating IS NULL OR rating IN (1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5)",
            name="profile_game_rating_half_stars",
        ),
        CheckConstraint("hours_played IS NULL OR hours_played >= 0", name="profile_game_hours"),
        CheckConstraint(
            "started_on IS NULL OR completed_on IS NULL OR completed_on >= started_on",
            name="profile_game_date_order",
        ),
        CheckConstraint(
            "completed_on IS NULL OR status = 'completed'", name="profile_game_completed_status"
        ),
        CheckConstraint(
            "(featured = false AND featured_order IS NULL AND featured_note IS NULL) "
            "OR (featured = true AND featured_order IS NOT NULL AND featured_order >= 0)",
            name="profile_game_featured_fields",
        ),
        Index("ix_profile_games_profile_status", "profile_id", "status"),
    )
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    profile_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("profiles.id", ondelete="CASCADE"))
    game_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("games.id", ondelete="RESTRICT"))
    status: Mapped[GameStatus] = mapped_column(Enum(GameStatus, native_enum=False), index=True)
    rating: Mapped[float | None] = mapped_column(Float)
    review: Mapped[str | None] = mapped_column(Text)
    hours_played: Mapped[float | None] = mapped_column(Float)
    started_on: Mapped[date | None] = mapped_column(Date)
    completed_on: Mapped[date | None] = mapped_column(Date)
    platform: Mapped[str | None] = mapped_column(String(100))
    featured: Mapped[bool] = mapped_column(default=False, index=True)
    featured_order: Mapped[int | None] = mapped_column(Integer)
    featured_note: Mapped[str | None] = mapped_column(Text)
    profile: Mapped[Profile] = relationship(back_populates="games")
    game: Mapped[Game] = relationship(back_populates="profiles")
    awards: Mapped[list["Award"]] = relationship(
        back_populates="profile_game",
        cascade="all, delete-orphan",
        foreign_keys="[Award.profile_game_id, Award.profile_id]",
        overlaps="profile,awards",
    )


class Award(TimestampMixin, Base):
    __tablename__ = "awards"
    __table_args__ = (
        ForeignKeyConstraint(
            ["profile_game_id", "profile_id"],
            ["profile_games.id", "profile_games.profile_id"],
            ondelete="CASCADE",
            name="fk_award_same_profile_game",
        ),
        CheckConstraint("sort_order >= 0", name="award_sort_order"),
    )
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    profile_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("profiles.id", ondelete="CASCADE"), index=True
    )
    profile_game_id: Mapped[uuid.UUID] = mapped_column(index=True)
    title: Mapped[str] = mapped_column(String(100))
    description: Mapped[str | None] = mapped_column(Text)
    icon_url: Mapped[str | None] = mapped_column(String(2048))
    awarded_on: Mapped[date | None] = mapped_column(Date)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    profile: Mapped[Profile] = relationship(
        back_populates="awards", foreign_keys=[profile_id], overlaps="awards,profile_game"
    )
    profile_game: Mapped[ProfileGame] = relationship(
        back_populates="awards",
        foreign_keys=[profile_game_id, profile_id],
        overlaps="awards,profile",
    )


class RateLimitEvent(Base):
    __tablename__ = "rate_limit_events"
    __table_args__ = (
        Index("ix_rate_limit_lookup", "scope", "profile_id", "ip_hash", "created_at"),
    )
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    scope: Mapped[str] = mapped_column(String(40))
    profile_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("profiles.id", ondelete="CASCADE"))
    ip_hash: Mapped[str] = mapped_column(String(64))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
