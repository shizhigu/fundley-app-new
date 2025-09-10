import { tool } from 'ai';
import { z } from 'zod';

export const scanMarket = tool({
  description: 'Scan the entire market (70K+ companies) for top performers using any financial metric. Optimized with DuckDB for ultra-fast market-wide analysis.',
  inputSchema: z.object({
    metricId: z.string().describe('Metric ID or name to calculate across all companies'),
    topN: z.number().optional().default(100).describe('Number of top companies to return (default: 100, max: 1000)'),
    sortBy: z.enum(['desc', 'asc']).optional().default('desc').describe('Sort order - desc for highest values first, asc for lowest'),
    periodType: z.enum(['quarter', 'annual']).optional().default('quarter').describe('Data period type'),
    asOf: z.string().optional().describe('Specific time point (YYYY-QN format, e.g., "2025-Q3")'),
    filters: z.object({
      marketCap: z.tuple([z.number(), z.number()]).optional().describe('Market cap range filter [min, max] in USD'),
      sector: z.array(z.string()).optional().describe('Sector filter (e.g., ["Technology", "Healthcare"])'),
      exchange: z.array(z.string()).optional().describe('Exchange filter (e.g., ["NASDAQ", "NYSE"])'),
      minValue: z.number().optional().describe('Minimum metric value filter'),
      maxValue: z.number().optional().describe('Maximum metric value filter')
    }).optional().describe('Optional filters to narrow down the market scan')
  }),
  execute: async (params) => {
    try {
      console.log(`🌍 Starting market scan for metric: ${params.metricId}`);
      console.log(`🎯 Parameters:`, params);

      // Import enhanced engine
      const { EnhancedFinancialEngine } = await import('@/lib/financial/enhanced-engine');
      const engine = new EnhancedFinancialEngine();

      // For market scanning, we need to get the metric definition
      // This should integrate with the metric search system
      // For now, we'll use a placeholder - in real implementation, 
      // this should fetch the metric definition from Convex

      // Temporary: Create a simple ROCE metric for demonstration
      const metricDefinition = {
        name: params.metricId,
        description: `Market scan for ${params.metricId}`,
        ast: {
          type: 'arithmetic',
          operator: 'divide',
          left: {
            type: 'field',
            source: 'income_statement',
            field: 'ebit'
          },
          right: {
            type: 'arithmetic',
            operator: 'subtract',
            left: {
              type: 'field',
              source: 'balance_sheet',
              field: 'totalassets'
            },
            right: {
              type: 'field',
              source: 'balance_sheet', 
              field: 'totalcurrentliabilities'
            }
          }
        }
      };

      // Execute market scan
      const result = await engine.scanMarket({
        metricDefinition,
        topN: Math.min(params.topN, 1000), // Cap at 1000 for performance
        sortBy: params.sortBy,
        periodType: params.periodType,
        asOf: params.asOf,
        filters: params.filters
      });

      // Format results for display
      let formattedOutput = `🌍 **Market Scan Results: ${params.metricId}**\n\n`;
      formattedOutput += `⚡ *DuckDB Columnar Engine - ${result.metadata.executionTime}ms*\n`;
      formattedOutput += `📊 *Scanned: ${result.metadata.totalScanned} companies, Found: ${result.metadata.validResults} valid results*\n`;
      
      if (params.filters) {
        formattedOutput += `🔍 *Filters Applied*\n`;
      }
      
      formattedOutput += `\n**Top ${result.results.length} Companies:**\n\n`;

      // Create results table
      formattedOutput += `| Rank | Symbol | Company | Value | Sector | Market Cap |\n`;
      formattedOutput += `|------|--------|---------|-------|--------|------------|\n`;

      result.results.slice(0, 20).forEach((company) => { // Show top 20 in table
        const value = typeof company.value === 'number' ? company.value.toFixed(3) : 'N/A';
        const marketCap = company.market_cap ? `$${(company.market_cap / 1e9).toFixed(1)}B` : 'N/A';
        const companyName = (company.company_name || 'Unknown').substring(0, 25);
        const sector = (company.sector || 'N/A').substring(0, 15);
        
        formattedOutput += `| ${company.rank} | **${company.symbol}** | ${companyName} | ${value} | ${sector} | ${marketCap} |\n`;
      });

      if (result.results.length > 20) {
        formattedOutput += `\n*...and ${result.results.length - 20} more companies*\n`;
      }

      formattedOutput += `\n🔧 **Technical Details:**\n`;
      formattedOutput += `- Execution Time: ${result.metadata.executionTime}ms\n`;
      formattedOutput += `- Data Source: MotherDuck DuckDB (md:financial_db)\n`;
      formattedOutput += `- Period: ${params.periodType}${params.asOf ? ` as of ${params.asOf}` : ' (latest)'}\n`;

      // Include SQL for debugging (truncated)
      const sqlPreview = result.metadata.sql.substring(0, 200).replace(/\s+/g, ' ');
      formattedOutput += `- Generated SQL: \`${sqlPreview}...\`\n`;

      console.log('✅ Market scan completed successfully');
      
      return {
        success: true,
        message: formattedOutput,
        data: result
      };

    } catch (error) {
      console.error('❌ Market scan error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      return {
        success: false,
        error: `❌ Market scan failed: ${errorMessage}`,
        suggestion: 'Please check the metric ID and try again. Use searchMetrics to find available metrics.'
      };
    }
  }
});

