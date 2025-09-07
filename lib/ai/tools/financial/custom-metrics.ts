import { tool } from 'ai'
import { z } from 'zod'
import { generateSQLQuery } from '@/lib/ai/agents/sql-generator-agent'
import { executeSQLQuery } from '@/lib/ai/tools/financial/sql-query-tool'
import { 
  createCustomMetricInDB,
  getCustomMetricFromDB,
  recordMetricUsage,
  searchCustomMetrics
} from '@/lib/ai/utils/custom-metric-api'

/**
 * Custom Financial Metric Creation Tool (SQL-based)
 * Creates custom financial metrics by converting user requirements into SQL query templates
 */
export const createCustomMetric = tool({
  description: `Create custom financial metrics. Use this when users want to create a new financial calculation or metric.`,

  inputSchema: z.object({
    displayName: z.string().describe('Name of the metric'),
    description: z.string().describe('What this metric measures'),
    formula: z.string().describe('How to calculate this metric'),
    calculationType: z.enum(['single_period', 'ttm', 'multi_period']).default('ttm').describe('Type of calculation'),
    category: z.string().default('custom').describe('Category of metric')
  }),

  execute: async (params) => {
    const { 
      displayName,
      description, 
      formula,
      calculationType,
      category 
    } = params

    try {
      console.log('Creating SQL-based custom metric:', displayName)
      console.log('All parameters received:', JSON.stringify(params, null, 2))
      
      // Validate required parameters
      if (!displayName) {
        return {
          success: false,
          error: 'displayName parameter is required',
          displayAction: 'Create custom metric',
          displayResult: 'Display name is required for the metric'
        }
      }

      if (!description) {
        return {
          success: false,
          error: 'description parameter is required',
          displayAction: 'Create custom metric',
          displayResult: 'Description is required to understand the metric purpose'
        }
      }

      if (!formula) {
        return {
          success: false,
          error: 'formula parameter is required',
          displayAction: 'Create custom metric',
          displayResult: 'Formula description is required to generate SQL query'
        }
      }

      // Generate a system name from displayName
      const systemName = displayName
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, '_')
        .substring(0, 50)
      
      // Step 1: Generate SQL query template from natural language description
      const sqlGenerationResult = await generateSQLQuery({
        userRequest: `Create a SQL query template for calculating "${displayName}". Formula: ${formula}. Description: ${description}. Please automatically determine the required database fields from the financial database schema.`,
        analysisType: calculationType === 'ttm' ? 'ttm' : 'custom',
        metricName: systemName,
        description: description
      });

      if (!sqlGenerationResult.success || !sqlGenerationResult.query) {
        return {
          success: false,
          error: `SQL generation failed: ${sqlGenerationResult.error}`,
          displayAction: 'Create custom metric',
          displayResult: '❌ Failed to generate SQL template'
        }
      }

      // Step 2: Save to database with SQL structure
      const dbResult = await createCustomMetricInDB({
        name: displayName,
        description,
        category,
        formula: {
          name: systemName,
          sqlTemplate: sqlGenerationResult.query,
          description: sqlGenerationResult.description || `SQL query for ${displayName}`,
          dataFields: [], // Will be extracted from SQL query automatically
          calculationType,
          userRequirement: `${formula} - ${description}`,
          formula: formula
        },
        prompt: `Custom financial metric: ${description}\nCalculation: ${formula}\nSQL Template: ${sqlGenerationResult.query}`,
        isPublic: false
      })

      if (!dbResult.success) {
        return {
          success: false,
          error: `Database save failed: ${dbResult.error}`,
          displayAction: 'Create custom metric',
          displayResult: '❌ Failed to save to database'
        }
      }

      console.log(`SQL-based custom metric created with ID: ${dbResult.metricId}`)

      return {
        success: true,
        metricId: dbResult.metricId,
        name: displayName,
        sqlTemplate: sqlGenerationResult.query,
        description: sqlGenerationResult.description,
        formula,
        calculationType,
        displayAction: 'Create custom metric',
        displayResult: `✅ Created SQL-based custom metric: ${displayName}`
      }

    } catch (error) {
      console.error('Create SQL custom metric failed:', error)
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create custom metric',
        displayAction: 'Create custom metric',
        displayResult: `❌ Creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }
})

/**
 * Tool 2: Execute Custom Financial Metric Calculation (SQL Version)
 * Execute queries based on saved SQL templates and return results
 */
export const executeCustomMetric = tool({
  description: `Execute SQL-based custom financial metric calculations.

  Use pre-created SQL custom metrics to calculate and analyze specific companies.
  Supports batch calculations for single or multiple companies, including TTM and historical data analysis.
  
  Example use cases:
  - Calculate Apple's cash conversion cycle
  - Compare investment returns across tech companies
  - Analyze historical trend data`,

  inputSchema: z.object({
    metricId: z.string().describe('ID of the custom metric'),
    symbols: z.array(z.string()).min(1).describe('List of stock symbols, e.g. ["AAPL"] or ["AAPL", "MSFT"]'),
    timeframe: z.enum(['ttm', 'latest', 'historical']).default('latest').describe('Data timeframe: ttm=trailing 12 months, latest=most recent period, historical=historical trends'),
    periods: z.number().optional().default(5).describe('Number of historical periods to limit (1-25)')
  }),

  execute: async ({ metricId, symbols, timeframe, periods = 5 }) => {
    try {
      console.log(`Executing SQL custom metric ${metricId} for symbols:`, symbols)

      // Step 1: Get metric definition
      const metricResult = await getCustomMetricFromDB(metricId)

      if (!metricResult.success || !metricResult.metric) {
        return {
          success: false,
          error: metricResult.error || 'Metric not found or access denied',
          displayAction: 'Execute custom metric',
          displayResult: '❌ Metric not found'
        }
      }

      const metric = metricResult.metric
      const startTime = Date.now()

      // Step 2: Generate and execute SQL queries for each symbol
      const allResults: any[] = []
      
      for (const symbol of symbols) {
        // Generate specific query based on metric SQL template and parameters
        const sqlResult = await generateSQLQuery({
          userRequest: `Calculate ${metric.name} for ${symbol} with timeframe ${timeframe}`,
          symbols: [symbol],
          timeRange: timeframe === 'historical' ? { periods } : undefined,
          analysisType: timeframe as any,
          metricName: metric.name,
          description: metric.description
        });

        if (!sqlResult.success || !sqlResult.query) {
          console.error(`Failed to generate SQL for ${symbol}:`, sqlResult.error);
          continue;
        }

        // Execute SQL query
        const queryResult = await executeSQLQuery({
          query: sqlResult.query,
          description: `Calculate ${metric.name} for ${symbol}`,
          expectedResultType: sqlResult.expectedResultType || 'multiple_rows'
        });

        if (queryResult.success) {
          allResults.push({
            symbol,
            data: queryResult.data,
            metricName: metric.name,
            timeframe,
            query: sqlResult.query
          });
        } else {
          console.error(`SQL execution failed for ${symbol}:`, queryResult.error);
        }
      }

      const executionTime = Date.now() - startTime;

      if (allResults.length === 0) {
        return {
          success: false,
          error: 'All queries failed',
          displayAction: 'Execute custom metric',
          displayResult: '❌ All queries failed'
        }
      }

      // Step 3: Record usage statistics
      await recordMetricUsage({
        metricId,
        calculationTime: executionTime,
        success: true
      })

      // Step 4: Format return results
      const formattedResult = formatSQLResults(metric.name, allResults, symbols, timeframe)

      return {
        success: true,
        metricName: metric.name,
        symbols,
        timeframe,
        executionTime,
        results: allResults,
        formattedResults: formattedResult,
        displayAction: 'Execute custom metric',
        displayResult: `✅ ${metric.name} calculation completed (${executionTime}ms)`
      }

    } catch (error) {
      console.error('Execute SQL custom metric failed:', error)

      // Record failed usage statistics
      await recordMetricUsage({
        metricId,
        calculationTime: 0,
        success: false
      })

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to execute custom metric',
        displayAction: 'Execute custom metric',
        displayResult: `❌ Execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }
})

