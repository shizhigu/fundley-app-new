// Field metadata for income statement and other financial statements
// This will be used for vector search to match user queries to field names

export interface FieldMetadata {
  field: string // Actual field name in API response
  name: string // Human-readable name
  description: string
  category: string
  aliases: string[] // Alternative names users might use
  useCases: string[] // Common use cases and analysis scenarios
  
  // Updated for unified tool architecture
  dataSource: {
    endpoint: string // API endpoint path (e.g., '/income-statement', '/ratios')
    dataType: 'getIncomeStatement' | 'getBalanceSheet' | 'getCashFlow' | 'getFinancialRatios' | 'getKeyMetrics' | 'getCompanyProfile' // For unified tool
    statement?: string // Which financial statement (for clarity)
  }
  
  // Enhanced data interpretation guidance
  dataFormat: {
    unit?: string // Base unit - flexible for various financial units
    isPercentage?: boolean // If true, value is already in percentage (0.15 = 15%)
    isRatio?: boolean // If true, value is a ratio (1.5 = 1.5:1)
    scale?: 'millions' | 'billions' | 'thousands' | 'units' // Magnitude scale
    interpretation?: string // How to interpret the value (e.g., "Higher is better", "0.15 means 15%")
  }
}

// Legacy fields are now replaced by imported field definitions

// Import all field definitions
import { financialRatiosFields, } from './financial-ratios-fields'
import { keyMetricsFields, } from './key-metrics-fields'
import { incomeStatementFields } from './income-statement-fields'
import { balanceSheetFields } from './balance-sheet-fields'
import { cashFlowFields } from './cash-flow-fields'

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
  dataSource: {
    endpoint: '/ratios',
    dataType: 'getFinancialRatios',
    statement: 'Financial Ratios'
  },
  dataFormat: {
    unit: field.unit || (field.isRatio ? (field.isPercentage ? 'percentage' : 'ratio') : undefined),
    isPercentage: field.isPercentage,
    isRatio: field.isRatio,
    interpretation: field.isPercentage ? 'Value shown as percentage (e.g., 0.15 = 15%)' : field.isRatio ? 'Value shown as ratio' : undefined
  }
}))

// Convert key metrics fields to match FieldMetadata interface  
const KEY_METRICS_FIELDS: FieldMetadata[] = keyMetricsFields.map(field => ({
  field: field.field,
  name: field.displayName,
  description: field.description,
  category: field.category,
  aliases: field.keywords,
  useCases: [
    // Generate use cases based on field category
    ...(field.category === 'Valuation Metrics' ? [
      'Compare company valuations across peers',
      'Track market value changes over time'
    ] : []),
    ...(field.category === 'Return Metrics' ? [
      'Assess capital efficiency and profitability',
      'Compare return metrics with industry benchmarks'
    ] : []),
    ...(field.category === 'Growth Metrics' ? [
      'Analyze business growth trends',
      'Forecast future performance'
    ] : []),
    ...(field.category === 'Market Metrics' ? [
      'Evaluate market position and share',
      'Compare market performance with competitors'
    ] : [])
  ],
  dataSource: {
    endpoint: '/key-metrics',
    dataType: 'getKeyMetrics',
    statement: 'Key Metrics'
  },
  dataFormat: {
    unit: field.unit || (field.isRatio ? (field.isPercentage ? 'percentage' : 'ratio') : undefined),
    isPercentage: field.isPercentage,
    isRatio: field.isRatio,
    interpretation: field.isPercentage ? 'Value shown as percentage (e.g., 0.15 = 15%)' : field.isRatio ? 'Value shown as ratio' : undefined
  }
}))

// Combine all fields for universal search
export const ALL_FINANCIAL_FIELDS: FieldMetadata[] = [
  ...FINANCIAL_RATIOS_FIELDS,
  ...KEY_METRICS_FIELDS,
  ...incomeStatementFields,
  ...balanceSheetFields,
  ...cashFlowFields
]

// Helper function to create searchable text for each field
export function getSearchableText(field: FieldMetadata): string {
  return [
    field.name,
    field.description,
    ...field.aliases
  ].join(' ').toLowerCase()
}