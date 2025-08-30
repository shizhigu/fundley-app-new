# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Core Commands
- **Development**: `pnpm dev` - Runs Next.js with Turbo in development mode
- **Build**: `pnpm build` - Runs database migrations then builds the Next.js app
- **Linting**: `pnpm lint` - Runs Next.js lint and Biome lint with auto-fix
- **Formatting**: `pnpm format` - Formats code using Biome
- **Testing**: `pnpm test` - Runs Playwright E2E tests (sets PLAYWRIGHT=True environment variable)

### Database Commands
- **Generate migrations**: `pnpm db:generate` - Generates Drizzle migrations
- **Run migrations**: `pnpm db:migrate` - Applies migrations to database
- **Open Drizzle Studio**: `pnpm db:studio` - Opens database UI
- **Push schema**: `pnpm db:push` - Pushes schema changes directly to database

## Architecture Overview

This is a Next.js 15 AI chatbot application using the App Router pattern with the following key components:

### Core Stack
- **Framework**: Next.js 15 with App Router, React Server Components, and Server Actions
- **AI Integration**: Vercel AI SDK with xAI (grok models) as default provider
- **Database**: PostgreSQL via Drizzle ORM (Neon serverless for production)
- **Authentication**: NextAuth.js with credentials provider and guest user support
- **UI Components**: shadcn/ui with Radix UI primitives and Tailwind CSS
- **File Storage**: Vercel Blob for attachments

### Project Structure

#### `/app` - Next.js App Router
- `(auth)` - Authentication flow (login, register, auth config)
- `(chat)` - Main chat interface and API routes
  - `/api/chat` - Chat streaming endpoint
  - `/api/document` - Document creation/update endpoints
  - `/api/files/upload` - File upload handling

#### `/components` - React Components
- Core UI components using shadcn/ui patterns
- Chat components: `chat.tsx`, `messages.tsx`, `multimodal-input.tsx`
- Artifact system: `artifact.tsx` with specialized editors
- Data streaming: `data-stream-provider.tsx` for real-time updates

#### `/lib` - Core Libraries
- `/ai` - AI configuration
  - `providers.ts` - Model provider configuration (xAI/test models)
  - `tools/` - AI tool implementations (create/update documents, weather, suggestions)
- `/db` - Database layer
  - `schema.ts` - Drizzle schema definitions
  - `queries.ts` - Database query functions
  - `migrations/` - SQL migration files
- `/artifacts` - Document artifact handlers (code, text, image, sheet)
- `/editor` - ProseMirror and CodeMirror configurations

#### `/artifacts` - Artifact System
Each artifact type (code, text, image, sheet) has:
- `client.tsx` - Client-side React component
- `server.ts` - Server-side document handler with streaming

### Key Patterns

1. **Streaming Architecture**: Uses Vercel AI SDK's streaming capabilities for real-time chat responses and document updates via `streamObject` and custom data streams

2. **Authentication Flow**: Dual authentication system supporting both registered users and guest sessions, with session data stored in JWT tokens

3. **Message Storage**: Messages use a parts-based structure (v2 schema) supporting multimodal content and attachments

4. **Artifact System**: Specialized document types (code, text, image, spreadsheet) with dedicated editors and real-time streaming updates

5. **Model Configuration**: Centralized AI model configuration in `providers.ts` with test models for development and xAI models for production

## Code Style

- **Linting**: Biome for both linting and formatting
- **TypeScript**: Strict mode with comprehensive type definitions
- **Component Pattern**: Functional components with hooks
- **File Naming**: kebab-case for files, PascalCase for components
- **Imports**: Absolute imports via `@/` alias for project files


## AI Agent Architecture (Financial Data Integration)

### Overview

Fundley's core value proposition is providing intelligent financial analysis through integration with Financial Modeling Prep (FMP) API. The AI Agent must efficiently retrieve, process, and analyze financial data to answer complex queries about private equity portfolios, market trends, and investment opportunities.

### Architecture Design

#### 1. Core Components