/**
 * 格式化SQL计算结果为用户友好的显示格式
 */
function formatSQLResults(metricName: string, allResults: any[], symbols: string[], timeframe: string): string {
  const lines: string[] = []
  
  lines.push(`=== ${metricName} Calculation Results ===`)
  lines.push(`Analysis Scope: ${symbols.join(', ')} | Timeframe: ${timeframe}`)
  lines.push('')

  if (allResults.length === 0) {
    lines.push(`❌ No calculation results available`)
    return lines.join('\n')
  }

  // Display results for each symbol
  allResults.forEach((result, index) => {
    lines.push(`📊 ${result.symbol}:`)
    
    if (Array.isArray(result.data)) {
      // Multi-row results (historical data)
      result.data.forEach((row: any, rowIndex: number) => {
        if (rowIndex < 5) { // Only show first 5 rows
          lines.push(`   Period ${rowIndex + 1}: ${JSON.stringify(row)}`)
        }
      })
      if (result.data.length > 5) {
        lines.push(`   ... ${result.data.length - 5} more rows of data`)
      }
    } else {
      // Single row result
      lines.push(`   Result: ${JSON.stringify(result.data)}`)
    }
    
    if (index < allResults.length - 1) {
      lines.push('') // Empty line to separate results for different symbols
    }
  })

  return lines.join('\n')
}

