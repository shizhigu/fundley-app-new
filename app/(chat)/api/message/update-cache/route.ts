import { type NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';

export async function POST(request: NextRequest) {
  try {
    const { getToken, userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { messageId, toolCallId, cachedHtml, cachedImage } = await request.json();

    if (!messageId || !toolCallId) {
      return NextResponse.json({ error: 'Missing messageId or toolCallId' }, { status: 400 });
    }

    // Create authenticated Convex client
    const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL as string);
    const token = await getToken({ template: 'convex' }); if (token) { convex.setAuth(token); }

    // Convert messageId to Convex ID type and get the message
    const convexMessageId = messageId as Id<"messages">;
    const message = await convex.query(api.messages.get, { id: convexMessageId });
    
    if (!message) {
      console.log('Message not found with ID:', messageId);
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    // 幂等性检查：如果缓存数据已存在且相同，跳过更新
    const existingPart = message.parts.find((part: any) => 
      part.type === 'tool-result' && part.toolCallId === toolCallId
    );
    
    if (existingPart && 
        existingPart.result?.cachedHtml === cachedHtml && 
        existingPart.result?.cachedImage === cachedImage) {
      console.log('Cache data already exists and is identical, skipping update');
      return NextResponse.json({ success: true, skipped: true });
    }

    // Update the message parts to include the cached content
    let updatedParts = message.parts.map((part: any) => {
      // Find the tool call result that matches our visualization
      if (part.type === 'tool-result' && part.toolCallId === toolCallId) {
        return {
          ...part,
          result: {
            ...part.result,
            cachedHtml,
            cachedImage,
          }
        };
      }
      return part;
    });

    // Save the updated parts back to the message with retry on conflict
    const maxRetries = 3;
    let attempt = 0;
    
    while (attempt < maxRetries) {
      try {
        await convex.mutation(api.messages.updateParts, {
          messageId: convexMessageId,
          parts: updatedParts,
        });
        break; // Success, exit retry loop
      } catch (error: any) {
        console.log(`Error details for debugging:`, {
          message: error?.message,
          data: error?.data,
          code: error?.code,
          fullError: error
        });
        
        // 检查多种可能的错误格式
        const isOptimisticError = 
          error?.data?.code === 'OptimisticConcurrencyControlFailure' ||
          error?.code === 'OptimisticConcurrencyControlFailure' ||
          error?.message?.includes('OptimisticConcurrencyControlFailure') ||
          (typeof error === 'object' && JSON.stringify(error).includes('OptimisticConcurrencyControlFailure'));
          
        if (isOptimisticError && attempt < maxRetries - 1) {
          attempt++;
          // 增加随机延迟避免多个请求同时重试
          const baseDelay = 100 * Math.pow(2, attempt - 1);
          const jitter = Math.random() * 100; // 0-100ms随机抖动
          const delay = baseDelay + jitter;
          
          console.log(`🔄 Retry attempt ${attempt}/${maxRetries} after ${delay.toFixed(0)}ms delay (optimistic conflict)`);
          await new Promise(resolve => setTimeout(resolve, delay));
          
          // Re-fetch the message to get latest state
          try {
            const latestMessage = await convex.query(api.messages.get, { id: convexMessageId });
            if (latestMessage) {
              const refreshedParts = latestMessage.parts.map((part: any) => {
                if (part.type === 'tool-result' && part.toolCallId === toolCallId) {
                  return {
                    ...part,
                    result: {
                      ...part.result,
                      cachedHtml,
                      cachedImage,
                    }
                  };
                }
                return part;
              });
              updatedParts = refreshedParts;
            }
          } catch (refetchError) {
            console.warn('Failed to refetch message during retry:', refetchError);
          }
        } else {
          throw error; // Re-throw if not a concurrency error or max retries exceeded
        }
      }
    }

    console.log('Successfully updated message parts with cache data');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating message cache:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}