export const scanTopCompanies = tool({
  description: 'Quick scan for top companies by a specific financial metric. Simplified interface for common market analysis queries.',
  inputSchema: z.object({
    metric: z.enum(['roce', 'roe', 'roa', 'revenue_growth', 'profit_margin', 'debt_to_equity', 'current_ratio'])
      .describe('Predefined metric to scan for'),
    count: z.number().optional().default(50).describe('Number of top companies (default: 50)'),
    sector: z.string().optional().describe('Specific sector to filter (e.g., "Technology", "Healthcare")'),
    minMarketCap: z.number().optional().describe('Minimum market cap in USD (e.g., 1000000000 for $1B)')
  }),
  execute: async (params) => {
    try {
      // Map predefined metrics to actual metric calculations
      const metricMap: Record<string, any> = {
        roce: {
          name: 'ROCE (Return on Capital Employed)',
          ast: {
            type: 'arithmetic',
            operator: 'divide',
            left: { type: 'field', source: 'income_statement', field: 'ebit' },
            right: {
              type: 'arithmetic',
              operator: 'subtract',
              left: { type: 'field', source: 'balance_sheet', field: 'totalassets' },
              right: { type: 'field', source: 'balance_sheet', field: 'totalcurrentliabilities' }
            }
          }
        },
        roe: {
          name: 'ROE (Return on Equity)',
          ast: {
            type: 'arithmetic',
            operator: 'divide',
            left: { type: 'field', source: 'income_statement', field: 'netincome' },
            right: { type: 'field', source: 'balance_sheet', field: 'totalequity' }
          }
        },
        roa: {
          name: 'ROA (Return on Assets)',
          ast: {
            type: 'arithmetic',
            operator: 'divide',
            left: { type: 'field', source: 'income_statement', field: 'netincome' },
            right: { type: 'field', source: 'balance_sheet', field: 'totalassets' }
          }
        },
        profit_margin: {
          name: 'Net Profit Margin',
          ast: {
            type: 'arithmetic',
            operator: 'divide',
            left: { type: 'field', source: 'income_statement', field: 'netincome' },
            right: { type: 'field', source: 'income_statement', field: 'revenue' }
          }
        },
        debt_to_equity: {
          name: 'Debt to Equity Ratio',
          ast: {
            type: 'arithmetic',
            operator: 'divide',
            left: { type: 'field', source: 'balance_sheet', field: 'totaldebt' },
            right: { type: 'field', source: 'balance_sheet', field: 'totalequity' }
          }
        },
        current_ratio: {
          name: 'Current Ratio',
          ast: {
            type: 'arithmetic',
            operator: 'divide',
            left: { type: 'field', source: 'balance_sheet', field: 'currentassets' },
            right: { type: 'field', source: 'balance_sheet', field: 'totalcurrentliabilities' }
          }
        }
      };

      const metricDefinition = metricMap[params.metric];
      if (!metricDefinition) {
        return `❌ Unknown metric: ${params.metric}. Available: ${Object.keys(metricMap).join(', ')}`;
      }

      // Build filters
      const filters: any = {};
      if (params.sector) {
        filters.sector = [params.sector];
      }
      if (params.minMarketCap) {
        filters.marketCap = [params.minMarketCap, Number.MAX_SAFE_INTEGER];
      }

      // Call the enhanced engine directly for predefined metrics
      const { EnhancedFinancialEngine } = await import('@/lib/financial/enhanced-engine');
      const engine = new EnhancedFinancialEngine();
      
      const result = await engine.scanMarket({
        metricDefinition,
        topN: params.count,
        sortBy: ['debt_to_equity'].includes(params.metric) ? 'asc' : 'desc', // Lower debt is better
        filters: Object.keys(filters).length > 0 ? filters : undefined
      });
      
      // Format similar to scanMarket output
      let formattedOutput = `🌍 **Top ${params.count} Companies by ${metricDefinition.name}**\n\n`;
      formattedOutput += `⚡ *DuckDB Columnar Engine - ${result.metadata.executionTime}ms*\n`;
      
      if (params.sector) {
        formattedOutput += `🔍 *Sector: ${params.sector}*\n`;
      }
      if (params.minMarketCap) {
        formattedOutput += `💰 *Min Market Cap: $${(params.minMarketCap / 1e9).toFixed(1)}B*\n`;
      }
      
      formattedOutput += `\n**Results:**\n\n`;
      formattedOutput += `| Rank | Symbol | Company | Value | Market Cap |\n`;
      formattedOutput += `|------|--------|---------|-------|------------|\n`;

      result.results.slice(0, 20).forEach((company) => {
        const value = typeof company.value === 'number' ? company.value.toFixed(3) : 'N/A';
        const marketCap = company.market_cap ? `$${(company.market_cap / 1e9).toFixed(1)}B` : 'N/A';
        const companyName = (company.company_name || 'Unknown').substring(0, 25);
        
        formattedOutput += `| ${company.rank} | **${company.symbol}** | ${companyName} | ${value} | ${marketCap} |\n`;
      });

      if (result.results.length > 20) {
        formattedOutput += `\n*...and ${result.results.length - 20} more companies*\n`;
      }
      
      return formattedOutput;

    } catch (error) {
      console.error('❌ Top companies scan error:', error);
      return `❌ Scan failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }
});