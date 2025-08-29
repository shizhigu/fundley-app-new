# Financial AI Agents

This directory contains specialized AI agents for financial data analysis, implementing a modern sub-agent architecture using Vercel AI SDK.

## Architecture Overview

### Financial Fields Sub-Agent

**File:** `financial-fields-agent.ts`

A specialized LLM-powered agent that replaces the previous vector database approach for financial field matching. This agent:

- **Multi-language Support**: Understands queries in Chinese, English, Japanese, etc.
- **Intelligent Field Mapping**: Uses AI reasoning to match user intent to specific financial fields
- **Data Format Awareness**: Understands percentages, ratios, and scale formats
- **Unified Tool Compatible**: Optimized for the `getFinancialData` unified tool

#### Key Features

1. **Context-Aware Analysis**: Maps user queries like "盈利能力" → profitability ratios
2. **Smart Data Interpretation**: Provides guidance on how to interpret values (0.15 = 15% for ROE)
3. **Tool Routing**: Recommends optimal data types for unified tool calling
4. **Relevance Scoring**: AI-powered ranking of field relevance (0-1 scale)

#### Response Structure

```typescript
{
  success: boolean,
  selectedFields: [
    {
      field: "returnOnEquity",           // Exact API field name
      name: "Return on Equity (ROE)",   // Human-readable name  
      dataType: "getFinancialRatios",   // For unified tool
      isPercentage: true,               // Format guidance
      interpretation: "0.15 means 15%", // How to present data
      relevanceScore: 0.95              // AI confidence
    }
  ],
  summary: {
    primaryDataType: "getFinancialRatios",
    queryIntent: "Analyze profitability metrics",
    dataInterpretationGuidance: "Present ROE as percentage..."
  }
}
```

## Field Metadata Structure

**File:** `../fmp/field-metadata-updated.ts`

Enhanced metadata structure supporting the unified tool architecture:

```typescript
interface FieldMetadata {
  field: string                    // API field name
  name: string                     // Display name
  description: string              // Field description
  category: string                 // Grouping category
  aliases: string[]               // Alternative names/translations
  useCases: string[]              // Common analysis scenarios
  
  dataSource: {
    endpoint: string              // API endpoint (/ratios, /income-statement)
    dataType: 'getFinancialRatios' | 'getIncomeStatement' | ...
    statement?: string            // Financial statement context
  }
  
  dataFormat: {
    unit?: 'USD' | 'percentage' | 'ratio' | 'count'
    isPercentage?: boolean        // 0.15 = 15%
    isRatio?: boolean            // 1.5 = 1.5:1 
    scale?: 'millions' | 'billions' | 'units'
    interpretation?: string       // Display guidance
  }
}
```

## Model Configuration

**File:** `../providers.ts`

Dedicated model configuration for sub-agents:

```typescript
// Sub-agent models - optimized for specific tasks
export const financialFieldsModel = openrouter('google/gemini-2.5-flash') // Fast field matching
export const subAgentModel = openrouter('google/gemini-2.5-flash')        // General sub-agents
```

## Usage in Main Agent

The financial fields agent is integrated as a tool in the main chat flow:

```typescript
// In chat/route.ts
tools: {
  createDocument,
  updateDocument, 
  createVisualization,
  financialFieldsAgent,    // New sub-agent
  getFinancialData,        // Unified data tool
}
```

## Workflow

1. **User Query**: "Tesla的盈利能力如何？" (Chinese: How is Tesla's profitability?)

2. **Agent Analysis**: `financialFieldsAgent` understands intent and maps to:
   - `netIncome`, `returnOnEquity`, `netProfitMargin` fields
   - Primary data type: `getFinancialRatios`
   - Interpretation guidance: "ROE of 0.15 means 15%"

3. **Data Retrieval**: Main agent calls `getFinancialData` with:
   - `symbols: ["TSLA"]`
   - `fields: ["netIncome", "returnOnEquity", "netProfitMargin"]`
   - `dataType: "getFinancialRatios"`

4. **Smart Presentation**: Main agent applies interpretation guidance:
   - "Tesla's ROE of 15% indicates strong profitability..."

## Benefits

- **🌐 Multi-language**: Native support for Chinese, English, Japanese queries
- **🧠 Intelligent**: AI-powered field matching vs rigid keyword search  
- **📊 Data-Aware**: Understands percentage/ratio formatting automatically
- **🔧 Maintainable**: Easy to add new fields and APIs
- **⚡ Fast**: Optimized models for quick field analysis
- **🎯 Accurate**: Context-aware relevance scoring

## Architecture Advantages

### vs Vector Database Approach

| Aspect | Vector DB | LLM Sub-Agent |
|--------|-----------|---------------|
| **Setup Complexity** | High (Qdrant, embeddings) | Low (simple function) |
| **Language Support** | English-only | Multi-language native |
| **Context Understanding** | Keyword matching | Semantic understanding |
| **Data Format Awareness** | None | Built-in interpretation |
| **Maintenance** | Vector reindexing | Code updates |
| **Cost** | Vector DB + embedding calls | Single LLM call |

### Agent-as-Tool Pattern

Following Vercel AI SDK best practices, the sub-agent is implemented as a tool that the main agent can choose to call based on context, rather than a rigid workflow. This provides:

- **Flexible Orchestration**: Main agent decides when to use the sub-agent
- **Natural Integration**: Seamless part of the existing tool ecosystem
- **Error Handling**: Built-in retry and fallback mechanisms
- **Debugging**: Clear tool call chains and logging

## Future Extensions

The architecture supports easy addition of new specialized agents:

- **Market Analysis Agent**: For technical analysis and market trends
- **Risk Assessment Agent**: For credit and operational risk analysis  
- **Valuation Agent**: For DCF, comparable, and precedent analysis
- **ESG Agent**: For sustainability and governance metrics

Each agent follows the same pattern: specialized knowledge + structured output + main agent integration.