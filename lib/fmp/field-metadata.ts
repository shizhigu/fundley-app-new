// Field metadata for income statement and other financial statements
// This will be used for vector search to match user queries to field names

export interface FieldMetadata {
  field: string // Actual field name in API response
  name: string // Human-readable name
  description: string
  category: string
  aliases: string[] // Alternative names users might use
  useCases: string[] // Common use cases and analysis scenarios
  unit?: string // e.g., 'USD', 'percentage', 'ratio'
  tool: string // Tool to call (e.g., 'getIncomeStatement', 'getBalanceSheet')
  statement?: string // Which financial statement (for clarity)
}

export const INCOME_STATEMENT_FIELDS: FieldMetadata[] = [
  // Revenue & Sales
  {
    field: 'revenue',
    name: 'Revenue',
    description: 'Total sales or gross income from business operations',
    category: 'revenue',
    aliases: ['sales', 'total sales', 'gross sales', 'income', 'top line', '营收', '收入', '销售额'],
    useCases: [
      'Calculate year-over-year growth rate',
      'Market share analysis vs competitors',
      'Revenue per employee productivity'
    ],
    unit: 'USD',
    tool: 'getIncomeStatement',
    statement: 'Income Statement'
  },
  {
    field: 'costOfRevenue',
    name: 'Cost of Revenue',
    description: 'Direct costs attributable to the production of goods sold',
    category: 'costs',
    aliases: ['COGS', 'cost of goods sold', 'cost of sales', '营业成本', '销售成本'],
    useCases: [
      'Calculate gross margin efficiency',
      'Supply chain cost analysis',
      'Manufacturing efficiency trends'
    ],
    unit: 'USD',
    tool: 'getIncomeStatement',
    statement: 'Income Statement'
  },
  {
    field: 'grossProfit',
    name: 'Gross Profit',
    description: 'Revenue minus cost of goods sold',
    category: 'profit',
    aliases: ['gross income', 'gross margin', '毛利润', '毛利'],
    useCases: [
      'Pricing power assessment',
      'Product profitability analysis',
      'Competitive advantage evaluation'
    ],
    unit: 'USD',
    tool: 'getIncomeStatement',
    statement: 'Income Statement'
  },
  
  // Operating Expenses
  {
    field: 'researchAndDevelopmentExpenses',
    name: 'R&D Expenses',
    description: 'Costs related to research and development activities',
    category: 'expenses',
    aliases: ['R&D', 'research expenses', 'development costs', '研发费用', '研发支出'],
    useCases: [
      'Innovation investment intensity',
      'R&D as % of revenue for tech companies',
      'Future growth potential indicator'
    ],
    unit: 'USD',
    tool: 'getIncomeStatement',
    statement: 'Income Statement'
  },
  {
    field: 'sellingGeneralAndAdministrativeExpenses',
    name: 'SG&A Expenses',
    description: 'Selling, general and administrative expenses',
    category: 'expenses',
    aliases: ['SG&A', 'operating expenses', 'admin expenses', '销售及管理费用', '运营费用'],
    useCases: [
      'Operating efficiency analysis',
      'Cost structure optimization',
      'SG&A leverage in growth phase'
    ],
    unit: 'USD',
    tool: 'getIncomeStatement',
    statement: 'Income Statement'
  },
  {
    field: 'operatingExpenses',
    name: 'Operating Expenses',
    description: 'Total operating expenses including R&D and SG&A',
    category: 'expenses',
    aliases: ['OPEX', 'total operating expenses', '运营费用', '经营费用'],
    useCases: [
      'Operating leverage calculation',
      'Break-even analysis',
      'Cost reduction targets'
    ],
    unit: 'USD',
    tool: 'getIncomeStatement',
    statement: 'Income Statement'
  },
  
  // Profitability
  {
    field: 'operatingIncome',
    name: 'Operating Income',
    description: 'Profit from business operations before interest and taxes',
    category: 'profit',
    aliases: ['operating profit', 'EBIT', 'operating earnings', '营业利润', '经营利润'],
    useCases: [
      'Core business profitability',
      'Management effectiveness metric',
      'Debt coverage ability'
    ],
    unit: 'USD',
    tool: 'getIncomeStatement',
    statement: 'Income Statement'
  },
  {
    field: 'ebitda',
    name: 'EBITDA',
    description: 'Earnings before interest, taxes, depreciation and amortization',
    category: 'profit',
    aliases: ['EBITDA', 'cash earnings', '息税折旧摊销前利润'],
    useCases: [
      'LBO/PE valuation multiples',
      'Cash generation capability',
      'Cross-industry comparison'
    ],
    unit: 'USD',
    tool: 'getIncomeStatement',
    statement: 'Income Statement'
  },
  {
    field: 'netIncome',
    name: 'Net Income',
    description: 'Final profit after all expenses, taxes and interest',
    category: 'profit',
    aliases: ['net profit', 'bottom line', 'earnings', 'net earnings', '净利润', '净收入'],
    useCases: [
      'Dividend coverage ratio',
      'Return on equity calculation',
      'Earnings quality assessment'
    ],
    unit: 'USD',
    tool: 'getIncomeStatement',
    statement: 'Income Statement'
  },
  
  // Per Share Metrics
  {
    field: 'eps',
    name: 'Earnings Per Share',
    description: 'Net income divided by shares outstanding',
    category: 'per-share',
    aliases: ['EPS', 'basic EPS', '每股收益', '每股盈利'],
    useCases: [
      'P/E ratio calculation',
      'Earnings growth trajectory',
      'Stock valuation baseline'
    ],
    unit: 'USD/share',
    tool: 'getIncomeStatement',
    statement: 'Income Statement'
  },
  {
    field: 'epsDiluted',
    name: 'Diluted EPS',
    description: 'EPS accounting for all convertible securities',
    category: 'per-share',
    aliases: ['diluted earnings per share', '稀释每股收益'],
    useCases: [
      'Stock option impact analysis',
      'Conservative valuation metric',
      'M&A dilution assessment'
    ],
    unit: 'USD/share',
    tool: 'getIncomeStatement',
    statement: 'Income Statement'
  },
  
  // Additional Operating Expenses
  {
    field: 'generalAndAdministrativeExpenses',
    name: 'G&A Expenses',
    description: 'General and administrative expenses',
    category: 'expenses',
    aliases: ['G&A', 'admin costs', '管理费用', '行政费用'],
    useCases: [
      'Overhead cost control',
      'Management efficiency metric',
      'Scale economics analysis'
    ],
    unit: 'USD',
    tool: 'getIncomeStatement',
    statement: 'Income Statement'
  },
  {
    field: 'sellingAndMarketingExpenses',
    name: 'Sales & Marketing',
    description: 'Selling and marketing expenses',
    category: 'expenses',
    aliases: ['marketing costs', 'sales expenses', '销售费用', '营销费用'],
    useCases: [
      'Customer acquisition cost',
      'Marketing ROI calculation',
      'Sales efficiency ratio'
    ],
    unit: 'USD',
    tool: 'getIncomeStatement',
    statement: 'Income Statement'
  },
  {
    field: 'otherExpenses',
    name: 'Other Expenses',
    description: 'Other operating expenses',
    category: 'expenses',
    aliases: ['misc expenses', '其他费用', '其他支出'],
    useCases: [
      'One-time charges identification',
      'Non-recurring expense analysis',
      'Earnings quality check'
    ],
    unit: 'USD',
    tool: 'getIncomeStatement',
    statement: 'Income Statement'
  },
  {
    field: 'costAndExpenses',
    name: 'Total Costs & Expenses',
    description: 'Total costs and expenses',
    category: 'expenses',
    aliases: ['total expenses', '总成本和费用', '总支出'],
    useCases: [
      'Breakeven revenue calculation',
      'Cost structure benchmarking',
      'Operating margin derivation'
    ],
    unit: 'USD',
    tool: 'getIncomeStatement',
    statement: 'Income Statement'
  },
  
  // Interest & Non-Operating
  {
    field: 'netInterestIncome',
    name: 'Net Interest Income',
    description: 'Net interest income (interest income minus interest expense)',
    category: 'non-operating',
    aliases: ['interest income net', '净利息收入'],
    useCases: [
      'Bank profitability analysis',
      'Cash management efficiency',
      'Financial institution comparison'
    ],
    unit: 'USD',
    tool: 'getIncomeStatement',
    statement: 'Income Statement'
  },
  {
    field: 'interestIncome',
    name: 'Interest Income',
    description: 'Income from interest-bearing assets',
    category: 'non-operating',
    aliases: ['interest revenue', '利息收入'],
    useCases: [
      'Cash utilization effectiveness',
      'Treasury management performance',
      'Investment income tracking'
    ],
    unit: 'USD',
    tool: 'getIncomeStatement',
    statement: 'Income Statement'
  },
  {
    field: 'interestExpense',
    name: 'Interest Expense',
    description: 'Cost of borrowed funds',
    category: 'non-operating',
    aliases: ['interest cost', 'borrowing cost', '利息支出', '利息费用'],
    useCases: [
      'Debt service coverage',
      'Leverage cost analysis',
      'Interest coverage ratio'
    ],
    unit: 'USD',
    tool: 'getIncomeStatement',
    statement: 'Income Statement'
  },
  {
    field: 'depreciationAndAmortization',
    name: 'D&A',
    description: 'Depreciation and amortization expenses',
    category: 'expenses',
    aliases: ['depreciation', 'amortization', 'D&A', '折旧和摊销'],
    useCases: [
      'Capex intensity indicator',
      'Cash vs accrual earnings',
      'Asset utilization efficiency'
    ],
    unit: 'USD',
    tool: 'getIncomeStatement',
    statement: 'Income Statement'
  },
  
  // Operating Income variants
  {
    field: 'ebit',
    name: 'EBIT',
    description: 'Earnings before interest and taxes',
    category: 'profit',
    aliases: ['operating profit before interest', '息税前利润'],
    useCases: [
      'Capital structure neutral comparison',
      'Operating performance metric',
      'Interest coverage calculation'
    ],
    unit: 'USD',
    tool: 'getIncomeStatement',
    statement: 'Income Statement'
  },
  {
    field: 'nonOperatingIncomeExcludingInterest',
    name: 'Non-Operating Income',
    description: 'Non-operating income excluding interest',
    category: 'non-operating',
    aliases: ['other income', '非经营性收入'],
    useCases: [
      'Core vs non-core earnings',
      'Investment gains tracking',
      'Earnings sustainability check'
    ],
    unit: 'USD',
    tool: 'getIncomeStatement',
    statement: 'Income Statement'
  },
  {
    field: 'totalOtherIncomeExpensesNet',
    name: 'Other Income/Expenses Net',
    description: 'Total other income and expenses net',
    category: 'non-operating',
    aliases: ['net other income', '其他净收入'],
    useCases: [
      'Non-recurring items analysis',
      'Normalized earnings calculation',
      'Special items identification'
    ],
    unit: 'USD',
    tool: 'getIncomeStatement',
    statement: 'Income Statement'
  },
  
  // Tax & Bottom Line
  {
    field: 'incomeBeforeTax',
    name: 'Pre-Tax Income',
    description: 'Income before income tax expense',
    category: 'profit',
    aliases: ['EBT', 'earnings before tax', 'pre-tax profit', '税前利润', '税前收入'],
    useCases: [
      'Effective tax rate calculation',
      'Cross-border comparison',
      'Tax planning baseline'
    ],
    unit: 'USD',
    tool: 'getIncomeStatement',
    statement: 'Income Statement'
  },
  {
    field: 'incomeTaxExpense',
    name: 'Income Tax',
    description: 'Income tax expense',
    category: 'expenses',
    aliases: ['tax expense', 'corporate tax', '所得税', '税费'],
    useCases: [
      'Tax efficiency analysis',
      'Jurisdiction comparison',
      'Deferred tax assessment'
    ],
    unit: 'USD',
    tool: 'getIncomeStatement',
    statement: 'Income Statement'
  },
  {
    field: 'netIncomeFromContinuingOperations',
    name: 'Income from Continuing Ops',
    description: 'Net income from continuing operations',
    category: 'profit',
    aliases: ['continuing operations', '持续经营净利润'],
    useCases: [
      'Ongoing business profitability',
      'Segment discontinuation impact',
      'Forward earnings basis'
    ],
    unit: 'USD',
    tool: 'getIncomeStatement',
    statement: 'Income Statement'
  },
  {
    field: 'netIncomeFromDiscontinuedOperations',
    name: 'Income from Discontinued Ops',
    description: 'Net income from discontinued operations',
    category: 'profit',
    aliases: ['discontinued operations', '停止经营净利润'],
    useCases: [
      'Divestiture impact analysis',
      'One-time gain/loss identification',
      'Restructuring effects'
    ],
    unit: 'USD',
    tool: 'getIncomeStatement',
    statement: 'Income Statement'
  },
  {
    field: 'bottomLineNetIncome',
    name: 'Bottom Line',
    description: 'Final net income after all adjustments',
    category: 'profit',
    aliases: ['final net income', '最终净利润'],
    useCases: [
      'Final profitability measure',
      'Shareholder returns basis',
      'Comprehensive earnings view'
    ],
    unit: 'USD',
    tool: 'getIncomeStatement',
    statement: 'Income Statement'
  },
  
  // Share Count
  {
    field: 'weightedAverageShsOut',
    name: 'Shares Outstanding',
    description: 'Weighted average shares outstanding',
    category: 'shares',
    aliases: ['shares', 'share count', '流通股数', '股本'],
    useCases: [
      'Market cap calculation',
      'Per-share metrics computation',
      'Buyback impact tracking'
    ],
    unit: 'shares',
    tool: 'getIncomeStatement',
    statement: 'Income Statement'
  },
  {
    field: 'weightedAverageShsOutDil',
    name: 'Diluted Shares',
    description: 'Weighted average diluted shares outstanding',
    category: 'shares',
    aliases: ['diluted share count', '稀释股数'],
    useCases: [
      'Option exercise impact',
      'Convertible bond dilution',
      'Worst-case ownership calculation'
    ],
    unit: 'shares',
    tool: 'getIncomeStatement',
    statement: 'Income Statement'
  }
]

