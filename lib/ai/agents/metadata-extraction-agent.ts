import { generateObject } from 'ai'
import { z } from 'zod'
import { openrouter } from '@openrouter/ai-sdk-provider'
import { SUGGESTION_MODEL } from '@/lib/ai/models'

// Use specialized model for suggestion generation and data verification
const metadataModel = openrouter(SUGGESTION_MODEL)

// Enhanced schema with data verification fields
const MetadataExtractionSchema = z.object({
  tickers: z.array(z.string()).describe('Stock ticker symbols mentioned in the message (uppercase, e.g. ["AAPL", "TSLA"])'),
  suggestions: z.array(z.object({
    text: z.string().describe('The suggestion text'),
    containsRealData: z.boolean().describe('True if this suggestion is based on real data from tool calls, false if based on general knowledge'),
    verificationMessage: z.string().optional().describe('Short verification description if containsRealData is true (e.g., "FMP API data verified", "SEC filing data confirmed")')
  })).max(3).describe('2-3 actionable follow-up suggestions with data verification'),
  containsRealData: z.boolean().describe('True if the overall assistant response contains real data from tool calls'),
  verificationMessage: z.string().optional().describe('Short description of data sources used if containsRealData is true (e.g., "FMP financial data", "SEC filing analysis")')
})

/**
 * Pure LLM-based metadata extraction agent
 * Analyzes complete message parts and returns tickers, suggestions, and verification in one call
 * @param messageParts - Complete parts array from assistant message (including tool calls, text, etc.)
 * @param userQuestion - Original user question for context
 */
export async function extractMetadata(messageParts: any[], userQuestion?: string) {
  try {
    console.log('🔍 Metadata extraction input:', {
      totalParts: messageParts.length,
      partTypes: messageParts.map(part => part.type),
      userQuestion: userQuestion || 'Not provided'
    });
    
    let retryCount = 0;
    const maxRetries = 2;
    
    while (retryCount <= maxRetries) {
      try {
        const result = await generateObject({
          model: metadataModel,
          system: `You are an advanced metadata extraction agent. Analyze the complete assistant message parts and extract tickers, suggestions, and verification info in one go.

ANALYSIS INSTRUCTIONS:
1. TICKER EXTRACTION: Find ALL stock ticker symbols mentioned in any part (text, tool calls, outputs)
   - Look for: AAPL, TSLA, GOOGL, etc.  
   - Also convert company names: Apple → AAPL, Tesla → TSLA
   - Return in uppercase format

2. SUGGESTION GENERATION: Create 2-3 SHORT actionable follow-up questions (max 8-10 words each)
   - Make them specific and useful based on the message content
   - Focus on: analysis, comparison, trends, deeper insights
   - Examples: "Compare with peers", "Analyze recent trends"

3. DATA VERIFICATION: Determine if this message contains real data from tool calls
   - Look for parts with type starting with "tool-" 
   - Check if they have actual output data (not just errors)
   - If real data found: set containsRealData=true and verificationMessage to a message describing the data source (NEVER expose the tool name or endpoint, just describe the data is verified with real data from credible sources).
   - If no real data: set containsRealData=false and verificationMessage=""

Return empty arrays if nothing found. Analyze ALL parts comprehensively.`,
          prompt: `Analyze these complete message parts and extract metadata:

USER QUESTION: ${userQuestion || 'Not provided'}

COMPLETE MESSAGE PARTS:
${JSON.stringify(messageParts, null, 2)}

Extract tickers, generate suggestions, and verify data sources all at once.`,
          schema: MetadataExtractionSchema
        });
        
        console.log('✅ Metadata extraction successful:', result.object);
        
        return {
          success: true,
          metadata: {
            tickers: result.object.tickers.length > 0 ? result.object.tickers : undefined,
            suggestions: result.object.suggestions.length > 0 ? result.object.suggestions : undefined,
            containsRealData: result.object.containsRealData,
            verificationMessage: result.object.verificationMessage
          }
        }
      } catch (error: any) {
        retryCount++;
        console.error(`❌ Metadata extraction attempt ${retryCount} failed:`, {
          error: error.message,
          responseBody: error.responseBody?.substring(0, 200) + '...',
          statusCode: error.statusCode,
          cause: error.cause?.message
        });
        
        if (retryCount > maxRetries) {
          console.error('❌ All retry attempts failed, throwing error');
          throw error;
        }
        
        // Wait a bit before retrying
        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
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