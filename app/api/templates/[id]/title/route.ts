import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { neon } from '@neondatabase/serverless';

// PATCH /api/templates/[id]/title - Update template title
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
    const { title } = await request.json();

    if (!title || typeof title !== 'string' || !title.trim()) {
      return NextResponse.json(
        { error: 'Title is required and must be a non-empty string' },
        { status: 400 }
      );
    }

    const sql = neon(process.env.DATABASE_URL!);

    // Only template owner can change title
    const result = await sql`
      WITH user_info AS (
        SELECT id::text as user_id FROM users WHERE clerk_user_id = ${userId} LIMIT 1
      )
      UPDATE analysis_templates
      SET title = ${title.trim()}, updated_at = NOW()
      WHERE id = ${id}::uuid
        AND user_id = (SELECT user_id FROM user_info)
      RETURNING id, title
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
      title: result[0].title,
      message: 'Template title updated successfully'
    });

  } catch (error) {
    console.error('Error updating template title:', error);
    return NextResponse.json(
      { error: 'Failed to update template title' },
      { status: 500 }
    );
  }
}
