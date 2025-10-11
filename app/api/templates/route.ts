import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { neon } from '@neondatabase/serverless';

// GET /api/templates - List all templates accessible to user
export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sql = neon(process.env.DATABASE_URL!);

    // Get templates accessible to this user:
    // 1. Templates created by this user (private or public)
    // 2. Public templates from same organization
    const templates = await sql`
      WITH user_info AS (
        SELECT id::text as user_id, organization_id FROM users WHERE clerk_user_id = ${userId} LIMIT 1
      )
      SELECT
        at.id,
        at.template_name,
        at.title,
        at.description,
        at.category,
        at.created_at,
        at.updated_at,
        at.is_public,
        at.user_id,
        at.organization_id,
        CASE WHEN at.user_id = user_info.user_id THEN true ELSE false END as is_mine
      FROM analysis_templates at, user_info
      WHERE
        at.user_id = user_info.user_id
        OR
        (at.is_public = true AND at.organization_id = user_info.organization_id)
      ORDER BY is_mine DESC, at.created_at DESC
    `;

    return NextResponse.json({
      success: true,
      templates: templates.map(t => ({
        id: t.id,
        title: t.title,
        description: t.description,
        category: t.category,
        created_at: t.created_at,
        updated_at: t.updated_at,
        is_public: t.is_public,
        is_mine: t.is_mine,
        source: t.is_mine ? 'My Template' : 'Team Template'
      }))
    });

  } catch (error) {
    console.error('Error fetching templates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch templates' },
      { status: 500 }
    );
  }
}