```text
┌─────────────────────────────────────────────────────────────┐
│                        User Interface                        │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│                    AI Planning Layer                         │
│  • Query Understanding  • Tool Selection  • Execution Plan   │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│                 Orchestration Layer                          │
│  • Parallel Execution  • Error Handling  • Rate Limiting     │
└────────┬───────────────────────────────────┬────────────────┘
         │                                   │
┌────────▼──────────┐              ┌────────▼──────────┐
│   Tool Layer      │              │   Cache Layer      │
│ • FMP API Tools   │◄────────────►│ • Redis Cache      │
│ • Data Transform  │              │ • TTL Management   │
└───────────────────┘              └────────────────────┘
```

#### 2. FMP API Integration Strategy

##### Phase 1: Core Financial Tools (MVP)

Focus on essential endpoints that provide maximum value:

- **Company Fundamentals**: Income statements, balance sheets, cash flow
- **Market Data**: Real-time quotes, historical prices
- **Financial Ratios**: Key metrics and ratios
- **Portfolio Analytics**: Holdings analysis, performance metrics

##### Tool Implementation Pattern
```typescript
// lib/ai/tools/financial/[tool-name].ts
export const getCompanyFinancials = tool({
  description: 'Get comprehensive financial statements for a company',
  parameters: z.object({
    symbol: z.string().describe('Stock ticker symbol'),
    period: z.enum(['annual', 'quarter']).optional(),
    limit: z.number().optional().default(5)
  }),
  execute: async ({ symbol, period, limit }) => {
    // 1. Check cache first
    const cached = await cache.get(`financials:${symbol}:${period}`)
    if (cached) return cached
    
    // 2. Parallel fetch multiple endpoints
    const [income, balance, cashflow] = await Promise.all([
      fmp.getIncomeStatement(symbol, period, limit),
      fmp.getBalanceSheet(symbol, period, limit),
      fmp.getCashFlow(symbol, period, limit)
    ])
    
    // 3. Transform and cache
    const result = transformFinancialData({ income, balance, cashflow })
    await cache.set(`financials:${symbol}:${period}`, result, { ttl: 3600 })
    
    return result
  }
})
```

#### 3. Parallel Execution Architecture

**Problem**: Sequential API calls create unacceptable latency
**Solution**: Intelligent parallel execution with dependency management

```typescript
// lib/ai/orchestrator.ts
export class ToolOrchestrator {
  async executePlan(toolCalls: ToolCall[]) {
    // 1. Analyze dependencies
    const executionGroups = this.groupByDependency(toolCalls)
    
    // 2. Execute each group in parallel
    const results = []
    for (const group of executionGroups) {
      const groupResults = await Promise.all(
        group.map(call => this.executeWithRateLimit(call))
      )
      results.push(...groupResults)
    }
    
    return results
  }
  
  private async executeWithRateLimit(toolCall: ToolCall) {
    await this.rateLimiter.acquire()
    try {
      return await toolCall.execute()
    } finally {
      this.rateLimiter.release()
    }
  }
}
```

#### 4. Data Management Strategy

##### Caching Tiers

1. **Hot Cache** (Redis): 1-hour TTL for frequently accessed data
2. **Warm Cache** (PostgreSQL): Daily snapshots of key metrics
3. **Cold Storage**: Historical data in PostgreSQL with JSONB

##### Cache Invalidation Rules

- **Real-time data**: 1-5 minute TTL
- **Daily metrics**: 1-hour TTL
- **Fundamentals**: 24-hour TTL (updates after market close)
- **Historical data**: Permanent cache

#### 5. Context Engineering Strategy

##### The Challenge

FMP API returns massive JSON objects with 100+ fields. Simply dumping all data into LLM context causes:

- **Token explosion**: 2000+ tokens per query
- **Reduced accuracy**: LLM gets "lost" in irrelevant data
- **High costs**: Unnecessary token consumption
- **Slow responses**: Processing overhead

##### The Solution: Intelligent Field Selection

