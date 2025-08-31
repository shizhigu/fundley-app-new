import { type NextRequest, NextResponse } from 'next/server'
import { extractMetadata } from '@/lib/ai/agents/metadata-extraction-agent'
import { auth } from '@/lib/auth/clerk'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@/convex/_generated/api'

export async function POST(request: NextRequest) {
  try {
    const { messageParts, userQuestion, messageId } = await request.json()
    
    if (!messageParts || !Array.isArray(messageParts)) {
      return NextResponse.json(
        { error: 'Invalid message parts - must be an array' },
        { status: 400 }
      )
    }
    
    const result = await extractMetadata(messageParts, userQuestion)
    
    // If messageId is provided and extraction was successful, save to database
    if (messageId && result.success && result.metadata) {
      try {
        const session = await auth()
        if (session) {
          const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)
          convex.setAuth(await session.getToken())
          
          await convex.mutation(api.messages.updateMetadata, {
            messageId,
            extractedMetadata: result.metadata
          })
          
          console.log('✅ Saved metadata to database for message:', messageId)
        }
      } catch (dbError) {
        console.warn('⚠️ Failed to save metadata to database:', dbError)
        // Don't fail the whole request if database save fails
      }
    }
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('Metadata extraction API error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to extract metadata' },
      { status: 500 }
    )
  }
}