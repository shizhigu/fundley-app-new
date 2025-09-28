// Mock implementations for removed AI SDK
const tool = (config: any) => config;
const generateObject = (args: any) => ({
  object: {
    selectedFields: [{
      field: 'mockField',
      name: 'Mock Field',
      description: 'Mock description',
      category: 'mock',
      endpoint: '/mock-endpoint',
      unit: 'USD',
      isPercentage: false,
      isRatio: false,
      interpretation: 'Mock interpretation',
      relevanceScore: 95,
      reasoning: 'Mock field selection',
      dataType: 'getIncomeStatement'
    }],
    reasoning: 'Mock reasoning',
    summary: {
      recommendedTimeframe: 'annual',
      totalFields: 1,
      query: 'mock query',
      primaryDataType: 'getIncomeStatement',
      queryIntent: 'mock intent',
      dataInterpretationGuidance: 'mock guidance'
    }
  }
});
import { z } from 'zod'
import { financialFieldsModel } from '@/lib/ai/providers'
import { ALL_FINANCIAL_FIELDS } from '@/lib/fmp/field-metadata'

// Response schema for the financial fields sub-agent
const FieldSelectionSchema = z.object({
  reasoning: z.string().describe('Brief explanation of field selection logic and user intent understanding'),
  selectedFields: z.array(z.object({
    field: z.string().describe('Exact API field name'),
    name: z.string().describe('Human readable name'),
    description: z.string().describe('Field description'),
    category: z.string().describe('Field category'),
    
    // Enhanced for unified tool compatibility
    dataType: z.enum(['getIncomeStatement', 'getBalanceSheet', 'getCashFlow', 'getFinancialRatios', 'getKeyMetrics']).describe('Which unified tool data type to use'),
    endpoint: z.string().describe('API endpoint path'),
    
    // Data interpretation guidance
    unit: z.string().optional().describe('Data unit (USD, percentage, ratio, etc.)'),
    isPercentage: z.boolean().optional().describe('Whether value is already in percentage format'),
    isRatio: z.boolean().optional().describe('Whether value is a ratio'),
    interpretation: z.string().optional().describe('How to interpret the numeric value'),
    
    relevanceScore: z.number().min(0).max(1).describe('How relevant (0-1) this field is to the query')
  })).max(5).describe('Top 5 most relevant fields sorted by relevance'),
  
  // Summary for main agent with TTM support
  summary: z.object({
    primaryDataType: z.enum(['getIncomeStatement', 'getBalanceSheet', 'getCashFlow', 'getFinancialRatios', 'getKeyMetrics']).describe('Most appropriate data type for this query'),
    recommendedTimeframe: z.enum(['historical', 'ttm']).describe('historical: trend analysis across periods, ttm: current/recent analysis'),
    queryIntent: z.string().describe('What the user is trying to analyze'),
    dataInterpretationGuidance: z.string().describe('How the main agent should interpret and present the returned data')
  })
})

// Create condensed field database for LLM context
const createFieldDatabase = () => {
  return ALL_FINANCIAL_FIELDS.map(field => ({
    field: field.field,
    name: field.name,
    description: field.description,
    category: field.category,
    aliases: field.aliases.join(', '),
    useCases: field.useCases.slice(0, 2).join('; '), // Limit for context efficiency
    
    // Enhanced metadata with safe access
    dataType: field.dataSource?.dataType || 'getFinancialData',
    endpoint: field.dataSource?.endpoint || '/financial-data',
    statement: field.dataSource?.statement || 'Financial Data',
    
    // Data format information with safe access
    unit: field.dataFormat?.unit || '',
    isPercentage: field.dataFormat?.isPercentage || false,
    isRatio: field.dataFormat?.isRatio || false,
    scale: field.dataFormat?.scale || 'units',
    interpretation: field.dataFormat?.interpretation || ''
  }))
}

const FIELD_DATABASE = createFieldDatabase()

/**
 * Financial Fields Sub-Agent - LLM Enhanced
 * 
 * Specialized agent that understands user intent and maps it to specific financial fields
 * Provides structured guidance for the unified financial data tool
 */
