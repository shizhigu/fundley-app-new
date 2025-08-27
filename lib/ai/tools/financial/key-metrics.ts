import { tool } from 'ai';
import { z } from 'zod';
import { fmpClient } from '../../../fmp/client';
import { keyMetricsFields } from '../../../fmp/key-metrics-fields';
import { fieldSearch } from '../../../fmp/field-search';


export const getKeyMetrics = tool({
  description: `Get key financial metrics for companies including valuation, return, cash flow, and working capital metrics. 
  REQUIRED PARAMETERS:
  1. symbols: You MUST provide an array of stock ticker symbols (e.g., ["AAPL"], ["AAPL", "MSFT", "GOOGL"])
  2. fields: You MUST provide specific field names from findKeyMetricsFields results
  
  IMPORTANT: Always call findKeyMetricsFields FIRST to get the correct field names, then use those exact field names in the 'fields' parameter.
  Never call this tool without both symbols AND fields parameters.`,
  
  inputSchema: z.object({
    symbols: z.array(z.string()).min(1, 'At least one stock symbol is required').describe('REQUIRED: Stock ticker symbols as array (e.g., ["AAPL"], ["AAPL", "GOOGL", "MSFT"])'),
    fields: z.array(z.string()).optional().describe('Specific key metrics fields to retrieve. If not specified, will return comprehensive metrics.'),
    period: z.enum(['annual', 'quarter']).optional().default('annual').describe('Annual or quarterly data'),
    limit: z.number().optional().default(1).describe('Number of periods to retrieve (1-5)')
  }),
  execute: async ({ symbols, fields = [], period = 'annual', limit = 1 }) => {
    try {
      // Validate required parameters
      if (!symbols || symbols.length === 0) {
        return {
          success: false,
          message: 'ERROR: No stock symbols provided. You MUST provide symbols array parameter with stock ticker(s) like ["AAPL", "MSFT"].'
        }
      }
      
      console.log(`📊 Fetching key metrics for ${symbols.join(', ')} (${period}, limit: ${limit})`);
      
      // Fetch data for all symbols in parallel
      const allResults = await Promise.all(
        symbols.map(async (ticker) => {
          try {
            const data = await fmpClient.getKeyMetrics(ticker, period, limit);
            return { symbol: ticker, data, error: null };
          } catch (error) {
            console.error(`Error fetching key metrics for ${ticker}:`, error);
            return { symbol: ticker, data: null, error: error instanceof Error ? error.message : 'Unknown error' };
          }
        })
      );
      
      // Separate successful and failed results
      const successful = allResults.filter(r => r.data && Array.isArray(r.data) && r.data.length > 0);
      const failed = allResults.filter(r => r.error !== null);
      
      if (successful.length === 0) {
        return {
          success: false,
          message: `Failed to fetch data for all symbols: ${failed.map(f => `${f.symbol}: ${f.error}`).join(', ')}`
        }
      }
      
      // If no specific fields requested, use a comprehensive set
      let fieldsToShow = fields;
      if (!fields || fields.length === 0) {
        fieldsToShow = [
          'marketCap',
          'enterpriseValue',
          'evToSales',
          'evToEBITDA',
          'returnOnEquity',
          'returnOnAssets',
          'returnOnInvestedCapital',
          'freeCashFlowYield',
          'currentRatio',
          'workingCapital',
          'cashConversionCycle',
          'netDebtToEBITDA'
        ];
      }
      
      // If single symbol, return simple format
      if (symbols.length === 1 && successful.length === 1) {
        const { symbol: ticker, data } = successful[0]
        
        // Build text summary with raw values (no formatting)
        const textLines = []
        textLines.push(`Key Metrics for ${ticker.toUpperCase()}`)
        
        // Show data for each period
        data.forEach((periodData: any, index: number) => {
          if (index < 5) { // Limit to first 5 periods for text summary
            textLines.push(`\n${periodData.period} ${periodData.fiscalYear} (${periodData.date}):`)
            fieldsToShow.forEach(field => {
              if (periodData[field] !== undefined && periodData[field] !== null) {
                const fieldMeta = keyMetricsFields.find(f => f.field === field);
                const displayName = fieldMeta?.displayName || field;
                textLines.push(`  ${displayName}: ${periodData[field]}`); // 原始数值，不加格式
              }
            });
          }
        });
        
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
          };
          fieldsToShow.forEach(field => {
            if (item[field] !== undefined) {
              filtered[field] = item[field];
            }
          });
          return filtered;
        });
        
        return {
          success: true,
          rawData: filteredData,  // 原始数据供分析
          formattedData: textLines.join('\n'),  // 文本摘要（使用原始数值）
          symbol: ticker.toUpperCase(),
          period,
          fieldsReturned: fieldsToShow.length,
          recordsCount: data.length,
          displayAction: 'show_key_metrics',
          displayResult: `Retrieved key metrics for ${ticker.toUpperCase()}`  // 简短信息给前端
        };
      }
      
      // Multiple symbols - format data for comparison
      const allFormattedData = []
      const allRawData: any = {}
      
      for (const { symbol: ticker, data } of successful) {
        allFormattedData.push(`**${ticker.toUpperCase()}**`)
        
        // Store raw data for each symbol
        allRawData[ticker] = data.map((item: any) => {
          const filtered: any = {
            symbol: item.symbol,
            date: item.date,
            period: item.period,
            fiscalYear: item.fiscalYear
          };
          fieldsToShow.forEach(field => {
            if (item[field] !== undefined) {
              filtered[field] = item[field];
            }
          });
          return filtered;
        });
        
        // Show latest period data with raw values
        if (data.length > 0) {
          const latest = data[0]
          allFormattedData.push(`${latest.period} ${latest.fiscalYear} (${latest.date}):`)
          
          fieldsToShow.forEach(field => {
            if (latest[field] !== undefined && latest[field] !== null) {
              const fieldMeta = keyMetricsFields.find(f => f.field === field);
              const displayName = fieldMeta?.displayName || field;
              allFormattedData.push(`  ${displayName}: ${latest[field]}`); // 原始数值
            }
          })
        }
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
        fields: fieldsToShow,
        rawData: allRawData,  // 原始数据
        formattedData: allFormattedData.join('\n'),  // 文本摘要（使用原始数值）
        displayAction: 'compare_key_metrics',
        displayResult: `Retrieved key metrics for ${successful.length} symbols${failedDisplay}`
      };
      
    } catch (error) {
      console.error('Key metrics fetch error:', error);
      
      const symbolDisplay = symbols?.length > 0 ? symbols.join(', ').toUpperCase() : '[MISSING SYMBOLS]';
      
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch key metrics data',
        symbols: symbols || [],
        displayAction: 'error_key_metrics',
        displayResult: `Error fetching key metrics for ${symbolDisplay}: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
});

export const findKeyMetricsFields = tool({
  description: 'Search and discover available key metrics fields using natural language queries. Supports both English and Chinese queries.',
  inputSchema: z.object({
    query: z.string().describe('Natural language query to find relevant key metrics fields (e.g., "profitability ratios", "debt metrics", "现金流指标")'),
    limit: z.number().optional().default(10).describe('Maximum number of fields to return')
  }),
  execute: async ({ query, limit = 10 }) => {
    try {
      console.log(`🔍 Searching key metrics fields for: "${query}"`);
      
      // Search for relevant fields
      const results = await fieldSearch.searchFields(query, limit);
      
      // Filter to only Key Metrics fields
      const keyMetricsResults = results.filter(field => field.tool === 'getKeyMetrics');
      
      if (keyMetricsResults.length === 0) {
        return {
          success: true,
          query,
          fieldsFound: 0,
          results: [],
          displayAction: 'search_key_metrics_fields',
          displayResult: `No key metrics fields found matching "${query}". Try terms like "valuation", "profitability", "cash flow", or "debt ratios".`
        };
      }
      
      // Format results for display
      const displayLines = [];
      displayLines.push(`**Found ${keyMetricsResults.length} Key Metrics Fields for "${query}":**\n`);
      
      // Group by category
      const byCategory: Record<string, any[]> = {};
      keyMetricsResults.forEach(result => {
        const category = result.category || 'Other';
        if (!byCategory[category]) byCategory[category] = [];
        byCategory[category].push(result);
      });
      
      Object.entries(byCategory).forEach(([category, fields]) => {
        displayLines.push(`**${category}:**`);
        fields.forEach(field => {
          displayLines.push(`• **${field.field}** - ${field.name}`);
          displayLines.push(`  ${field.description}`);
          if (field.unit) {
            displayLines.push(`  *Unit: ${field.unit}*`);
          }
        });
        displayLines.push('');
      });
      
      displayLines.push(`💡 Use these field names with getKeyMetrics tool: \`${keyMetricsResults.map(r => r.field).join('`, `')}\``);
      
      return {
        success: true,
        query,
        fieldsFound: keyMetricsResults.length,
        results: keyMetricsResults.map(r => ({
          field: r.field,
          displayName: r.name,
          description: r.description,
          category: r.category,
          unit: r.unit
        })),
        displayAction: 'show_key_metrics_fields',
        displayResult: displayLines.join('\n')
      };
      
    } catch (error) {
      console.error('Key metrics field search error:', error);
      
      return {
        success: false,
        query,
        message: error instanceof Error ? error.message : 'Failed to search key metrics fields',
        displayAction: 'error_search_key_metrics_fields',
        displayResult: `Error searching key metrics fields: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
});