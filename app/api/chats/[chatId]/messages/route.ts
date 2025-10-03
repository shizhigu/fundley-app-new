import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/clerk';
import { db } from '@/lib/db/config';

// GET /api/chats/[chatId]/messages - Get messages for a chat
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ chatId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { chatId } = await params;
    const userId = session.user.id;

    // Verify user owns this chat
    const chatCheck = await db`
      SELECT c.id
      FROM chats c
      WHERE c.id = ${chatId} AND c.user_id = ${userId}
    `;

    if (chatCheck.length === 0) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
    }

    // Get messages from new simplified table including attachments
    const rawMessages = await db`
      SELECT
        id,
        role,
        content,
        tool_name,
        tool_args,
        tool_result,
        attachments,
        invocation_id,
        created_at as timestamp
      FROM messages
      WHERE chat_id = ${chatId}
      ORDER BY created_at ASC
    `;

    // Parse JSON fields back to objects with error handling
    const messages = rawMessages.map((msg) => {
      let parsedToolArgs = null;
      let parsedToolResult = null;
      let parsedAttachments = [];

      // Safe JSON parsing for tool_args
      if (msg.tool_args) {
        if (typeof msg.tool_args === 'string') {
          try {
            parsedToolArgs = JSON.parse(msg.tool_args);
          } catch (error) {
            console.warn(
              `Invalid JSON in tool_args for message ${msg.id}:`,
              msg.tool_args,
            );
            parsedToolArgs = msg.tool_args; // Keep as string if parsing fails
          }
        } else {
          parsedToolArgs = msg.tool_args;
        }
      }

      // Safe JSON parsing for tool_result
      if (msg.tool_result) {
        if (typeof msg.tool_result === 'string') {
          try {
            parsedToolResult = JSON.parse(msg.tool_result);
          } catch (error) {
            // console.warn(
            //   `Invalid JSON in tool_result for message ${msg.id}:`,
            //   msg.tool_result,
            // );
            parsedToolResult = msg.tool_result; // Keep as string if parsing fails
          }
        } else {
          parsedToolResult = msg.tool_result;
        }
      }

      // Safe JSON parsing for attachments
      if (msg.attachments) {
        if (typeof msg.attachments === 'string') {
          try {
            parsedAttachments = JSON.parse(msg.attachments);
          } catch (error) {
            console.warn(
              `Invalid JSON in attachments for message ${msg.id}:`,
              msg.attachments,
            );
            parsedAttachments = []; // Default to empty array if parsing fails
          }
        } else if (Array.isArray(msg.attachments)) {
          parsedAttachments = msg.attachments;
        }
      }

      return {
        ...msg,
        tool_args: parsedToolArgs,
        tool_result: parsedToolResult,
        attachments: parsedAttachments,
      };
    });

    return NextResponse.json({ success: true, messages });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 },
    );
  }
}

// POST /api/chats/[chatId]/messages - Create new message
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ chatId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { chatId } = await params;
    const { role, content, tool_name, tool_args, tool_result } =
      await request.json();
    const userId = session.user.id;

    // Verify user owns this chat
    const chatCheck = await db`
      SELECT c.id
      FROM chats c
      WHERE c.id = ${chatId} AND c.user_id = ${userId}
    `;

    if (chatCheck.length === 0) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
    }

    // Create message with new simplified schema
    const newMessage = await db`
      INSERT INTO messages (
        chat_id, role, content, tool_name, tool_args, tool_result
      )
      VALUES (
        ${chatId}, ${role}, ${content || null},
        ${tool_name || null}, ${tool_args || null}, ${tool_result || null}
      )
      RETURNING
        id, role, content, tool_name, tool_args, tool_result,
        created_at as timestamp
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
      { status: 500 },
    );
  }
}
