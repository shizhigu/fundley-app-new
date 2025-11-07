import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || 'http://localhost:8000';

export async function POST(request: Request) {
  try {
    // Verify authentication
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get internal user ID
    const userResult = await sql`
      SELECT id FROM users WHERE clerk_user_id = ${clerkUserId}
    `;

    if (!userResult || userResult.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const userId = userResult[0].id;
    const { slug } = await request.json();

    if (!slug) {
      return NextResponse.json(
        { error: 'Slug is required' },
        { status: 400 }
      );
    }

    // Get app details from database
    const appResult = await sql`
      SELECT title, description, slug
      FROM data_apps
      WHERE user_id = ${userId} AND slug = ${slug} AND deployment_status = 'archived'
    `;

    if (!appResult || appResult.length === 0) {
      return NextResponse.json(
        { error: 'Archived app not found' },
        { status: 404 }
      );
    }

    const app = appResult[0];

    // Call Python service to redeploy
    // The deploy_streamlit_app tool will:
    // 1. Check if source code exists at /workspace/data_apps/{slug}/
    // 2. Deploy from existing source
    // 3. Update database status to 'deploying'
    const response = await fetch(`${PYTHON_SERVICE_URL}/api/v1/data-apps/redeploy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: userId,
        slug: app.slug,
        title: app.title,
        description: app.description,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { error: errorData.error || 'Failed to redeploy dashboard' },
        { status: response.status }
      );
    }

    const result = await response.json();
    return NextResponse.json(result);

  } catch (error) {
    console.error('Error in redeploy route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
