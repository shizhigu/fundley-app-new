import { auth } from '@/lib/auth/clerk';
import { db } from '@/lib/db/drizzle';
import { document } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { ChatSDKError } from '@/lib/errors';

export async function GET(request: Request) {
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