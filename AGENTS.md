# Repository Guidelines

Synchronize UI, Convex, and agent updates across this Next.js + Python stack.

## Project Structure & Module Organization
- `app/` contains App Router features (chat, editor, auth) plus the root layout; colocate UI, loaders, and route-specific stores inside each route folder.
- Core building blocks live in `components/`, `hooks/`, `lib/`, and `stores/`; promote complex helpers into feature subfolders as they evolve.
- Convex functions and schema live in `convex/`; refresh client calls and generated types before shipping.
- Python agents live under `chatbot-service/agents/`, with mirrored handlers in `app/api`; keep prompt updates and HTTP contracts aligned.
- Static assets sit in `public/`, styling tokens in `styles/` + `tailwind.config.ts`, docs in `docs/`, and local tooling (e.g., `scripts/init-qdrant`) in `scripts/`.

## Build, Test, and Development Commands
- `pnpm dev` starts the standard Next.js dev server; `pnpm dev:turbo` runs `next dev --turbo` when you need quicker refreshes.
- `pnpm build && pnpm start` produces and serves the production bundle.
- `pnpm lint` (or `pnpm lint:fix`) runs Next lint plus Biome autofixes; `pnpm format` runs Biome alone.
- `pnpm test` executes the Playwright suites—stop other local servers on the same port before running.

## Coding Style & Naming Conventions
- Biome settings (`biome.jsonc`) enforce 2-space indentation, single quotes, and trailing commas; do not override locally.
- Components use PascalCase (`ChatPanel`), hooks are prefixed `use`, utility files stay lowercase-kebab (`date-utils.ts`).
- Favor functional React components with shared Tailwind tokens, and keep Zod schemas beside the Convex actions or API routes they guard.

## Testing Guidelines
- Playwright specs live in `tests/e2e` and `tests/routes` and follow the `*.test.ts` suffix.
- Share selectors through page objects to avoid brittle locators, and stub third-party services via Convex doubles for deterministic runs.
- `pnpm test` already sets `PLAYWRIGHT=True`; attach HTML reports when debugging regressions.

## Commit & Pull Request Guidelines
- Keep commit subjects short (~60 chars) and action-oriented (e.g., `Add adaptive tooltip states`).
- PRs should explain the what/why, link tickets, and include screenshots or GIFs for UI changes plus Playwright evidence or a manual checklist.
- Call out updates to `docs/` or `chatbot-service/MODEL_CONFIGURATION.md` so reviewers can verify agent behavior.

## Security & Configuration Tips
- Never commit secrets; load them through `.env.local` and document required keys inside `docs/`.
- Revalidate Convex role checks and agent permissions with targeted Playwright smoke tests before merge, and rerun `scripts/init-qdrant` whenever vector contracts change.
