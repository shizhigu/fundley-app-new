import { type NextRequest, NextResponse } from 'next/server'
import { generateObject } from 'ai'
import { z } from 'zod'
import { openrouter } from '@openrouter/ai-sdk-provider'
import { SUGGESTION_MODEL } from '@/lib/ai/models'

const suggestionsModel = openrouter(SUGGESTION_MODEL)

const SimpleSuggestionsSchema = z.object({
  tickers: z.array(z.string()).max(5).describe('Stock ticker symbols found in the message (e.g. ["AAPL", "TSLA"])'),
  suggestions: z.array(z.string()).max(3).describe('2-3 insightful data-driven follow-up questions (max 12 words each)'),
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
      system: `You are an expert financial analyst. Generate insightful, data-driven follow-up questions for financial analysis.

## LANGUAGE REQUIREMENT:
**IMPORTANT**: Always respond in the same language as the user's message. If the message is in Chinese, respond in Chinese. If in English, respond in English. Match the user's language exactly.

## INSTRUCTIONS:

### 1. TICKERS: Find stock symbols (AAPL, TSLA, etc.) - uppercase

### 2. SUGGESTIONS: Generate 2-3 analytical questions (max 12 words each)

When message contains financial data, prioritize questions that explore:

**Data-driven insights:**
- "Why did [specific metric] change in [time period]?"
- "What factors drove the [X]% [increase/decline] in [metric]?" 
- "How does this [trend/ratio] compare to industry benchmarks?"

**Investment implications:**
- "What risks could reverse this performance trend?"
- "Is this [improvement/decline] sustainable long-term?"
- "How does current valuation reflect these fundamentals?"

**Comparative analysis:**
- "How do these metrics compare to key competitors?"
- "What does this trend mean for market positioning?"
- "Which business segment is driving these results?"

### 3. DATA VERIFICATION: 
- containsRealData: true if tool call data present
- verificationMessage: describe data source

## FOCUS:
- Ask WHY behind data changes, not just WHAT
- Target investment decision-making context  
- Be specific to the actual data shown
- Avoid generic questions like "analyze performance"

Generate questions professional analysts would ask.`,
      prompt: `Analyze this financial message:

MESSAGE: ${messageText}

MESSAGE PARTS: ${JSON.stringify(messageParts, null, 2)}

Generate follow-up questions that focus on:
- WHY specific metrics/trends changed 
- WHAT data patterns mean for investment decisions
- HOW results compare to benchmarks/competitors

Make questions specific to the actual data and companies mentioned.`,
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