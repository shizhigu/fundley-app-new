import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/clerk';
import { db } from '@/lib/db/config';

// GET /api/chats/[chatId]/messages - Get messages for a chat
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

    // Verify user owns this chat
    const chatCheck = await db`
      SELECT c.id
      FROM chats c
      JOIN users u ON c.user_id = u.id
      WHERE c.id = ${chatId} AND u.clerk_user_id = ${clerkUserId}
    `;

    if (chatCheck.length === 0) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
    }

    // Get messages
    const messages = await db`
      SELECT
        id,
        role,
        content,
        metadata as parts,
        created_at as "createdAt"
      FROM messages
      WHERE chat_id = ${chatId}
      ORDER BY created_at ASC
    `;

    return NextResponse.json({ messages });

  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}

// POST /api/chats/[chatId]/messages - Create new message
export async function POST(
  request: NextRequest,
  { params }: { params: { chatId: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { chatId } = params;
    const { role, content, parts, attachments = [] } = await request.json();
    const clerkUserId = session.user.id;

    // Verify user owns this chat
    const chatCheck = await db`
      SELECT c.id
      FROM chats c
      JOIN users u ON c.user_id = u.id
      WHERE c.id = ${chatId} AND u.clerk_user_id = ${clerkUserId}
    `;

    if (chatCheck.length === 0) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
    }

    // Create message with parts format (v2 schema)
    const metadata = parts || [{ type: 'text', text: content }];

    const newMessage = await db`
      INSERT INTO messages (chat_id, role, content, metadata)
      VALUES (${chatId}, ${role}, ${content}, ${JSON.stringify(metadata)})
      RETURNING id, role, content, metadata as parts, created_at as "createdAt"
    `;

    // Update chat's updated_at timestamp
    await db`
      UPDATE chats
      SET updated_at = NOW()
      WHERE id = ${chatId}
    `;

    return NextResponse.json({ message: newMessage[0] });

  } catch (error) {
    console.error('Error creating message:', error);
    return NextResponse.json(
      { error: 'Failed to create message' },
      { status: 500 }
    );
  }
}