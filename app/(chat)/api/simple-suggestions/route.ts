import { type NextRequest, NextResponse } from 'next/server'
import { generateObject } from 'ai'
import { z } from 'zod'
import { openrouter } from '@openrouter/ai-sdk-provider'
import { SUGGESTION_MODEL } from '@/lib/ai/models'

const suggestionsModel = openrouter(SUGGESTION_MODEL)

const SimpleSuggestionsSchema = z.object({
  tickers: z.array(z.string()).max(5).describe('Stock ticker symbols found in the message (e.g. ["AAPL", "TSLA"])'),
  suggestions: z.array(z.string()).max(3).describe('2-3 short actionable follow-up questions (max 8-10 words each)'),
  containsRealData: z.boolean().describe('True if message contains real data from tool calls'),
  verificationMessage: z.string().optional().describe('Short data source description if containsRealData is true')
})

export async function POST(request: NextRequest) {
  try {
    const { messageText, messageParts } = await request.json()
    
    if (!messageText || typeof messageText !== 'string') {
      return NextResponse.json({ error: 'Invalid messageText' }, { status: 400 })
    }
    
    console.log('🎯 Simple suggestions API called for text length:', messageText.length);
    
    const result = await generateObject({
      model: suggestionsModel,
      system: `Extract tickers, generate suggestions, and verify data sources from this financial assistant message.

INSTRUCTIONS:
1. TICKERS: Find stock symbols (AAPL, TSLA, etc.) - return uppercase
2. SUGGESTIONS: Create 2-3 SHORT actionable follow-ups (max 8-10 words each)
   - Examples: "Compare with industry peers", "Analyze recent trends", "Check quarterly performance"
3. DATA VERIFICATION: Check if message contains real tool call data
   - If yes: set containsRealData=true and describe data source
   - If no: set containsRealData=false

Keep it simple and fast.`,
      prompt: `Analyze this financial assistant message:

MESSAGE: ${messageText}

MESSAGE PARTS: ${JSON.stringify(messageParts, null, 2)}

Extract tickers, generate suggestions, verify data sources.`,
      schema: SimpleSuggestionsSchema
    });
    
    console.log('✅ Simple suggestions generated:', result.object);
    
    return NextResponse.json({
      success: true,
      tickers: result.object.tickers,
      suggestions: result.object.suggestions,
      containsRealData: result.object.containsRealData,
      verificationMessage: result.object.verificationMessage
    })
  } catch (error) {
    console.error('Simple suggestions API error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to generate suggestions' },
      { status: 500 }
    )
  }
}