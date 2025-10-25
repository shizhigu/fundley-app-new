import { auth } from '@/lib/auth/clerk';
import { neon } from '@neondatabase/serverless';
import { NextRequest, NextResponse } from 'next/server';

const sql = neon(process.env.DATABASE_URL!);

// GET - Fetch all templates for current user
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const templates = await sql`
      SELECT id, name, sql_query, description, created_at, updated_at
      FROM sql_templates
      WHERE user_id = ${session.user.id}
      ORDER BY created_at DESC
    `;

    return NextResponse.json({ templates });
  } catch (error) {
    console.error('Failed to fetch SQL templates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch templates' },
      { status: 500 }
    );
  }
}

// POST - Create new template
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, sql_query, description } = body;

    if (!name || !sql_query) {
      return NextResponse.json(
        { error: 'Name and SQL query are required' },
        { status: 400 }
      );
    }

    // Check if template name already exists for this user
    const existing = await sql`
      SELECT id FROM sql_templates
      WHERE user_id = ${session.user.id} AND name = ${name}
    `;

    if (existing.length > 0) {
      return NextResponse.json(
        { error: 'Template with this name already exists' },
        { status: 409 }
      );
    }

    const result = await sql`
      INSERT INTO sql_templates (user_id, name, sql_query, description)
      VALUES (${session.user.id}, ${name}, ${sql_query}, ${description || null})
      RETURNING id, name, sql_query, description, created_at, updated_at
    `;

    return NextResponse.json({ template: result[0] }, { status: 201 });
  } catch (error) {
    console.error('Failed to create SQL template:', error);
    return NextResponse.json(
      { error: 'Failed to create template' },
      { status: 500 }
    );
  }
}

// DELETE - Delete template
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Template ID is required' },
        { status: 400 }
      );
    }

    const result = await sql`
      DELETE FROM sql_templates
      WHERE id = ${id} AND user_id = ${session.user.id}
      RETURNING id
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete SQL template:', error);
    return NextResponse.json(
      { error: 'Failed to delete template' },
      { status: 500 }
    );
  }
}

// PUT - Update template
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, name, sql_query, description } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Template ID is required' },
        { status: 400 }
      );
    }

    const result = await sql`
      UPDATE sql_templates
      SET
        name = COALESCE(${name}, name),
        sql_query = COALESCE(${sql_query}, sql_query),
        description = COALESCE(${description}, description)
      WHERE id = ${id} AND user_id = ${session.user.id}
      RETURNING id, name, sql_query, description, created_at, updated_at
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ template: result[0] });
  } catch (error) {
    console.error('Failed to update SQL template:', error);
    return NextResponse.json(
      { error: 'Failed to update template' },
      { status: 500 }
    );
  }
}
