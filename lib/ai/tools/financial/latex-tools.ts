/**
 * LaTeX Financial Tools for AI Agent
 * 全新的LaTeX-first财务指标AI工具
 */

import { tool } from 'ai';
import { z } from 'zod';
import type { ConvexHttpClient } from 'convex/browser';
import { api } from '@/convex/_generated/api';
import { LaTeXFinancialEngine } from '@/lib/latex-financial/engine';
import type { LaTeXMetricDefinition, LaTeXCalculationRequest } from '@/lib/latex-financial/types';

/**
 * 根据名字解析LaTeX metrics，支持精确匹配和包含匹配
 */
async function resolveMetricNames(metricNames: string[], convex: ConvexHttpClient): Promise<Array<{id: string, name: string, matchType: 'exact' | 'partial'}>> {
  const results: Array<{id: string, name: string, matchType: 'exact' | 'partial'}> = [];

  // 获取所有可用的metrics进行匹配
  const allMetrics = await convex.query(api.latexMetrics.getAccessibleLatexMetrics, {
    limit: 1000 // 获取足够多的metrics进行匹配
  });
  if (!allMetrics || allMetrics.length === 0) {
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
}


/**
 * 创建LaTeX财务指标工具 (工厂函数)
 */
export const createLatexMetric = (convex: ConvexHttpClient) => tool({
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
      
      const result = await convex.mutation(api.latexMetrics.createLatexMetric, {
        name,
        description,
        category,
        latexFormula,
        variableMapping: {}, // LLM会自动处理变量映射
        exampleResult: undefined
      });
      
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
 * 计算LaTeX财务指标工具 (工厂函数)
 */
export const calculateLatexMetric = (convex: ConvexHttpClient) => tool({
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
      const resolvedMetrics = await resolveMetricNames(metricNames, convex);
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
        const metric = await convex.query(api.latexMetrics.getLatexMetric, {
          id: resolvedMetric.id as any
        });
        if (!metric) {
          console.warn(`Metric not found for ID: ${resolvedMetric.id}`);
          continue;
        }
        metrics.push(metric);
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
      let enhancedQuery = `
# UNIFIED MULTI-METRIC SQL GENERATION
Generate a SINGLE SQL query that calculates ALL requested metrics together for comparison and analysis.

## REQUESTED METRICS:
${metricsInfo}

## USER REQUIREMENTS:
- Analysis Description: ${dataRequirements.description}
- Expected Volume: ${dataRequirements.expectedDataVolume}
- Row Definition: ${dataRequirements.rowDefinition}
- Column Requirements: ${dataRequirements.columnRequirements}

## QUERY SPECIFICATIONS:
- Companies: ${querySpecification.companies}
- Time Range: ${querySpecification.timeRange}
- Filter Criteria: ${querySpecification.filterCriteria}
- Sort/Limit: ${querySpecification.sortAndLimit}

## OUTPUT REQUIREMENTS:
- Expected Fields: ${expectedOutput.sqlFields}

**CRITICAL UNIFIED CALCULATION STRATEGY**:
1. Use WITH clauses (CTEs) to structure the calculation
2. Calculate ALL metrics in the SAME query for consistent data alignment
3. Include all metrics as separate columns in the final SELECT
4. Apply cross-metric filtering if specified (e.g., "ROCE > 15% AND ROE > 20%")
5. Ensure proper field mapping for each LaTeX formula
6. Handle time-series data consistently across all metrics

**CRITICAL TIME DIMENSION REQUIREMENTS**:
- ALWAYS include fiscalyear, period, and filingdate fields in SELECT clause
- For quarterly analysis: Include both quarter (Q1, Q2, Q3, Q4) and fiscal year for proper time series ordering
- For multi-period calculations: Ensure proper time ordering with ORDER BY filingdate or fiscalyear, period
- Never return only quarter without fiscal year context

**FIELD REQUIREMENTS FOR EACH METRIC**:
${allMetricDefinitions.map(metric => 
  `- ${metric.name}: Extract fields from formula "${metric.latexFormula}"`
).join('\n')}

Generate a single comprehensive SQL query that calculates all metrics together with consistent data alignment:
`;

      // Create unified metric definition for the engine
      const unifiedMetricDefinition: LaTeXMetricDefinition = {
        name: `Unified Analysis: ${allMetricDefinitions.map(m => m.name).join(', ')}`,
        description: `Multi-metric analysis combining: ${allMetricDefinitions.map(m => m.name).join(', ')}`,
        category: 'unified',
        latexFormula: allMetricDefinitions.map(m => `${m.name} = ${m.latexFormula}`).join(' | ')
      };

      // Use unified SQL generation approach
      enhancedQuery = `
# UNIFIED MULTI-METRIC SQL GENERATION

Generate a SINGLE SQL query that calculates ALL requested metrics together for data consistency and performance.

## Analysis Requirements: ${dataRequirements.description}

## All LaTeX Formulas:
${allMetricDefinitions.map(m => `**${m.name}**: ${m.latexFormula}`).join('\n')}

## DATABASE SCHEMA:

### Core Financial Data Table:
**\`financial_statements\`** - Unified table containing all financial statement data:

### Supplementary Tables (use ONLY when needed):
**\`company_profiles\`** - Company information and market data:
- **Company info**: companyName, sector, industry, country, marketCap, etc.
- **Market data**: price, beta, volAvg, mktCap, lastDiv, range, etc.
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
2. **Secondary source**: \`company_profiles\` (for company info like marketCap, sector, industry)
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

Generate ONE comprehensive SQL query that calculates ALL metrics together:
`;
      
      const request: LaTeXCalculationRequest = {
        metricDefinition: unifiedMetricDefinition,
        query: enhancedQuery
      };

      const result = await engine.calculateMetric(request);
      
      // Log to Convex for the unified calculation (single entry)
      await convex.mutation(api.latexMetrics.updateMetricUsage, {
        metricId: resolvedMetrics[0].id as any, // Primary metric for logging
        executionTimeMs: result.metadata?.executionTimeMs,
        sql: result.metadata?.generatedSQL
      });

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
 * 搜索LaTeX指标工具 (工厂函数)
 */
export const searchLatexMetrics = (convex: ConvexHttpClient) => tool({
  description: 'Search for existing LaTeX financial metrics by name, description, or formula',
  
  inputSchema: z.object({
    searchTerm: z.string().describe('Search term (name, description, or formula keywords)'),
    category: z.optional(z.string()).describe('Filter by category: profitability, liquidity, etc.'),
    limit: z.number().default(10).describe('Maximum number of results')
  }),

  execute: async ({ searchTerm, category, limit }) => {
    try {
      const results = await convex.query(api.latexMetrics.searchLatexMetrics, {
        searchTerm,
        category,
        limit
      });

      return {
        success: true,
        results: results.map(metric => ({
          id: metric._id,
          name: metric.name,
          description: metric.description,
          category: metric.category,
          latexFormula: metric.latexFormula,
          usageCount: metric.usageCount,
          avgExecutionTime: metric.avgExecutionTimeMs
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
 * 获取热门LaTeX指标工具 (工厂函数)
 */
export const getPopularLatexMetrics = (convex: ConvexHttpClient) => tool({
  description: 'Get most popular LaTeX financial metrics based on usage',
  
  inputSchema: z.object({
    limit: z.number().default(10).describe('Number of popular metrics to return')
  }),

  execute: async ({ limit }) => {
    try {
      const results = await convex.query(api.latexMetrics.getPopularLatexMetrics, {
        limit
      });

      return {
        success: true,
        metrics: results.map(metric => ({
          id: metric._id,
          name: metric.name,
          description: metric.description,
          category: metric.category,
          latexFormula: metric.latexFormula,
          usageCount: metric.usageCount,
          avgExecutionTime: metric.avgExecutionTimeMs
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

