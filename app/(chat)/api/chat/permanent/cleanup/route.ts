import { auth } from '@clerk/nextjs/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@/convex/_generated/api';
import { NextResponse } from 'next/server';

export async function POST() {
  const { getToken, userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Create authenticated Convex client
    const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL as string);
    const token = await getToken({ template: 'convex' });
    if (token) {
      convex.setAuth(token);
    }
    
    // Get all messages using the correct query for persistent chat
    const messages = await convex.query(api.messages.listForPersistentChat);
    
    // Find incomplete assistant messages (empty parts)
    const incompleteMessages = messages.filter(
      (msg: any) => msg.role === 'assistant' && (!msg.parts || msg.parts.length === 0)
    );
    
    console.log(`🧹 Found ${incompleteMessages.length} incomplete assistant messages to clean`);
    
    // Delete incomplete messages
    for (const msg of incompleteMessages) {
      await convex.mutation(api.messages.deleteMessage, { messageId: msg._id });
    }
    
    return NextResponse.json({ 
      cleaned: incompleteMessages.length,
      success: true 
    });
  } catch (error) {
    console.error('Cleanup error:', error);
    return NextResponse.json({ error: 'Cleanup failed' }, { status: 500 });
  }
}