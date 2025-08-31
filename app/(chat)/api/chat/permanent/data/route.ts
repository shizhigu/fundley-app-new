import { auth } from '@clerk/nextjs/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@/convex/_generated/api';
import { NextResponse } from 'next/server';

export async function GET() {
  console.log('🔍 User messages data API called');
  
  const { getToken, userId } = await auth();
  console.log('👤 User ID:', userId);
  
  if (!userId) {
    console.log('❌ No user ID, returning 401');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Create authenticated Convex client
    const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL as string);
    
    // Set authentication token
    convex.setAuth(await getToken({ template: 'convex' }));
    
    // Ensure user exists in Convex database
    await convex.mutation(api.users.store);
    
    // Get all user's messages directly
    const messages = await convex.query(api.messages.list);
    console.log('📝 Messages found:', messages.length);
    
    const result = {
      chat: {
        id: 'user-workspace',
        title: 'My Workspace',
        visibility: 'private',
      },
      messages,
      vizCaches: [],
    };
    
    console.log('✅ Returning data:', JSON.stringify(result, null, 2));
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching user messages:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}