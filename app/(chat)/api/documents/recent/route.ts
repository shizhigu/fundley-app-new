import { auth } from '@/lib/auth/clerk';
import { convexQueries } from '@/lib/convex/client';
import { ChatSDKError } from '@/lib/errors';

export async function GET(request: Request) {
  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError('unauthorized:documents').toResponse();
  }

  try {
    const documents = await convexQueries.getDocumentsByUserId({ 
      userId: session.user.id 
    });

    // Return only the 5 most recent documents
    const recentDocuments = documents.slice(0, 5);

    return Response.json(recentDocuments, { status: 200 });
  } catch (error) {
    console.error('Error fetching recent documents:', error);
    return new ChatSDKError('internal:documents').toResponse();
  }
}