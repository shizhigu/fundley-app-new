import { type NextRequest, NextResponse } from 'next/server'
import { extractMetadata } from '@/lib/ai/agents/metadata-extraction-agent'
import { createAuthenticatedConvexClient } from '@/lib/api/auth-utils'
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
        const convexResult = await createAuthenticatedConvexClient()
        if ('error' in convexResult) {
          console.warn('⚠️ Authentication failed for metadata save')
        } else {
          const { convex } = convexResult
          
          // 硬性验证：确保 messageId 是有效的 Convex ID 格式 (32 characters)
          console.log('🔍 REGEX DEBUG:', {
            messageId,
            messageIdType: typeof messageId,
            messageIdLength: messageId?.length,
            regexTest_28: /^[a-z0-9]{28}$/.test(messageId || ''),
            regexTest_32: /^[a-z0-9]{32}$/.test(messageId || ''),
            regexMatch_32: messageId?.match(/^[a-z0-9]{32}$/),
          });
          
          if (typeof messageId === 'string' && messageId.match(/^[a-z0-9]{32}$/)) {
            await convex.mutation(api.messages.updateMetadata, {
              messageId,
              extractedMetadata: result.metadata
            })
            console.log('✅ Saved metadata to database for message:', messageId)
          } else {
            console.warn('⚠️ Invalid Convex ID format, skipping metadata save:', messageId)
          }
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