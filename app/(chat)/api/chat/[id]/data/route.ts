import { auth } from '@/lib/auth/clerk';
import { convexQueries } from '@/lib/convex/client';
import { NextResponse } from 'next/server';

// Permanent chat - always return user's permanent chat data
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get or create permanent chat for user
    const permanentChat = await convexQueries.getOrCreatePermanentChat();
    
    // Get all user's messages
    const messages = await convexQueries.getMessagesByUserId();
    
    return NextResponse.json({
      chat: {
        id: permanentChat._id,
        title: permanentChat.title,
        userId: permanentChat.userId,
        visibility: 'private', // Always private in permanent chat
      },
      messages,
    });
  } catch (error) {
    console.error('Error fetching permanent chat data:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}