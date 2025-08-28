import { auth } from '@/lib/auth/clerk';
import { getChatById, getMessagesByChatId, getVisualizationCachesByChat } from '@/lib/db/queries';
import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  const chat = await getChatById({ id });
  if (!chat) {
    return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
  }

  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check visibility permissions
  if (chat.visibility === 'private') {
    if (!session.user || session.user.id !== chat.userId) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
    }
  }

  const messages = await getMessagesByChatId({ id });
  const vizCaches = await getVisualizationCachesByChat(id);

  return NextResponse.json({
    chat: {
      id: chat.id,
      visibility: chat.visibility,
      userId: chat.userId,
    },
    messages,
    vizCaches,
  });
}