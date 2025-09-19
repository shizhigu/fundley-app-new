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
        INSERT INTO chats (title, user_id, organization_id)
        VALUES ('Chat History', ${userId}, ${organizationId})
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