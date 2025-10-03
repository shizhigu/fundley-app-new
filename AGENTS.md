# Repository Guidelines

## Project Structure & Module Organization
- `app/` hosts Next.js App Router routes (chat, editor, auth) and global layout.
- `components/`, `hooks/`, and `lib/` provide shared UI, state, and utilities; favor colocating feature-specific pieces under relevant subfolders.
- `convex/` contains Convex backend functions and schema definitions; update alongside app code when data contracts change.
- `public/` stores static assets; CSS and design tokens live under `styles/`.
- `chatbot-service/` wraps the Python agent runtime (see `chatbot-service/agents/`); mirror API contracts when touching `app/api` endpoints.
- Configuration and reference docs live in `docs/`, and `scripts/` holds maintenance tasks (e.g., `init-qdrant`).

## Build, Test, and Development Commands
- `pnpm dev` – start the Next.js dev server with hot reload.
- `pnpm dev:turbo` – run `next dev --turbo` for faster refresh on supported platforms.
- `pnpm build && pnpm start` – create and serve the optimized production build.
- `pnpm lint` / `pnpm lint:fix` – run Next lint and Biome (auto-fixing with `lint:fix`).
- `pnpm format` – apply Biome formatting without lint checks.
- `pnpm test` – launch Playwright suites; ensure `pnpm dev` ports are free.

## Coding Style & Naming Conventions
- Use TypeScript with 2-space indentation, single quotes, and trailing commas per `biome.jsonc`.
- Components use PascalCase, hooks use `useCamelCase`, utility modules stay lowercase-kebab.
- Prefer functional React components and Tailwind utility classes defined in `styles/` and `tailwind.config.ts`.
- Keep Convex function names descriptive and collocate Zod schemas near usage.

## Testing Guidelines
- Playwright tests live in `tests/e2e` and `tests/routes`, named `*.test.ts`; favor page object helpers for reuse.
- Set `PLAYWRIGHT=True` when running locally (handled by `pnpm test`); add screenshots or traces via `test.info().attach`.
- Aim for coverage of critical flows (auth, chat execution, research tools); stub external APIs via Convex test doubles when possible.

## Commit & Pull Request Guidelines
- Follow the existing concise, action-oriented subject style (e.g., `优化聊天布局拆分面板` or `Add adaptive tooltip states`); limit to ~60 characters.
- Reference related tickets in the body and describe key user-facing impacts.
- PRs should include what/why, testing evidence (Playwright HTML report or manual steps), and screenshots/GIFs for UI changes.
- Link Convex schema or agent prompt updates to relevant docs in `docs/` or `chatbot-service/MODEL_CONFIGURATION.md`.
