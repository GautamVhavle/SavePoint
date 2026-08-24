# SavePoint API

Production-oriented FastAPI service for a public gaming portfolio. It exposes a public composite portfolio, owner-only management APIs, IGDB metadata snapshots, signed Supabase Storage uploads, and a profile-bounded Gemini Guide.

## Requirements

- Python 3.11+
- PostgreSQL (Supabase Postgres is supported); SQLite/aiosqlite for tests
- Auth0 API using RS256
- Optional Twitch/IGDB, Supabase Storage, and Gemini credentials

## Local setup

```bash
cd apps/api
uv sync --all-extras
cp .env.example .env
uv run alembic upgrade head
uv run uvicorn app.main:app --reload
```

Set `DEV_AUTH_BYPASS=true` only for local development or tests. It is rejected by configuration validation in staging/production. When enabled, owner endpoints use `X-Dev-Auth-Sub` (or `DEV_AUTH_SUB`). Never enable it in a deployed environment.

Seed a realistic portfolio after migrating:

```bash
uv run savepoint-seed --auth0-sub 'auth0|local-developer' --handle alex
```

API docs are available at `/docs` outside production. Health probes are `GET /api/v1/health` and `GET /api/v1/ready`.

## Authentication and ownership

Create an Auth0 API with the configured audience. Bearer JWTs are verified against cached tenant JWKS with pinned issuer, audience, RS256 algorithm, expiry, and required claims. Owner identity always comes from JWT `sub`; resource profile IDs are never accepted from clients. Every mutation query includes the authenticated profile ID to prevent IDOR.

## Integrations

### IGDB

Set `TWITCH_CLIENT_ID` and `TWITCH_CLIENT_SECRET`. The service obtains and caches a Twitch client-credentials token with early refresh. `GET /api/v1/igdb/search` searches IGDB; adding a game retrieves authoritative details and saves a local metadata snapshot. IGDB image URLs are transformed using the documented image service convention.

### Supabase Storage

Create a private bucket matching `SUPABASE_STORAGE_BUCKET` and set the server-only service-role key. `POST /api/v1/me/uploads/sign` accepts only JPEG, PNG, WebP, or GIF under `MAX_UPLOAD_BYTES`. The server creates a random path under `users/{profile_uuid}/{purpose}/`; clients cannot choose paths. Keep the service-role key off all clients and logs. Use bucket policies and content scanning appropriate to your deployment.

### Gemini Guide

Set `GEMINI_API_KEY`. The Guide receives only the public composite profile JSON, a fixed instruction that treats profile text as data, and the current question. It must refuse unrelated/general questions. Calls are bounded by input/output size and timeout. Per-IP + profile limits are persisted in the database; IPs are stored only as keyed HMAC-SHA256 hashes.

## Quality checks

```bash
pytest --cov=app --cov-report=term-missing
ruff check .
mypy app
```

Tests use temporary SQLite and mock external services; no credentials or network are required.

## Production deployment

Build and run the included image:

```bash
docker build -t savepoint-api .
docker run --rm -p 8000:8000 --env-file .env savepoint-api
```

The container runs `alembic upgrade head` and then Uvicorn, honoring `$PORT`. In multi-replica deployments, run migrations as a one-off release job instead. Configure an exact HTTPS frontend origin, a strong random `IP_HASH_SECRET`, database SSL/least-privilege credentials, trusted proxy forwarding, secret rotation, backups, and provider quotas. Do not expose the Supabase service role. `/ready` checks database connectivity; use `/health` for liveness.

## Security controls

See [docs/security-posture.md](../../docs/security-posture.md) for the control inventory (auth, rate limits, body/media guards, CSP) and their deliberate limits.

## Error format

Validation and persistence conflicts use RFC 9457-style `application/problem+json` documents. Authentication/provider errors use stable HTTP statuses and intentionally avoid SQL, tokens, keys, signed URLs, or upstream response bodies.

## Official documentation

- [FastAPI](https://fastapi.tiangolo.com/)
- [Pydantic Settings](https://docs.pydantic.dev/latest/concepts/pydantic_settings/)
- [SQLAlchemy asyncio](https://docs.sqlalchemy.org/en/20/orm/extensions/asyncio.html)
- [Alembic](https://alembic.sqlalchemy.org/)
- [Auth0 validate access tokens](https://auth0.com/docs/secure/tokens/access-tokens/validate-access-tokens)
- [IGDB authentication](https://api-docs.igdb.com/#authentication)
- [Supabase signed upload URLs](https://supabase.com/docs/reference/python/storage-from-createsigneduploadurl)
- [Google Gen AI Python SDK](https://googleapis.github.io/python-genai/)
- [FastAPI in containers](https://fastapi.tiangolo.com/deployment/docker/)
