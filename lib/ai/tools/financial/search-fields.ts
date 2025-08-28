import { tool } from 'ai'
import { z } from 'zod'
import { fieldSearch } from '@/lib/fmp/field-search'

/**
 * AI Tool for searching financial field names using vector similarity search.
 * This tool helps the AI find the correct FMP API field names based on user queries.
 */
export const searchFinancialFields = tool({
  description: `Search for financial field names using semantic search. 
  Use this FIRST when users ask about financial data, metrics, or company fundamentals.
  
  IMPORTANT: The query MUST be in ENGLISH. If the user asks in another language (Chinese, Japanese, etc.), 
  you MUST translate it to English first before calling this tool.
  
  Example translations:
  - "营收" → "revenue"
  - "利润率" → "profit margin"
  - "研发费用" → "R&D expenses" or "research and development costs"
  - "现金流" → "cash flow"
  - "负债率" → "debt ratio"
  
  Returns the top 5 matching fields with their exact API field names and which tool to use.`,
  
  inputSchema: z.object({
    query: z.string().describe('Financial metric search query IN ENGLISH ONLY (e.g., "revenue", "profit margin", "cash flow", "R&D expenses", "debt coverage")'),
    context: z.string().optional().describe('Additional context IN ENGLISH about what the user wants to analyze')
  }),
  
  execute: async ({ query, context }) => {
    try {
      // Enhance query with context if provided
      const searchQuery = context ? `${query} ${context}` : query
      
      // Search for matching fields (returns top 5 by default)
      const matches = await fieldSearch.searchFields(searchQuery, 5)
      
      if (!matches || matches.length === 0) {
        return {
          success: false,
          message: `No matching financial fields found for "${query}". Please try a different search term.`,
          suggestion: 'Try using more general terms like "revenue", "profit", "assets", "debt", etc.'
        }
      }
      
      // Group fields by tool for easier selection
      const fieldsByTool = matches.reduce((acc, field) => {
        if (!acc[field.tool]) {
          acc[field.tool] = []
        }
        acc[field.tool].push({
          field: field.field,
          name: field.name,
          description: field.description,
          category: field.category
        })
        return acc
      }, {} as Record<string, any[]>)
      
      // Format the results for AI to understand
      const formatted = matches.map((field, index) => ({
        rank: index + 1,
        field: field.field, // Exact field name to use in API calls
        name: field.name,   // Human-readable name
        description: field.description,
        category: field.category,
        tool: field.tool,   // Which FMP API tool to use
        statement: field.statement, // Which financial statement it belongs to
        useCases: field.useCases || [],
        aliases: field.aliases || []
      }))
      
      // Create user-friendly display summary
      const topFields = matches.slice(0, 5).map(f => f.name).filter(Boolean).join(', ')
      const displayCount = matches.length > 0 ? `${matches.length} metrics` : 'no matches'
      
      return {
        success: true,
        query: query,
        context: context,
        totalMatches: matches.length,
        matches: formatted,
        fieldsByTool: fieldsByTool,
        instruction: `Found ${matches.length} matching fields. The most relevant fields are listed above. 
        Use the 'field' value when calling the actual data retrieval tools.
        The 'tool' indicates which FMP API endpoint to use (e.g., 'getIncomeStatement', 'getBalanceSheet', etc.).`,
        // User-friendly display fields
        displayAction: 'Searching financial metrics',
        displayResult: topFields ? `Found: ${topFields}` : `Found: ${displayCount}`
      }
    } catch (error) {
      console.error('Error searching financial fields:', error)
      return {
        success: false,
        message: `Failed to search fields: ${error instanceof Error ? error.message : 'Unknown error'}`,
        suggestion: 'Try again with a simpler search term'
      }
    }
  }
})