export const financialFieldsAgent = tool({
  description: `Expert financial fields analyst agent. Use when users ask about financial metrics, ratios, company fundamentals, or any financial data analysis.
  
  This agent specializes in:
  - Understanding financial queries in any language (Chinese, English, etc.)
  - Mapping user intent to specific financial fields
  - Providing data interpretation guidance
  - Selecting optimal data sources and tool routing
  
  Returns structured field information for the unified financial data tool.`,
  
  inputSchema: z.object({
    query: z.string().describe('User query about financial metrics (supports any language)'),
    context: z.string().optional().describe('Additional context about the analysis needed'),
    symbols: z.array(z.string()).optional().describe('Stock symbols if already known')
  }),
  
  execute: async ({ query, context, symbols }: { query: string, context?: string, symbols?: string[] }) => {
    try {
      const enhancedQuery = context ? `${query} (Context: ${context})` : query
      
      const result = await generateObject({
        model: financialFieldsModel,
        system: `You are a financial data expert. Map user queries to specific financial fields from the database.

Available fields:
${JSON.stringify(FIELD_DATABASE, null, 2)}

Task: Analyze the query and return the 5 most relevant fields with clear reasoning.

Timeframe guide:
- TTM: Use for current/recent analysis (keywords: latest, current, recent, 最近, 当前)  
- Historical: Use for trends/comparisons (keywords: trend, growth, over time, 趋势, 历史)

Return 5 fields ranked by relevance with dataType and timeframe recommendation.`,
        
        prompt: `Analyze this financial query and select the most relevant fields:

"${enhancedQuery}"
${symbols ? `Stock symbols: ${symbols.join(', ')}` : ''}

Provide field selection with clear reasoning and data interpretation guidance.`,
        schema: FieldSelectionSchema,
      })

      if (!result.object.selectedFields.length) {
        return {
          success: false,
          message: `No relevant financial fields found for "${query}". Please try a more specific financial query.`,
          suggestion: 'Try terms like "revenue analysis", "profitability ratios", "cash flow", "debt levels", etc.'
        }
      }

      // Sort by relevance score (highest first)
      const sortedFields = result.object.selectedFields.sort((a, b) => b.relevanceScore - a.relevanceScore)
      
      // Group by data type for unified tool calling
      const fieldsByDataType = sortedFields.reduce((acc, field) => {
        if (!acc[field.dataType]) {
          acc[field.dataType] = []
        }
        acc[field.dataType].push({
          field: field.field,
          name: field.name,
          description: field.description,
          unit: field.unit,
          isPercentage: field.isPercentage,
          isRatio: field.isRatio,
          interpretation: field.interpretation,
          relevanceScore: field.relevanceScore
        })
        return acc
      }, {} as Record<string, any[]>)

      // Prepare response for main agent
      const topFields = sortedFields.slice(0, 3).map(f => f.name).join(', ')
      
      return {
        success: true,
        query: query,
        context: context,
        symbols: symbols,
        reasoning: result.object.reasoning,
        
        // Field information for unified tool
        selectedFields: sortedFields.map(field => ({
          field: field.field,
          name: field.name,
          description: field.description,
          category: field.category,
          dataType: field.dataType,
          endpoint: field.endpoint,
          unit: field.unit,
          isPercentage: field.isPercentage,
          isRatio: field.isRatio,
          interpretation: field.interpretation,
          relevanceScore: field.relevanceScore
        })),
        
        fieldsByDataType: fieldsByDataType,
        
        // Summary for main agent decision making with TTM support
        summary: {
          ...result.object.summary,
          recommendedTimeframe: result.object.summary.recommendedTimeframe
        },
        
        // Legacy compatibility
        totalMatches: sortedFields.length,
        matches: sortedFields, // For backward compatibility
        instruction: `Selected ${sortedFields.length} most relevant fields for unified tool calling. Primary data type: ${result.object.summary.primaryDataType}, Recommended timeframe: ${result.object.summary.recommendedTimeframe}`,
        
        // UI display fields
        displayAction: 'AI field analysis',
        displayResult: `Mapped to: ${topFields} (${result.object.summary.recommendedTimeframe.toUpperCase()})`,
        formattedData: `Intent: ${result.object.summary.queryIntent}

Recommended Timeframe: ${result.object.summary.recommendedTimeframe.toUpperCase()}
Reasoning: ${result.object.reasoning}

Selected Fields:
${sortedFields.map(f => `• ${f.name} (${f.field}) - ${f.relevanceScore.toFixed(2)} relevance
  Data Type: ${f.dataType}
  ${f.interpretation ? `Interpretation: ${f.interpretation}` : ''}`).join('\n\n')}

Primary Data Source: ${result.object.summary.primaryDataType}
Analysis Guidance: ${result.object.summary.dataInterpretationGuidance}`
      }
      
    } catch (error) {
      console.error('Error in financial fields sub-agent:', error)
      return {
        success: false,
        message: `Failed to analyze query: ${error instanceof Error ? error.message : 'Unknown error'}`,
        suggestion: 'Please try rephrasing your financial query or use more specific terms'
      }
    }
  }
})