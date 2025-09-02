import { generateText } from 'ai';
import { financialFieldsModel } from '@/lib/ai/providers';

interface SQLGenerationParams {
  userRequest: string;
  symbols?: string[];
  timeRange?: {
    startYear?: number;
    endYear?: number;
    periods?: number; // Number of periods to include (for TTM, rolling analysis)
  };
  analysisType?: 'ratio' | 'trend' | 'comparison' | 'custom' | 'ttm';
  metricName?: string;
  description?: string;
}

export async function generateSQLQuery(params: SQLGenerationParams): Promise<{
  success: boolean;
  query?: string;
  description?: string;
  expectedResultType?: 'single_value' | 'single_row' | 'multiple_rows' | 'aggregation';
  error?: string;
}> {
  try {
    const prompt = buildSQLGenerationPrompt(params);
    
    console.log('🤖 Generating SQL query for:', {
      userRequest: params.userRequest,
      analysisType: params.analysisType,
      symbols: params.symbols,
      timeRange: params.timeRange
    });
    
    const { text } = await generateText({
      model: financialFieldsModel,
      prompt,
      temperature: 0.1, // Low temperature for consistent SQL generation
    });
    
    // 解析LLM响应
    const result = parseGeneratedResponse(text);
    
    if (!result.query) {
      throw new Error('Failed to generate valid SQL query');
    }
    
    console.log('✅ Generated SQL query:', result);
    return { success: true, ...result };
    
  } catch (error) {
    console.error('❌ SQL generation failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

function buildSQLGenerationPrompt(params: SQLGenerationParams): string {
  return `You are an expert SQL generator for financial analysis. Generate a SQL query based on the user request.

DATABASE SCHEMA:
==============

Table: income_statement
- symbol (VARCHAR): Stock ticker
- fiscalYear (INTEGER): Fiscal year
- period (VARCHAR): 'FY' (annual), 'Q1', 'Q2', 'Q3', 'Q4' (quarterly)
- date (DATE): Statement date
- revenue (BIGINT): Total revenue in cents
- costOfRevenue (BIGINT): Cost of goods sold in cents
- grossProfit (BIGINT): Gross profit in cents
- operatingExpenses (BIGINT): Total operating expenses in cents
- operatingIncome (BIGINT): Operating income in cents
- netIncome (BIGINT): Net income in cents
- eps (NUMERIC): Earnings per share
- epsDiluted (NUMERIC): Diluted earnings per share
- ebitda (BIGINT): EBITDA in cents
- [... other income statement fields]

Table: cashflow_statement
- symbol, fiscalYear, period, date (same as above)
- netCashProvidedByOperatingActivities (BIGINT): Operating cash flow in cents
- operatingCashFlow (BIGINT): Operating cash flow in cents
- capitalExpenditure (BIGINT): Capital expenditures in cents
- freeCashFlow (BIGINT): Free cash flow in cents
- netChangeInCash (BIGINT): Net change in cash in cents
- [... other cash flow fields]

Table: balance_sheet
- symbol, fiscalYear, period, date (same as above)
- totalAssets (BIGINT): Total assets in cents
- totalLiabilities (BIGINT): Total liabilities in cents
- totalStockholdersEquity (BIGINT): Total stockholders equity in cents
- cashAndCashEquivalents (BIGINT): Cash and equivalents in cents
- totalDebt (BIGINT): Total debt in cents
- [... other balance sheet fields]

IMPORTANT GUIDELINES:
====================

1. PERIOD HANDLING:
   - 'FY' = Annual data (most recent complete fiscal year)
   - 'Q1', 'Q2', 'Q3', 'Q4' = Quarterly data
   - For TTM (Trailing Twelve Months): Use last 4 quarters, ordered by fiscalYear DESC, period DESC
   - For N periods: Always order by fiscalYear DESC, period DESC and LIMIT N
   - Some companies may not have all quarters - handle missing periods gracefully

2. MULTI-PERIOD QUERIES:
   - For trend analysis: ORDER BY fiscalYear ASC, period ASC (chronological)
   - For latest data: ORDER BY fiscalYear DESC, period DESC LIMIT N
   - Always include fiscalYear and period in SELECT for multi-period queries

3. TTM CALCULATION EXAMPLE:
   SELECT symbol, 
          SUM(revenue) as ttm_revenue,
          SUM(netIncome) as ttm_net_income
   FROM (
     SELECT * FROM income_statement 
     WHERE symbol = 'AAPL' AND period IN ('Q1','Q2','Q3','Q4')
     ORDER BY fiscalYear DESC, 
              CASE period WHEN 'Q4' THEN 4 WHEN 'Q3' THEN 3 WHEN 'Q2' THEN 2 WHEN 'Q1' THEN 1 END DESC
     LIMIT 4
   ) subquery
   GROUP BY symbol;

4. MONETARY VALUES:
   - All monetary fields are stored in CENTS (divide by 100.0 for dollars)
   - Use CAST(field AS NUMERIC) / 100.0 for dollar amounts
   - For ratios, keep as raw values to avoid rounding errors

5. JOIN PATTERNS:
   - Always join on: symbol = symbol AND fiscalYear = fiscalYear AND period = period
   - Use table aliases (i, c, b for income, cashflow, balance)

USER REQUEST:
=============
${params.userRequest}

PARAMETERS:
===========
${params.symbols ? `Symbols: ${params.symbols.join(', ')}` : 'Symbols: Not specified'}
${params.timeRange ? `Time Range: ${JSON.stringify(params.timeRange)}` : 'Time Range: Not specified'}
${params.analysisType ? `Analysis Type: ${params.analysisType}` : 'Analysis Type: Not specified'}
${params.metricName ? `Metric Name: ${params.metricName}` : ''}

RESPONSE FORMAT:
================
Respond with JSON only:
{
  "query": "SELECT ... your SQL query here ...",
  "description": "Human readable description of what this query does",
  "expectedResultType": "single_value|single_row|multiple_rows|aggregation"
}

Generate a precise, efficient SQL query that addresses the user's request. Focus on:
- Correct field names and table joins
- Proper period handling for TTM and multi-period analysis
- Efficient query structure
- Clear, descriptive field aliases`;
}

function parseGeneratedResponse(text: string): {
  query?: string;
  description?: string;
  expectedResultType?: 'single_value' | 'single_row' | 'multiple_rows' | 'aggregation';
} {
  try {
    // 尝试解析JSON响应
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        query: parsed.query?.trim(),
        description: parsed.description?.trim(),
        expectedResultType: parsed.expectedResultType
      };
    }
    
    // 如果不是JSON格式，尝试提取SQL查询
    const sqlMatch = text.match(/SELECT[\s\S]*?;?$/im);
    if (sqlMatch) {
      return {
        query: sqlMatch[0].replace(/;$/, '').trim(),
        description: 'Generated SQL query',
        expectedResultType: 'multiple_rows'
      };
    }
    
    throw new Error('Could not parse generated response');
    
  } catch (error) {
    console.error('Failed to parse SQL generation response:', error);
    return {};
  }
}