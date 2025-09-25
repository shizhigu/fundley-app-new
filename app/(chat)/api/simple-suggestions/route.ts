import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

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
    
    // AI suggestions disabled for AgentOS integration
    console.log('✅ Simple suggestions disabled during migration');

    return NextResponse.json({
      success: true,
      tickers: [],
      suggestions: [],
      containsRealData: false,
      verificationMessage: undefined
    })
  } catch (error) {
    console.error('Simple suggestions API error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to generate suggestions' },
      { status: 500 }
    )
  }
}