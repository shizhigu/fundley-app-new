import { tool } from 'ai';
import { z } from 'zod';
import { safeExecute } from '../tool-wrapper';

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
    return safeExecute(async () => {
      // This will be handled by inline implementation in the API route with Convex client access
      // Return a placeholder indicating the tool was called correctly
      return `🔍 Searching metrics with parameters: ${JSON.stringify(params, null, 2)}`;
    });
  }
});

// 2. Calculate metric using secure metric ID
export const calculateMetric = tool({
  description: 'Calculate financial metrics for specified companies using predefined or custom metric definitions. Supports both current and historical time point analysis.',
  inputSchema: z.object({
    metricId: z.string().optional().describe('Single metric ID (legacy support)'),
    metricIds: z.array(z.string()).optional().describe('Multiple metric IDs for batch calculation'),
    symbols: z.array(z.string()).describe('Stock ticker symbols (e.g., ["AAPL", "MSFT", "GOOGL"])'),
    periods: z.number().optional().default(4).describe('Number of historical periods to retrieve (1-25). Default 4 gets last 4 quarters'),
    periodType: z.enum(['quarter', 'annual']).optional().default('quarter').describe('Type of periods to analyze'),
    asOf: z.string().optional().describe('Latest time point for historical analysis. Format: "YYYY-QN" (e.g., "2025-Q3"). If omitted, uses most recent data available'),
    analysisType: z.enum(['single', 'historical', 'trend']).optional().default('single').describe('single: latest value only, historical: multiple time points, trend: time series analysis')
  }).refine(
    (data) => data.metricId || data.metricIds,
    "Either metricId or metricIds must be provided"
  ),
  execute: async (params) => {
    return safeExecute(async () => {
      // This will be handled by inline implementation in the API route
      const timePoint = params.asOf ? ` as of ${params.asOf}` : ' (latest)';
      return `📊 Calculating metric ${params.metricId} for ${params.symbols.join(', ')}${timePoint}`;
    });
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
    return safeExecute(async () => {
      // This will be handled by inline implementation in the API route
      return `✅ Creating custom metric "${params.name}" with category ${params.category}`;
    });
  }
});