// Import financial ratios fields
import { financialRatiosFields } from './financial-ratios-fields'

// Convert financial ratios fields to match FieldMetadata interface
const FINANCIAL_RATIOS_FIELDS: FieldMetadata[] = financialRatiosFields.map(field => ({
  field: field.field,
  name: field.displayName,
  description: field.description,
  category: field.category,
  aliases: field.keywords,
  useCases: [
    // Generate use cases based on field category
    ...(field.category === 'Profitability Ratios' ? [
      'Assess company profitability trends',
      'Compare profit margins across competitors'
    ] : []),
    ...(field.category === 'Valuation Ratios' ? [
      'Determine stock valuation relative to fundamentals',
      'Compare valuation multiples to industry peers'
    ] : []),
    ...(field.category === 'Liquidity Ratios' ? [
      'Analyze short-term financial health',
      'Assess ability to meet short-term obligations'
    ] : []),
    ...(field.category === 'Leverage Ratios' ? [
      'Evaluate financial leverage and debt risk',
      'Analyze capital structure efficiency'
    ] : []),
    ...(field.category === 'Efficiency Ratios' ? [
      'Measure asset utilization effectiveness',
      'Track working capital management'
    ] : [])
  ],
  unit: field.unit || (field.isRatio ? (field.isPercentage ? 'percentage' : 'ratio') : undefined),
  tool: field.tool,
  statement: 'Financial Ratios'
}))

// Combine all fields for universal search
export const ALL_FINANCIAL_FIELDS: FieldMetadata[] = [
  ...INCOME_STATEMENT_FIELDS,
  ...FINANCIAL_RATIOS_FIELDS,
  // Future: Add balance sheet fields, cash flow fields, etc.
]

// Helper function to create searchable text for each field
export function getSearchableText(field: FieldMetadata): string {
  return [
    field.name,
    field.description,
    ...field.aliases
  ].join(' ').toLowerCase()
}