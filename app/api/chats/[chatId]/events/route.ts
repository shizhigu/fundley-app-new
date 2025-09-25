import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/clerk';
import { neon } from '@neondatabase/serverless';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}

const sql = neon(process.env.DATABASE_URL);

export interface EventContent {
  role: 'user' | 'model';
  parts: Array<{
    text?: string;
    function_call?: {
      id: string;
      name: string;
      args: any;
    };
    function_response?: {
      id: string;
      name: string;
      response: any;
    };
    thought_signature?: string;
  }>;
}

export interface EventRecord {
  id: string;
  session_id: string;
  author: string;
  content: EventContent;
  timestamp: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ chatId: string }> }
) {
  try {
    const session = await auth();
    if (!session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { chatId } = await params;

    // 首先验证用户是否有权限访问这个chat
    const chatAccess = await sql`
      SELECT c.langgraph_thread_id as session_id
      FROM chats c
      WHERE c.id = ${chatId} AND c.user_id = ${session.user.id}
    `;

    if (chatAccess.length === 0) {
      return NextResponse.json({ error: 'Chat not found or access denied' }, { status: 404 });
    }

    const sessionId = chatAccess[0].session_id;

    // 现在安全地查询events表
    const events = await sql`
      SELECT
        id,
        session_id,
        author,
        content,
        timestamp
      FROM events
      WHERE session_id = ${sessionId}
      ORDER BY timestamp ASC
    `;

    // Transform events to our format
    const transformedEvents: EventRecord[] = events.map((event: any) => ({
      id: event.id,
      session_id: event.session_id,
      author: event.author,
      content: event.content as EventContent,
      timestamp: event.timestamp
    }));

    return NextResponse.json({
      success: true,
      events: transformedEvents
    });

  } catch (error) {
    console.error('Error fetching events:', error);
    return NextResponse.json(
      { error: 'Failed to fetch events' },
      { status: 500 }
    );
  }
}