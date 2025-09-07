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
    
    // If messageId is provided and extraction was successful, try to save to database
    if (messageId && result && result.success && result.metadata) {
      try {
        const convexResult = await createAuthenticatedConvexClient()
        if ('error' in convexResult) {
          console.warn('⚠️ Authentication failed for metadata save')
        } else {
          const { convex } = convexResult
          
          console.log('🔍 Message ID analysis:', {
            messageId,
            messageIdType: typeof messageId,
            messageIdLength: messageId?.length,
            isConvexFormat: /^[a-z0-9]{32}$/.test(messageId || ''),
            isUuidFormat: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(messageId || ''),
          });
          
          if (typeof messageId === 'string') {
            if (messageId.match(/^[a-z0-9]{32}$/)) {
              // Direct Convex ID - save directly
              await convex.mutation(api.messages.updateMetadata, {
                messageId: messageId as any,
                extractedMetadata: result!.metadata
              })
              console.log('✅ Saved metadata to database for Convex message:', messageId)
            } else if (messageId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
              // UUID format - find the corresponding Convex message and save there
              try {
                // Find the most recent assistant message that matches the content
                // This is a simple approach - find by matching first text part
                const firstTextPart = messageParts.find(part => part.type === 'text')?.text?.substring(0, 100);
                
                if (firstTextPart) {
                  const foundMessage = await convex.query(api.messages.findByContentMatch, {
                    contentPrefix: firstTextPart.trim(),
                    role: 'assistant'
                  })
                  
                  if (foundMessage) {
                    await convex.mutation(api.messages.updateMetadata, {
                      messageId: foundMessage._id,
                      extractedMetadata: result!.metadata
                    })
                    console.log('✅ Saved metadata to database via content matching:', messageId, '→', foundMessage._id)
                  } else {
                    console.warn('⚠️ UUID message not found by content matching, metadata not saved:', messageId)
                  }
                } else {
                  console.warn('⚠️ No text content to match, metadata not saved:', messageId)
                }
              } catch (error) {
                console.warn('⚠️ Failed to find UUID message by content:', error)
              }
            } else {
              console.log('ℹ️ Unknown ID format, metadata extracted but not saved to DB:', messageId)
            }
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