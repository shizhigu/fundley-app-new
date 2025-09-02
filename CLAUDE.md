# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Core Commands
- **Development**: `pnpm dev` - Runs Next.js with Turbo in development mode
- **Build**: `pnpm build` - Builds the Next.js application
- **Linting**: `pnpm lint` - Runs Next.js lint and Biome lint with auto-fix
- **Formatting**: `pnpm format` - Formats code using Biome
- **Testing**: `pnpm test` - Runs Playwright E2E tests (sets PLAYWRIGHT=True environment variable)

### Convex Database Commands
- **Deploy**: `npx convex deploy` - Deploys Convex functions and schema to production
- **Dev mode**: `npx convex dev` - Runs Convex development server with hot reload

## Architecture Overview

This is a Next.js 15 AI chatbot application using the App Router pattern with the following key components:

### Core Stack
- **Framework**: Next.js 15 with App Router, React Server Components, and Server Actions
- **AI Integration**: Vercel AI SDK with xAI (grok models) as default provider
- **Database**: Convex with TypeScript-native queries and real-time subscriptions
- **Authentication**: Clerk with Convex integration for user management
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
- `/artifacts` - Document artifact handlers (code, text, sheet)
- `/editor` - ProseMirror and CodeMirror configurations
- `/convex` - Convex client adapter for API compatibility

#### `/convex` - Convex Backend Functions
- `schema.ts` - Database schema definitions with indexes
- `users.ts` - User management with Clerk integration
- `chats.ts` - Chat CRUD operations
- `messages.ts` - Message management
- `documents.ts` - Document operations
- `organizations.ts` - Organization management  
- `streams.ts` - Data streaming
- `votes.ts` - Voting system
- `visualizationCache.ts` - Visualization caching
- `auth.config.ts` - Clerk authentication configuration

#### `/artifacts` - Artifact System
Each artifact type (code, text, sheet) has:
- `client.tsx` - Client-side React component
- `server.ts` - Server-side document handler with streaming

### Key Patterns

1. **Streaming Architecture**: Uses Vercel AI SDK's streaming capabilities for real-time chat responses and document updates via `streamObject` and custom data streams

2. **Authentication Flow**: Clerk authentication with Convex integration, supporting both registered users and guest sessions

3. **Message Storage**: Messages use a parts-based structure (v2 schema) supporting multimodal content and attachments

4. **Artifact System**: Specialized document types (code, text, spreadsheet) with dedicated editors and real-time streaming updates

5. **Model Configuration**: Centralized AI model configuration in `providers.ts` with test models for development and xAI models for production

## Code Style

- **Linting**: Biome for both linting and formatting
- **TypeScript**: Strict mode with comprehensive type definitions
- **Component Pattern**: Functional components with hooks
- **File Naming**: kebab-case for files, PascalCase for components
- **Imports**: Absolute imports via `@/` alias for project files

## AI Tool Development

### CRITICAL: Vercel AI SDK Tool Schema

**❌ COMMON ERROR - DO NOT USE `parameters`:**
```typescript
export const myTool = tool({
  description: "My tool description",
  parameters: z.object({  // ❌ WRONG - This will cause tools to not receive parameters
    name: z.string().describe('Name parameter')
  })
})
```

**✅ CORRECT - ALWAYS USE `inputSchema`:**
```typescript
export const myTool = tool({
  description: "My tool description", 
  inputSchema: z.object({  // ✅ CORRECT - This is the proper Vercel AI SDK syntax
    name: z.string().describe('Name parameter')
  })
})
```

### Why This Matters
- **Symptom**: LLM calls tool but tool receives empty parameters `{}`
- **Error**: Tool validation fails with "parameter is required" even when LLM passes parameters
- **Root Cause**: Vercel AI SDK expects `inputSchema`, not `parameters`
- **Fix**: Always use `inputSchema` for tool parameter definitions

### Model Configuration
- **Use OpenRouter**: All models must use the unified OpenRouter configuration from `lib/ai/providers.ts`
- **Never use direct provider SDKs**: Don't call OpenAI, Anthropic, etc. directly
- **Model Selection**: Use `financialFieldsModel`, `subAgentModel`, or other predefined models
- **Example**: `const { text } = await generateText({ model: financialFieldsModel, ... })`

### Tool Development Checklist
1. ✅ Use `inputSchema` (not `parameters`)
2. ✅ Import models from `lib/ai/providers.ts` 
3. ✅ Use OpenRouter configuration
4. ✅ Add comprehensive parameter descriptions
5. ✅ Include error handling and validation
6. ✅ Test tools manually before integration

## Convex Database Schema

### Core Tables (8 Tables)

