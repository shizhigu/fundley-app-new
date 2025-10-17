# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Core Commands

- **Development**: `pnpm dev` - Runs Next.js with hot reload on port 3000
- **Development (Turbo)**: `pnpm dev:turbo` - Faster refresh using Turbo mode
- **Build**: `pnpm build` - Creates production build
- **Production**: `pnpm start` - Serves production build
- **Linting**: `pnpm lint` - Runs Next.js lint and Biome lint with auto-fix
- **Formatting**: `pnpm format` - Formats code using Biome
- **Testing**: `pnpm test` - Runs Playwright E2E tests (sets PLAYWRIGHT=True environment variable)

### Python Agent Service Commands

```bash
cd chatbot-service

# Create conda environment
conda create -n fundley-chat python=3.10
conda activate fundley-chat

# Install dependencies
pip install -r requirements.txt

# Run agent service
python main.py
```

### Utility Commands

- **Field Search Test**: `pnpm field:search` - Tests financial field search functionality
- **Qdrant Init**: `pnpm qdrant:init` - Initializes Qdrant vector database

## Architecture Overview

This is a Next.js 15 AI financial analysis platform with a hybrid architecture combining TypeScript (frontend/API) and Python (AI agents).

### Dual Runtime Architecture

**Next.js Application (TypeScript)**
- Frontend UI and API routes
- User authentication (Clerk)
- Database operations (PostgreSQL via Neon)
- File storage (local `/tmp/fundley/`)

**Python Agent Service (chatbot-service/)**
- AI agent runtime (Agno framework)
- Code execution in E2B sandboxes
- Financial data processing
- Tool execution and orchestration

**Communication Pattern**:
```
User → Next.js API Route → Python Agent Service → E2B Sandbox
                                ↓
                         Analysis Results
                                ↓
                    /tmp/fundley/{user_id}/blocks/{block_id}/
```

### Analysis Block Architecture (Notebook-Based)

**Core Concept**: 1 Analysis Block = 1 Jupyter Notebook + Generated Artifacts

**File Structure**:
```
/tmp/fundley/{user_id}/blocks/{block_id}/
├── analysis.ipynb       # Jupyter notebook (managed by Agent via nbformat)
├── report.html          # Generated report
├── data.json            # Data tables
└── chart.png            # Visualizations
```

**Workflow**:
1. Agent creates/loads `analysis.ipynb` using nbformat library
2. Adds cells incrementally (parameters → data fetching → analysis → visualization)
3. Executes cells in E2B sandbox (variables persist across cells)
4. Generated artifacts auto-download to local block directory
5. Frontend displays HTML reports and JSON data tables

**Key Design Decision**: Blocks are **independent of chats**. Each block has a unique `block_id` and persists across sessions. The notebook file serves as both code and state storage.

### Project Structure

#### `/app` - Next.js App Router
- `(auth)` - Authentication flow (Clerk integration)
- `(chat)` - Main chat interface and streaming API
  - `/api/chat` - Chat streaming endpoint
  - `/api/files/[filename]` - File serving for analysis artifacts
- `(settings)` - User settings and preferences

#### `/components` - React Components
- Built with shadcn/ui (Radix primitives + Tailwind)
- Key components:
  - `chat.tsx` - Main chat interface
  - `multimodal-input.tsx` - User input with file upload
  - `analysis-block-renderer.tsx` - Renders analysis results (HTML/JSON)
  - `right-panel-tabs.tsx` - Analysis blocks, financial data panels

#### `/lib` - Core Libraries
- `/db` - Database schema and migrations (Neon PostgreSQL)
  - `schema/` - TypeScript table definitions
  - `migrations/` - SQL migration files
- `/hooks` - Custom React hooks
- `/utils` - Utility functions

#### `/chatbot-service` - Python Agent Runtime
- `/agents` - AI agent implementations
  - `analyst/` - Financial analyst agent with E2B code execution
- `/tools` - Agent tools
  - `e2b.py` - **Core tool**: Jupyter notebook execution in E2B sandbox
  - `fmp_api_discovery_tools.py` - Financial Modeling Prep API access
  - `temporal_rag.py` - Time-aware financial narrative analysis
