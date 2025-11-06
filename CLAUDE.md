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
- Code execution in Fly.io machines (NOT E2B sandboxes)
- Financial data processing
- Tool execution and orchestration

**Communication Pattern**:
```
User → Next.js API Route → Python Agent Service → Fly.io Machine
                                ↓
                         Analysis Results
                                ↓
                    /tmp/fundley/{user_id}/tasks/{task_name}/
```

### Deliverables Architecture

**Core Concept**: Each analysis produces deliverables (reports, charts, data files) stored in task-specific directories.

**File Structure**:
```
/tmp/fundley/{user_id}/tasks/{task_name}/
├── src/
│   ├── model.py          # Core analysis logic
│   ├── config.yaml       # Configuration parameters
│   └── utils.py          # Helper functions
├── deliverables/{YYYYMMDD}/
│   ├── report.html       # Generated reports
│   ├── data.csv          # Data exports
│   └── chart.png         # Visualizations
└── data_cache/           # Cached data
```

### Interactive Dashboards (My Dashboards)

**Streamlit App Workflow**:
1. User requests a dashboard in chat
2. Agent writes Streamlit app code to `/workspace/data_apps/{slug}/` on Fly.io dev machine
3. Agent calls `deploy_streamlit_app(slug, title)` - tool handles:
   - Database registration (if first deploy)
   - Fly.io app creation/update
   - Environment variable configuration (FMP_API_KEY, POLYGON_API_KEY, MOTHERDUCK_TOKEN, SEC_API_KEY, OPENROUTER_API_KEY)
   - Auto-stop configuration (10min idle → stop, auto-start on visit)