#### Users Table
```typescript
users: defineTable({
  email: v.string(),
  clerkUserId: v.string(),
  clerkOrganizationId: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.number(),
}).index("by_clerk_user_id", ["clerkUserId"])
  .index("by_email", ["email"])
```
**Purpose**: User management with Clerk authentication integration
**Key Features**: 
- Clerk user ID mapping for authentication
- Optional organization support
- Timestamp tracking

#### Chats Table  
```typescript
chats: defineTable({
  title: v.string(),
  userId: v.id("users"),
  visibility: v.union(v.literal("private"), v.literal("public")),
  createdAt: v.number(),
  updatedAt: v.number(),
}).index("by_user_id", ["userId"])
  .index("by_created_at", ["createdAt"])
```
**Purpose**: Chat session management
**Key Features**:
- User ownership with foreign key
- Public/private visibility control
- Chronological indexing

#### Messages Table
```typescript
messages: defineTable({
  chatId: v.id("chats"),
  role: v.union(v.literal("user"), v.literal("assistant"), v.literal("system")),
  parts: v.any(), // Multimodal content parts
  attachments: v.array(v.any()),
  createdAt: v.number(),
}).index("by_chat_id", ["chatId"])
  .index("by_created_at", ["createdAt"])
```
**Purpose**: Store conversation messages with multimodal support
**Key Features**:
- Chat association with foreign key
- Role-based message types (user/assistant/system)
- Flexible parts structure for multimodal content
- Attachment support

#### Documents Table
```typescript
documents: defineTable({
  title: v.string(),
  kind: v.union(v.literal("text"), v.literal("code"), v.literal("sheet")),
  content: v.optional(v.string()),
  userId: v.id("users"),
  createdAt: v.number(),
  updatedAt: v.number(),
}).index("by_user_id", ["userId"])
  .index("by_kind", ["kind"])
```
**Purpose**: Document artifact management
**Key Features**:
- Document type classification (text/code/sheet)
- User ownership
- Content storage with optional field

#### Organizations Table
```typescript
organizations: defineTable({
  name: v.string(),
  slug: v.string(),
  clerkOrganizationId: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.number(),
}).index("by_clerk_org_id", ["clerkOrganizationId"])
  .index("by_slug", ["slug"])
```
**Purpose**: Organization management
**Key Features**:
- Unique slug for URL routing
- Clerk organization integration
- Name and slug indexing

#### Streams Table
```typescript
streams: defineTable({
  chatId: v.id("chats"),
  data: v.any(), // Flexible streaming data
  createdAt: v.number(),
}).index("by_chat_id", ["chatId"])
```
**Purpose**: Real-time data streaming for chat sessions
**Key Features**:
- Chat association
- Flexible data structure
- Timestamp indexing

#### Votes Table
```typescript
votes: defineTable({
  messageId: v.id("messages"),
  chatId: v.id("chats"),
  isUpvoted: v.boolean(),
  createdAt: v.number(),
}).index("by_message_id", ["messageId"])
  .index("by_chat_id", ["chatId"])
```
**Purpose**: Message voting/rating system
**Key Features**:
- Message and chat association
- Boolean upvote/downvote
- Dual indexing for queries

#### Visualization Cache Table
```typescript
visualizationCache: defineTable({
  messageId: v.id("messages"),
  dataHash: v.string(),
  result: v.any(),
  createdAt: v.number(),
}).index("by_message_id", ["messageId"])
  .index("by_data_hash", ["dataHash"])
```
**Purpose**: Cache expensive visualization computations
**Key Features**:
- Message association for context
- Hash-based cache key
- Flexible result storage

### Schema Features

#### Automatic Indexes
Convex automatically creates the following indexes:
- Primary ID indexes for all tables
- Custom indexes as defined in schema
- Compound indexes for efficient querying

#### Type Safety
- Full TypeScript integration
- Runtime validation with Convex values
- End-to-end type safety from database to frontend

#### Real-time Subscriptions
- Automatic reactivity for all queries
- WebSocket-based updates
- No polling required

#### Authentication Integration
- Seamless Clerk integration
- User context in all functions  
- Row-level security through function logic

### Migration Benefits

**From PostgreSQL to Convex**:
1. **Simplified Architecture**: No ORM configuration needed
2. **Real-time by Default**: Built-in subscriptions
3. **Type Safety**: Native TypeScript support
4. **Automatic Scaling**: Managed infrastructure
5. **Developer Experience**: Hot reloading and introspection

**Removed Complexity**:
- No SQL migrations
- No connection pooling
- No query optimization
- No manual index management

## AI Agent Architecture (Financial Data Integration)

### Overview

Fundley's core value proposition is providing intelligent financial analysis through integration with Financial Modeling Prep (FMP) API. The AI Agent efficiently retrieves, processes, and analyzes financial data to answer complex queries about private equity portfolios, market trends, and investment opportunities.

### Architecture Design

#### Core Components

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

#### FMP API Integration Strategy

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

