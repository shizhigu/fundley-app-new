import { tool } from 'ai';
import { z } from 'zod';

/**
 * Financial metrics tools - fully integrated with Convex database
 * These tools provide secure metric management without exposing SQL details
 */

// 1. Search available metrics (built-in + custom)
export const searchMetrics = tool({
  description: 'Search for available financial metrics (both built-in and custom)',
  inputSchema: z.object({
    query: z.string().optional().describe('Search keywords for metric name or description'),
    category: z.string().optional().describe('Filter by metric category (profitability, liquidity, efficiency, etc.)'),
    includeCustom: z.boolean().default(true).describe('Whether to include user-created custom metrics'),
    includeBuiltIn: z.boolean().default(true).describe('Whether to include built-in metrics')
  }),
  execute: async (params) => {
    // This will be handled by inline implementation in the API route with Convex client access
    // Return a placeholder indicating the tool was called correctly
    return `🔍 Searching metrics with parameters: ${JSON.stringify(params, null, 2)}`;
  }
});

// 2. Calculate metric using secure metric ID
export const calculateMetric = tool({
  description: 'Calculate financial metrics for specified companies using predefined or custom metric definitions',
  inputSchema: z.object({
    metricId: z.string().describe('ID of the metric to calculate (from searchMetrics results)'),
    symbols: z.array(z.string()).describe('Stock ticker symbols (e.g., ["AAPL", "MSFT", "GOOGL"])'),
    periods: z.number().optional().default(4).describe('Number of periods to retrieve (quarters or years)'),
    periodType: z.enum(['quarter', 'annual']).optional().default('quarter').describe('Type of periods to analyze')
  }),
  execute: async (params) => {
    // This will be handled by inline implementation in the API route
    return `📊 Calculating metric ${params.metricId} for ${params.symbols.join(', ')} over ${params.periods} ${params.periodType}s`;
  }
});

// 3. Create custom metric
export const createCustomMetric = tool({
  description: 'Create a new custom financial metric with formula and calculation logic',
  inputSchema: z.object({
    name: z.string().describe('Display name of the metric (e.g. "Alpha-1", "Custom ROI")'),
    description: z.string().describe('What this metric measures and its business purpose'),
    category: z.string().describe('Metric category: profitability, liquidity, efficiency, leverage, growth, valuation'),
    formula: z.string().describe('Human-readable formula description (e.g. "EPS divided by Revenue")'),
    sqlTemplate: z.string().describe('SQL query template using {{symbol}}, {{period}} placeholders'),
    calculationType: z.enum(['single_period', 'ttm', 'multi_period']).default('ttm').describe('How to calculate across time periods'),
    isPublic: z.boolean().default(false).describe('Whether other users can see and use this metric')
  }),
  execute: async (params) => {
    // This will be handled by inline implementation in the API route
    return `✅ Creating custom metric "${params.name}" with category ${params.category}`;
  }
});