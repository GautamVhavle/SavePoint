# SavePoint Web

A production-oriented React frontend for a collectible gaming portfolio: public player archives, hardware, Hall of Fame, chronological reviews, profile-scoped AI Guide, and a protected curator studio.

## Stack

React 18 + TypeScript + Vite, Tailwind CSS, React Router, TanStack Query, React Hook Form + Zod, Auth0, Framer Motion, GSAP, Lucide, Vitest/Testing Library, and Playwright.

## Start locally

```bash
cp .env.example .env.local
pnpm install
pnpm dev
```

For the credential-free visual showcase, omit `VITE_API_URL` or set `VITE_DEMO_MODE=true`. Demo mode uses deterministic synthetic data and simulated writes. It only changes browser UX: it does **not** manufacture an access token or bypass FastAPI authorization. In production configure the API and Auth0 variables and leave demo mode false.

## Commands

- `pnpm dev`, Vite development server
- `pnpm typecheck`, strict TypeScript project check
- `pnpm lint`, ESLint quality gate (zero warnings allowed)
- `pnpm test`, Vitest suite
- `pnpm build`, typecheck and optimized production bundle
- `pnpm test:e2e`, Playwright desktop/mobile suites against the preview build

## FastAPI contract

The typed client is centralized in `src/lib/api.ts`. Public reads call `GET /profiles/:handle`; writes use bearer tokens acquired silently from Auth0 and target `/me/*`; Guide calls `POST /profiles/:handle/guide`. Requests are cancellable, use JSON, include credentials for secure cookie-compatible deployments, and normalize response errors. FastAPI remains responsible for authorization, ownership checks, validation, upload scanning, rate limits, and draft/public field separation.

Expected public profile data matches the interfaces in `src/types.ts`. For a mature deployment, generate API types from FastAPI OpenAPI and add runtime response validation at this boundary.

## Auth0

Create a Regular SPA application for each environment. Allow only exact callback URLs (`https://host/auth/callback`), logout URLs, and web origins. Configure audience and domain through public `VITE_` identifiers; never place an Auth0 client secret in the frontend. All API mutations must independently validate JWT issuer, audience, signature, expiry, scopes, and resource ownership.

## Metadata and deployment

`react-helmet-async` provides route-specific title, canonical, description, and Open Graph structure. `vercel.json` provides SPA deep-link rewrites, immutable hashed-asset caching, and baseline security headers. Client-generated tags are not reliable for every social crawler. For production indexing, add a Vercel edge/server rendering endpoint or build-time prerender for published `/u/:handle` pages that emits the same sanitized tags, canonical URL, and absolute social image before serving the SPA. Private editor routes should be emitted as `noindex` by that layer.

Remote Unsplash demo covers are stable references with CSS gradient failure states; no copyrighted files are bundled. Replace the remote image allowlist and CSP with the production image pipeline.

## Accessibility and motion

The app includes a skip link, semantic landmarks, labeled icon controls, 44px targets, visible focus, live status/toasts, keyboard-accessible filters/details, contrast-aware themes, and reduced-motion CSS. GSAP owns only the detail-card physical flip; Framer owns route, layout, and entrance transitions. The GSAP context is reverted on unmount. The detail view remains readable when motion is disabled.

## Release checklist

1. Run typecheck, lint, unit tests, production build, and Playwright.
2. Verify Auth0 callback/logout URLs in each environment.
3. Validate CSP against the selected Auth0, API, image, and telemetry origins.
4. Exercise 401/403/404/409/429 and offline states against staging.
5. Run manual keyboard, screen reader, 200% zoom, reduced-motion, dark/light, and 320px checks.
6. Verify social cards through target crawler debuggers after edge/prerender metadata is enabled.