#### Parallel Execution Architecture

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

#### Data Management Strategy

##### Caching Tiers

1. **Hot Cache** (Redis): 1-hour TTL for frequently accessed data
2. **Warm Cache** (Convex): Daily snapshots of key metrics
3. **Cold Storage**: Historical data in Convex with flexible schema

##### Cache Invalidation Rules

- **Real-time data**: 1-5 minute TTL
- **Daily metrics**: 1-hour TTL
- **Fundamentals**: 24-hour TTL (updates after market close)
- **Historical data**: Permanent cache

#### Context Engineering Strategy

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

**Option 2: Convex Vector Search (Production)**

```typescript
// Store field embeddings in Convex
const fieldEmbeddings = defineTable({
  fieldName: v.string(),
  embedding: v.array(v.float64()),
  metadata: v.any(),
}).index("by_field", ["fieldName"])

// Semantic search function
export const searchFields = query({
  args: { queryEmbedding: v.array(v.float64()), limit: v.number() },
  handler: async (ctx, { queryEmbedding, limit }) => {
    // Implement vector similarity search
    const allEmbeddings = await ctx.db.query("fieldEmbeddings").collect()
    // ... cosine similarity calculation
    return topKResults
  },
})
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

## SEC Filing Analysis Tools

### Overview

The SEC filing tools provide intelligent extraction of key sections from SEC filings through SEC-API.io integration. These tools are designed for pilot customers who specifically need Management Discussion & Analysis (MD&A) and other regulatory filing data.

### Available Tools

#### 1. `extractMDA` - Management Discussion & Analysis
Extracts MD&A sections from 10-K (Section 7) and 10-Q (Part 1 Item 2) filings.

```typescript
// Example usage
const mdaData = await extractMDA({
  symbol: 'AAPL',
  formType: '10-K',
  filingYear: 2024 // Optional
});
```

**Returns LLM-optimized structure:**
- Company information (symbol, name, CIK)
- Filing metadata (date, period, accession number)
- MD&A content with word count and key topics analysis
- Auto-generated summary for quick understanding

#### 2. `extractRiskFactors` - Risk Factors Analysis
Extracts Section 1A (Risk Factors) from 10-K filings with intelligent categorization.

```typescript
const riskData = await extractRiskFactors({
  symbol: 'TSLA',
  filingYear: 2024
});
```

**Features:**
- Automatic risk categorization (Market, Operational, Regulatory, etc.)
- Key risk extraction from paragraphs
- Structured data for LLM analysis

#### 3. `extractBusinessOverview` - Business Description
Extracts Section 1 (Business) from 10-K filings with key point identification.

```typescript
const businessData = await extractBusinessOverview({
  symbol: 'MSFT',
  filingYear: 2024
});
```

**Features:**
- Business segment identification
- Key business activity extraction
- Structured overview for competitive analysis

### Technical Architecture

#### LLM-Optimized Data Format
All SEC tools return data optimized for language model consumption:

```typescript
interface SecFilingResponse {
  success: boolean;
  company: {
    symbol: string;
    name: string;
    cik: string;
  };
  filing: {
    type: '10-K' | '10-Q';
    date: string;
    period: string;
    url: string;
  };
  // Tool-specific content (mdaContent, riskFactors, businessOverview)
  metadata: {
    extractedAt: string;
    dataSource: 'SEC-API.io';
  };
}
```

#### Error Handling
- Graceful fallbacks for missing filings
- Clear error messages for debugging
- Rate limiting compliance with SEC-API.io

### Environment Setup

Add SEC-API.io credentials to your environment:

```bash
# .env.local
SEC_API_KEY=your-sec-api-key-here
```

Get your API key at: https://sec-api.io/

### Integration Pattern

SEC tools are integrated as specialized, non-unified tools for better management:

```typescript
// app/(chat)/api/chat/route.ts
import { 
  extractMDA, 
  extractRiskFactors, 
  extractBusinessOverview 
} from '@/lib/ai/tools/financial/sec-filings';

// In streamText tools configuration
tools: {
  // ... other tools
  extractMDA,
  extractRiskFactors,  
  extractBusinessOverview,
}
```

### Usage Guidelines

1. **Performance**: SEC filings can be large; extraction may take 5-15 seconds
2. **Caching**: Consider implementing result caching for frequently accessed filings
3. **Rate Limits**: SEC-API.io has rate limits; implement appropriate throttling
4. **Data Freshness**: Most recent filings are prioritized; specify year for historical data

### Pilot Customer Features

Based on pilot customer feedback, these tools prioritize:

1. **MD&A Analysis**: Primary customer requirement for strategic decision making
2. **Risk Assessment**: Automated risk categorization for due diligence
3. **Business Understanding**: Structured business overview for competitive analysis

The tools provide executive-level summaries while maintaining access to full text for detailed analysis.