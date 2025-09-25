import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/clerk';
import { db } from '@/lib/db/config';

// GET /api/chats/[chatId] - Get specific chat
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ chatId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { chatId } = await params;
    const userId = session.user.id;

    // Get chat with user verification
    const chat = await db`
      SELECT
        c.id,
        c.title,
        c.created_at as "createdAt",
        c.updated_at as "updatedAt"
      FROM chats c
      WHERE c.id = ${chatId} AND c.user_id = ${userId}
    `;

    if (chat.length === 0) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
    }

    return NextResponse.json({ chat: chat[0] });

  } catch (error) {
    console.error('Error fetching chat:', error);
    return NextResponse.json(
      { error: 'Failed to fetch chat' },
      { status: 500 }
    );
  }
}

// DELETE /api/chats/[chatId] - Delete chat
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ chatId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { chatId } = await params;
    const userId = session.user.id;

    console.log(`🗑️ Deleting chat ${chatId} for user ${userId}`);

    // First, delete associated messages
    console.log('🗑️ Deleting messages...');
    const messagesDeleted = await db`
      DELETE FROM messages
      WHERE chat_id = ${chatId} AND EXISTS (
        SELECT 1 FROM chats c
        WHERE c.id = ${chatId} AND c.user_id = ${userId}
      )
    `;
    console.log(`🗑️ Deleted ${messagesDeleted.length} messages`);

    // Then delete the chat
    console.log('🗑️ Deleting chat...');
    const result = await db`
      DELETE FROM chats
      WHERE id = ${chatId} AND user_id = ${userId}
      RETURNING id
    `;

    console.log('🗑️ Delete result:', result);

    if (result.length === 0) {
      console.log('❌ Chat not found or permission denied');
      return NextResponse.json({ error: 'Chat not found or permission denied' }, { status: 404 });
    }

    console.log('✅ Chat deleted successfully');
    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error deleting chat:', error);
    return NextResponse.json(
      { error: 'Failed to delete chat' },
      { status: 500 }
    );
  }
}

// PUT /api/chats/[chatId] - Update chat
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ chatId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { chatId } = await params;
    const { title } = await request.json();
    const userId = session.user.id;

    // Update chat title
    const result = await db`
      UPDATE chats
      SET title = ${title}, updated_at = NOW()
      WHERE id = ${chatId} AND user_id = ${userId}
      RETURNING id, title, created_at as "createdAt", updated_at as "updatedAt"
    `;

    if (result.length === 0) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
    }

    return NextResponse.json({ chat: result[0] });

  } catch (error) {
    console.error('Error updating chat:', error);
    return NextResponse.json(
      { error: 'Failed to update chat' },
      { status: 500 }
    );
  }
}