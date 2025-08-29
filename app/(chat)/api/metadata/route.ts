import { type NextRequest, NextResponse } from 'next/server'
import { extractMetadata } from '@/lib/ai/agents/metadata-extraction-agent'

export async function POST(request: NextRequest) {
  try {
    const { messageContent } = await request.json()
    
    if (!messageContent || typeof messageContent !== 'string') {
      return NextResponse.json(
        { error: 'Invalid message content' },
        { status: 400 }
      )
    }
    
    const result = await extractMetadata(messageContent)
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('Metadata extraction API error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to extract metadata' },
      { status: 500 }
    )
  }
}