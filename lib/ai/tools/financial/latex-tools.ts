/**
 * LaTeX Financial Tools for AI Agent - PostgreSQL Version
 * 完全基于PostgreSQL API的LaTeX财务指标AI工具
 */

import { tool, generateText } from 'ai';
import { z } from 'zod';
import { LaTeXFinancialEngine } from '@/lib/latex-financial/engine';
import type { LaTeXMetricDefinition } from '@/lib/latex-financial/types';
import { financialFieldsModel } from '@/lib/ai/providers';

/**
 * 从LLM响应中解析JSON
 */
function parseJSONFromResponse(response: string): { sql: string; explanation: string } {
  try {
    // 首先尝试直接解析
    const parsed = JSON.parse(response);
    if (parsed.sql && parsed.explanation) {
      return parsed;
    }
  } catch (error) {
    // 如果直接解析失败，尝试从响应中提取JSON
  }

  // 尝试从markdown代码块中提取JSON
  const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[1]);
      if (parsed.sql && parsed.explanation) {
        return parsed;
      }
    } catch (error) {
      // 继续尝试其他方法
    }
  }

  // 尝试查找任何看起来像JSON的内容
  const possibleJsonMatch = response.match(/\{[\s\S]*\}/);
  if (possibleJsonMatch) {
    try {
      const parsed = JSON.parse(possibleJsonMatch[0]);
      if (parsed.sql && parsed.explanation) {
        return parsed;
      }
    } catch (error) {
      // 继续
    }
  }

  throw new Error(`Could not parse JSON from response: ${response}`);
}

/**
 * 根据名字解析LaTeX metrics，支持精确匹配和包含匹配
 */
async function resolveMetricNames(metricNames: string[]): Promise<Array<{id: string, name: string, matchType: 'exact' | 'partial'}>> {
  const results: Array<{id: string, name: string, matchType: 'exact' | 'partial'}> = [];

  try {
    // 调用PostgreSQL API获取所有可用的metrics (使用新的custom-metrics API)
    const response = await fetch('/api/custom-metrics?includePublic=true');
    if (!response.ok) {
      console.error('Failed to fetch metrics from API:', response.status);
      return results;
    }

    const allMetrics = await response.json();

    if (allMetrics.length === 0) {
      console.warn('No LaTeX metrics found in database');
      return results;
    }

    for (const inputName of metricNames) {
      const trimmedInput = inputName.trim();
      let found = false;

      // 1. 精确匹配（不区分大小写）
      for (const metric of allMetrics) {
        if (metric.name.toLowerCase() === trimmedInput.toLowerCase()) {
          results.push({
            id: metric._id,
            name: metric.name,
            matchType: 'exact'
          });
          found = true;
          break;
        }
      }

      // 2. 如果没找到精确匹配，尝试包含匹配
      if (!found) {
        for (const metric of allMetrics) {
          if (metric.name.toLowerCase().includes(trimmedInput.toLowerCase())) {
            results.push({
              id: metric._id,
              name: metric.name,
              matchType: 'partial'
            });
            found = true;
            break; // 只取第一个匹配结果，避免重复
          }
        }
      }

      if (!found) {
        console.warn(`No metric found matching: "${inputName}"`);
      }
    }

    return results;
  } catch (error) {
    console.error('Error resolving metric names:', error);
    return results;
  }
}

/**
 * 创建LaTeX财务指标工具
 */
