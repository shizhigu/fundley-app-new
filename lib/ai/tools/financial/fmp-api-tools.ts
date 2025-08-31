import { tool } from 'ai';
import { z } from 'zod';
import { fmpClient } from '@/lib/fmp/client';

/**
 * 纯API工具集合 - 无LLM逻辑，只执行API调用返回原始数据
 * 这些工具由 Data Orchestrator Agent 调用
 */

// 13F机构持股工具
export const get13FFilings = tool({
  description: 'Get Form 13F institutional holdings data from FMP API',
  inputSchema: z.object({
    cik: z.string().optional().describe('CIK of specific institution'),
    date: z.string().optional().describe('Filing date (YYYY-MM-DD)'),
    symbol: z.string().optional().describe('Stock symbol to filter'),
    limit: z.number().optional().default(100).describe('Number of records to return')
  }),
  execute: async ({ cik, date, symbol, limit = 100 }) => {
    try {
      console.log(`📋 Fetching 13F data: CIK=${cik}, date=${date}, symbol=${symbol}`);
      
      let data = [];
      
      if (cik) {
        // 特定机构的13F持股
        data = await fmpClient.get('/institutional-holder', {
          symbol: symbol || 'AAPL',
          includeCurrentQuarter: true
        });
      } else {
        // 获取最新13F文件列表
        data = await fmpClient.get('/form-thirteen', { limit });
        
        // 如果指定了symbol，过滤相关持股
        if (symbol && data && data.length > 0) {
          const filteredData = data.filter((filing: any) => 
            filing.stocks && filing.stocks.some((stock: any) => 
              stock.nameOfIssuer?.toLowerCase().includes(symbol.toLowerCase()) ||
              stock.cusip === symbol
            )
          );
          data = filteredData;
        }
      }
      
      return {
        success: true,
        endpoint: '/form-thirteen',
        recordCount: data?.length || 0,
        data: data || [],
        metadata: {
          cik,
          date,
          symbol,
          timestamp: new Date().toISOString()
        }
      };
      
    } catch (error: any) {
      console.error('❌ 13F API Error:', error);
      return {
        success: false,
        endpoint: '/form-thirteen',
        error: error.message,
        data: [],
        recordCount: 0
      };
    }
  }
});

// 机构持股分析工具
export const getInstitutionalHoldings = tool({
  description: 'Get institutional ownership data for specific stocks from FMP API',
  inputSchema: z.object({
    symbols: z.array(z.string()).describe('Array of stock symbols'),
    includeCurrentQuarter: z.boolean().optional().default(true).describe('Include current quarter data'),
    limit: z.number().optional().default(50).describe('Limit per symbol')
  }),
  execute: async ({ symbols, includeCurrentQuarter = true, limit = 50 }) => {
    try {
      console.log(`🏢 Fetching institutional holdings for: ${symbols.join(', ')}`);
      
      const results = [];
      
      for (const symbol of symbols.slice(0, 10)) { // 限制并发
        try {
          const data = await fmpClient.get(`/institutional-holder/${symbol.toUpperCase()}`, {
            includeCurrentQuarter
          });
          
          if (data && data.length > 0) {
            results.push({
              symbol: symbol.toUpperCase(),
              holdings: data.slice(0, limit),
              totalInstitutions: data.length,
              timestamp: new Date().toISOString()
            });
          }
        } catch (symbolError) {
          console.warn(`Failed to fetch holdings for ${symbol}:`, symbolError);
          results.push({
            symbol: symbol.toUpperCase(),
            holdings: [],
            totalInstitutions: 0,
            error: (symbolError as Error).message
          });
        }
      }
      
      return {
        success: true,
        endpoint: '/institutional-holder',
        recordCount: results.reduce((sum, r) => sum + r.holdings?.length || 0, 0),
        data: results,
        metadata: {
          symbols: symbols.slice(0, 10),
          includeCurrentQuarter,
          timestamp: new Date().toISOString()
        }
      };
      
    } catch (error: any) {
      console.error('❌ Institutional Holdings API Error:', error);
      return {
        success: false,
        endpoint: '/institutional-holder',
        error: error.message,
        data: [],
        recordCount: 0
      };
    }
  }
});

// 导出工具映射
export const fmpApiTools = {
  get13FFilings,
  getInstitutionalHoldings
} as const;