# Official Integration References

SavePoint's external-service implementations should be reviewed against these primary sources when dependencies or platform behavior change.

## Frontend and deployment

- [Vite guide](https://vite.dev/guide/)
- [Vite environment variables and modes](https://vite.dev/guide/env-and-mode)
- [Tailwind CSS with Vite](https://tailwindcss.com/docs/installation/using-vite)
- [shadcn/ui Vite installation](https://ui.shadcn.com/docs/installation/vite)
- [Vercel Vite deployment](https://vercel.com/docs/frameworks/frontend/vite)
- [Vercel Open Graph image generation](https://vercel.com/docs/og-image-generation)
- [Open Graph protocol](https://ogp.me/)
- [Meta shared-image guidance](https://developers.facebook.com/documentation/sharing/webmasters/images)

Public profile HTML must include crawler-visible `og:title`, `og:type`, `og:url`, `og:image`, and `og:image:alt` values. Image references must be absolute URLs. SavePoint targets 1200 × 630 output; Vercel's 500 KB `@vercel/og` constraint applies to the function bundle rather than the generated image response.

## Auth0

- [Auth0 React quickstart](https://auth0.com/docs/quickstart/spa/react)
- [Auth0 FastAPI quickstart](https://auth0.com/docs/quickstart/backend/fastapi)
- [Validate access tokens](https://auth0.com/docs/secure/tokens/access-tokens/validate-access-tokens)
- [Validate JSON Web Tokens](https://auth0.com/docs/secure/tokens/json-web-tokens/validate-json-web-tokens)

The browser sends an API access token, never an ID token. FastAPI validates RS256 signature, issuer, audience, expiry, and scopes using cached JWKS, refreshing when a previously unknown key ID appears.

## Supabase

- [Python client initialization](https://supabase.com/docs/reference/python/initializing)
- [Postgres connection modes](https://supabase.com/docs/guides/database/connecting-to-postgres)
- [Storage access control](https://supabase.com/docs/guides/storage/security/access-control)
- [Signed upload URLs](https://supabase.com/docs/reference/python/storage-from-create-signed-upload-url)

The service-role key remains server-side. FastAPI authorizes a user-scoped object path and the browser uploads directly with a short-lived signed URL.

## Twitch and IGDB

- [Twitch client-credentials flow](https://dev.twitch.tv/docs/authentication/getting-tokens-oauth/#client-credentials-grant-flow)
- [IGDB authentication](https://api-docs.igdb.com/#authentication)
- [IGDB endpoints](https://api-docs.igdb.com/#endpoints)
- [IGDB rate limits](https://api-docs.igdb.com/#rate-limits)
- [IGDB images](https://api-docs.igdb.com/#images)

IGDB calls remain server-only. Tokens are cached until shortly before expiry, refreshed once on unauthorized responses, and calls respect the published four-requests-per-second and eight-open-request limits.

## Gemini

- [Official Gemini libraries](https://ai.google.dev/gemini-api/docs/libraries)
- [Gemini 3.7 Flash](https://ai.google.dev/gemini-api/docs/models/gemini-3.7-flash)
- [Structured output](https://ai.google.dev/gemini-api/docs/structured-output)
- [Rate limits](https://ai.google.dev/gemini-api/docs/rate-limits)
- [Model deprecations](https://ai.google.dev/gemini-api/docs/deprecations)

SavePoint uses the unified `google-genai` package and an environment-configurable stable Flash model. Quotas can change, so rate-limit and upstream errors must degrade gracefully.

## Testing

- [Vitest guide](https://vitest.dev/guide/)
- [Playwright introduction](https://playwright.dev/docs/intro/)
- [FastAPI testing](https://fastapi.tiangolo.com/tutorial/testing/)
- [Supabase local development](https://supabase.com/docs/guides/local-development)

Routine automated tests use deterministic fakes and must not consume live IGDB or Gemini quotas.
