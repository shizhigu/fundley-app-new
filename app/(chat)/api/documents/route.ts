import { auth } from '@/lib/auth/clerk';
import { convexQueries } from '@/lib/convex/client';
import { ChatSDKError } from '@/lib/errors';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  const chatId = searchParams.get('chatId');
  const limit = Number.parseInt(searchParams.get('limit') || '50');

  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError('unauthorized:documents').toResponse();
  }

  try {
    const documents = await convexQueries.getDocumentsByUserId({ 
      userId: session.user.id 
    });

    return Response.json(documents, { status: 200 });
  } catch (error) {
    console.error('Error fetching documents:', error);
    return new ChatSDKError('internal:documents').toResponse();
  }
}

