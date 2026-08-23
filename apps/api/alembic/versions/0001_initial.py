"""Initial SavePoint schema.

Revision ID: 0001
Revises:
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def timestamps() -> list[sa.Column]:
    return [
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
    ]


def upgrade() -> None:
    op.create_table(
        "profiles",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("auth0_sub", sa.String(255), nullable=False),
        sa.Column("handle", sa.String(40), nullable=False),
        sa.Column("display_name", sa.String(80), nullable=False),
        sa.Column("bio", sa.Text()),
        sa.Column("avatar_url", sa.String(2048)),
        sa.Column(
            "theme_preference",
            sa.Enum("system", "light", "dark", name="themepreference", native_enum=False),
            server_default="system",
            nullable=False,
        ),
        sa.Column("location", sa.String(120)),
        sa.Column("social_links", sa.JSON(), nullable=False),
        sa.Column("is_public", sa.Boolean(), nullable=False),
        *timestamps(),
        sa.UniqueConstraint("auth0_sub"),
        sa.UniqueConstraint("handle"),
    )
    op.create_index("ix_profiles_auth0_sub", "profiles", ["auth0_sub"])
    op.create_index("ix_profiles_handle", "profiles", ["handle"])
    op.create_index("ix_profiles_is_public", "profiles", ["is_public"])

    op.create_table(
        "rigs",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column(
            "profile_id",
            sa.Uuid(),
            sa.ForeignKey("profiles.id", ondelete="CASCADE"),
            nullable=False,
            unique=True,
        ),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("hero_photo_url", sa.String(2048)),
        sa.Column("monitors", sa.JSON(), nullable=False, server_default="[]"),
        sa.Column("cpu", sa.String(160)),
        sa.Column("gpu", sa.String(160)),
        sa.Column("motherboard", sa.String(160)),
        sa.Column("memory", sa.String(160)),
        sa.Column("storage", sa.String(250)),
        sa.Column("case", sa.String(160)),
        sa.Column("psu", sa.String(160)),
        sa.Column("cooling", sa.String(160)),
        sa.Column("os", sa.String(100)),
        sa.Column("notes", sa.Text()),
        *timestamps(),
    )

    op.create_table(
        "peripherals",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column(
            "profile_id",
            sa.Uuid(),
            sa.ForeignKey("profiles.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("type", sa.String(60), nullable=False),
        sa.Column("display_name", sa.String(160), nullable=False),
        sa.Column("brand_model", sa.String(200)),
        sa.Column("photo_url", sa.String(2048)),
        sa.Column("notes", sa.Text()),
        sa.Column("sort_order", sa.Integer(), nullable=False),
        sa.CheckConstraint("sort_order >= 0", name="peripheral_sort_order"),
        *timestamps(),
    )
    op.create_index("ix_peripherals_profile_id", "peripherals", ["profile_id"])

    op.create_table(
        "games",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("igdb_id", sa.BigInteger(), nullable=False),
        sa.Column("name", sa.String(250), nullable=False),
        sa.Column("slug", sa.String(250), nullable=False),
        sa.Column("summary", sa.Text()),
        sa.Column("cover_url", sa.String(2048)),
        sa.Column("release_date", sa.DateTime(timezone=True)),
        sa.Column("genres", sa.JSON(), nullable=False),
        sa.Column("platforms", sa.JSON(), nullable=False),
        sa.Column("snapshot", sa.JSON(), nullable=False),
        sa.Column(
            "snapshot_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        *timestamps(),
        sa.UniqueConstraint("igdb_id"),
    )
    op.create_index("ix_games_igdb_id", "games", ["igdb_id"])
    op.create_index("ix_games_name", "games", ["name"])

    op.create_table(
        "profile_games",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column(
            "profile_id",
            sa.Uuid(),
            sa.ForeignKey("profiles.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "game_id", sa.Uuid(), sa.ForeignKey("games.id", ondelete="RESTRICT"), nullable=False
        ),
        sa.Column("status", sa.String(20), nullable=False),
        sa.Column("rating", sa.Float()),
        sa.Column("review", sa.Text()),
        sa.Column("hours_played", sa.Float()),
        sa.Column("started_on", sa.Date()),
        sa.Column("completed_on", sa.Date()),
        sa.Column("platform", sa.String(100)),
        sa.Column("featured", sa.Boolean(), nullable=False),
        sa.Column("featured_order", sa.Integer()),
        sa.Column("featured_note", sa.Text()),
        *timestamps(),
        sa.UniqueConstraint("profile_id", "game_id"),
        sa.UniqueConstraint("id", "profile_id", name="uq_profile_games_id_profile"),
        sa.UniqueConstraint("profile_id", "featured_order", name="uq_profile_featured_order"),
        sa.CheckConstraint(
            "rating IS NULL OR rating IN (1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5)",
            name="profile_game_rating_half_stars",
        ),
        sa.CheckConstraint(
            "hours_played IS NULL OR hours_played >= 0", name="profile_game_hours"
        ),
        sa.CheckConstraint(
            "started_on IS NULL OR completed_on IS NULL OR completed_on >= started_on",
            name="profile_game_date_order",
        ),
        sa.CheckConstraint(
            "completed_on IS NULL OR status = 'completed'",
            name="profile_game_completed_status",
        ),
        sa.CheckConstraint(
            "(featured = false AND featured_order IS NULL AND featured_note IS NULL) "
            "OR (featured = true AND featured_order IS NOT NULL AND featured_order >= 0)",
            name="profile_game_featured_fields",
        ),
    )
    op.create_index("ix_profile_games_profile_status", "profile_games", ["profile_id", "status"])
    op.create_index("ix_profile_games_status", "profile_games", ["status"])
    op.create_index("ix_profile_games_featured", "profile_games", ["featured"])

    op.create_table(
        "awards",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column(
            "profile_id",
            sa.Uuid(),
            sa.ForeignKey("profiles.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("profile_game_id", sa.Uuid(), nullable=False),
        sa.Column("title", sa.String(100), nullable=False),
        sa.Column("description", sa.Text()),
        sa.Column("icon_url", sa.String(2048)),
        sa.Column("awarded_on", sa.Date()),
        sa.Column("sort_order", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(
            ["profile_game_id", "profile_id"],
            ["profile_games.id", "profile_games.profile_id"],
            ondelete="CASCADE",
            name="fk_award_same_profile_game",
        ),
        sa.CheckConstraint("sort_order >= 0", name="award_sort_order"),
        *timestamps(),
    )
    op.create_index("ix_awards_profile_id", "awards", ["profile_id"])
    op.create_index("ix_awards_profile_game_id", "awards", ["profile_game_id"])

    op.create_table(
        "rate_limit_events",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("scope", sa.String(40), nullable=False),
        sa.Column(
            "profile_id",
            sa.Uuid(),
            sa.ForeignKey("profiles.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("ip_hash", sa.String(64), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
    )
    op.create_index(
        "ix_rate_limit_lookup",
        "rate_limit_events",
        ["scope", "profile_id", "ip_hash", "created_at"],
    )


def downgrade() -> None:
    for table in [
        "rate_limit_events",
        "awards",
        "profile_games",
        "games",
        "peripherals",
        "rigs",
        "profiles",
    ]:
        op.drop_table(table)
