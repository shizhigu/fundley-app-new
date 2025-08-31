import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/clerk';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@/convex/_generated/api';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { messageId, extractedMetadata } = await request.json();

    if (!messageId || !extractedMetadata) {
      return NextResponse.json(
        { error: 'messageId and extractedMetadata are required' },
        { status: 400 }
      );
    }

    const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
    convex.setAuth(await session.getToken());

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