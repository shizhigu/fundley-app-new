import { NextRequest, NextResponse } from 'next/server';
import { createAuthenticatedConvexClient } from '@/lib/api/auth-utils';
import { api } from '@/convex/_generated/api';

export async function POST(request: NextRequest) {
  try {
    const { messageId, extractedMetadata } = await request.json();

    if (!messageId || !extractedMetadata) {
      return NextResponse.json(
        { error: 'messageId and extractedMetadata are required' },
        { status: 400 }
      );
    }

    const convexResult = await createAuthenticatedConvexClient();
    if ('error' in convexResult) {
      return convexResult.error;
    }

    const { convex } = convexResult;

    // Update the message with extracted metadata
    await convex.mutation(api.messages.updateMetadata, {
      messageId,
      extractedMetadata
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to update message metadata:', error);
    return NextResponse.json(
      { error: 'Failed to update metadata' },
      { status: 500 }
    );
  }
}