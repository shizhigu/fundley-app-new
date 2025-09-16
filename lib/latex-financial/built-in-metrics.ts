/**
 * Built-in LaTeX Financial Metrics Templates
 * 预定义的高质量LaTeX财务指标模板
 */

import type { BuiltInMetricTemplate } from './types';

/**
 * 内置LaTeX指标模板
 */
export const BUILTIN_LATEX_METRICS: BuiltInMetricTemplate[] = [
  // 1. 基础盈利能力指标
  {
    id: 'roe_basic',
    name: 'Return on Equity (ROE)',
    latexFormula: String.raw`ROE = \frac{NetIncome}{ShareholderEquity}`,
    variableMapping: {
      'NetIncome': { table: 'income_statement', field: 'netincome' },
      'ShareholderEquity': { table: 'balance_sheet', field: 'totalstockholdersequity' }
    },
    category: 'profitability',
    description: 'Measures profitability relative to shareholders equity',
  },

  {
    id: 'roa_basic',
    name: 'Return on Assets (ROA)',
    latexFormula: String.raw`ROA = \frac{NetIncome}{TotalAssets}`,
    variableMapping: {
      'NetIncome': { table: 'income_statement', field: 'netincome' },
      'TotalAssets': { table: 'balance_sheet', field: 'totalassets' }
    },
    category: 'profitability',
    description: 'Measures how efficiently assets generate profits',
  },

  {
    id: 'gross_margin',
    name: 'Gross Profit Margin',
    latexFormula: String.raw`GrossMargin = \frac{Revenue - COGS}{Revenue} \times 100`,
    variableMapping: {
      'Revenue': { table: 'income_statement', field: 'revenue' },
      'COGS': { table: 'income_statement', field: 'costofrevenue' }
    },
    category: 'profitability',
    description: 'Percentage of revenue retained after direct costs',
    sqlFormula: `((grossprofit / NULLIF(revenue, 0)) * 100)::NUMERIC AS gross_profit_margin`
  },

  // 2. 高级ROCE（您的复杂示例）
  {
    id: 'roce_advanced',
    name: 'ROCE (Advanced - Average Capital)',
    latexFormula: String.raw`ROCE = \frac{EBIT}{\frac{Assets_t + Assets_{t-1}}{2} - \frac{Liab_t + Liab_{t-1}}{2}}`,
    variableMapping: {
      'EBIT': { table: 'income_statement', field: 'ebit' },
      'Assets_t': { table: 'balance_sheet', field: 'totalassets' },
      'Assets_{t-1}': { table: 'balance_sheet', field: 'totalassets' },
      'Liab_t': { table: 'balance_sheet', field: 'totalcurrentliabilities' },
      'Liab_{t-1}': { table: 'balance_sheet', field: 'totalcurrentliabilities' }
    },
    category: 'profitability',
    description: 'EBIT divided by average capital employed (current + previous period average)',
    sqlFormula: `(ebit*100 / NULLIF(((totalassets + LAG(totalassets, 1) OVER (PARTITION BY symbol ORDER BY fiscalyear, period)) / 2.0) - ((totalcurrentliabilities + LAG(totalcurrentliabilities, 1) OVER (PARTITION BY symbol ORDER BY fiscalyear, period)) / 2.0), 0))::NUMERIC AS roce_value`
  },

  // 3. 流动性指标
  {
    id: 'current_ratio',
    name: 'Current Ratio',
    latexFormula: String.raw`CurrentRatio = \frac{CurrentAssets}{CurrentLiabilities}`,
    variableMapping: {
      'CurrentAssets': { table: 'balance_sheet', field: 'totalcurrentassets' },
      'CurrentLiabilities': { table: 'balance_sheet', field: 'totalcurrentliabilities' }
    },
    category: 'liquidity',
    description: 'Measures ability to pay short-term obligations',
  },

  {
    id: 'quick_ratio',
    name: 'Quick Ratio (Acid Test)',
    latexFormula: String.raw`QuickRatio = \frac{CurrentAssets - Inventory}{CurrentLiabilities}`,
    variableMapping: {
      'CurrentAssets': { table: 'balance_sheet', field: 'totalcurrentassets' },
      'Inventory': { table: 'balance_sheet', field: 'inventory' },
      'CurrentLiabilities': { table: 'balance_sheet', field: 'totalcurrentliabilities' }
    },
    category: 'liquidity',
    description: 'More conservative liquidity measure excluding inventory',
  },

  // 4. 杠杆比率
  {
    id: 'debt_to_equity',
    name: 'Debt-to-Equity Ratio',
    latexFormula: String.raw`DebtToEquity = \frac{TotalDebt}{ShareholderEquity}`,
    variableMapping: {
      'TotalDebt': { table: 'balance_sheet', field: 'totaldebt' },
      'ShareholderEquity': { table: 'balance_sheet', field: 'totalstockholdersequity' }
    },
    category: 'leverage',
    description: 'Measures financial leverage and capital structure',
  },

  {
    id: 'debt_to_assets',
    name: 'Debt-to-Assets Ratio', 
    latexFormula: String.raw`DebtToAssets = \frac{TotalDebt}{TotalAssets}`,
    variableMapping: {
      'TotalDebt': { table: 'balance_sheet', field: 'totaldebt' },
      'TotalAssets': { table: 'balance_sheet', field: 'totalassets' }
    },
    category: 'leverage',
    description: 'Percentage of assets financed by debt',
  },

  // 5. 效率指标
  {
    id: 'asset_turnover',
    name: 'Asset Turnover Ratio',
    latexFormula: String.raw`AssetTurnover = \frac{Revenue}{TotalAssets}`,
    variableMapping: {
      'Revenue': { table: 'income_statement', field: 'revenue' },
      'TotalAssets': { table: 'balance_sheet', field: 'totalassets' }
    },
    category: 'efficiency',
    description: 'Measures how efficiently assets generate revenue',
  },

  {
    id: 'inventory_turnover',
    name: 'Inventory Turnover',
    latexFormula: String.raw`InventoryTurnover = \frac{COGS}{Inventory}`,
    variableMapping: {
      'COGS': { table: 'income_statement', field: 'costofrevenue' },
      'Inventory': { table: 'balance_sheet', field: 'inventory' }
    },
    category: 'efficiency',
    description: 'How quickly inventory is sold and replaced',
  },

  // 6. 时间序列指标
  {
    id: 'revenue_growth_yoy',
    name: 'Year-over-Year Revenue Growth',
    latexFormula: String.raw`RevenueGrowth = \frac{Revenue_t - Revenue_{t-4}}{Revenue_{t-4}} \times 100`,
    variableMapping: {
      'Revenue_t': { table: 'income_statement', field: 'revenue' },
      'Revenue_{t-4}': { table: 'income_statement', field: 'revenue' }
    },
    category: 'growth',
    description: 'Year-over-year percentage change in revenue',
  },

  {
    id: 'rolling_roe',
    name: 'Rolling 4-Quarter ROE',
    latexFormula: String.raw`RollingROE = \overline{ROE_{t-3:t}}`,
    variableMapping: {
      'ROE': { table: 'income_statement', field: 'netincome' }, // 需要计算ROE然后滚动
      'Equity': { table: 'balance_sheet', field: 'totalstockholdersequity' }
    },
    category: 'profitability',
    description: 'Four-quarter rolling average of Return on Equity',
  },

  // 7. 现金流指标
  {
    id: 'operating_cash_margin',
    name: 'Operating Cash Flow Margin',
    latexFormula: String.raw`OCFMargin = \frac{OperatingCashFlow}{Revenue} \times 100`,
    variableMapping: {
      'OperatingCashFlow': { table: 'cash_flow_statement', field: 'operatingcashflow' },
      'Revenue': { table: 'income_statement', field: 'revenue' }
    },
    category: 'cash_flow',
    description: 'Operating cash flow as percentage of revenue',
  },

  {
    id: 'free_cash_flow_yield',
    name: 'Free Cash Flow Yield',
    latexFormula: String.raw`FCFYield = \frac{FreeCashFlow}{MarketCap} \times 100`,
    variableMapping: {
      'FreeCashFlow': { table: 'cash_flow_statement', field: 'freecashflow' },
      'MarketCap': { table: 'balance_sheet', field: 'totalassets' } // 简化，实际需要市值数据
    },
    category: 'valuation',
    description: 'Free cash flow relative to market capitalization',
  }
];

/**
 * 根据分类获取内置指标
 */
export function getMetricsByCategory(category: string): BuiltInMetricTemplate[] {
  return BUILTIN_LATEX_METRICS.filter(metric => metric.category === category);
}

/**
 * 根据复杂度获取内置指标
 */
// 移除complexity相关函数，保持简单灵活

/**
 * 获取所有分类
 */
export function getAllCategories(): string[] {
  const categories = new Set(BUILTIN_LATEX_METRICS.map(m => m.category));
  return Array.from(categories).sort();
}

/**
 * 根据ID获取内置指标
 */
export function getMetricById(id: string): BuiltInMetricTemplate | undefined {
  return BUILTIN_LATEX_METRICS.find(metric => metric.id === id);
}