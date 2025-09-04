import { api } from '@/convex/_generated/api';
import { NextResponse } from 'next/server';
import { createAuthenticatedConvexClient } from '@/lib/api/auth-utils';

export async function GET() {
  console.log('🔍 Optimized user messages API called');
  
  const authResult = await createAuthenticatedConvexClient();
  
  if ('error' in authResult) {
    console.log('❌ Authentication failed');
    return authResult.error;
  }
  
  const { convex, userId } = authResult;
  console.log('👤 User ID:', userId);

  try {
    
    // Ensure user exists in Convex database (only if needed)
    await convex.mutation(api.users.store);
    
    // Get recent user's messages with limit for performance
    const messages = await convex.query(api.messages.listForPersistentChat);
    console.log('📝 Messages found:', messages.length);
    
    // Debug metadata in messages
    messages.forEach((msg: any, idx: number) => {
      if (msg.role === 'assistant' && idx < 3) { // Only log first 3 assistant messages
        console.log(`📊 Message ${idx} metadata debug:`, {
          id: msg._id,
          role: msg.role,
          hasExtractedMetadata: !!msg.extractedMetadata,
          extractedMetadataType: typeof msg.extractedMetadata,
          extractedMetadata: msg.extractedMetadata
        });
      }
    });
    
    // 分析消息parts结构，检查冗余
    if (messages && messages.length > 0) {
      let totalParts = 0;
      let totalPartsSize = 0;
      let reasoningParts = 0;
      
      messages.forEach((msg: any, idx: number) => {
        if (msg.parts) {
          totalParts += msg.parts.length;
          
          msg.parts.forEach((part: any) => {
            const partStr = JSON.stringify(part);
            totalPartsSize += partStr.length;
            
            if (part.type === 'reasoning') {
              reasoningParts++;
            }
            
            // 打印前几个消息的详细信息
            if (idx < 2) {
              console.log(`📋 Message ${idx} part:`, {
                type: part.type,
                size: partStr.length,
                hasText: !!part.text,
                textLength: part.text?.length || 0
              });
            }
          });
        }
      });
      
      console.log('📊 Parts分析:', {
        totalMessages: messages.length,
        totalParts,
        avgPartsPerMessage: (totalParts / messages.length).toFixed(2),
        totalPartsSize: `${(totalPartsSize / 1024 / 1024).toFixed(2)}MB`,
        avgSizePerMessage: `${(totalPartsSize / messages.length / 1024).toFixed(2)}KB`,
        reasoningParts,
        reasoningRatio: `${((reasoningParts / totalParts) * 100).toFixed(1)}%`
      });
    }
    
    const result = {
      messages,
    };
    
    // Disable cache temporarily for debugging
    const response = NextResponse.json(result);
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    
    return response;
  } catch (error) {
    console.error('Error fetching user messages:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}