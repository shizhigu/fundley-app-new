import { generateObject } from 'ai'
import { z } from 'zod'
import { openrouter } from '@openrouter/ai-sdk-provider'

// Use a fast, cheap model for simple metadata extraction
const metadataModel = openrouter('google/gemini-2.5-flash-lite')

// Simple schema for metadata extraction
const MetadataExtractionSchema = z.object({
  tickers: z.array(z.string()).describe('Stock ticker symbols mentioned in the message (uppercase, e.g. ["AAPL", "TSLA"])'),
  suggestions: z.array(z.string()).max(3).describe('2-3 actionable follow-up suggestions based on the message content')
})

/**
 * Lightweight utility agent for extracting metadata from assistant messages
 * Uses a small, fast model to identify tickers and generate suggestions
 */
export async function extractMetadata(messageContent: string) {
  try {
    const result = await generateObject({
      model: metadataModel,
      system: `You are a metadata extraction utility. Extract ticker symbols and generate suggestions from assistant messages.

TICKER EXTRACTION:
- Find ALL stock ticker symbols mentioned (e.g. Apple → AAPL, Microsoft → MSFT)
- Return in uppercase format
- Include company names you can identify (Tesla → TSLA, Google → GOOGL)

SUGGESTION GENERATION:
- Create 2-3 actionable follow-up questions/tasks
- Make them specific and useful
- Focus on analysis, comparison, trends, or deeper insights
- Examples: "Compare AAPL with industry peers", "Analyze revenue trends", "Check latest earnings"

Return empty arrays if none found.`,
      prompt: `Extract metadata from this assistant message:

${messageContent}`,
      schema: MetadataExtractionSchema
    })

    return {
      success: true,
      metadata: {
        tickers: result.object.tickers.length > 0 ? result.object.tickers : undefined,
        suggestions: result.object.suggestions.length > 0 ? result.object.suggestions : undefined
      }
    }
  } catch (error) {
    console.warn('Metadata extraction failed:', error)
    return {
      success: false,
      metadata: {}
    }
  }
}