# SavePoint — FastAPI ➜ Vercel Serverless Migration Plan

Goal: run the **entire** product (SPA + API + database + storage) on the Vercel free
tier at `https://savepointarchive.vercel.app`, with zero self-hosted services.

## Target architecture

| Concern        | Before                          | After                                                    |
| -------------- | ------------------------------- | -------------------------------------------------------- |
| API framework  | FastAPI (Python, uvicorn)       | Hono on Vercel Node Functions                              |
| Hosting        | Separate container/host         | Same Vercel project as the SPA (`/api/v1/*`)               |
| Database       | Self-hosted Postgres            | Neon Serverless Postgres (Vercel Marketplace, free)        |
| ORM/migrations | SQLAlchemy + Alembic            | Prisma ORM + `prisma migrate`                              |
| Validation     | Pydantic                        | Zod                                                        |
| Auth           | python-jose + JWKS cache        | `jose` `createRemoteJWKSet` (Auth0 RS256)                  |
| Media storage  | Supabase Storage                | Vercel Blob (client uploads w/ server-issued token)        |
| AI guide       | `google-genai` (Python)         | `@google/genai` (Node)                                     |
| Game metadata  | httpx ➜ IGDB                    | `fetch` ➜ IGDB                                             |
| Rate limiting  | Postgres sliding window         | Postgres sliding window (unchanged semantics, via Prisma)  |
| CORS           | Required (cross-origin)         | Not required (same-origin `/api/v1`)                       |

### Why a single catch-all function

Vercel Hobby allows **12 serverless functions per deployment**. The API has 20+
endpoints, so each route cannot be its own file. All API routes are served by one
function, `api/index.ts`, which delegates to a Hono router. Total function count
stays at **3** (`index`, `og-image`, `profile-html`).

### Directory layout

```
prisma/
  schema.prisma            # ported from models.py + alembic
  seed.ts                  # ported from app/seed.py
api/
  index.ts                 # Hono entrypoint  ->  /api/v1/*
  og-image.ts              # unchanged (retargeted to same-origin API)
  profile-html.ts          # unchanged (retargeted to same-origin API)
  _lib/                    # "_" prefix => never treated as routes by Vercel
    env.ts                 # typed env + production safety checks
    prisma.ts              # global-cached PrismaClient (serverless-safe)
    errors.ts              # RFC7807 problem+json, matching FastAPI shape
    auth.ts                # Auth0 JWT verify + dev bypass + Principal
    rate-limit.ts          # enforceScopeLimit / enforceGuideLimit
    validation.ts          # Zod schemas (1:1 with schemas.py)
    serialize.ts           # Prisma row -> snake_case API DTO
    routes/*.ts            # health, profiles, me, rig, peripherals,
                           # games, awards, uploads, guide
    integrations/
      igdb.ts  gemini.ts  blob.ts
```

## Wire-contract compatibility

The HTTP contract is kept **byte-identical** to FastAPI (snake_case DTOs, same
status codes, same `application/problem+json` error body, same ETag/Cache-Control
on public profiles). Only the frontend changes are:

1. `VITE_API_URL` becomes `/api/v1` (same-origin, no CORS).
2. `uploadMedia()` switches from a Supabase signed PUT to a Vercel Blob client
   upload: the API mints a short-lived client token with
   `generateClientTokenFromReadWriteToken` for a profile-scoped path, and the
   browser calls `put()` from `@vercel/blob/client`, which returns the public
   URL directly. `VITE_SUPABASE_URL` / `VITE_SUPABASE_BUCKET` are removed.

## Platform notes learned during the migration

- `api/[...route].ts` catch-all filenames are a Next.js convention; on a Vite
  project Vercel does not match them. `/api/v1/*` is instead pointed at the
  single `api/index.ts` function by an explicit `vercel.json` rewrite.
- `hono/vercel`'s `handle()` targets runtimes that pass a WHATWG `Request`. The
  Vercel Node.js runtime passes Node's `(IncomingMessage, ServerResponse)`, so
  the entrypoint uses `getRequestListener` from `@hono/node-server` instead.
- For the same reason `c.req.url` is a *relative* path inside the function;
  `new URL(c.req.url)` throws, so `c.req.path` is used when building responses.

## Phases

0. **Provision** Neon Postgres + Blob store on the linked `savepointarchive` project.
1. **Scaffold**: root deps, `tsconfig`, Prisma schema, generated client output.
2. **Core libs**: env, prisma, errors, auth, rate limiting, validation, serializers.
3. **Integrations**: IGDB, Gemini, Blob.
4. **Routes**: all 20+ endpoints on Hono.
5. **Frontend rewire**: env vars, upload flow, OG functions.
6. **Tests**: vitest unit + contract tests replacing pytest.
7. **Build config**: `vercel.json`, build command, function config.
8. **Remove Python**: delete `apps/api`, alembic, Dockerfile, CI job.
9. **Deploy & verify** end-to-end against production.

## Rollback

The Python backend is deleted only in phase 8, after the TypeScript API passes
its test suite. Everything is a single git working tree, so `git checkout` restores
`apps/api` if needed.
