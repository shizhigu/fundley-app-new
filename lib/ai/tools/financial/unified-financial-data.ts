import { tool } from 'ai'
import { z } from 'zod'
import { fmpClient } from '@/lib/fmp/client'

// API endpoint mapping with TTM support
const API_ENDPOINTS = {
  historical: {
    'getIncomeStatement': '/income-statement',
    'getBalanceSheet': '/balance-sheet', 
    'getCashFlow': '/cash-flow-statement',
    'getFinancialRatios': '/ratios',
    'getKeyMetrics': '/key-metrics'
  },
  ttm: {
    'getIncomeStatement': '/income-statement-ttm',
    'getBalanceSheet': '/balance-sheet-statement-ttm',
    'getCashFlow': '/cash-flow-statement-ttm',
    'getFinancialRatios': '/ratios-ttm',
    'getKeyMetrics': '/key-metrics-ttm'
  }
} as const

/**
 * Unified financial data tool that supports cross-dataset analysis and combined timeframes
 * Can fetch data from multiple financial statements simultaneously (Income, Balance, Cash Flow, Ratios, Metrics)
 */
// Helper function for field extraction  
const extractFields = (data: any[], fields: string[], timeframe: 'historical' | 'ttm') => {
  return data.map((period: any) => {
    const extracted: any = {}
    
    // Auto-extract metadata based on value type and field name rules
    Object.keys(period).forEach(key => {
      const value = period[key]
      
      // Rule 1: All string values are metadata  
      if (typeof value === 'string') {
        extracted[key] = value
      }
      // Rule 2: Fields containing 'year' are metadata
      else if (key.toLowerCase().includes('year')) {
        extracted[key] = value
      }
      // Rule 3: Add requested data fields
      else if (fields.includes(key) && value !== undefined) {
        extracted[key] = value
      }
      // Rule 4: For TTM endpoints, map TTM-suffixed fields
      else if (timeframe === 'ttm' && key.endsWith('TTM') && value !== undefined) {
        const originalField = key.replace(/TTM$/, '')
        if (fields.includes(originalField)) {
          extracted[originalField] = value
        }
      }
    })
    
    return extracted
  })
}