```typescript
// lib/ai/context-engineering/field-selector.ts
class FieldSelector {
  // Step 1: Define metadata for each field
  private metadata = {
    returnOnEquity: {
      name: "Return on Equity (ROE)",
      category: "profitability",
      description: "Measures profitability relative to shareholders' equity",
      keywords: ["profitability", "shareholder returns", "equity efficiency"]
    },
    currentRatio: {
      name: "Current Ratio",
      category: "liquidity",
      description: "Ability to pay short-term obligations",
      keywords: ["liquidity", "short-term solvency", "working capital"]
    }
    // ... metadata for all 100+ fields
  }
  
  // Step 2: Generate embeddings for semantic search
  async initialize() {
    for (const [field, meta] of Object.entries(this.metadata)) {
      const embedding = await this.generateEmbedding(
        `${meta.name} ${meta.description} ${meta.keywords.join(' ')}`
      )
      await this.vectorStore.upsert({ field, embedding, metadata: meta })
    }
  }
  
  // Step 3: Find relevant fields for user query
  async selectFields(query: string): Promise<string[]> {
    const queryEmbedding = await this.generateEmbedding(query)
    const results = await this.vectorStore.search(queryEmbedding, { topK: 10 })
    return results.map(r => r.field)
  }
}
```

##### Implementation Options

**Option 1: In-Memory Vector Search (MVP)**

```typescript
// Simple, fast, cost-effective for <1000 fields
class InMemoryVectorStore {
  private embeddings = new Map<string, Float32Array>()
  
  async search(queryVector: Float32Array, k: number) {
    // Compute cosine similarity
    const scores = Array.from(this.embeddings.entries())
      .map(([field, vector]) => ({
        field,
        score: cosineSimilarity(queryVector, vector)
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, k)
    
    return scores
  }
}
```

**Option 2: PostgreSQL pgvector (Production)**

```sql
-- Enable pgvector extension
CREATE EXTENSION vector;

-- Store field embeddings
CREATE TABLE field_embeddings (
  field_name TEXT PRIMARY KEY,
  embedding vector(1536),
  metadata JSONB
);

-- Semantic search
SELECT field_name, metadata 
FROM field_embeddings 
ORDER BY embedding <-> $1 
LIMIT 10;
```

**Option 3: Dedicated Vector DB (Scale)**

- Pinecone, Qdrant, or Weaviate for large-scale deployments
- Managed service with advanced features
- Higher cost but better performance at scale

##### Result: Optimized Context

```typescript
// Before: 2000+ tokens
const bloatedContext = JSON.stringify(entireFinancialData)

// After: 200-300 tokens
const optimizedContext = {
  query: "How profitable is Apple?",
  relevantData: {
    returnOnEquity: { value: 1.479, interpretation: "Excellent" },
    netProfitMargin: { value: 0.253, interpretation: "Strong" },
    returnOnAssets: { value: 0.283, interpretation: "Very Good" }
  }
}
```

### Implementation Priorities

#### MVP (Week 1-2)

1. Implement 5-10 core FMP tools
2. Basic Redis caching
3. Simple parallel execution
4. Error handling and fallbacks

#### Phase 2 (Week 3-4)

1. Expand to 20-30 FMP tools
2. Implement intelligent caching strategy
3. Add rate limiting and retry logic
4. Basic field selection (keyword matching)

#### Phase 3 (Month 2)

1. Semantic search with embeddings
2. Advanced query planning
3. Multi-step reasoning chains
4. Custom financial calculations

### Technical Decisions

#### Why Single Agent (for MVP)?

- **Simpler to debug**: One execution path
- **Lower latency**: No inter-agent communication
- **Easier state management**: Single context
- **Cost-effective**: Fewer LLM calls

*Multi-agent can be considered when we need specialized expertise (e.g., dedicated agents for equity analysis, market data, portfolio optimization)*

#### Why Parallel Function Calling?

- **Reduces latency**: From O(n) to O(1) where n = number of API calls
- **Native support**: Modern LLMs support parallel tool calls
- **Better UX**: Faster responses improve user satisfaction

#### Context Engineering Approach

- **Start simple**: Direct field mapping for MVP (10-20 fields)
- **Add intelligence gradually**: Keyword matching → Embeddings → Semantic search
- **Measure impact**: Track token usage and response accuracy at each stage
- **Optimize based on data**: Let usage patterns guide optimization priorities

### Error Handling & Resilience

