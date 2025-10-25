import { NextRequest, NextResponse } from 'next/server';
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
    // 2. Globally public templates (accessible to all users)
    const templates = await sql`
      WITH user_info AS (
        SELECT id::text as user_id FROM users WHERE clerk_user_id = ${userId} LIMIT 1
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
        CASE WHEN at.user_id = user_info.user_id THEN true ELSE false END as is_mine
      FROM analysis_templates at, user_info
      WHERE
        at.user_id = user_info.user_id
        OR
        at.is_public = true
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
        source: t.is_mine ? 'My Template' : 'Public Template'
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

// POST /api/templates - Save current analysis as template
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { blockId, title, description, category, isPublic = false } = body;

    if (!blockId) {
      return NextResponse.json(
        { error: 'blockId is required' },
        { status: 400 }
      );
    }

    const sql = neon(process.env.DATABASE_URL!);

    // Get user's internal UUID
    const userResult = await sql`
      SELECT id FROM users WHERE clerk_user_id = ${userId} LIMIT 1
    `;

    if (userResult.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const internalUserId = userResult[0].id;

    // Get the analysis block
    const blockResult = await sql`
      SELECT * FROM analysis_blocks
      WHERE id = ${blockId} AND user_id = ${internalUserId}
      LIMIT 1
    `;

    if (blockResult.length === 0) {
      return NextResponse.json(
        { error: 'Analysis block not found' },
        { status: 404 }
      );
    }

    const block = blockResult[0];

    // Create template from the analysis block
    const templateName = `template_${Date.now()}`;
    const templateTitle = title || block.title || 'Untitled Template';
    const templateDescription = description || block.description || '';
    const templateCategory = category || 'general';

    const result = await sql`
      INSERT INTO analysis_templates (
        user_id,
        template_name,
        title,
        description,
        category,
        code,
        is_public,
        metadata
      ) VALUES (
        ${internalUserId},
        ${templateName},
        ${templateTitle},
        ${templateDescription},
        ${templateCategory},
        '',
        ${isPublic},
        ${JSON.stringify({
          source_block_id: blockId,
          symbols: block.symbols || [],
          created_from: 'command_palette'
        })}
      )
      RETURNING id, title, description, category, created_at
    `;

    return NextResponse.json({
      success: true,
      template: result[0]
    });

  } catch (error) {
    console.error('Error creating template:', error);
    return NextResponse.json(
      { error: 'Failed to create template' },
      { status: 500 }
    );
  }
}
