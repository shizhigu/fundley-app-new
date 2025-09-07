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

## CRITICAL LANGUAGE REQUIREMENT:
**MUST FOLLOW**: Detect the primary language of the user's message and respond ONLY in that language:
- If message is primarily Chinese (中文): Generate ALL suggestions in Chinese
- If message is primarily English: Generate ALL suggestions in English
- NEVER mix languages - use only ONE language per response

## INSTRUCTIONS:

### 1. TICKERS: Find stock symbols (AAPL, TSLA, etc.) - uppercase

### 2. SUGGESTIONS: Generate 2-3 analytical questions (max 8 words each in Chinese, max 10 words in English)

When message contains financial data, prioritize questions that explore:

**Data-driven insights:**
- Chinese: "为什么[指标]在[时期]发生变化?" / English: "Why did [metric] change in [period]?"
- Chinese: "什么因素推动了[指标][X]%的变化?" / English: "What drove [X]% change in [metric]?"
- Chinese: "这个[趋势/比率]与行业基准如何比较?" / English: "How does this compare to benchmarks?"

**Investment implications:**
- Chinese: "什么风险可能逆转这一趋势?" / English: "What risks could reverse this trend?"
- Chinese: "这种[改善/下降]可持续吗?" / English: "Is this [improvement/decline] sustainable?"
- Chinese: "当前估值如何反映这些基本面?" / English: "How does valuation reflect fundamentals?"

### 3. DATA VERIFICATION: 
- containsRealData: true if tool call data present
- verificationMessage: describe data source

## FOCUS:
- Ask WHY behind data changes, not just WHAT
- Target investment decision-making context  
- Be specific to the actual data shown
- Avoid generic questions like "analyze performance"

Generate questions professional analysts would ask.`,
      prompt: `CRITICAL: First detect the language of this message and respond ONLY in that same language!

MESSAGE TO ANALYZE: ${messageText}

MESSAGE PARTS: ${JSON.stringify(messageParts, null, 2)}

Language Detection: If the message above contains Chinese characters, respond in Chinese. If English, respond in English.

Generate follow-up questions that focus on:
- WHY specific metrics/trends changed 
- WHAT data patterns mean for investment decisions  
- HOW results compare to benchmarks/competitors

Make questions specific to the actual data and companies mentioned.
REMEMBER: Use the SAME LANGUAGE as the original message!`,
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