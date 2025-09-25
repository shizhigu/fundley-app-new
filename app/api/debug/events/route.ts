import { NextResponse } from 'next/server';
import { db } from '@/lib/db/config';

export async function GET() {
  try {
    // 获取最新的几个 chat
    const chats = await db`
      SELECT id, langgraph_thread_id, title, created_at
      FROM chats
      ORDER BY created_at DESC
      LIMIT 3
    `;

    // 获取最新的 events
    const events = await db`
      SELECT *
      FROM events
      ORDER BY timestamp DESC
      LIMIT 15
    `;

    return NextResponse.json({
      success: true,
      chats,
      events,
      eventCount: events.length
    });

  } catch (error) {
    console.error('Debug error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}