- `/shared` - Shared utilities
  - `voyage_embeddings.py` - Financial document embeddings
  - `qdrant_client.py` - Vector database operations

### Key Patterns

#### 1. Notebook-Based Code Execution (E2B)

**Tool**: `chatbot-service/tools/e2b.py`

The Agent operates on Jupyter notebooks using nbformat:

```python
# Agent's typical workflow
import nbformat
from nbformat.v4 import new_notebook, new_code_cell

# Load or create notebook
try:
    with open('analysis.ipynb', 'r') as f:
        nb = nbformat.read(f, as_version=4)
except FileNotFoundError:
    nb = new_notebook()

# Add cell with parameters
nb.cells.append(new_code_cell('''
# === PARAMETERS ===
SYMBOL = 'NVDA'
'''))

# Save notebook
with open('analysis.ipynb', 'w') as f:
    nbformat.write(nb, f)

# Execute cell
exec(nb.cells[-1].source)
```

**Critical**:
- E2BTools syncs notebook between local (`/tmp/fundley/...`) and sandbox (`/home/user/analysis.ipynb`)
- Variables persist across cells within same execution
- `session_state` must contain `current_block_id` to identify target block

#### 2. Streaming Architecture

**Chat Streaming**: Uses Vercel AI SDK's `streamText` with custom data stream protocol

**Tool Results**: Streamed back via `createDataStreamResponse` with structured annotations

**Analysis Blocks**: Created via `createAnalysisBlock` tool, tracked in database, files auto-downloaded

#### 3. Authentication Flow

**Clerk + Database Integration**:
- Clerk handles OAuth and session management
- Webhook syncs user data to PostgreSQL
- `clerk_user_id` maps to internal `users.id` (UUID)

#### 4. Financial Data Pipeline

**Data Sources**:
- Financial Modeling Prep (FMP) - Company fundamentals, financial statements
- Polygon.io - Options data
- MotherDuck/DuckDB - Cached financial data
- EODHD - News and events

**Vector Search**: Qdrant stores:
- FMP API documentation (270+ endpoints)
- Polygon API documentation
- Financial field metadata (for intelligent field selection)

#### 5. Temporal RAG (News Analysis)

**Algorithm**: Greedy window-based narrative discovery
- Fetches news events from EODHD
- Generates finance-optimized embeddings (Voyage-finance-2)
- Finds temporal narratives using sliding time windows
- Connects causally-related events without LLM judgment

### Database Schema (PostgreSQL via Neon)

**Core Tables**:

```sql
-- Users (linked to Clerk)
users: { id: UUID, email, clerk_user_id, created_at, updated_at }

-- Chats (conversation history)
chats: { id: UUID, user_id, title, visibility, created_at }

-- Messages (chat messages)
messages: { id: UUID, chat_id, role, parts, attachments, created_at }

-- Analysis Blocks (independent of chats)
analysis_blocks: {
  id: UUID,
  user_id,
  title,
  notebook_path,  -- /tmp/fundley/{user_id}/blocks/{block_id}/analysis.ipynb
  symbols: TEXT[],
  tags: TEXT[],
  created_at
}

-- Watchlist (user's tracked symbols)
watchlist: {
  id: SERIAL,
  user_id: UUID,
  symbol,
  asset_type,
  tags: JSONB,
  alert_price_high,
  alert_price_low
}
```

**Key Indexes**:
- `users.clerk_user_id` - Fast Clerk → DB user lookup
- `analysis_blocks.symbols` (GIN) - Multi-symbol queries
- `watchlist.tags` (GIN) - JSONB tag searches

### Environment Variables

**Required**:
- `DATABASE_URL` - Neon PostgreSQL connection string
- `CLERK_SECRET_KEY` - Clerk authentication
- `E2B_API_KEY` - E2B sandbox execution
- `FMP_API_KEY` - Financial Modeling Prep API
- `POLYGON_API_KEY` - Polygon.io API
- `REDIS_URL` - Redis for E2B sandbox pool management

**Optional**:
- `MOTHERDUCK_TOKEN` - DuckDB cloud storage
- `QDRANT_URL`, `QDRANT_API_KEY` - Vector database
- `VOYAGE_API_KEY` - Financial embeddings
- `EODHD_API_TOKEN` - News data

