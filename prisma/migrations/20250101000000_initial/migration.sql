-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "GameStatus" AS ENUM ('playing', 'completed', 'backlog', 'dropped');

-- CreateEnum
CREATE TYPE "ThemePreference" AS ENUM ('system', 'light', 'dark');

-- CreateTable
CREATE TABLE "profiles" (
    "id" UUID NOT NULL,
    "auth0_sub" VARCHAR(255) NOT NULL,
    "handle" VARCHAR(40) NOT NULL,
    "display_name" VARCHAR(80) NOT NULL,
    "bio" TEXT,
    "avatar_url" VARCHAR(2048),
    "theme_preference" "ThemePreference" NOT NULL DEFAULT 'system',
    "location" VARCHAR(120),
    "social_links" JSONB NOT NULL DEFAULT '{}',
    "is_public" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rigs" (
    "id" UUID NOT NULL,
    "profile_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL DEFAULT 'Main Rig',
    "hero_photo_url" VARCHAR(2048),
    "monitors" JSONB NOT NULL DEFAULT '[]',
    "cpu" VARCHAR(160),
    "gpu" VARCHAR(160),
    "motherboard" VARCHAR(160),
    "memory" VARCHAR(160),
    "storage" VARCHAR(250),
    "case" VARCHAR(160),
    "psu" VARCHAR(160),
    "cooling" VARCHAR(160),
    "os" VARCHAR(100),
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "rigs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "peripherals" (
    "id" UUID NOT NULL,
    "profile_id" UUID NOT NULL,
    "type" VARCHAR(60) NOT NULL,
    "display_name" VARCHAR(160) NOT NULL,
    "brand_model" VARCHAR(200),
    "photo_url" VARCHAR(2048),
    "notes" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "peripherals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "games" (
    "id" UUID NOT NULL,
    "igdb_id" INTEGER NOT NULL,
    "name" VARCHAR(250) NOT NULL,
    "slug" VARCHAR(250) NOT NULL,
    "summary" TEXT,
    "cover_url" VARCHAR(2048),
    "banner_url" VARCHAR(2048),
    "release_date" TIMESTAMPTZ(6),
    "genres" JSONB NOT NULL DEFAULT '[]',
    "platforms" JSONB NOT NULL DEFAULT '[]',
    "snapshot" JSONB NOT NULL DEFAULT '{}',
    "snapshot_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "games_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profile_games" (
    "id" UUID NOT NULL,
    "profile_id" UUID NOT NULL,
    "game_id" UUID NOT NULL,
    "status" "GameStatus" NOT NULL,
    "rating" DOUBLE PRECISION,
    "review" TEXT,
    "hours_played" DOUBLE PRECISION,
    "started_on" DATE,
    "completed_on" DATE,
    "platform" VARCHAR(100),
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "featured_order" INTEGER,
    "featured_note" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "profile_games_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "awards" (
    "id" UUID NOT NULL,
    "profile_id" UUID NOT NULL,
    "profile_game_id" UUID NOT NULL,
    "title" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "icon_url" VARCHAR(2048),
    "awarded_on" DATE,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "awards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rate_limit_events" (
    "id" UUID NOT NULL,
    "scope" VARCHAR(40) NOT NULL,
    "profile_id" UUID NOT NULL,
    "ip_hash" VARCHAR(64) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rate_limit_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "profiles_auth0_sub_key" ON "profiles"("auth0_sub");

-- CreateIndex
CREATE UNIQUE INDEX "profiles_handle_key" ON "profiles"("handle");

-- CreateIndex
CREATE INDEX "profiles_is_public_idx" ON "profiles"("is_public");

-- CreateIndex
CREATE UNIQUE INDEX "rigs_profile_id_key" ON "rigs"("profile_id");

-- CreateIndex
CREATE INDEX "peripherals_profile_id_idx" ON "peripherals"("profile_id");

-- CreateIndex
CREATE UNIQUE INDEX "games_igdb_id_key" ON "games"("igdb_id");

-- CreateIndex
CREATE INDEX "games_name_idx" ON "games"("name");

-- CreateIndex
CREATE INDEX "profile_games_profile_id_status_idx" ON "profile_games"("profile_id", "status");

-- CreateIndex
CREATE INDEX "profile_games_status_idx" ON "profile_games"("status");

-- CreateIndex
CREATE INDEX "profile_games_featured_idx" ON "profile_games"("featured");

-- CreateIndex
CREATE UNIQUE INDEX "profile_games_profile_id_game_id_key" ON "profile_games"("profile_id", "game_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_profile_games_id_profile" ON "profile_games"("id", "profile_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_profile_featured_order" ON "profile_games"("profile_id", "featured_order");

-- CreateIndex
CREATE INDEX "awards_profile_id_idx" ON "awards"("profile_id");

-- CreateIndex
CREATE INDEX "awards_profile_game_id_idx" ON "awards"("profile_game_id");

-- CreateIndex
CREATE INDEX "ix_rate_limit_lookup" ON "rate_limit_events"("scope", "profile_id", "ip_hash", "created_at");

-- CreateIndex
CREATE INDEX "ix_rate_limit_created_at" ON "rate_limit_events"("created_at");

-- AddForeignKey
ALTER TABLE "rigs" ADD CONSTRAINT "rigs_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "peripherals" ADD CONSTRAINT "peripherals_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile_games" ADD CONSTRAINT "profile_games_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile_games" ADD CONSTRAINT "profile_games_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "games"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "awards" ADD CONSTRAINT "awards_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "awards" ADD CONSTRAINT "fk_award_same_profile_game" FOREIGN KEY ("profile_game_id", "profile_id") REFERENCES "profile_games"("id", "profile_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rate_limit_events" ADD CONSTRAINT "rate_limit_events_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CHECK constraints ported from the retired SQLAlchemy model. Prisma has no
-- schema syntax for these, so they are applied as raw SQL and asserted by tests.
ALTER TABLE "peripherals"
  ADD CONSTRAINT "ck_peripherals_peripheral_sort_order" CHECK ("sort_order" >= 0);

ALTER TABLE "awards"
  ADD CONSTRAINT "ck_awards_award_sort_order" CHECK ("sort_order" >= 0);

ALTER TABLE "profile_games"
  ADD CONSTRAINT "ck_profile_games_profile_game_rating_half_stars"
    CHECK ("rating" IS NULL OR "rating" IN (1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5)),
  ADD CONSTRAINT "ck_profile_games_profile_game_hours"
    CHECK ("hours_played" IS NULL OR "hours_played" >= 0),
  ADD CONSTRAINT "ck_profile_games_profile_game_date_order"
    CHECK ("started_on" IS NULL OR "completed_on" IS NULL OR "completed_on" >= "started_on"),
  ADD CONSTRAINT "ck_profile_games_profile_game_completed_status"
    CHECK ("completed_on" IS NULL OR "status" = 'completed'::"GameStatus"),
  ADD CONSTRAINT "ck_profile_games_profile_game_featured_fields"
    CHECK (
      ("featured" = false AND "featured_order" IS NULL AND "featured_note" IS NULL)
      OR ("featured" = true AND "featured_order" IS NOT NULL AND "featured_order" >= 0)
    );