export const getFinancialData = tool({
  description: `Get financial data for companies with cross-dataset support and combined timeframes.
  
  🚨 CRITICAL USAGE REQUIREMENTS:
  1. ALWAYS call financialFieldsAgent FIRST to get field mapping
  2. MUST pass either fieldsByDataType OR both (fields + dataType) parameters
  3. NEVER call this tool with only symbols/timeframe - it WILL FAIL with 404/no data
  4. If you get errors, check your parameters - don't retry with same wrong parameters!
  
  💡 CORRECT USAGE EXAMPLES:
  ✅ GOOD: { symbols: ["AAPL"], fieldsByDataType: {"getKeyMetrics": ["returnOnEquity"]}, timeframe: "ttm" }
  ✅ GOOD: { symbols: ["AAPL"], fields: ["revenue"], dataType: "getIncomeStatement", timeframe: "historical" }
  ❌ BAD:  { symbols: ["AAPL"], timeframe: "ttm" } // Missing field specification!
  ❌ BAD:  { symbols: ["AAPL"], limit: 5 } // Missing field specification!
  
  Key Features:
  - Cross-dataset support: Get income + ratios + metrics in single call
  - Combined timeframes: Get both historical trends AND current TTM data
  - Multi-symbol support: Analyze multiple companies simultaneously
  - Global parallel execution: All API calls execute simultaneously for maximum speed
  
  Timeframes:
  - historical: quarterly/annual historical data for trend analysis
  - ttm: trailing twelve months (current rolling 12-month data)  
  - both: get both historical AND ttm data for comprehensive analysis
  
  Historical Period Options (when timeframe='historical' or 'both'):
  - Q1, Q2, Q3, Q4: Specific quarters across years (e.g., all Q3s: 2024-Q3, 2023-Q3...)
  - FY, annual: Annual/fiscal year data
  - quarter: All quarterly data mixed (Q1,Q2,Q3,Q4)
  
  WORKFLOW:
  Step 1: Call financialFieldsAgent with user query
  Step 2: Extract fieldsByDataType from agent result  
  Step 3: Call getFinancialData with fieldsByDataType parameter
  Step 4: If error occurs, check parameters and fix - don't repeat same call!`,
  
  inputSchema: z.object({
    symbols: z.array(z.string()).min(1).describe('Stock symbols: ["AAPL"] or ["AAPL","MSFT"]'),
    
    // Method 1: Cross-dataset support (new, preferred)  
    fieldsByDataType: z.record(z.array(z.string())).optional().describe('Object with dataType keys and field name arrays from financialFieldsAgent.fieldsByDataType'),
    
    // Method 2: Single dataset (legacy compatibility)
    fields: z.array(z.string()).optional().describe('Field names - use only if fieldsByDataType not provided'),
    dataType: z.enum(['getIncomeStatement', 'getBalanceSheet', 'getCashFlow', 'getFinancialRatios', 'getKeyMetrics']).optional().describe('Single data type - use only if fieldsByDataType not provided'),
    
    timeframe: z.enum(['historical', 'ttm', 'both']).optional().default('both').describe('historical: trend analysis, ttm: current analysis, both: comprehensive analysis (recommended)'),
    period: z.enum(['Q1', 'Q2', 'Q3', 'Q4', 'FY', 'annual', 'quarter']).optional().default('annual').describe('Historical period selection. Q1-Q4: specific quarters across years, annual: yearly data, quarter: all quarters'),
    limit: z.number().optional().default(5).describe('Number of periods per timeframe (1-10). For both mode: applies to historical data')
  }),
  
  execute: async ({ symbols, fieldsByDataType, fields, dataType, timeframe = 'both', period = 'annual', limit = 5 }) => {
    try {
      // Input validation and normalization
      let dataStructure: Record<string, string[]>
      
      // Method 1: Cross-dataset (preferred)
      if (fieldsByDataType && Object.keys(fieldsByDataType).length > 0) {
        dataStructure = fieldsByDataType
      }
      // Method 2: Legacy single dataset
      else if (fields && dataType) {
        dataStructure = {
          [dataType]: fields
        }
      }
      else {
        return {
          success: false,
          error: '🚨 PARAMETER ERROR: Must provide either fieldsByDataType (preferred) or both fields + dataType parameters',
          solution: 'SOLUTION: First call financialFieldsAgent to get field mapping, then use fieldsByDataType parameter',
          examples: {
            correct: 'fieldsByDataType: {"getKeyMetrics": ["returnOnEquity", "returnOnAssets"]}',
            alsocorrect: 'fields: ["revenue", "netIncome"] + dataType: "getIncomeStatement"'
          },
          displayAction: 'Parameter validation failed',
          displayResult: '❌ Missing required field parameters - check tool description for examples'
        }
      }
      
      // Build all API calls based on dataStructure and timeframe
      const apiCalls: Array<{
        symbol: string
        dataType: string
        timeframe: 'historical' | 'ttm'
        fields: string[]
        promise: Promise<any>
        key: string
      }> = []
      
      const timeframes = timeframe === 'both' ? ['historical', 'ttm'] as const : [timeframe as 'historical' | 'ttm']
      
      for (const symbol of symbols) {
        for (const [currentDataType, currentFields] of Object.entries(dataStructure)) {
          
          for (const tf of timeframes) {
            const endpoint = API_ENDPOINTS[tf][currentDataType as keyof typeof API_ENDPOINTS[typeof tf]]
            if (!endpoint) continue
            
            // TTM endpoints don't use period parameter
            const params: Record<string, any> = { symbol, limit: tf === 'ttm' ? 1 : limit }
            if (tf === 'historical') {
              params.period = period
            }
            
            const key = `${symbol}-${currentDataType}-${tf}`
            apiCalls.push({
              symbol,
              dataType: currentDataType,
              timeframe: tf,
              fields: currentFields,
              promise: fmpClient.get(endpoint, params),
              key
            })
          }
        }
      }
      
      // Execute all API calls in parallel
      console.log(`Executing ${apiCalls.length} parallel API calls for cross-dataset analysis`)
      const results = await Promise.allSettled(apiCalls.map(call => 
        call.promise.then(data => ({ ...call, data, error: null })).catch(error => ({ ...call, data: null, error: error.message || 'Unknown error' }))
      ))
      
      // Process results
      const successful: Array<{symbol: string, dataType: string, timeframe: string, fields: string[], data: any[], key: string}> = []
      const failed: Array<{symbol: string, dataType: string, timeframe: string, error: string, key: string}> = []
      
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          const { data, error, symbol, dataType, timeframe, fields, key } = result.value
          if (data && Array.isArray(data) && data.length > 0) {
            successful.push({ symbol, dataType, timeframe, fields, data, key })
          } else {
            failed.push({ symbol, dataType, timeframe, error: error || 'No data returned', key })
          }
        } else {
          const call = apiCalls[index]
          failed.push({ 
            symbol: call.symbol, 
            dataType: call.dataType, 
            timeframe: call.timeframe, 
            error: result.reason?.message || 'API call failed',
            key: call.key
          })
        }
      })
      
      if (successful.length === 0) {
        return {
          success: false,
          error: 'No data retrieved from any API calls',
          failedCalls: failed,
          displayAction: 'Cross-dataset fetch',
          displayResult: `Failed all ${apiCalls.length} API calls`
        }
      }
      
      // Structure the response data by symbol with nested timeframe and dataType organization
      const structuredData: Record<string, any> = {}
      const formattedDataLines: string[] = []
      
      formattedDataLines.push(`Finding financial data for ${symbols.join(', ')}...\n`)
      
      for (const symbol of symbols) {
        const symbolResults = successful.filter(r => r.symbol === symbol)
        if (symbolResults.length === 0) continue
        
        structuredData[symbol] = {}
        formattedDataLines.push(`=== ${symbol.toUpperCase()} ===`)
        
        // Group by timeframe first
        const historicalResults = symbolResults.filter(r => r.timeframe === 'historical')
        const ttmResults = symbolResults.filter(r => r.timeframe === 'ttm')
        
        if (historicalResults.length > 0) {
          structuredData[symbol].historical = {}
          formattedDataLines.push(`Historical Data (${period}, ${limit} periods):`)
          
          for (const result of historicalResults) {
            const extractedData = extractFields(result.data, result.fields, 'historical')
            structuredData[symbol].historical[result.dataType] = extractedData
            
            formattedDataLines.push(`  ${result.dataType.replace('get', '')}:`)
            if (extractedData.length > 0) {
              const latest = extractedData[0]
              formattedDataLines.push(`    Period: ${latest.period || 'N/A'} | FiscalYear: ${latest.fiscalYear || 'N/A'} | Date: ${latest.date || 'N/A'}`)
              
              result.fields.forEach(field => {
                if (latest[field] !== undefined && latest[field] !== null) {
                  formattedDataLines.push(`      ${field}: ${latest[field]}`)
                }
              })
            }
          }
          formattedDataLines.push('')
        }
        
        if (ttmResults.length > 0) {
          structuredData[symbol].ttm = {}
          formattedDataLines.push(`TTM Data (trailing 12 months):`)
          
          for (const result of ttmResults) {
            const extractedData = extractFields(result.data, result.fields, 'ttm')
            structuredData[symbol].ttm[result.dataType] = extractedData
            
            formattedDataLines.push(`  ${result.dataType.replace('get', '')}:`)
            if (extractedData.length > 0) {
              const latest = extractedData[0]
              formattedDataLines.push(`    Date: ${latest.date || 'N/A'} | FiscalYear: ${latest.fiscalYear || 'N/A'}`)
              
              result.fields.forEach(field => {
                if (latest[field] !== undefined && latest[field] !== null) {
                  formattedDataLines.push(`      ${field}: ${latest[field]}`)
                }
              })
            }
          }
          formattedDataLines.push('')
        }
      }
      
      return {
        success: true,
        symbols: symbols,
        timeframe: timeframe,
        dataTypes: Object.keys(dataStructure),
        totalApiCalls: apiCalls.length,
        successfulCalls: successful.length,
        data: structuredData,
        formattedData: formattedDataLines.join('\n'),
        ...(failed.length > 0 && { 
          warnings: failed.map(f => `${f.key}: ${f.error}`) 
        }),
        displayAction: `Cross-dataset ${timeframe} analysis`,
        displayResult: `Retrieved data from ${successful.length}/${apiCalls.length} API calls${failed.length ? ` (${failed.length} failed)` : ''}`
      }
      
    } catch (error: any) {
      console.error('Cross-dataset financial fetch error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        symbols: symbols,
        timeframe: timeframe,
        displayAction: 'Cross-dataset fetch error',
        displayResult: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }
})