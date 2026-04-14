# Fundley

> AI-powered financial analysis platform that turns natural-language questions about public companies into interactive, reusable analysis reports.

## What is this?

Fundley collapses the fragmented financial analysis workflow -- Bloomberg for data, Excel for modeling, Python for computation, EDGAR for filings, PowerPoint for output -- into a single conversational interface. Ask a question like "Compare NVDA and AMD gross margins over the last 8 quarters," and a multi-agent pipeline retrieves verified data from institutional-grade APIs, executes Python in a sandboxed Jupyter notebook, generates interactive charts, and packages everything into a persistent Analysis Block that you can search, pin, duplicate, and export.

## Why?

I was frustrated that analysts spend 60-70% of their time on data wrangling rather than actual analysis, copy-pasting between disconnected tools with no audit trail. Generic AI chatbots hallucinate numbers and produce throwaway text -- the gap between "explain ROE" and "calculate trailing-four-quarter ROE for three companies and chart the trend" is enormous, and no product bridged it with verified data and auditable computation.

## How it works

A dual-runtime architecture: **Next.js 15** handles the frontend, auth, billing, and database, while a **Python agent service** (Agno framework) handles AI orchestration and code execution.

1. User sends a natural-language question via the chat interface
2. Next.js authenticates (Clerk), checks credits, and opens an SSE stream to the Python service
3. The Financial Analyst agent (GPT-5.2 with reasoning) plans the workflow and calls tools: FMP API for financials, SEC-API for filings, E2B sandbox for Python/Jupyter execution, MotherDuck/DuckDB for warehouse queries
4. Streaming events flow back through SSE -- chat text renders in the left panel, Analysis Blocks populate the right panel
5. Each block stores its Jupyter notebook alongside results for full auditability
6. Credits are deducted based on token-level billing at `RunCompleted`

A custom metric engine parses user-defined formulas into ASTs, then transpiles them to DuckDB SQL with window functions for market-wide screening in a single query.

## Key Technical Highlights

- **Analysis Blocks as knowledge artifacts**: Every analytical output is saved as an independent, searchable, exportable block -- not a disposable chat message -- enabling a growing library of institutional knowledge.
- **Three-layer metric engine**: User formulas are parsed into ASTs, compiled to step-by-step LLM instructions for auditability, and transpiled to DuckDB SQL with window functions for instant market-wide computation.
- **RAG-based API discovery**: 270+ FMP and Polygon API endpoints are embedded in a vector store; the agent discovers the right endpoint via semantic search rather than hardcoded mappings, automatically leveraging new endpoints as docs are added.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15 (App Router), React 19, Tailwind CSS, shadcn/ui |
| State | Zustand, TanStack Query |
| Charts | Recharts, Chart.js, Lightweight Charts |
| Auth | Clerk |
| Database | PostgreSQL (Neon Serverless) |
| ORM | Drizzle ORM |
| Data Warehouse | MotherDuck / DuckDB |
| Vector DB | Qdrant |
| AI Framework | Agno (AgentOS) |
| LLMs | GPT-5.2, GPT-5-mini, xAI Grok-4-fast |
| Code Sandbox | E2B Code Interpreter |
| Financial Data | FMP, Polygon.io, EODHD, SEC-API.io |
| Payments | Stripe |
| Caching | Redis |
| Deployment | Vercel (frontend), Render (Python) |

## Quick Start

```bash
git clone https://github.com/shizhigu/fundley-app-new.git
cd fundley-app-new
cp .env.example .env.local  # fill in API keys
npm install
npm run dev
# In a separate terminal, start the Python agent service
cd agent-service && pip install -r requirements.txt && uvicorn main:app --reload
```

## License

MIT
