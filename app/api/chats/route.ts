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

    const clerkUserId = session.user.id;

    // Get user's chats
    const chats = await db`
      SELECT
        c.id,
        c.title,
        c.created_at as "createdAt",
        c.updated_at as "updatedAt"
      FROM chats c
      JOIN users u ON c.user_id = u.id
      WHERE u.clerk_user_id = ${clerkUserId}
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
    const clerkUserId = session.user.id;

    // Get or create user
    let user = await db`
      SELECT id, clerk_organization_id
      FROM users
      WHERE clerk_user_id = ${clerkUserId}
    `;

    if (user.length === 0) {
      // Create user if doesn't exist
      user = await db`
        INSERT INTO users (email, clerk_user_id, clerk_organization_id)
        VALUES (${session.user.emailAddresses[0]?.emailAddress || `user-${clerkUserId}@temp.com`}, ${clerkUserId}, ${session.user.organizationId})
        RETURNING id, clerk_organization_id
      `;
    }

    const userId = user[0].id;

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

    // Create new chat
    const newChat = await db`
      INSERT INTO chats (title, user_id, organization_id)
      VALUES (${title || 'New Chat'}, ${userId}, ${organizationId})
      RETURNING id, title, created_at as "createdAt", updated_at as "updatedAt"
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