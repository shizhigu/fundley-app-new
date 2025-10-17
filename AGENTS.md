# Repository Guidelines

Quick reference for contributing to Fundley's agent stack.

## Project Structure & Module Organization
- `app/` hosts Next.js App Router features (chat, editor, auth) and the root layout; keep per-route UI colocated.
- Shared building blocks stay in `components/`, `hooks/`, `lib/`, and `stores/`; split into feature folders when logic grows.
- Convex functions and schema sit in `convex/`; update client callers and backend types together.
- Python agents live in `chatbot-service/agents/`; mirror responses with handlers under `app/api`.
- Static assets live in `public/`; Tailwind tokens and CSS utilities are in `styles/` and `tailwind.config.ts`.
- Reference docs sit in `docs/`; setup helpers such as `scripts/init-qdrant` support local tooling.

## Build, Test, and Development Commands
- `pnpm dev` starts the Next.js dev server with hot reload.
- `pnpm dev:turbo` runs `next dev --turbo` for faster refreshes.
- `pnpm build && pnpm start` produces and serves the production bundle.
- `pnpm lint` / `pnpm lint:fix` run Next lint and Biome; `pnpm format` runs Biome alone.
- `pnpm test` triggers Playwright suites—close other servers on the same port first.

## Coding Style & Naming Conventions
- Follow the TypeScript defaults in `biome.jsonc`: 2-space indentation, single quotes, trailing commas.
- Components use PascalCase (`ChatPanel`), hooks use `useCamelCase`, utilities stay lowercase-kebab (`date-utils.ts`).
- Favor functional React components with Tailwind classes defined in `styles/` and `tailwind.config.ts`.
- Collocate Zod schemas with their consumers, especially around Convex actions and API routes.

## Testing Guidelines
- Playwright specs reside in `tests/e2e` and `tests/routes`, named `*.test.ts`.
- Share selectors through page objects to avoid brittle locators.
- Run suites with `pnpm test`; the script sets `PLAYWRIGHT=True` automatically.
- Stub third-party services through Convex doubles when validating research tools.

## Commit & Pull Request Guidelines
- Keep commit subjects concise and action-oriented (~60 chars), e.g., `优化聊天布局拆分面板` or `Add adaptive tooltip states`.
- In PRs, summarize the what/why, link tickets, and attach screenshots or GIFs for UI-impacting changes.
- Provide test evidence (Playwright HTML report or manual checklist) and point reviewers to relevant updates in `docs/` or `chatbot-service/MODEL_CONFIGURATION.md`.

## Security & Configuration Tips
- Never commit secrets; load them through `.env.local` and document required keys in `docs/`.
- Revalidate Convex and agent permissions with targeted Playwright smoke tests before merging.
