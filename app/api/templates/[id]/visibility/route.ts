import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { neon } from '@neondatabase/serverless';

// PATCH /api/templates/[id]/visibility - Toggle template visibility
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { is_public } = await request.json();

    if (typeof is_public !== 'boolean') {
      return NextResponse.json(
        { error: 'is_public must be a boolean' },
        { status: 400 }
      );
    }

    const sql = neon(process.env.DATABASE_URL!);

    // Only template owner can change visibility
    const result = await sql`
      WITH user_info AS (
        SELECT id::text as user_id FROM users WHERE clerk_user_id = ${userId} LIMIT 1
      )
      UPDATE analysis_templates
      SET is_public = ${is_public}, updated_at = NOW()
      WHERE id = ${id}::uuid
        AND user_id = (SELECT user_id FROM user_info)
      RETURNING id, is_public
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Template not found or you don\'t have permission' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      template_id: result[0].id,
      is_public: result[0].is_public,
      message: is_public ? 'Template shared with organization' : 'Template is now private'
    });

  } catch (error) {
    console.error('Error updating template visibility:', error);
    return NextResponse.json(
      { error: 'Failed to update template visibility' },
      { status: 500 }
    );
  }
}
