import { tool } from 'ai'
import { z } from 'zod'
import { fmpClient } from '@/lib/fmp/client'
import { fieldSearch } from '@/lib/fmp/field-search'
import { FieldMetadata } from '@/lib/fmp/field-metadata'

export const getIncomeStatement = tool({
  description: `Get income statement data for companies. 
  REQUIRED PARAMETERS:
  1. symbols: You MUST provide an array of stock ticker symbols (e.g., ["AAPL"], ["AAPL", "MSFT", "GOOGL"])
  2. fields: You MUST provide specific field names from searchFinancialFields results
  
  IMPORTANT: Always call searchFinancialFields FIRST to get the correct field names, then use those exact field names in the 'fields' parameter.
  Never call this tool without both symbols AND fields parameters.`,
  
  inputSchema: z.object({
    symbols: z.array(z.string()).min(1, 'At least one stock symbol is required').describe('REQUIRED: Stock ticker symbols as array (e.g., ["AAPL"], ["AAPL", "GOOGL", "MSFT"])'),
    fields: z.array(z.string()).describe('REQUIRED: Specific field names from searchFinancialFields results (e.g., ["revenue", "netIncome", "eps"]). NEVER leave this empty.'),
    period: z.enum(['annual', 'quarter']).optional().describe('Annual or quarterly data'),
    limit: z.number().optional().default(5).describe('Number of periods to return')
  }),
  execute: async ({ symbols, fields, period, limit }) => {
    try {
      // Validate required parameters
      if (!symbols || symbols.length === 0) {
        return {
          success: false,
          message: 'ERROR: No stock symbols provided. You MUST provide symbols array parameter with stock ticker(s) like ["AAPL", "MSFT"].'
        }
      }
      
      if (!fields || fields.length === 0) {
        return {
          success: false,
          message: 'ERROR: No fields provided. You MUST first call searchFinancialFields to find the correct field names, then provide them in the fields parameter.'
        }
      }
      
      // Fetch data for all symbols in parallel
      const allResults = await Promise.all(
        symbols.map(async (ticker) => {
          try {
            const data = await fmpClient.getIncomeStatement(
              ticker,
              period,
              limit
            )
            return { symbol: ticker, data, error: null }
          } catch (error) {
            console.error(`Error fetching data for ${ticker}:`, error)
            return { 
              symbol: ticker, 
              data: null, 
              error: error instanceof Error ? error.message : 'Unknown error' 
            }
          }
        })
      )
      
      // Separate successful and failed fetches
      const successful = allResults.filter(r => r.data !== null)
      const failed = allResults.filter(r => r.error !== null)
      
      if (successful.length === 0) {
        return {
          success: false,
          message: `Failed to fetch data for all symbols: ${failed.map(f => `${f.symbol}: ${f.error}`).join(', ')}`
        }
      }
      
      // Get field metadata once (same for all symbols)
      const fieldMetadata = await fieldSearch.getFields(fields)
      
      // If single symbol, return simple format
      if (symbols.length === 1 && successful.length === 1) {
        const { symbol: ticker, data } = successful[0]
        
        if (!data || data.length === 0) {
          return {
            success: false,
            message: `No income statement data found for ${ticker}`
          }
        }
        
        // Build text summary with raw values (no formatting)
        const textLines = []
        textLines.push(`Income Statement for ${ticker.toUpperCase()}`)
        
        // Show data for each period
        data.forEach((periodData, index) => {
          if (index < 5) { // Limit to first 5 periods for text summary
            textLines.push(`\n${periodData.period} ${periodData.fiscalYear} (${periodData.date}):`)
            fields.forEach(field => {
              if (periodData[field] !== undefined && periodData[field] !== null) {
                const metadata = fieldMetadata.find(f => f.field === field)
                const displayName = metadata?.name || field
                textLines.push(`  ${displayName}: ${periodData[field]}`) // 原始数值，不加格式
              }
            })
          }
        })
        
        if (data.length > 5) {
          textLines.push(`\n... and ${data.length - 5} more periods`)
        }
        
        // Also include raw data for LLM to analyze
        const filteredData = data.map((item: any) => {
          const filtered: any = {
            symbol: item.symbol,
            date: item.date,
            period: item.period,
            fiscalYear: item.fiscalYear
          }
          fields.forEach(field => {
            if (item[field] !== undefined) {
              filtered[field] = item[field]
            }
          })
          return filtered
        })
        
        return {
          success: true,
          symbol: ticker,
          dataPoints: data.length,
          fields: fields,
          rawData: filteredData,  // 原始数据供分析
          formattedData: textLines.join('\n'),  // 文本摘要（使用原始数值）
          displayAction: `Fetching ${ticker} financials`,
          displayResult: `Retrieved income statement for ${ticker.toUpperCase()}`  // 简短信息给前端
        }
      }
      
      // Multiple symbols - format data for comparison
      const allFormattedData: string[] = []
      const allRawData: Record<string, any> = {}
      
      // Process each successful result
      for (const { symbol: ticker, data } of successful) {
        if (!data || data.length === 0) continue
        
        // Store raw data for each symbol
        allRawData[ticker] = data.map((item: any) => {
          const filtered: any = {
            symbol: item.symbol,
            date: item.date,
            period: item.period,
            fiscalYear: item.fiscalYear
          }
          fields.forEach(field => {
            if (item[field] !== undefined) {
              filtered[field] = item[field]
            }
          })
          return filtered
        })
        
        // Show latest period data with raw values
        allFormattedData.push(`**${ticker.toUpperCase()}**`)
        const latest = data[0]
        allFormattedData.push(`${latest.period} ${latest.fiscalYear} (${latest.date}):`)
        
        fields.forEach(field => {
          if (latest[field] !== undefined && latest[field] !== null) {
            const metadata = fieldMetadata.find(f => f.field === field)
            const displayName = metadata?.name || field
            allFormattedData.push(`  ${displayName}: ${latest[field]}`) // 原始数值
          }
        })
        allFormattedData.push('')
      }
      
      // Create display summary for multiple symbols
      const symbolsDisplay = successful.map(s => s.symbol).join(', ')
      const failedDisplay = failed.length > 0 ? ` (${failed.length} failed)` : ''
      
      return {
        success: true,
        symbols: symbols,
        successfulSymbols: successful.map(s => s.symbol),
        failedSymbols: failed.map(f => ({ symbol: f.symbol, error: f.error })),
        dataPoints: successful[0]?.data?.length || 0,
        fields: fields,
        rawData: allRawData,  // 原始数据
        formattedData: allFormattedData.join('\n'),  // 文本摘要（使用原始数值）
        instruction: `Here is the income statement data for ${symbolsDisplay}. Please analyze and compare based on the user's question.`,
        // User-friendly display fields
        displayAction: `Fetching financials for ${symbolsDisplay}`,
        displayResult: `Retrieved data for ${successful.length} symbols${failedDisplay}`
      }
    } catch (error) {
      console.error('Error fetching income statement:', error)
      return {
        success: false,
        message: `Failed to fetch income statement: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }
})

// Tool for discovering what fields to use
export const findIncomeStatementFields = tool({
  description: 'Search for income statement field names based on user query. Use this before getIncomeStatement to identify the correct field names.',
  inputSchema: z.object({
    query: z.string().describe('What the user is looking for (e.g., "revenue", "profit margin", "研发费用")')
  }),
  execute: async ({ query }) => {
    // Search for matching fields
    const matches = await fieldSearch.searchFields(query, 5)
    
    if (matches.length === 0) {
      return {
        success: false,
        message: `No matching fields found for "${query}"`
      }
    }
    
    // Format the results with enhanced metadata
    const formatted = matches.map(field => ({
      field: field.field,
      name: field.name,
      description: field.description,
      category: field.category,
      tool: field.tool,
      statement: field.statement
    }))
    
    // Create display summary
    const topFieldNames = matches.slice(0, 5).map(f => f.name).join(', ')
    
    return {
      success: true,
      query,
      matches: formatted,
      instruction: `Found ${matches.length} matching fields. The most relevant is "${matches[0].field}" (${matches[0].name}).`,
      // User-friendly display fields
      displayAction: 'Searching income statement fields',
      displayResult: `Found: ${topFieldNames}`
    }
  }
})