export const createLatexMetric = tool({
  description: `Create a custom financial metric using LaTeX mathematical notation.

  Use this when users want to define new financial ratios or calculations.
  LaTeX formulas are more intuitive than complex JSON structures.

  Examples:
  - Simple ratio: ROE = \\\\frac{NetIncome}{ShareholderEquity}
  - Cross-period: ROCE = \\\\frac{EBIT}{\\\\frac{Assets_t + Assets_{t-1}}{2}}
  - Time series: AvgROE = \\\\overline{ROE_{t-3:t}}`,

  inputSchema: z.object({
    name: z.string().describe('Metric name (e.g., "Custom ROCE", "Modified ROE")'),
    description: z.string().describe('What this metric measures and why it is useful'),
    category: z.string().describe('Category: profitability, liquidity, efficiency, leverage, growth, valuation'),
    latexFormula: z.string().describe('LaTeX mathematical formula (e.g., "ROE = \\\\\\\\frac{NetIncome}{Equity}")')
  }),

  execute: async ({
    name,
    description,
    category,
    latexFormula
  }) => {
    try {
      console.log(`🧮 Creating LaTeX metric: ${name}`);
      console.log(`📐 Formula: ${latexFormula}`);

      const response = await fetch('/api/custom-metrics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          description,
          category,
          formula: {
            latex: latexFormula
          },
          prompt: `Custom financial metric: ${name}`,
          isPublic: false,
          calculationType: 'latex'
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create metric');
      }

      const result = await response.json();

      return {
        success: true,
        metricId: result.id,
        message: `✅ LaTeX metric "${name}" created successfully!`,
        formula: latexFormula
      };

    } catch (error) {
      console.error('❌ Failed to create LaTeX metric:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: `❌ Failed to create LaTeX metric: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
});

/**
 * 计算LaTeX财务指标工具
 */
export const calculateLatexMetric = tool({
  description: `LaTeX financial metric calculation tool with intelligent name matching.

  This tool takes metric names (not IDs) and generates unified SQL queries to calculate all requested metrics together.
  Returns quarterly data with filingdate field for seamless chart integration.

  🎯 **Key Features:**
  - Smart name matching: Use exact names like "ROE" or partial names like "Return"
  - No more ID confusion: Simply use metric names instead of database IDs
  - Converts LaTeX formulas directly to SQL using LLM intelligence
  - Generates unified SQL for multiple metrics in one query
  - Uses unified financial_statements table for consistent data access
  - Handles time series data with proper quarterly transitions and filingdate alignment

  📝 **Name Matching:**
  - Exact match: "ROE" matches "ROE"
  - Partial match: "Return" matches "Return on Equity"
  - Case insensitive: "roe" matches "ROE"
  - Multiple metrics: ["ROE", "ROCE", "Custom Profitability"]

  **Example Input:**
  metricNames: ["ROE", "Return on Assets", "Custom ROCE"]`,

  inputSchema: z.object({
    metricNames: z.array(z.string()).describe('LaTeX metric names (supports exact names and partial matching). Examples: ["ROE", "Return on Equity", "Custom ROCE"]'),

    // Data requirements specification
    dataRequirements: z.object({
      description: z.string().describe('Detailed description of what financial data and analysis is needed (e.g., "Get AAPL and MSFT ROCE data for past 5 quarters for trend comparison analysis")'),

      expectedDataVolume: z.string().describe('Rough estimate of expected data volume (e.g., "2 companies × 5 quarters = 10 rows", "Top 20 company ranking ≈ 20 rows", "Single company annual data ≈ 1 row")'),

      rowDefinition: z.string().describe('What each row of data represents (e.g., "Each row represents a company\'s ROCE value for a specific quarter", "Each row represents a company\'s annual summary metrics", "Each row represents industry average for a time period")'),

      columnRequirements: z.string().describe('What columns/fields need to be returned (e.g., "symbol(company ticker), period(time period), roce_value(ROCE value), market_cap(market cap), sector(industry)")')
    }),

    // Query specification
    querySpecification: z.object({
      companies: z.string().describe('Scope of companies involved (e.g., "AAPL, MSFT", "All tech stocks", "Top 100 companies by market cap", "No company restrictions")'),

      timeRange: z.string().describe('Time range requirements (e.g., "2023Q1-2024Q4", "Most recent 5 quarters", "2024 annual data", "Latest available data")'),

      filterCriteria: z.string().describe('Filter conditions (e.g., "Market cap > $10B", "Exclude financial sector", "US stocks only", "No special filters")'),

      sortAndLimit: z.string().describe('Sorting and quantity limits (e.g., "Sort by ROCE descending, take top 20", "Sort by time ascending", "Sort by company alphabetically", "No special sorting needed")')
    }),

    // Expected output format
    expectedOutput: z.object({
      sqlFields: z.string().describe('Expected SQL query result field names (e.g., "symbol, company_name, period, roce_value, rank")')
    })
  }),

  execute: async ({
    metricNames,
    dataRequirements,
    querySpecification,
    expectedOutput
  }) => {
    try {
      console.log(`🧮 Calculating ${metricNames.length} LaTeX metric(s): ${metricNames.join(', ')}`);
      console.log(`📊 Data Requirements:`, dataRequirements);
      console.log(`🔍 Query Specification:`, querySpecification);
      console.log(`📋 Expected Output:`, expectedOutput);

      // Step 1: Resolve metric names to IDs
      const resolvedMetrics = await resolveMetricNames(metricNames);
      if (resolvedMetrics.length === 0) {
        return {
          success: false,
          error: 'No metrics found',
          message: `❌ No LaTeX metrics found matching: ${metricNames.join(', ')}`
        };
      }

      // Step 2: Fetch full metric definitions
      const metrics: any[] = [];
      for (const resolvedMetric of resolvedMetrics) {
        try {
          const response = await fetch('/api/custom-metrics');
          if (response.ok) {
            const allMetrics = await response.json();
            const metric = allMetrics.find((m: any) => m._id === resolvedMetric.id);
            if (metric) {
              metrics.push(metric);
            }
          } else {
            console.warn(`Metric not found for ID: ${resolvedMetric.id}`);
          }
        } catch (error) {
          console.warn(`Error fetching metric ${resolvedMetric.id}:`, error);
        }
      }

      if (metrics.length === 0) {
        return {
          success: false,
          error: 'No metrics found after resolution',
          message: `❌ No valid LaTeX metrics found after resolving names: ${metricNames.join(', ')}`
        };
      }

      // Build unified metric definitions for all requested metrics
      const allMetricDefinitions = metrics.map((metric) => ({
        name: metric.name,
        description: metric.description,
        category: metric.category,
        latexFormula: metric.latexFormula
      }));

      // Create LaTeX engine for unified calculation
      const engine = new LaTeXFinancialEngine();

      // Build unified prompt with ALL metrics and requirements
      const metricsInfo = allMetricDefinitions.map(metric =>
        `**${metric.name}**: ${metric.latexFormula} (${metric.description})`
      ).join('\n');

      // Create comprehensive unified query prompt
      const enhancedQuery = `
# UNIFIED MULTI-METRIC SQL GENERATION

Generate a SINGLE SQL query that calculates ALL requested metrics together for data consistency and performance.

## Analysis Requirements: ${dataRequirements.description}

## All LaTeX Formulas:
${allMetricDefinitions.map(m => `**${m.name}**: ${m.latexFormula}`).join('\n')}


<thinking>
The FIRST priority is to make sure the LaTeX formulas are translated into correct SQL queries. We have to make sure the formulas are 100 percent understood and calculated correctly.
</thinking>

## DATABASE SCHEMA:

### Core Financial Data Table:
**\`financial_statements\`** - Unified table containing all financial statement data:

### Supplementary Tables (use ONLY when needed):
**\`company_profiles\`** - Company information and market data:
- **Company info**: companyName, sector, industry, country, marketcap, etc.
- **Market data**: price, beta, exchange, isactivelytrading (IMPORTANT: Always use isactivelytrading = true, user will not want to fetch data for inactive stocks)
- **Exchange**: exchange (When user wants to fetch data for US stocks market, then use exchange = 'NASDAQ' and exchange = 'NYSE')
- **Key field**: symbol (for joining with financial_statements)

## FIELD USAGE RULES:

**🚫 CRITICAL RESTRICTIONS**:
🚫 **FIELD SCOPE**: ONLY use fields explicitly mentioned in the LaTeX formulas above
🚫 **NO FIELD DERIVATION**: Do NOT calculate or derive fields from other fields
🚫 **NO FIELD SUBSTITUTION**: Use exact field names from formulas only
🚫 **NO ASSUMPTIONS**: Do NOT assume field relationships or use unmapped fields
🚫 **NO FIELD MODIFICATION**: Do NOT modify, rename, or change field names in any way

**✅ FIELD NAME REQUIREMENTS**:
✅ **EXACT MATCH**: Use the EXACT field names as defined in the LaTeX formula - no modifications allowed
✅ **NO REASONING**: Do NOT try to "improve" or "correct" field names - they are already correct
✅ **TRUST DEFINITIONS**: All field names in formulas are verified and correct - use them as-is
✅ **NO SUBSTITUTIONS**: Even if a field name looks "wrong", use it exactly as specified
✅ **FORMULA AUTHORITY**: The LaTeX formula definition is the authoritative source for field names

**✅ ALLOWED OPERATIONS**:
✅ **Formula fields only**: Map LaTeX variables to exact database field names
✅ **Smart table selection**: Use financial_statements for financial metrics, company_profiles for company info
✅ **Minimal joins**: JOIN company_profiles ONLY if formula requires company/market data


## TABLE SELECTION STRATEGY:

1. **Primary source**: \`financial_statements\` (contains 95% of financial metrics)
2. **Secondary source**: \`company_profiles\` (for company info like marketcap, sector, industry)
3. **Join logic**:
   \`\`\`sql
   FROM financial_statements fs
   LEFT JOIN company_profiles cp ON fs.symbol = cp.symbol
   \`\`\`

## FINANCIAL TIME SERIES RULES:
1. **Quarterly data**: Use relative_quarter approach for previous period comparisons
2. **Year transitions**: Handle Q4→Q1 properly across fiscal years
3. **Missing data**: Return NULL if previous period unavailable (no COALESCE)
4. **Period filter**: \`WHERE period IN ('Q1', 'Q2', 'Q3', 'Q4')\` for quarterly analysis
5. **Field consistency**: Only use fields that exist in the LaTeX formulas

## Query Parameters:
- **Companies**: ${querySpecification.companies}
- **Time Range**: ${querySpecification.timeRange}
- **Filters**: ${querySpecification.filterCriteria}
- **Sort/Limit**: ${querySpecification.sortAndLimit}
- **Output Fields**: ${expectedOutput.sqlFields}

## DATA SUFFICIENCY ANALYSIS:
<thinking>
Based on the LaTeX formulas and analysis requirements, determine how much historical data is needed to perform these calculations properly. Consider:
- What periods are required for each metric?
- Do any formulas need previous period data?
- Are there any trend or growth calculations that need multiple periods?
- What's the minimum data range needed for meaningful results?
</thinking>

## CRITICAL REQUIREMENTS:
- **Data sufficiency**: Ensure SQL fetches enough historical periods for all calculations
- **Time dimensions**: ALWAYS include fiscalyear, period, filingdate in SELECT
- **Quarterly ordering**: Include both quarter and fiscal year for proper time series
- **Multi-period calculations**: Use proper time ordering (ORDER BY filingdate or fiscalyear, period)
- **Context preservation**: Never return period without fiscal year context

## SQL FRAMEWORK EXAMPLES:
\`\`\`sql
-- Example 1: Pure financial metrics (most common)
SELECT symbol, fiscalyear, period, filingdate,
       [metric1_calculation] as metric1_name,
       [metric2_calculation] as metric2_name
FROM financial_statements
WHERE symbol = 'COMPANY' AND period IN ('Q1', 'Q2', 'Q3', 'Q4')

-- Example 2: When company market data needed (e.g., Market Cap)
SELECT fs.symbol, fs.fiscalyear, fs.period, fs.filingdate,
       [metric_calculation] as metric_name,
       cp.mktcap as market_cap
FROM financial_statements fs
LEFT JOIN company_profiles cp ON fs.symbol = cp.symbol
WHERE fs.symbol = 'COMPANY' AND fs.period IN ('Q1', 'Q2', 'Q3', 'Q4')
\`\`\`

Generate ONE comprehensive SQL query that calculates ALL metrics together.

**CRITICAL: Output must be in strict JSON format:**

\`\`\`json
{
  "sql": "Complete DuckDB SQL query statement",
  "explanation": "Brief explanation of calculation logic and field mapping"
}
\`\`\`

**Important Rules:**
1. Return only JSON, no additional text, explanations, or markdown
2. sql field must be a directly executable complete SQL statement
3. All field names use lowercase format
4. Ensure SQL syntax is completely correct
`;

      // Generate SQL directly using LLM
      const { text: response } = await generateText({
        model: financialFieldsModel,
        prompt: enhancedQuery,
        temperature: 0.1,
      });

      console.log('🔍 Raw LLM response:', response);

      // Parse JSON response to extract SQL
      const jsonResult = parseJSONFromResponse(response);
      console.log('🧠 Generated SQL:', jsonResult.sql);
      console.log('💡 Explanation:', jsonResult.explanation);

      // Create unified metric definition for the engine
      const unifiedMetricDefinition: LaTeXMetricDefinition = {
        name: `Unified Analysis: ${allMetricDefinitions.map(m => m.name).join(', ')}`,
        description: `Multi-metric analysis combining: ${allMetricDefinitions.map(m => m.name).join(', ')}`,
        category: 'unified',
        latexFormula: allMetricDefinitions.map(m => `${m.name} = ${m.latexFormula}`).join(' | ')
      };

      // Execute SQL using engine
      const result = await engine.executeSQL(jsonResult.sql, unifiedMetricDefinition.name);

      // Clean up and close connection
      await engine.close();

      // Return unified results with metadata about all metrics
      return {
        ...result,
        unifiedAnalysis: {
          totalMetrics: resolvedMetrics.length,
          metrics: allMetricDefinitions.map(m => ({
            name: m.name,
            formula: m.latexFormula,
            category: m.category
          })),
          calculationMethod: 'unified_sql',
          message: `✅ Unified analysis completed for ${resolvedMetrics.length} metrics: ${allMetricDefinitions.map(m => m.name).join(', ')}`
        }
      };

    } catch (error) {
      console.error('❌ LaTeX metric calculation failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: `❌ Calculation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
});

/**
 * 搜索LaTeX指标工具
 */
export const searchLatexMetrics = tool({
  description: 'Search for existing LaTeX financial metrics by name, description, or formula',

  inputSchema: z.object({
    searchTerm: z.string().describe('Search term (name, description, or formula keywords)'),
    category: z.optional(z.string()).describe('Filter by category: profitability, liquidity, etc.'),
    limit: z.number().default(10).describe('Maximum number of results')
  }),

  execute: async ({ searchTerm, category, limit }) => {
    try {
      const queryParams = new URLSearchParams({
        search: searchTerm,
        limit: limit.toString()
      });

      if (category) {
        queryParams.append('category', category);
      }

      const response = await fetch('/api/custom-metrics?includePublic=true');
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const allResults = await response.json();
      // Filter results based on search term and category
      const results = allResults.filter((metric: any) => {
        const matchesSearch = !searchTerm ||
          metric.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          metric.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          metric.latexFormula?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesCategory = !category || metric.category === category;

        return matchesSearch && matchesCategory;
      }).slice(0, limit);

      return {
        success: true,
        results: results.map((metric: any) => ({
          id: metric._id,
          name: metric.name,
          description: metric.description,
          category: metric.category,
          latexFormula: metric.latexFormula,
        })),
        message: `Found ${results.length} LaTeX metrics matching "${searchTerm}"`
      };

    } catch (error) {
      console.error('❌ LaTeX metric search failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: `❌ Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
});

/**
 * 获取热门LaTeX指标工具
 */
export const getPopularLatexMetrics = tool({
  description: 'Get most popular LaTeX financial metrics based on usage',

  inputSchema: z.object({
    limit: z.number().default(10).describe('Number of popular metrics to return')
  }),

  execute: async ({ limit }) => {
    try {
      const response = await fetch('/api/custom-metrics?includePublic=true');
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const allResults = await response.json();
      // Sort by creation date as a proxy for popularity and take the limit
      const results = allResults.sort((a: any, b: any) =>
        new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      ).slice(0, limit);

      return {
        success: true,
        metrics: results.map((metric: any) => ({
          id: metric._id,
          name: metric.name,
          description: metric.description,
          category: metric.category,
          latexFormula: metric.latexFormula,
        })),
        message: `Retrieved ${results.length} most popular LaTeX metrics`
      };

    } catch (error) {
      console.error('❌ Failed to get popular metrics:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
});