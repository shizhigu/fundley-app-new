import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/clerk';
import { db } from '@/lib/db/config';

// GET /api/chats - List user's chats
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id; // This is already the database UUID from auth()

    // Get user's chats with ADK session mapping
    const chats = await db`
      SELECT
        c.id,
        c.title,
        c.langgraph_thread_id as "sessionId",
        c.created_at as "createdAt",
        c.updated_at as "updatedAt"
      FROM chats c
      WHERE c.user_id = ${userId}
      ORDER BY c.updated_at DESC
    `;

    return NextResponse.json({ chats });

  } catch (error) {
    console.error('Error fetching chats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch chats' },
      { status: 500 }
    );
  }
}

// POST /api/chats - Create new chat
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { title } = await request.json();
    const userId = session.user.id; // This is already the database UUID from auth()

    // Get user organization info
    const user = await db`
      SELECT id, clerk_organization_id
      FROM users
      WHERE id = ${userId}
    `;

    // User should exist (created by auth system), but handle edge case
    if (user.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get organization if user belongs to one
    let organizationId = null;
    if (user[0].clerk_organization_id) {
      const org = await db`
        SELECT id
        FROM organizations
        WHERE clerk_organization_id = ${user[0].clerk_organization_id}
      `;
      if (org.length > 0) {
        organizationId = org[0].id;
      }
    }

    // Generate unique ADK session ID
    const adkSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create new chat with ADK session mapping
    const newChat = await db`
      INSERT INTO chats (id, title, user_id, organization_id, langgraph_thread_id, created_at, updated_at)
      VALUES (uuid_generate_v4(), ${title || 'New Chat'}, ${userId}, ${organizationId}, ${adkSessionId}, NOW(), NOW())
      RETURNING id, title, langgraph_thread_id as "sessionId", created_at as "createdAt", updated_at as "updatedAt"
    `;

    return NextResponse.json({ chat: newChat[0] });

  } catch (error) {
    console.error('Error creating chat:', error);
    return NextResponse.json(
      { error: 'Failed to create chat' },
      { status: 500 }
    );
  }
}