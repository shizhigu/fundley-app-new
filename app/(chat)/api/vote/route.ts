import { auth } from '@/lib/auth/clerk';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@/convex/_generated/api';
import { ChatSDKError } from '@/lib/errors';

export async function GET(request: Request) {
  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError('unauthorized:vote').toResponse();
  }

  try {
    const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
    const token = await session.getToken();
    if (token) {
      convex.setAuth(token);
    }

    // Get all user votes (no chatId needed)
    const votes = await convex.query(api.votes.listByUser);

    return Response.json(votes, { status: 200 });
  } catch (error) {
    console.error('Error fetching user votes:', error);
    return new ChatSDKError('internal:vote').toResponse();
  }
}

export async function PATCH(request: Request) {
  const {
    messageId,
    type,
  }: { messageId: string; type: 'up' | 'down' } =
    await request.json();

  if (!messageId || !type) {
    return new ChatSDKError(
      'bad_request:api',
      'Parameters messageId and type are required.',
    ).toResponse();
  }

  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError('unauthorized:vote').toResponse();
  }

  try {
    const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
    const token = await session.getToken();
    if (token) {
      convex.setAuth(token);
    }

    // Create or update vote (user-based, no chatId needed)
    await convex.mutation(api.votes.create, {
      messageId: messageId as any, // Type assertion for Convex ID
      isUpvoted: type === 'up',
    });

    return new Response('Message voted', { status: 200 });
  } catch (error) {
    console.error('Error voting message:', error);
    return new ChatSDKError('internal:vote').toResponse();
  }
}
