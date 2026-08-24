# SavePoint Architecture

## System boundary

SavePoint has two deployable applications:

- The React/Vite web application renders the portfolio and authenticated curation experience.
- FastAPI owns persistence, authentication enforcement, external API credentials, media authorization, and AI requests.

The browser never receives the Twitch secret, Supabase service-role key, Gemini key, database URL, or rate-limit hashing secret.

## Request paths

### Public portfolio

1. A visitor opens `/u/:handle` without an account.
2. The web application requests the public composite profile DTO from FastAPI.
3. FastAPI loads the profile, setup, ordered peripherals, snapshotted game metadata, awards, and featured ordering from Postgres.
4. The page renders entirely from SavePoint data; IGDB is never contacted during a profile view.

### Authenticated curation

1. Auth0 Universal Login returns an access token issued for the SavePoint API audience.
2. The browser sends the bearer token to FastAPI.
3. FastAPI verifies signature, issuer, audience, expiry, and algorithm using Auth0 JWKS.
4. The API resolves the token subject to one SavePoint profile and enforces ownership for every mutation.

### Add a game

1. The editor sends a debounced search query to the authenticated FastAPI IGDB proxy.
2. FastAPI obtains or reuses a cached Twitch app-access token and queries IGDB.
3. When a result is selected, FastAPI performs an authoritative detail lookup.
4. The API stores a denormalized metadata snapshot and creates the player's unique library entry in one transaction.
5. Public reads use only that snapshot.

### Profile Guide

1. The visitor submits a bounded question on a specific public profile.
2. FastAPI derives a privacy-preserving HMAC of the visitor address and applies a database-backed profile/window limit.
3. The API selects relevant public game entries, reviews, awards, and rig data.
4. The API calls the stable, environment-configurable Gemini model (`gemini-2.0-flash` by default) through the unified `google-genai` async client, with a profile-only system boundary and the assembled context.
5. The response identifies supporting portfolio items and refuses unrelated general-assistant requests.

## Persistence rules

- Handles are normalized and globally unique.
- Auth0 subjects are globally unique.
- A profile can add a given IGDB game only once.
- Ratings use half-star steps in the inclusive 1 to 5 range when present.
- Awards belong to a profile and reference a game from that same profile.
- Featured games are manually selected and explicitly ordered.
- Long reviews are stored as text without an arbitrary product-level cap.
- Storage objects use user-scoped keys; media MIME type and size are validated before authorization.
- Anonymous clients use public API DTOs and do not query database tables directly.

## Local and production modes

Development can use SQLite, seeded portfolio data, and an explicit development authentication bypass. The API refuses that bypass in staging and production. Production uses Supabase's Postgres connection string, Auth0 JWT validation, Supabase Storage, IGDB/Twitch, and Gemini credentials supplied through environment variables.

Automated tests replace upstream calls with deterministic fakes. They never require or exercise real credentials.

## Deployment

- Web: Vercel, including crawler-visible metadata for profile routes and a dynamic profile image endpoint.
- API: FastAPI Cloud or another ASGI platform.
- Database/media: one Supabase project.

Production origins, callback URLs, API audience, database migrations, storage bucket policy, and external credentials must be configured before deployment.

## Frontend module layout

- `src/pages/` — route-level screens. `PublicProfile.tsx` composes the public archive; shared profile pieces live in `src/pages/profile/` (`GameDetail`, `Guide`, `Stars`, `use-masthead-cinema`, `load-gsap`). Studio editors are split under `src/pages/editors/` (`shared.tsx` owns the editor chrome, fields, save bar, uploads, and data hooks).
- `src/lib/api.ts` — the transport facade: request handling with timeout + abort normalization, the real client, and the `isDemoMode` selection. DTO→view mapping lives in `api-mapping.ts`; the localStorage showcase backend in `demo-backend.ts`. Import paths stay on `lib/api` so demo and live modes remain swappable.
- `src/lib/useDialogA11y.ts` — one hook for modal semantics: focus trap, Escape, `[inert]` occlusion of the page (with an optional overlay boundary), body-scroll lock, and focus restoration.
- Inline scripts in `index.html` are pinned by hash in `vercel.json`'s Content-Security-Policy; `src/index-html.security.test.ts` fails the build if they drift, and `e2e/csp.spec.ts` enforces the header end to end.
