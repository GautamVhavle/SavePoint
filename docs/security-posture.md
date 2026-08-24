# Security posture

A working map of SavePoint's controls and their deliberate limits. For
reporting vulnerabilities see [SECURITY.md](../SECURITY.md).

## Identity and authorization

| Control | Where |
| --- | --- |
| Auth0 RS256 JWT with required `exp/iat/iss/aud/sub`, JWKS caching with unknown-`kid` refresh | `apps/api/app/core/auth.py` |
| Ownership derived from the token subject — client input never selects a profile | `owner_profile` dependency |
| Dev bypass refused in staging/production by settings validator | `Settings.production_safety` |

## Abuse resistance

| Scope | Limit (default) | Notes |
| --- | --- | --- |
| Guide questions | 10 / profile+visitor / hour | Committed before the upstream Gemini call, so failures still consume quota |
| IGDB search | 60 / profile+visitor / hour | Events survive rollback because the limiter commits its own insert |
| Upload signing | 30 / profile+visitor / window | Throttles Supabase round trips |
| Request bodies | 1 MiB before parsing (`MAX_BODY_BYTES`) | 413 short-circuits in middleware |

Visitor identity is an HMAC-SHA256 of the socket address keyed by
`IP_HASH_SECRET`; raw addresses are never stored. The window cleanup deletes
aged events on every limited call and is backed by
`ix_rate_limit_created_at`.

Known tolerance: two concurrent requests can both pass the count check and
overshoot a limit by one. Acceptable granularity for abuse resistance (this
is not a billing meter).

## Content and prompt boundaries

- The Guide's system instruction treats all profile text as untrusted data;
  the wording is pinned by `test_guide_system_prompt_keeps_untrusted_data_boundary`.
- Answers are capped at 4000 characters regardless of upstream accounting.
- Validation errors strip submitted values before echoing anything back.

## Browser surface

- `Content-Security-Policy` is enforced via `vercel.json`. The page ships
  exactly one inline script whose sha256 is pinned; `src/index-html.security.test.ts`
  fails on drift and `e2e/csp.spec.ts` enforces the header across key routes.
- Headers on both surfaces: `nosniff`, `X-Frame-Options: DENY`,
  `frame-ancestors 'none'`, COOP `same-origin`, referrer + permissions policies,
  HSTS in staging/production.
- Authenticated endpoints return `Cache-Control: private, no-store`.

## Supply chain

- `gitleaks` scans full history on every push/PR.
- Dependabot watches npm, pip, and Actions; CI fails on high/critical npm
  audit findings in production dependencies.

## Residual risks (accepted, revisit if product changes)

1. **No CSP violation collector.** Violations surface in consoles only;
   add a reporting endpoint before tightening `connect-src` beyond `https:`.
2. **Public read flood.** `/profiles/{handle}` relies on CDN caching
   (60 s fresh + SWR) rather than per-IP throttling; a burst beyond cache
   reach reaches Postgres. Fine at current scale.
3. **Trusted-proxy IP assumption.** Rate limiting trusts `request.client.host`;
   the ASGI platform must sanitize forwarding headers (documented in `deps.py`).
4. **Demo mode writes** live in `localStorage` under a fixed key on shared
   machines. Demo grants no authorization, but clear it on shared devices.