/**
 * Format calculation results into user-friendly display format (legacy version for compatibility)
 */
function formatResults(metricName: string, results: any, symbols: string[], timeframe: string): string {
  const lines: string[] = []
  
  lines.push(`=== ${metricName} Calculation Results ===`)
  lines.push(`Analysis Scope: ${symbols.join(', ')} | Timeframe: ${timeframe}`)
  lines.push('')

  if (results.error) {
    lines.push(`❌ Calculation failed: ${results.message}`)
    return lines.join('\n')
  }

  // Main results
  lines.push(`📊 ${results.symbol || symbols[0]}:`)
  
  if (results.metricValue !== null && results.metricValue !== undefined) {
    lines.push(`   ${metricName}: ${results.metricValue}`)
    
    if (results.metricPercentage) {
      lines.push(`   Percentage format: ${results.metricPercentage}`)
    }
  }

  // Component analysis
  if (results.components) {
    lines.push('')
    lines.push('📋 Calculation Components:')
    
    Object.entries(results.components).forEach(([key, value]) => {
      if (typeof value === 'number') {
        lines.push(`   ${key}: ${value.toLocaleString()}`)
      } else {
        lines.push(`   ${key}: ${value}`)
      }
    })
  }

  // Time information
  if (results.period) {
    lines.push('')
    lines.push(`📅 Data Period: ${results.period}`)
  }

  return lines.join('\n')
}

/**
 * Tool 3: Find Existing Custom Metrics
 * Help main Agent determine if new metric creation is needed
 */
export const findCustomMetric = tool({
  description: `Find existing custom financial metrics.

  Before creating new metrics, check if similar metrics already exist.
  Supports fuzzy matching by name and description content.`,

  inputSchema: z.object({
    query: z.string().describe('Search keywords, such as metric name or description'),
    includePublic: z.boolean().default(true).describe('Whether to include public metrics')
  }),

  execute: async ({ query, includePublic }) => {
    try {
      const searchResult = await searchCustomMetrics({
        query,
        includePublic
      })

      if (!searchResult.success) {
        return {
          success: false,
          error: searchResult.error,
          displayAction: 'Search custom metrics',
          displayResult: `❌ Search failed: ${searchResult.error}`
        }
      }

      const results = searchResult.metrics || []

      if (results.length === 0) {
        return {
          success: true,
          found: false,
          metrics: [],
          displayAction: 'Search custom metrics',
          displayResult: 'No matching custom metrics found'
        }
      }

      // Format search results
      const formattedMetrics = results.map((metric: any) => ({
        id: metric._id,
        name: metric.name,
        description: metric.description,
        category: metric.category,
        createdAt: new Date(metric.createdAt).toLocaleDateString(),
        isPublic: metric.isPublic
      }))

      return {
        success: true,
        found: true,
        metrics: formattedMetrics,
        count: results.length,
        displayAction: 'Search custom metrics',
        displayResult: `Found ${results.length} matching metrics`
      }

    } catch (error) {
      console.error('Find custom metric failed:', error)
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Search failed',
        displayAction: 'Search custom metrics',
        displayResult: `❌ Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }
})