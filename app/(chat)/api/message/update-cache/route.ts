import { type NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@/convex/_generated/api';

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
    convex.setAuth(await getToken({ template: 'convex' }));

    // Get the current message
    const message = await convex.query(api.messages.get, { id: messageId });
    if (!message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    // Update the message parts to include the cached content
    const updatedParts = message.parts.map((part: any) => {
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

    // Save the updated parts back to the message
    await convex.mutation(api.messages.updateParts, {
      messageId,
      parts: updatedParts,
    });

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