4. User accesses dashboard via unique URL (e.g., https://nvda-monitor-a1b2c3d4.fly.dev)

**Key Design Decisions**:
- One tool workflow: `write_script()` → `deploy_streamlit_app()` (no separate create step)
- Subsequent deploys to same slug **overwrite** existing app (URL remains constant)
- Dashboards persist independently of chat sessions
- Smart polling: UI only auto-refreshes when apps are in 'deploying'/'pending' state

### Project Structure

#### `/app` - Next.js App Router
- `(auth)` - Authentication flow (Clerk integration)
- `(chat)` - Main chat interface and streaming API
  - `/api/chat` - Chat streaming endpoint
  - `/api/files/[filename]` - File serving for analysis artifacts
- `(settings)` - User settings and preferences
- `/api/data-apps` - Streamlit dashboard management API

#### `/components` - React Components
- Built with shadcn/ui (Radix primitives + Tailwind)
- Key components:
  - `chat.tsx` - Main chat interface
  - `multimodal-input.tsx` - User input with file upload
  - `deliverable-renderer.tsx` - Renders analysis results (HTML/JSON)
  - `data-apps-panel.tsx` - My Dashboards panel with iframe rendering
  - `right-panel-tabs.tsx` - Deliverables, dashboards, schedule, watchlist panels

#### `/lib` - Core Libraries
- `/db` - Database schema and migrations (Neon PostgreSQL)
  - `schema/` - TypeScript table definitions
  - `migrations/` - SQL migration files
- `/hooks` - Custom React hooks
- `/utils` - Utility functions

#### `/chatbot-service` - Python Agent Runtime
- `/agents` - AI agent implementations
  - `analyst/` - Financial analyst agent with Fly.io code execution
- `/tools` - Agent tools
  - `flyio_machine.py` - **Primary runtime**: Manages Fly.io machines for code execution
  - `streamlit_app_tools.py` - Streamlit dashboard deployment
  - `fmp_api_discovery_tools.py` - Financial Modeling Prep API access
  - `temporal_rag.py` - Time-aware financial narrative analysis
- `/shared` - Shared utilities
  - `voyage_embeddings.py` - Financial document embeddings
  - `qdrant_client.py` - Vector database operations

### Key Patterns

#### 1. Fly.io Machine Pool Pattern

**Tool**: `chatbot-service/tools/flyio_machine.py`

The system uses persistent Fly.io machines (not E2B sandboxes) for Python code execution:

```python
# Agent workflow
from tools.flyio_machine import FlyMachinePool

machine_pool = FlyMachinePool(redis_client, FLY_API_TOKEN)
machine = machine_pool.get_or_create_machine(user_id)

# Execute code in user's dedicated machine
result = machine.exec(python_code)

# Write files to persistent volume
machine.write_file('/workspace/tasks/dcf_valuation/src/model.py', code)
```

**Critical**:
- Each user gets a dedicated Fly.io machine (persistent across sessions)
- Files stored in `/workspace/` volume (10GB persistent storage)
- Machines auto-stop after 15 min idle (cost optimization)
- Environment variables automatically propagated: FMP_API_KEY, POLYGON_API_KEY, MOTHERDUCK_TOKEN, OPENROUTER_API_KEY, SEC_API_KEY

#### 2. Streaming Architecture

**Chat Streaming**: Uses Vercel AI SDK's `streamText` with custom data stream protocol

**Tool Results**: Streamed back via `createDataStreamResponse` with structured annotations

**Deliverables**: Created via tools, tracked in database, files downloaded from machines

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
- SEC Edgar - SEC filings (via SEC_API_KEY)
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

-- Deliverables (analysis outputs, independent of chats)
deliverables: {
  id: UUID,
  user_id,
  title,
  file_path,    -- Path to artifact file
  file_type,    -- html, json, csv, xlsx, png, etc.
  symbols: TEXT[],
  tags: TEXT[],
  created_at
}

-- Data Apps (Streamlit dashboards)
data_apps: {
  id: UUID,
  user_id,
  title,
  slug,         -- URL-safe identifier (e.g., "nvda-monitor")
  description,
  url,          -- Full Fly.io URL
  deployment_status,  -- 'pending', 'deploying', 'deployed', 'failed'
  created_at,
  updated_at
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
- `deliverables.symbols` (GIN) - Multi-symbol queries
- `watchlist.tags` (GIN) - JSONB tag searches

### Environment Variables

**Required**:
- `DATABASE_URL` - Neon PostgreSQL connection string
- `CLERK_SECRET_KEY` - Clerk authentication
- `FLY_API_TOKEN` - Fly.io machine management
- `FMP_API_KEY` - Financial Modeling Prep API
- `POLYGON_API_KEY` - Polygon.io API
- `REDIS_URL` - Redis for Fly.io machine pool management

**Optional**:
- `MOTHERDUCK_TOKEN` - DuckDB cloud storage
- `MOTHERDUCK_DATABASE` - Database name (default: 'financial_db')
- `QDRANT_URL`, `QDRANT_API_KEY` - Vector database
- `VOYAGE_API_KEY` - Financial embeddings
- `EODHD_API_TOKEN` - News data
- `SEC_API_KEY` - SEC filings API
- `OPENROUTER_API_KEY` - LLM routing

### AI Agent Configuration

**Models** (via OpenRouter):
- **Chat**: `grok-2-1212` (default)
- **Financial Fields**: `gpt-4o-mini` (field extraction)
- **Sub-agents**: `claude-3-5-sonnet-20241022` (reasoning tasks)

**Configuration**: `lib/ai/providers.ts`

**Critical Tool**: `run_python_code` in `chatbot-service/tools/flyio_machine.py`
- All Python code execution goes through Fly.io machines
- Manages persistent volumes and file system
- Auto-propagates environment variables

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
- Focus: Critical flows (auth, chat execution, deliverables)

**Python Tests**:
```bash
cd chatbot-service
pytest tests/
```

### File Upload and Storage

**Local Storage**: `/tmp/fundley/{user_id}/tasks/{task_name}/`
- Task-specific directories (persistent structure)
- Generated reports (`.html`)
- Data files (`.json`, `.csv`, `.parquet`, `.xlsx`)
- Charts (`.png`, `.jpg`)

**Auto-Download**: Tools automatically download artifacts from Fly.io machines after code execution

### Important Conventions

#### Streamlit Dashboard Workflow

1. **Write Code**: User requests dashboard in chat
2. **Agent Development**: Agent writes `app.py` to `/workspace/data_apps/{slug}/` on Fly.io machine using `write_script()`
3. **Deploy**: Agent calls `deploy_streamlit_app(slug, title, description)` which:
   - Creates/updates database record
   - Downloads code from dev machine to Render
   - Creates/updates Fly.io app
   - Sets environment secrets
   - Deploys with auto-stop configuration
4. **User Access**: Dashboard accessible via URL, renders in iframe in "My Dashboards" tab

#### Task-Based Code Structure

Standard pattern for analysis tasks:

```python
# /workspace/tasks/dcf_valuation/src/model.py
import duckdb
import pandas as pd

def run_dcf_analysis(symbol, config):
    # Load configuration
    discount_rate = config['discount_rate']

    # Fetch data from MotherDuck
    conn = duckdb.connect('md:financial_db')
    df = conn.sql(f"SELECT * FROM fundamentals WHERE symbol='{symbol}'").df()

    # Run analysis
    dcf_value = calculate_dcf(df, discount_rate)

    # Save outputs
    results = {
        'symbol': symbol,
        'fair_value': dcf_value,
        'upside': (dcf_value / df['price'].iloc[-1] - 1) * 100
    }

    return results
```

### Migration Notes

**Recent Changes**:
- **Migrated from E2B to Fly.io** (October 2024)
  - More cost-effective
  - Persistent volumes
  - Better control over execution environment
- **Renamed analysis_blocks to deliverables** (November 2024)
  - More accurate terminology
  - Supports various output types
- **Simplified Streamlit deployment** (November 2024)
  - Single tool workflow (no separate create step)
  - Automatic database registration
  - Smart polling (only when deploying)

### Troubleshooting

**Fly.io Machine Issues**:
- Check Redis connection (machine pool management)
- Verify FLY_API_TOKEN is set
- Machine auto-stops after 15 min idle (normal behavior)

**Database Connection**:
- Use correct DATABASE_URL (Neon connection string)
- For migrations: `psql $DATABASE_URL -f lib/db/migrations/xxx.sql`

**File Not Found**:
- Check task directory exists in `/workspace/tasks/{task_name}/`
- Verify files were created by agent execution
- Check Fly.io machine logs for errors

**Streamlit Deployment Issues**:
- Verify all required environment variables are set (FMP_API_KEY, POLYGON_API_KEY, MOTHERDUCK_TOKEN, MOTHERDUCK_DATABASE)
- Check `deployment_status` in data_apps table
- Review Fly.io app logs: `fly logs -a {app-name}`
- DNS propagation can take 1-2 minutes after deployment

### Key Documentation

- **Main README**: Product overview and differentiators
- **Agent Architecture**: `chatbot-service/README.md`
- **Fly.io Migration**: `chatbot-service/docs/FLYIO_MIGRATION_GUIDE.md`
- **Background Tasks**: `chatbot-service/README_BACKGROUND_TASKS.md` (auto-stop idle machines)