### AI Agent Configuration

**Models** (via OpenRouter):
- **Chat**: `grok-2-1212` (default)
- **Financial Fields**: `gpt-4o-mini` (field extraction)
- **Sub-agents**: `claude-3-5-sonnet-20241022` (reasoning tasks)

**Configuration**: `lib/ai/providers.ts`

**Critical Tool**: `run_python_code` in `chatbot-service/tools/e2b.py`
- All Python code execution goes through this tool
- Manages notebook lifecycle
- Auto-downloads generated artifacts
- See tool docstring for complete usage examples

### Code Style

- **TypeScript**: 2-space indentation, single quotes, trailing commas (per biome.jsonc)
- **React**: Functional components with hooks
- **File Naming**: kebab-case for files, PascalCase for components
- **CSS**: Tailwind utility classes (configured in tailwind.config.ts)
- **Python**: Black formatting (chatbot-service)

### Testing

**E2E Tests** (Playwright):
- Location: `/tests`
- Run: `pnpm test` (automatically sets `PLAYWRIGHT=True`)
- Focus: Critical flows (auth, chat execution, analysis blocks)

**Python Tests**:
```bash
cd chatbot-service
pytest tests/
```

### File Upload and Storage

**Local Storage**: `/tmp/fundley/{user_id}/blocks/{block_id}/`
- Analysis notebooks (`.ipynb`)
- Generated reports (`.html`)
- Data files (`.json`, `.csv`, `.parquet`)
- Charts (`.png`, `.jpg`)

**Auto-Download**: E2BTools automatically downloads artifacts from sandbox after code execution (see `_auto_download_artifacts`)

### Important Conventions

#### Analysis Block Workflow

1. **Create Block**: User initiates analysis in chat
2. **Set Context**: `session_state['current_block_id']` identifies target block
3. **Agent Execution**: Agent calls `run_python_code` with notebook operations
4. **Artifact Generation**: Agent writes files (report.html, data.json) in sandbox
5. **Auto-Download**: Files sync to local block directory
6. **Frontend Display**: UI renders HTML/JSON from local files

#### Notebook Cell Structure

Standard pattern for analysis notebooks:

```python
# Cell 1: Parameters
SYMBOL = 'NVDA'
PERIOD = 'Q4'

# Cell 2: Data Fetching
import pandas as pd
df = fetch_financial_data(SYMBOL)

# Cell 3: Analysis
df['growth'] = df['revenue'].pct_change()

# Cell 4: Visualization
import plotly.express as px
fig = px.line(df, x='date', y='revenue')
fig.write_html('report.html')
```

Variables persist across cells within same execution.

### Migration Notes

**Recent Changes**:
- **Switched from single scripts to Jupyter notebooks** (October 2025)
  - Enables incremental development
  - Better debugging (variables persist)
  - Template reuse (copy notebook, change parameters)
- **Removed Convex** - Migrated to PostgreSQL for better flexibility
- **Blocks decoupled from Chats** - Independent storage for better reusability

### Troubleshooting

**E2B Sandbox Issues**:
- Check Redis connection (sandbox pool management)
- Verify E2B_API_KEY is set
- Sandbox timeout: 20 minutes (configurable in E2BTools)

**Database Connection**:
- Use correct DATABASE_URL (not system default)
- For migrations: `psql $DATABASE_URL -f lib/db/migrations/xxx.sql`

**File Not Found**:
- Check block_id is set in session_state
- Verify files exist in `/tmp/fundley/{user_id}/blocks/{block_id}/`
- E2B auto-download may have failed (check logs)

### Key Documentation

- **Agent Architecture**: `/chatbot-service/README.md`
- **Temporal RAG**: `/chatbot-service/docs/TEMPORAL_RAG_README.md`
- **Block Architecture**: `/docs/block-architecture-comparison.md`
- **Commit Guidelines**: `/AGENTS.md`

### Security

**Sensitive Data**:
- Never commit `.env` files
- API keys sanitized in E2B outputs (see `_sanitize_output`)
- User files isolated by `user_id` in local storage

**Sandbox Isolation**:
- E2B provides isolated Python runtime
- Each user gets dedicated sandbox pool
- 50MB file size limit for auto-download
