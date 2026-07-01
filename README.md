<div align="center">

# Fundley

**An AI chat agent for company fundamentals and market data, aimed at investment research.**

[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-15-black.svg)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6.svg)](https://www.typescriptlang.org)
[![Lint](https://github.com/shizhigu/fundley-app-new/actions/workflows/lint.yml/badge.svg)](https://github.com/shizhigu/fundley-app-new/actions/workflows/lint.yml)

</div>

---

## What it is

Fundley is a chat interface where you ask financial questions in plain language ("how is NVDA's profitability?", "compare AAPL vs MSFT margins", "rank tech companies by ROCE") and an LLM agent pulls the data, runs the math, and explains the result. It pulls from the Financial Modeling Prep API for statements and ratios, SEC filings for MD&A and risk sections, and a DuckDB warehouse for market-wide queries.

The design docs target small fund managers doing investment research: institutional-holding tracking, peer comparison, custom-metric calculation, and screening. It is built on the Vercel Chat SDK template and extended into a financial-analysis tool. It supports English and Chinese queries.

## Agent design

This is a tool-using agent, not a single prompt call. The chat route (`app/(chat)/api/chat/route.ts`) runs a Vercel AI SDK `streamText` loop with `stopWhen: stepCountIs(5)`, so the model can take several turns of "call a tool, read the result, decide the next call" before answering. The model chooses from tools including:

- `getFinancialData`: unified FMP fetch across income statement, balance sheet, cash flow, ratios, and key metrics, with historical and TTM modes and field-level extraction to keep context small.
- `calculateLatexMetric` / `createLatexMetric`: the notable part. A user (or the agent) defines a metric as a LaTeX formula, and `lib/latex-financial/engine.ts` sends that formula plus the natural-language request to an LLM that generates a DuckDB SQL query. The SQL is checked against a keyword blocklist (DROP, DELETE, and so on), run against MotherDuck, and the rows come back to the agent. This lets the agent compute arbitrary ratios and rank across the whole dataset without hand-written queries.
- SEC filing tools (`extractMDA`, `extractRiskFactors`, `extractBusinessOverview`) via SEC-API.io.
- `webSearch` (Perplexity) as a last resort for recent news.
- `createJSVisualization` for inline Chart.js charts.

The philosophy in the design docs is "API to cache to extract to LLM": skip heavy ETL and business tables, cache raw API responses, extract only the fields a query needs, and let the LLM and SQL do the analysis. The system prompt (`lib/ai/prompts.ts`) pushes the agent to decode user intent first, prefer internal data over web search, and gather related metrics proactively.

The repo also contains structured sub-agents in `lib/ai/agents/` (a field-mapping agent in `financial-fields-agent.ts`, a data-orchestration agent, a SQL generator) that make single typed model calls, plus market-scan tools. Not all of these are wired into the current chat loop; some are staged for the roadmap in `CLAUDE.md`.

## Tech stack

- Next.js 15 (App Router, React 19, Server Actions)
- Vercel AI SDK 5, models routed through OpenRouter (Grok, Gemini, GPT-5 configurable)
- Convex for the database, chat history, and realtime subscriptions
- Clerk for auth
- MotherDuck / DuckDB for market-wide SQL, reached through a separate FastAPI service
- Financial Modeling Prep (financial data), SEC-API.io (filings), Perplexity (search)
- shadcn/ui + Tailwind, TipTap and CodeMirror editors, Chart.js (loaded via CDN) for inline charts
- Biome for lint and format, Playwright for E2E tests

## Quick start

```bash
pnpm install
npx convex dev   # in one terminal: Convex backend and codegen
pnpm dev         # in another: Next.js app on http://localhost:3000
```

You need environment variables before the app is useful. At minimum: `NEXT_PUBLIC_CONVEX_URL` and Clerk keys (auth), `OPENROUTER_API_KEY` (models), and `FMP_API_KEY` (financial data). Optional integrations read `SEC_API_KEY`, `PERPLEXITY_API_KEY`, `MOTHERDUCK_API_URL`, `MEM0_API_KEY`, and `REDIS_URL`. There is no committed `.env.example`; grep `process.env` under `lib/`, `app/`, and `convex/` for the full list.

Other scripts:

```bash
pnpm lint     # Next lint + Biome
pnpm format   # Biome format
pnpm test     # Playwright E2E
```

## Status

Early prototype under active iteration. It grew out of the Vercel Chat SDK template (the package is still named `ai-chatbot`, license is Apache 2.0 from Vercel), and much of the E2E test suite is inherited from that template. Expect rough edges: commented-out tool blocks, debug scripts and `console.log` throughout, some `_old` files, and design notes written in Chinese. The LaTeX-to-SQL path depends on an external MotherDuck service being available. GitHub Actions runs lint on push and Playwright on the main branch.

## License

Apache 2.0. See [LICENSE](LICENSE).
