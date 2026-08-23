# SavePoint

SavePoint is a collectible gaming portfolio: one public page for a player's rig, games, long-form reviews, custom awards, Hall of Fame, and profile-scoped AI Guide.

It is intentionally **a portfolio, not a feed**—there are no follows, likes, comments, or timelines.

## Workspace

- `apps/web` — React, TypeScript, Vite, Tailwind, Framer Motion, and GSAP
- `apps/api` — FastAPI, Pydantic v2, SQLAlchemy, Alembic, and external integrations
- `Plan.md` — product principles, scope, and feature plan

## Quick start

Detailed service-specific setup is documented in `apps/web/README.md` and `apps/api/README.md`.

```bash
# Frontend
pnpm install
pnpm dev

# Backend (separate terminal)
uv sync --project apps/api --all-extras
uv run --project apps/api alembic upgrade head
uv run --project apps/api uvicorn app.main:app --reload
```

Copy each service's `.env.example` to `.env`, then add the relevant Auth0, Supabase/Postgres, Twitch/IGDB, and Gemini credentials. Without credentials the repository still runs: the web app falls back to safe local demo data, IGDB search returns 503 until Twitch keys exist, and the Guide returns 503 until `GEMINI_API_KEY` exists — every other feature stays live.

### Full-stack local run (no credentials required)

```bash
cd apps/api
export DATABASE_URL="sqlite+aiosqlite:///./savepoint-live.db"
export DEV_AUTH_BYPASS=true
export CORS_ORIGINS='["http://localhost:5174","http://127.0.0.1:5174"]'
uv run alembic upgrade head
uv run python -m app.seed        # creates @alex with rig, games, and an award
uv run uvicorn app.main:app --port 8000

# second terminal
cd apps/web
VITE_API_URL=http://127.0.0.1:8000/api/v1 pnpm dev --port 5174
# open http://127.0.0.1:5174/u/alex
```

`DEV_AUTH_BYPASS` is refused outside development/test environments; production requires Auth0 JWTs.

## Quality checks

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:api
pnpm build
```

## Product constraints

- Public profile pages never require authentication.
- Every mutation is authenticated and ownership-checked.
- IGDB and Twitch credentials remain on the API server.
- Game metadata is snapshotted when a title is added.
- Gemini answers are constrained to the viewed public profile.
- Chat requests are rate-limited by privacy-preserving visitor and profile keys.
- Secrets belong only in environment variables and are never committed.

## Deployment targets

- Frontend: Vercel
- API: FastAPI Cloud or another ASGI host
- Database and media: Supabase Postgres and Storage

See each application README for environment variables, migrations, Auth0 callback/audience settings, storage setup, and deployment commands.
