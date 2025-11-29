import { auth } from '@/lib/auth/clerk';
import { db } from '@/lib/db/config';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const session = await auth();

    if (!session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const clerkUserId = session.user.id;

    // Get database user_id (UUID) from clerk_user_id
    const userResult = await db`
      SELECT id FROM users WHERE clerk_user_id = ${clerkUserId}
    `;

    if (userResult.length === 0) {
      return NextResponse.json(
        { error: 'User not found in database' },
        { status: 404 }
      );
    }

    return NextResponse.json({ userId: userResult[0].id });
  } catch (error) {
    console.error('Error fetching user ID:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
