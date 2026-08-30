# SavePoint, Product Plan

## 1. Philosophy

SavePoint is a **portfolio, not a feed.** No likes, no follows, no comments, no timeline. The only social action is: someone visits a link and sees a person's gaming life laid out, what they play it on, what they've played, and what they thought of it. Think Behance/Linktree/MyAnimeList, not Instagram.

Every gamer already curates a mental "best of" list and a rig they're proud of. SavePoint gives that a permanent, shareable, beautiful home. The product succeeds if a stranger lands on someone's `/u/handle` page and thinks *"this person clearly has taste, and this page is gorgeous."*

Two words should guide every UI decision: **collectible** and **credible**. Collectible, games render as cards with rarity-like visual weight (a 5-star review with a custom award should *feel* like pulling a rare card). Credible, all game data comes from IGDB, not free text, so the catalog never looks amateur or has typos in a game title.

## 2. Core Pillars

1. **The Rig**, one section, one time: what you play on and what you play with.
2. **The Chronicle**, every game touched, tagged `playing / completed / backlog / dropped`, each with a personal star rating and a review of any length.
3. **The Card**, the atomic unit of the whole app. IGDB metadata (cover, title, platforms, genres, release year) fused with the user's own voice (rating, review, custom award). Front face is glanceable; click/tap expands into the full story.
4. **The Portfolio**, a single public, shareable, read-only URL that composes all of the above into one page. This is the artifact people paste in a Discord bio or Twitter link.
5. **The Guide**, an AI chatbot scoped *only* to that one profile's data, so a visitor can ask "what does he think of Elden Ring?" instead of scrolling to find it.

## 3. Feature Breakdown

### 3.1 The Rig (setup showcase)

- Structured fields, not free text, so it renders consistently: CPU, GPU, RAM, motherboard, storage, monitor(s), and a flexible **peripherals list** (keyboard, mouse, headset, controller, chair, desk, mic, capture card, user can add arbitrary items with a name + brand/model + optional photo).
- Optional photo per item and one hero "battlestation" photo for the whole setup.
- Rendered as a spec sheet with a distinct visual identity from the game cards, this is the "about my hardware" section, not part of the collection.

### 3.2 The Chronicle (game library)

- Add a game via IGDB search-as-you-type (debounced, backend-proxied).
- On selection, snapshot IGDB metadata into your own DB (cover art, title, platforms, genres, release date, IGDB id). Never re-fetch IGDB live on every profile view.
- User then sets: status (`playing / completed / backlog / dropped`), star rating (1-5, half-star optional), platform they personally played it on (may differ from IGDB's platform list), start/finish dates (optional), hours played (optional), and a long-form review (no hard cap).
- Duplicate protection matches against IGDB id, not title string.

### 3.3 Custom Awards & Featured Games

- User can invent an award and attach it to any game in their library, with a short reason.
- A curator's-pick **Featured / Hall of Fame** rail is a manually chosen subset, separate from the full grid.

### 3.4 The Card (front + expanded states)

- **Front:** cover art, title, personal star rating, a small platform icon, and an optional award badge.
- **Expanded:** full review, status, hours played, dates, IGDB genre tags, and the award with its custom description.
- Cards visually differentiate by status without loud badges.

### 3.5 Public Portfolio Page

- One URL per user: `savepoint.vercel.app/u/<handle>`, with a real Open Graph preview containing title, avatar, representative cover image, and game count.
- Layout: identity header → Rig → Featured/Hall of Fame → full Chronicle grid with filters/sorting → chatbot entry point.
- Fully read-only, unauthenticated, and indexable.

### 3.6 AI Guide

- Scoped strictly to one profile at a time.
- The backend assembles the profile's rig, game list, and relevant reviews into prompt context and calls Gemini without a vector database.
- Rate-limited per visitor/IP.

### 3.7 Auth & Editing

- Auth0 gates only editing; viewing public profiles requires no login.
- One Auth0 account = one SavePoint profile = one public slug.

## 4. Data Model

- **User**, auth0_sub, unique handle/slug, display name, avatar URL, bio, theme preference
- **Setup**, User-owned structured specs, monitors, peripherals, and hero photo URL
- **GameEntry**, User-owned IGDB snapshot plus status, platform played, rating, review, hours, and dates
- **Award**, User-owned and attached to a GameEntry; name, description, and featured state
- **FeaturedGame**, ordered featured state and optional curator's note

GameEntry's IGDB snapshot stays denormalized so profiles render if IGDB is unavailable or a game is delisted.

## 5. Technology

| Layer | Choice |
|---|---|
| Frontend | React + Vite, Tailwind, shadcn/ui primitives, Framer Motion + GSAP |
| Backend | TypeScript, Hono on Vercel Functions, Zod |
| Database | Neon Serverless Postgres via Prisma |
| File storage | Vercel Blob |
| Auth | Auth0 |
| Game metadata | IGDB API v4 via Twitch OAuth2 |
| AI Guide | Gemini Flash API (`@google/genai`) |

IGDB credentials and tokens remain server-side. Search and add calls go through the Hono API. Gemini requests are profile-scoped and rate-limited. All credentials are injected via environment variables.

## 6. MVP Scope

**In scope:** rig showcase, IGDB-backed library with statuses/ratings/reviews, custom awards, featured rail, public portfolio with OG preview, profile-scoped AI Guide, Auth0 editing, and dark/light modes.

**Out of scope:** social graph, teams, native apps, automatic playtime imports, and monetization.

## 7. Design Direction

- Dark mode is the primary identity; light mode is a fully art-directed alternative.
- The card flip/expand is the signature interaction, combining GSAP physical detail with Framer Motion layout transitions.
- Motion communicates rarity and craft but never blocks long-form reading, and respects `prefers-reduced-motion`.
- Rig uses technical/monospace typography while Chronicle is editorial and cover-driven.
- The visual direction is premium frozen glass with selective blur, deep navy surfaces, spectral neon accents, clear hierarchy, responsive behavior, and accessible contrast.

## 8. Build Order

1. Data model, API routes, database wiring, Auth0, and dashboard shell.
2. IGDB search and metadata-snapshot flow.
3. Rig CRUD and Vercel Blob uploads.
4. Cards, reviews, ratings, awards, and featured curation.
5. Public profile route and Open Graph generation.
6. AI Guide and durable rate limiting.
7. Animation, responsive polish, accessibility, tests, and deployment validation.
