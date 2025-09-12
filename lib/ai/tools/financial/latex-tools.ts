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
import { FinancialTemplateSelector, FinancialSQLGenerator } from '@/lib/latex-financial/financial-time-series-templates';
import { LatexFormulaExplainer, SQLPatternValidator, ENHANCED_FINANCIAL_FORMULAS } from '@/lib/latex-financial/enhanced-latex-formulas';

/**
 * Helper function to identify metric type from LaTeX formula
 */
function identifyMetricType(latexFormula: string): string | null {
  const formula = latexFormula.toLowerCase();
  
  if (formula.includes('roce') || 
      (formula.includes('ebit') && formula.includes('capital'))) {
    return 'ROCE';
  }
  
  if (formula.includes('roe') || 
      (formula.includes('netincome') && formula.includes('equity'))) {
    return 'ROE';
  }
  
  if (formula.includes('roa') || 
      (formula.includes('netincome') && formula.includes('assets'))) {
    return 'ROA';
  }
  
  return null;
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
  description: `Enhanced LaTeX financial metric calculation tool with structured query specification.
  
  This tool requires detailed, structured input to generate precise SQL queries using proven financial time series patterns.
  
  🎯 **Key Features:**
  - Uses proven SQL templates for common financial metrics (ROCE, ROE, ROA)
  - Handles complex quarterly time series with proper Q4→Q1 transitions
  - Validates SQL against financial domain best practices
  - Returns NULL for missing previous period data (no fallbacks)
  
  📋 **Enhanced Processing:**
  - Auto-detects metric type from LaTeX formula
  - Selects appropriate SQL template 
  - Validates generated SQL patterns
  - Provides detailed formula explanations to LLM
  
  **Example Usage:**
  Instead of: "Get AAPL ROCE data"
  Provide: Complete structured requirements for precise SQL generation`,
  
  inputSchema: z.object({
    metricIds: z.array(z.string()).describe('LaTeX metric IDs from database (supports batch calculation of multiple metrics)'),
    
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
    metricIds,
    dataRequirements,
    querySpecification,
    expectedOutput
  }) => {
    try {
      console.log(`🧮 Calculating ${metricIds.length} LaTeX metric(s): ${metricIds.join(', ')}`);
      console.log(`📊 Data Requirements:`, dataRequirements);
      console.log(`🔍 Query Specification:`, querySpecification);
      console.log(`📋 Expected Output:`, expectedOutput);
      
      // Fetch all metrics concurrently
      const metricsPromises = metricIds.map(async (metricId) => {
        const metric = await convex.query(api.latexMetrics.getLatexMetric, { 
          id: metricId as any 
        });
        return { metricId, metric };
      });
      
      const metricsResults = await Promise.all(metricsPromises);
      
      // Check for missing metrics
      const missingMetrics = metricsResults.filter(({ metric }) => !metric);
      if (missingMetrics.length > 0) {
        const missingIds = missingMetrics.map(({ metricId }) => metricId);
        return {
          success: false,
          error: 'Metrics not found',
          message: `❌ LaTeX metrics not found: ${missingIds.join(', ')}`
        };
      }

      // Build unified metric definitions for all requested metrics
      const allMetricDefinitions = metricsResults.map(({ metric }) => ({
        name: metric!.name,
        description: metric!.description,
        category: metric!.category,
        latexFormula: metric!.latexFormula
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
- ALWAYS include fiscalyear, period, and date fields in SELECT clause
- For quarterly analysis: Include both quarter (Q1, Q2, Q3, Q4) and fiscal year for proper time series ordering
- For multi-period calculations: Ensure proper time ordering with ORDER BY date or fiscalyear, period
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

      // Skip template-based approach for unified queries (use general approach)
      if (false) {
        console.log(`🎯 Using enhanced template for ${metricKey}`);
        
        // Use the smart template selector
        const { template, params } = FinancialTemplateSelector.selectTemplate({
          description: dataRequirements.description,
          companies: querySpecification.companies,
          timeRange: querySpecification.timeRange,
          expectedDataVolume: dataRequirements.expectedDataVolume
        });
        
        // Generate detailed formula explanation
        const formulaExplanation = LatexFormulaExplainer.generateDetailedExplanation(metricKey);
        
        // Create enhanced prompt with template guidance
        enhancedQuery = `
# ENHANCED FINANCIAL METRIC CALCULATION

${formulaExplanation}

## USER REQUIREMENTS:
- Description: ${dataRequirements.description}
- Expected Volume: ${dataRequirements.expectedDataVolume}
- Companies: ${querySpecification.companies}
- Time Range: ${querySpecification.timeRange}
- Output Fields: ${expectedOutput.sqlFields}

**CRITICAL TIME DIMENSION REQUIREMENTS**:
- ALWAYS include fiscalyear, period, and date fields in SELECT clause
- For quarterly analysis: Include both quarter (Q1, Q2, Q3, Q4) and fiscal year for proper time series ordering  
- For multi-period calculations: Ensure proper time ordering with ORDER BY date or fiscalyear, period
- Never return only quarter without fiscal year context

## TEMPLATE GUIDANCE:
Template Selected: ${template.name}
Use Cases: ${template.useCases.join(', ')}



**CRITICAL FIELD RESTRICTIONS**:
🚫 **STRICTLY FORBIDDEN**: You MUST ONLY use fields that are explicitly defined in the LaTeX formula. 
🚫 **NO FIELD CALCULATIONS**: Do NOT calculate or derive fields from other fields (e.g., DO NOT use "revenue - operatingExpenses" when "operatingIncome" exists)
🚫 **NO FIELD SUBSTITUTIONS**: Do NOT substitute similar fields (e.g., use exact field names from formula only)

✅ **ALLOWED**: Only use the exact field names that appear in the LaTeX formula: ${metric.latexFormula}
✅ **FIELD MAPPING**: Map LaTeX variables to exact database field names only

**CRITICAL EXECUTION REQUIREMENTS**:
1. The relative_quarter approach for time series
2. The NULL handling for missing previous period data  
3. The proper Q4→Q1 cross-year handling
4. The exclusion of FY data for quarterly analysis
5. **ONLY use fields explicitly defined in the LaTeX formula**

Generate the final SQL now, following this proven pattern and STRICT FIELD USAGE:
`;
      } else {
        // Fallback to general CTE approach
        enhancedQuery = `
# GENERAL CTE-BASED SQL GENERATION

**CRITICAL**: Generate SQL using step-by-step WITH clauses (CTEs). Use financial time series best practices.

## Analysis Requirements: ${dataRequirements.description}
## LaTeX Formula: ${metric.latexFormula}

**🚫 CRITICAL FIELD RESTRICTIONS - MUST FOLLOW**:
🚫 **STRICTLY FORBIDDEN**: You MUST ONLY use fields that are explicitly defined in the LaTeX formula above
🚫 **NO FIELD CALCULATIONS**: Do NOT calculate or derive fields from other fields (e.g., DO NOT use "revenue - operatingExpenses" when "operatingIncome" exists)
🚫 **NO FIELD SUBSTITUTIONS**: Do NOT substitute similar fields - use exact field names from formula only
🚫 **NO ASSUMPTIONS**: Do NOT assume field relationships or use fields not in the formula

✅ **ALLOWED**: Only use the exact field names that appear in the LaTeX formula: ${metric.latexFormula}
✅ **FIELD MAPPING**: Map LaTeX variables to exact database field names only (e.g., NetIncome → netIncome, EBIT → operatingIncome)

## FINANCIAL TIME SERIES RULES:
1. For quarterly data: Use relative_quarter approach, NOT simple LAG()
2. Handle Q4→Q1 transitions properly across years
3. Return NULL if previous period data missing (no COALESCE fallbacks)
4. Filter out FY data: WHERE period IN ('Q1', 'Q2', 'Q3', 'Q4')
5. **ONLY use fields explicitly defined in the LaTeX formula**

## Data Specifications:
- Expected Volume: ${dataRequirements.expectedDataVolume}
- Row Definition: ${dataRequirements.rowDefinition}
- Column Requirements: ${dataRequirements.columnRequirements}

## Query Parameters:
- Companies: ${querySpecification.companies}
- Time Range: ${querySpecification.timeRange}
- Filters: ${querySpecification.filterCriteria}
- Sort/Limit: ${querySpecification.sortAndLimit}
- Output Fields: ${expectedOutput.sqlFields}

**REMINDER**: Before writing any SQL, identify ONLY the fields that exist in the LaTeX formula and map them to exact database field names. Do not use any other fields.

**CRITICAL TIME DIMENSION REQUIREMENTS**:
- ALWAYS include fiscalyear, period, and date fields in SELECT clause
- For quarterly analysis: Include both quarter (Q1, Q2, Q3, Q4) and fiscal year for proper time series ordering
- For multi-period calculations: Ensure proper time ordering with ORDER BY date or fiscalyear, period
- Never return only quarter without fiscal year context

Generate SQL following proven financial time series patterns and STRICT FIELD USAGE:
`;
      }
      
      const request: LaTeXCalculationRequest = {
        metricDefinition: unifiedMetricDefinition,
        query: enhancedQuery
      };

      const result = await engine.calculateMetric(request);
      
      // Log to Convex for the unified calculation (single entry)
      await convex.mutation(api.latexMetrics.updateMetricUsage, {
        metricId: metricIds[0] as any, // Primary metric for logging
        executionTimeMs: result.metadata?.executionTimeMs,
        sql: result.metadata?.generatedSQL
      });
      
      // Clean up and close connection
      await engine.close();
      
      // Return unified results with metadata about all metrics
      return {
        ...result,
        unifiedAnalysis: {
          totalMetrics: metricIds.length,
          metrics: allMetricDefinitions.map(m => ({
            name: m.name,
            formula: m.latexFormula,
            category: m.category
          })),
          calculationMethod: 'unified_sql',
          message: `✅ Unified analysis completed for ${metricIds.length} metrics: ${allMetricDefinitions.map(m => m.name).join(', ')}`
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

