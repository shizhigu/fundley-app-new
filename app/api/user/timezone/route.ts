import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/clerk';
import { db } from '@/lib/db/config';

export const dynamic = 'force-dynamic';

/**
 * Update user's timezone
 * Called by frontend on each connection/page load
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const { timezone } = await request.json();

    // Validate timezone format (IANA timezone string)
    if (!timezone || typeof timezone !== 'string') {
      return NextResponse.json(
        { error: 'Invalid timezone format' },
        { status: 400 }
      );
    }

    // Update user's timezone in database
    await db`
      UPDATE users
      SET timezone = ${timezone}, updated_at = NOW()
      WHERE id = ${userId}
    `;

    console.log(`✅ Updated timezone for user ${userId}: ${timezone}`);

    return NextResponse.json({
      success: true,
      timezone,
    });
  } catch (error) {
    console.error('❌ Error updating user timezone:', error);
    return NextResponse.json(
      { error: 'Failed to update timezone' },
      { status: 500 }
    );
  }
}

/**
 * Get user's current timezone
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    const [user] = await db`
      SELECT timezone FROM users WHERE id = ${userId}
    `;

    return NextResponse.json({
      timezone: user?.timezone || 'America/New_York',
    });
  } catch (error) {
    console.error('❌ Error fetching user timezone:', error);
    return NextResponse.json(
      { error: 'Failed to fetch timezone' },
      { status: 500 }
    );
  }
}