```typescript
// lib/ai/tools/base.ts
export abstract class FinancialTool {
  protected async executeWithFallback(
    primary: () => Promise<T>,
    fallback?: () => Promise<T>
  ): Promise<T | ToolError> {
    try {
      return await primary()
    } catch (error) {
      if (this.isRateLimitError(error)) {
        await this.backoff()
        return this.executeWithFallback(primary, fallback)
      }
      
      if (fallback) {
        console.warn('Primary failed, using fallback', error)
        return await fallback()
      }
      
      return new ToolError('Data temporarily unavailable', { 
        recoverable: true,
        suggestRetry: true 
      })
    }
  }
}
```

### Performance Metrics to Track

1. **Latency Metrics**
   - P50/P95/P99 response times
   - API call duration by endpoint
   - Cache hit rates

2. **Cost Metrics**
   - FMP API calls per user query
   - OpenAI tokens per conversation
   - Cache storage costs

3. **Quality Metrics**
   - Tool selection accuracy
   - Data freshness violations
   - Error rates by tool

### Security Considerations

1. **API Key Management**: Store FMP API key securely in environment variables
2. **Rate Limiting**: Implement per-user and per-organization limits
3. **Data Access Control**: Ensure users only access their organization's data
4. **Audit Logging**: Track all financial data access for compliance

### Development Philosophy

**"Build tools first, infrastructure second"**

1. Start with concrete FMP tool implementations
2. Identify actual pain points through usage
3. Build infrastructure to solve real problems, not hypothetical ones
4. Iterate based on performance metrics and user feedback

This approach prevents over-engineering and ensures our infrastructure investments directly address proven needs rather than anticipated ones.

## AI Native Board Architecture (Next-Gen Workspace)

### Overview

Fundley implements a revolutionary **AI Native Board** system that transforms traditional chat-based AI interaction into a persistent, intelligent workspace. Unlike conventional chatbots where conversations are linear and artifacts are isolated, our Board system creates a living workspace where AI components understand and interact with shared data.

### Core Concepts

#### **Board as Intelligent Workspace**
- **Persistent Context**: Each Board maintains a Master Document containing all relevant data and analysis
- **Cross-Component Intelligence**: Components can reference and build upon each other's data
- **User-Centric**: Boards belong to users, not conversations - multiple chats can contribute to the same Board

#### **AI Native Data Management**
```
Chat Input → AI Analysis → Master Document Update → Component Re-rendering
```

**Revolutionary Approach**: Instead of traditional database schemas, we use a text-based Master Document that LLMs can understand and manipulate. Each component extracts its needed data by querying this document through specialized AI models.

### Technical Architecture

#### **Data Flow**
1. **User Input**: Chat message or component interaction
2. **AI Intent Recognition**: Main agent decides what components to create/update
3. **Master Document Update**: Unified document stores all Board data in natural language
4. **Component Parsing**: Small AI models (Gemini Flash) extract structured data for each component
5. **Rendering**: Components display AI-parsed data with consistent styling

#### **Database Schema**

