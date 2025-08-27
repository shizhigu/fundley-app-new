import { auth } from '@/lib/auth/clerk';
import { db } from '@/lib/db/drizzle';
import { document } from '@/lib/db/schema';
import { eq, desc, and } from 'drizzle-orm';
import { ChatSDKError } from '@/lib/errors';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  const chatId = searchParams.get('chatId');
  const limit = parseInt(searchParams.get('limit') || '50');

  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError('unauthorized:documents').toResponse();
  }

  try {
    let conditions = [eq(document.userId, session.user.id)];

    // Add additional filters if provided
    if (chatId) {
      // Note: We'd need to add a chatId column to the document table
      // For now, we'll just return user's documents
    }

    const documents = await db
      .select()
      .from(document)
      .where(and(...conditions))
      .orderBy(desc(document.createdAt))
      .limit(limit);

    return Response.json(documents, { status: 200 });
  } catch (error) {
    console.error('Error fetching documents:', error);
    return new ChatSDKError('internal:documents').toResponse();
  }
}

// Get recent documents
export async function GET_RECENT(request: Request) {
  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError('unauthorized:documents').toResponse();
  }

  try {
    const documents = await db
      .select()
      .from(document)
      .where(eq(document.userId, session.user.id))
      .orderBy(desc(document.createdAt))
      .limit(5);

    return Response.json(documents, { status: 200 });
  } catch (error) {
    console.error('Error fetching recent documents:', error);
    return new ChatSDKError('internal:documents').toResponse();
  }
}