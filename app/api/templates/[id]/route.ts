import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { neon } from '@neondatabase/serverless';

// DELETE /api/templates/[id] - Delete a template
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const sql = neon(process.env.DATABASE_URL!);

    // Only template owner can delete
    const result = await sql`
      WITH user_info AS (
        SELECT id::text as user_id FROM users WHERE clerk_user_id = ${userId} LIMIT 1
      )
      DELETE FROM analysis_templates
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
      message: `Template "${result[0].title}" deleted successfully`
    });

  } catch (error) {
    console.error('Error deleting template:', error);
    return NextResponse.json(
      { error: 'Failed to delete template' },
      { status: 500 }
    );
  }
}