```sql
-- Board represents a persistent workspace
CREATE TABLE boards (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  user_id TEXT NOT NULL,
  master_document TEXT NOT NULL, -- The AI-readable data source
  layout JSONB NOT NULL DEFAULT '{}', -- Component positioning
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Widget represents individual components on a Board
CREATE TABLE widgets (
  id TEXT PRIMARY KEY,
  board_id TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'metric_card', 'time_series', 'data_table'
  title TEXT NOT NULL,
  config JSONB NOT NULL DEFAULT '{}', -- Component-specific configuration
  position JSONB NOT NULL, -- {x, y, width, height}
  data JSONB NOT NULL DEFAULT '{}', -- Parsed component data
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### **Component Types**

**1. MetricCard**
- Single KPI display with trend indication
- Config: `{metric: string, period: string, comparison?: string}`
- Data: `{value: string, trend: 'up'|'down'|'stable', change: string, color: string}`

**2. TimeSeriesChart**
- Multi-line charts for temporal data
- Config: `{metrics: string[], timeRange: string, chartType: 'line'|'area'}`
- Data: `{series: [{name: string, data: {date: string, value: number}[]}]}`

**3. DataTable**
- Flexible tabular data display
- Config: `{columns: string[], sortable: boolean, filterable: boolean}`
- Data: `{headers: string[], rows: string[][]}`

### AI Agent Architecture

#### **Main Agent (Chat Interface)**
- Analyzes user intent and context
- Decides component creation/updates
- Calls unified `manageWidgets` tool
- Updates Master Document

#### **Component Parser Agents (Gemini Flash)**
Each component type has a specialized parser:

```typescript
const componentParsers = {
  metric_card: `Extract single KPI from Master Document. Return formatted value (e.g. "$2.5B"), trend direction, and percentage change.`,
  time_series: `Extract time-based data series. Return numeric values for charting.`,
  data_table: `Extract tabular data. Return formatted strings for display.`
}
```

### UI Architecture Changes

#### **Layout Transformation**
```
Before: Full-width chat with occasional artifacts
After:  [Chat Panel 30%] | [Board Panel 70%]
```

#### **Component System**
- **Shared Widget Shell**: Common container, actions, and styling
- **Drag & Drop**: Components can be repositioned within Board
- **Board Selector**: Dropdown to switch between user's Boards
- **Responsive Design**: Graceful mobile adaptation

### Implementation Strategy

#### **Phase 1: Core Foundation** ✅
- Database migration for Board + Widget tables
- Basic Board UI with drag-and-drop grid
- Three core component types
- Master Document management system

#### **Phase 2: AI Integration** 
- Unified widget management tool
- Gemini Flash component parsers
- Master Document update logic
- Component data synchronization

#### **Phase 3: UX Polish**
- Advanced component interactions
- Board templates and sharing
- Performance optimizations
- Mobile experience

### Key Advantages

1. **Persistent Intelligence**: Unlike ChatGPT artifacts, Boards maintain context across sessions
2. **Cross-Component Relationships**: Components understand and build upon shared data
3. **Flexible Data Model**: No rigid schemas - AI adapts to any financial data structure
4. **Revolutionary UX**: Users work with living, intelligent dashboards rather than static reports

### Development Guidelines

- **Component Consistency**: All widgets share common shell styling and interactions
- **AI-First Design**: Optimize for LLM understanding rather than database efficiency  
- **String-Based Data**: Display values as formatted strings ("$2.5B") rather than raw numbers
- **Extensible Architecture**: Easy to add new component types and AI parsers

## AI Native Architecture (Simplified)

### Core Principle

**API → Cache → Extract → LLM**

No ETL pipelines, no business tables, no complex transformations. Let the LLM be the analytical engine.

### Architecture Components

#### 1. FMP API Client with Caching

```typescript
// Simple API client with Redis caching
class FMPClient {
  async get(endpoint: string, params: any) {
    const cacheKey = `fmp:${endpoint}:${JSON.stringify(params)}`
    const cached = await redis.get(cacheKey)
    if (cached) return JSON.parse(cached)
    
    const data = await fetch(`${FMP_BASE_URL}${endpoint}`, { params })
    await redis.setex(cacheKey, 3600, JSON.stringify(data))
    return data
  }
}
```

#### 2. Field Metadata with Vector Search

```typescript
// Field descriptions for semantic search
const FIELD_METADATA = {
  revenue: {
    name: "Revenue",
    description: "Total sales or gross income",
    aliases: ["sales", "income", "营收", "收入"]
  },
  netIncome: {
    name: "Net Income", 
    description: "Profit after all expenses and taxes",
    aliases: ["profit", "earnings", "净利润", "净收入"]
  }
  // ... all FMP fields
}
```

#### 3. Universal Financial Data Tool

```typescript
// One tool to rule them all
export const getFinancialData = tool({
  description: 'Get any financial data from FMP',
  parameters: z.object({
    endpoint: z.string(), // e.g., "/income-statement"
    symbols: z.array(z.string()),
    fields: z.array(z.string()), // Fields identified via vector search
    periods: z.array(z.string()).optional()
  }),
  execute: async ({ endpoint, symbols, fields, periods }) => {
    const results = {}
    for (const symbol of symbols) {
      const data = await fmpClient.get(endpoint, { symbol })
      // Extract only requested fields
      results[symbol] = extractFields(data, fields)
    }
    return formatForLLM(results)
  }
})
```

### Why This Works

1. **Flexibility**: LLM decides what data it needs and how to analyze it
2. **Simplicity**: No complex ETL or data models to maintain
3. **Cost-effective**: Only cache API responses, minimal infrastructure
4. **Scalable**: Add new endpoints without changing architecture

## Adding New FMP API Endpoints

### Standard Workflow (Developer Guide)

When adding a new FMP endpoint to the system, follow this exact process:

#### Step 1: API Exploration
```bash
# Test the endpoint with stable API format
curl "https://financialmodelingprep.com/stable/{endpoint}?symbol=AAPL&period=annual&limit=1&apikey=YOUR_KEY"

