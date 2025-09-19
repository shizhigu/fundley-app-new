import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/clerk';
import { db } from '@/lib/db/config';

// GET /api/chats/[chatId] - Get specific chat
export async function GET(
  request: NextRequest,
  { params }: { params: { chatId: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { chatId } = params;
    const clerkUserId = session.user.id;

    // Get chat with user verification
    const chat = await db`
      SELECT
        c.id,
        c.title,
        c.created_at as "createdAt",
        c.updated_at as "updatedAt"
      FROM chats c
      JOIN users u ON c.user_id = u.id
      WHERE c.id = ${chatId} AND u.clerk_user_id = ${clerkUserId}
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
  { params }: { params: { chatId: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { chatId } = params;
    const clerkUserId = session.user.id;

    // Verify user owns this chat and delete it
    const result = await db`
      DELETE FROM chats
      WHERE id = ${chatId} AND user_id = (
        SELECT id FROM users WHERE clerk_user_id = ${clerkUserId}
      )
    `;

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
  { params }: { params: { chatId: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { chatId } = params;
    const { title } = await request.json();
    const clerkUserId = session.user.id;

    // Update chat title
    const result = await db`
      UPDATE chats
      SET title = ${title}, updated_at = NOW()
      WHERE id = ${chatId} AND user_id = (
        SELECT id FROM users WHERE clerk_user_id = ${clerkUserId}
      )
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