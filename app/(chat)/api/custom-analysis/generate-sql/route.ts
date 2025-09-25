import { NextRequest } from 'next/server';
import { z } from 'zod';

const requestSchema = z.object({
  ast: z.any().describe('The AST definition of the financial metric'),
  marketRanking: z.boolean().default(true).describe('Whether to generate market ranking query'),
  topN: z.number().default(50).describe('Number of top results to return'),
  periods: z.number().default(1).describe('Number of periods to analyze'),
  customRequirement: z.string().optional().describe('Additional custom requirements for the query')
});

const responseSchema = z.object({
  sql: z.string().describe('Complete PostgreSQL query with proper safety constraints'),
  explanation: z.string().describe('Explanation of the SQL logic and what it calculates'),
  estimatedRows: z.number().describe('Estimated number of rows this query might return'),
  safetyChecks: z.array(z.string()).describe('List of safety measures applied to the query'),
  tablesSources: z.array(z.string()).describe('Database tables used in the query')
});

function buildSystemPrompt(): string {
  return `
You are an expert PostgreSQL query generator specialized in financial analysis. Your task is to convert financial metric AST definitions into efficient, secure SQL queries.

## Database Schema Context
The database contains financial data with these key tables:
- income_statement: symbol, fiscalyear, period, date, revenue, netincome, ebit, grossprofit...
- balance_sheet: symbol, fiscalyear, period, date, totalassets, totalcurrentliabilities, totalequity...
- cash_flow_statement: symbol, fiscalyear, period, date, operatingcashflow, freecashflow...

## AST Interpretation Rules

1. **Field References**: 
   - \`"source": "income_statement", "field": "ebit"\` → \`i.ebit\`
   - Always use appropriate table aliases (i, b, c for income/balance/cashflow)

2. **Time Selectors**:
   - \`"position": "latest"\` → Most recent period available
   - \`"offset": -1\` → Previous period (requires self-join with window functions)
   - \`"offset": -4\` → Year-over-year comparison

3. **Aggregation Functions**:
   - \`"function": "average", "values": [field1, field2]\` → \`(field1 + field2) / 2.0\`
   - \`"function": "sum"\` → \`SUM()\`
   - \`"function": "ttm"\` → Trailing twelve months calculation

4. **Arithmetic Operations**:
   - \`"operator": "divide"\` → \`/\`
   - \`"operator": "multiply"\` → \`*\`
   - Always handle division by zero: \`NULLIF(denominator, 0)\`

## SQL Structure Requirements

### For Market Ranking Queries:
\`\`\`sql
-- 1. Base CTE with window functions for time-based data
WITH quarterly_ranked AS (
  SELECT 
    i.symbol, i.fiscalyear, i.period, i.date,
    [required_fields],
    ROW_NUMBER() OVER (
      PARTITION BY i.symbol 
      ORDER BY i.fiscalyear DESC, 
               CASE i.period WHEN 'Q4' THEN 1 WHEN 'Q3' THEN 2 WHEN 'Q2' THEN 3 WHEN 'Q1' THEN 4 END
    ) - 1 as relative_quarter
  FROM [primary_table] i
  [JOIN clauses for other tables]
  WHERE [data quality filters]
),

-- 2. Calculation CTE
metric_calculation AS (
  SELECT 
    current_q.*,
    [previous period joins if needed],
    CASE 
      WHEN [denominator conditions] != 0
      THEN [calculation formula]
      ELSE NULL 
    END as metric_value
  FROM quarterly_ranked current_q
  [LEFT JOIN for previous periods if offset exists]
)

-- 3. Final ranking SELECT
SELECT 
  symbol,
  metric_value,
  RANK() OVER (ORDER BY metric_value DESC) as market_rank,
  fiscalyear,
  period
FROM metric_calculation
WHERE metric_value IS NOT NULL 
  AND relative_quarter = 0  -- Most recent period
ORDER BY metric_value DESC 
LIMIT [topN with safety cap];
\`\`\`

## MANDATORY Safety Constraints

1. **Row Limiting**: Always cap results at maximum 10,000 rows
2. **NULL Handling**: Use NULLIF() for all division operations
3. **Data Quality**: Filter out rows with critical NULL values
4. **Time Range**: Limit to recent 5 years unless specified
5. **Valid Periods**: Only include Q1-Q4, exclude FY (full year) periods
6. **Index Hints**: Use filters on indexed columns (symbol, fiscalyear, period)

## Example Query Pattern
For ROCE calculation with offset:
- Current period: totalassets from relative_quarter = 0
- Previous period: totalassets from relative_quarter = 1 (via LEFT JOIN)
- Average: (current + previous) / 2.0

## Response Requirements
- Generate complete, executable PostgreSQL
- Include detailed explanation of business logic
- Estimate result set size realistically
- List all safety measures applied
- Identify all tables used for query planning
  `;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ast, marketRanking, topN, periods, customRequirement } = requestSchema.parse(body);

    // Extract data sources from AST for context
    const extractDataSources = (node: any): Set<string> => {
      const sources = new Set<string>();
      
      if (node.type === 'field' && node.source) {
        sources.add(node.source);
      }
      
      if (node.left) {
        extractDataSources(node.left).forEach(s => sources.add(s));
      }
      if (node.right) {
        extractDataSources(node.right).forEach(s => sources.add(s));
      }
      if (node.values && Array.isArray(node.values)) {
        node.values.forEach((v: any) => extractDataSources(v).forEach(s => sources.add(s)));
      }
      
      return sources;
    };

    const dataSources = Array.from(extractDataSources(ast));

    const prompt = `
Generate a PostgreSQL query from this AST definition:

## AST Definition:
\`\`\`json
${JSON.stringify(ast, null, 2)}
\`\`\`

## Requirements:
${marketRanking ? 
  `- **Market Ranking Query**: Calculate metric for all companies and rank them
   - Return top ${Math.min(topN, 10000)} companies (safety capped)
   - Include: symbol, metric_value, market_rank, fiscalyear, period` :
  `- **Custom Analysis Query**: Calculate metric based on specific criteria`}

${periods > 1 ? `- **Multi-Period Analysis**: Analyze ${periods} recent periods` : ''}

## Data Sources Identified:
${dataSources.map(source => `- ${source}`).join('\n')}

${customRequirement ? `\n## Additional Requirements:\n${customRequirement}` : ''}

## Critical Safety Requirements:
1. Cap results at maximum 10,000 rows with LIMIT
2. Use NULLIF() for all divisions to prevent divide-by-zero
3. Filter out NULL values in critical calculations
4. Only include valid periods (Q1-Q4, exclude FY)
5. Add appropriate WHERE clauses for data quality

Generate the complete SQL query with comprehensive safety measures.
    `;

    // AI call removed for AgentOS integration
    // This API endpoint is temporarily disabled
    return Response.json({
      success: false,
      error: 'SQL generation temporarily disabled during AgentOS migration'
    }, { status: 503 });

  } catch (error) {
    console.error('SQL generation failed:', error);
    
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}