import { auth } from '@clerk/nextjs/server';
import { neon } from '@neondatabase/serverless';
import { NextResponse } from 'next/server';

const sql = neon(process.env.DATABASE_URL!);

export async function GET() {
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get internal user ID from Clerk ID
    const userResult = await sql`
      SELECT id FROM users WHERE clerk_user_id = ${clerkUserId}
    `;

    if (userResult.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userId = userResult[0].id;

    // Fetch user's data apps
    const apps = await sql`
      SELECT
        id,
        title,
        slug,
        description,
        url,
        deployment_status,
        created_at,
        updated_at
      FROM data_apps
      WHERE user_id = ${userId}
      ORDER BY updated_at DESC
    `;

    return NextResponse.json({ apps });
  } catch (error) {
    console.error('Error fetching data apps:', error);
    return NextResponse.json(
      { error: 'Failed to fetch data apps' },
      { status: 500 }
    );
  }
}
