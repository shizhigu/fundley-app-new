import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/clerk';
import { db } from '@/lib/db/config';

// GET /api/chats/default - Get or create default chat
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // Get user organization info if needed (using session.user data directly)
    const user = await db`
      SELECT id, clerk_organization_id
      FROM users
      WHERE id = ${userId}
    `;

    // User should exist (created by auth system), but handle edge case
    if (user.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Try to find existing chat
    let chat = await db`
      SELECT id, title, created_at as "createdAt", updated_at as "updatedAt"
      FROM chats
      WHERE user_id = ${userId}
      ORDER BY updated_at DESC
      LIMIT 1
    `;

    // If no chat exists, create default chat
    if (chat.length === 0) {
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

      chat = await db`
        INSERT INTO chats (id, title, user_id, organization_id, created_at, updated_at)
        VALUES (uuid_generate_v4(), 'Chat History', ${userId}, ${organizationId}, NOW(), NOW())
        RETURNING id, title, created_at as "createdAt", updated_at as "updatedAt"
      `;
    }

    return NextResponse.json({ chatId: chat[0].id });

  } catch (error) {
    console.error('Error getting/creating default chat:', error);
    return NextResponse.json(
      { error: 'Failed to get default chat' },
      { status: 500 }
    );
  }
}