# Extract all field names
curl "..." | jq '.[0] | keys'
```

#### Step 2: Create Field Definition File
Create `/lib/fmp/{endpoint-name}-fields.ts`:

```typescript
import { FieldMetadata } from './field-metadata'

export const endpointNameFields: FieldMetadata[] = [
  {
    field: "revenue",  // API field name
    name: "Revenue",   // Human readable name
    description: "Total sales or gross income",
    category: "income", // Logical grouping
    aliases: ["sales", "topline", "营收"], // Search terms
    useCases: ["Growth analysis", "Revenue trends"],
    dataSource: {
      endpoint: "/endpoint-name",
      dataType: "getEndpointName",
      statement: "Statement Name"
    },
    dataFormat: {
      unit: "USD",           // Currency, percentage, etc.
      isPercentage: false,   // Whether value is 0-100%
      isRatio: false        // Whether value is a ratio
    }
  },
  // ... other business fields (NO metadata fields like date, symbol)
]
```

#### Step 3: Update Unified Tool
In `/lib/ai/tools/financial/unified-financial-data.ts`:
```typescript
const API_ENDPOINTS = {
  'getIncomeStatement': '/income-statement',
  'getNewEndpoint': '/new-endpoint'  // Add new mapping
} as const
```

#### Step 4: Update Field Aggregation
In `/lib/fmp/field-metadata.ts`:
```typescript
import { newEndpointFields } from './new-endpoint-fields'

// Convert to unified format
const NEW_ENDPOINT_FIELDS: FieldMetadata[] = newEndpointFields.map(field => ({
  ...field,
  dataSource: {
    endpoint: '/new-endpoint',
    dataType: 'getNewEndpoint',
    statement: 'New Statement'
  }
}))

// Add to main array
export const ALL_FINANCIAL_FIELDS = [
  ...EXISTING_FIELDS,
  ...NEW_ENDPOINT_FIELDS  // Add here
]
```

#### Step 5: Update Agent Schema
In `/lib/ai/agents/financial-fields-agent.ts`:
```typescript
dataType: z.enum([
  'getIncomeStatement', 'getBalanceSheet', 'getCashFlow', 
  'getFinancialRatios', 'getKeyMetrics',
  'getNewEndpoint'  // Add enum option
])
```

### Field Selection Guidelines

**✅ Include in field files:**
- Business metrics: revenue, netIncome, totalAssets
- Financial ratios: grossProfitRatio, debtToEquity
- Performance indicators: eps, roce, cashFlow

**❌ Exclude from field files:**
- Metadata: date, symbol, reportedCurrency, cik
- Administrative: filingDate, acceptedDate, period
- Identifiers: All string values and fields containing "year"

*Metadata is auto-extracted by unified tool processing logic.*

### FMP API Format (2025)

**Correct Stable API Format:**
```
https://financialmodelingprep.com/stable/income-statement?symbol=AAPL&period=annual&limit=5&apikey=KEY
```

**Important Notes:**
- Use `/stable/` not `/api/v3/` (v3 retiring 2025/2026)
- Parameters: symbol, period, limit are typically required
- Always test with actual API key to verify data availability

### Implementation Path

1. **Phase 1**: Complete core financial statements (income, balance, cash flow)
2. **Phase 2**: Add specialized endpoints (ratios, metrics, profile)
3. **Phase 3**: Monitor usage and optimize based on user queries