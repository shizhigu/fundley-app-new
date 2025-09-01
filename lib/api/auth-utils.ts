import { auth as clerkAuth } from '@clerk/nextjs/server';
import { ConvexHttpClient } from 'convex/browser';
import { NextResponse } from 'next/server';

export async function createAuthenticatedConvexClient(): Promise<{
  convex: ConvexHttpClient;
  userId: string;
} | { error: NextResponse }> {
  const { getToken, userId } = await clerkAuth();
  
  if (!userId) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  try {
    // Create authenticated Convex client
    const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
    
    // Set authentication token if available
    const token = await getToken({ template: 'convex' });
    if (token) {
      convex.setAuth(token);
    }

    return { convex, userId };
  } catch (error) {
    console.error('Failed to create authenticated Convex client:', error);
    return { error: NextResponse.json({ error: 'Authentication failed' }, { status: 500 }) };
  }
}