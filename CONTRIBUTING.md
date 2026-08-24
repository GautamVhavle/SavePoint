# Contributing to SavePoint

Thanks for wanting to make player archives better. This repo is a pnpm + uv monorepo: `apps/web` (React, TypeScript, Vite) and `apps/api` (FastAPI, SQLAlchemy async).

## Setup

```bash
pnpm install
uv sync --project apps/api --all-extras
cp apps/web/.env.example apps/web/.env
cp apps/api/.env.example apps/api/.env   # optional; tests provide their own env
```

## Branches and commits

- Branch from `main`: `feat/...`, `fix/...`, `chore/...`.
- Commits: imperative subject under 72 characters, body explains *why* when it is not obvious.
- One logical change per PR. If you find an unrelated bug, open a separate PR.

## Definition of done

A PR is mergeable when **all** of the following pass locally:

```bash
pnpm lint && pnpm typecheck && pnpm test      # web unit (zero warnings allowed)
pnpm build                                     # production bundle compiles
pnpm test:e2e                                  # smoke + axe WCAG A/AA + studio flows + responsive gates
pnpm test:api                                  # FastAPI suite
pnpm check                                     # or run every gate in one shot
cd apps/api && uv run ruff check . && uv run mypy app
```

Additional expectations:

- **Accessibility**: any new interactive component must be keyboard-reachable, labelled (`aria-label` where text is absent), and pass the axe scans in both themes.
- **Responsive**: nothing may introduce horizontal overflow at 320px. The `responsive.spec.ts` gates exist for a reason.
- **Motion**: respect `prefers-reduced-motion`. Framer: gate on `useReducedMotion()`. GSAP: branch inside the timeline setup.
- **Data contracts**: API DTOs are snake_case and mirrored in `apps/web/src/types.ts`. If you change a Pydantic schema, update the view-model mapper in `apps/web/src/lib/api.ts` and, when relevant, regenerate `src/lib/__fixtures__/public-profile.json` from a live response so the contract test stays honest.
- **Database**: schema changes need an Alembic revision (`alembic revision -m "..."`) plus a model update. Never edit an existing revision — always add a new one on top.

## Design system notes

- Tokens live in `apps/web/src/styles.css` as CSS variables; Tailwind maps them in `tailwind.config.js`. Prefer tokens over raw hex values.
- Status colors come from `STATUS_COLORS` in `apps/web/src/types.ts`; do not hardcode status hues.
- Cards follow a deliberate split: mobile shows box art alone (covers carry their own typography), desktop layers stats over banner art. Preserve this contract when touching `GameCard`.
- Copy uses straight punctuation only: no em dashes anywhere in the codebase.

## Reporting bugs

Open an issue with the route, viewport width, theme, expected vs actual behavior, and console output if any. Screenshots welcome.
