import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/clerk';
import { db } from '@/lib/db/config';

// GET /api/latex-metrics - Get user's accessible LaTeX metrics
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100');

    // Get user's own metrics
    const metrics = await db`
      SELECT
        lm.id as "_id",
        lm.name,
        lm.description,
        lm.latex_code as "latexFormula",
        lm.formula->>'sql' as "sqlFormula",
        lm.formula as "formula",
        lm.created_at as "createdAt",
        lm.updated_at as "updatedAt"
      FROM latex_metrics lm
      WHERE lm.user_id = ${userId}
        AND lm.is_active = true
      ORDER BY lm.name
      LIMIT ${limit}
    `;

    return NextResponse.json({ metrics });

  } catch (error) {
    console.error('Error fetching LaTeX metrics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch metrics' },
      { status: 500 }
    );
  }
}

// POST /api/latex-metrics - Create new LaTeX metric
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      name,
      description,
      latexFormula,
      sqlFormula,
      variableMapping,
      category = 'custom'
    } = await request.json();

    const userId = session.user.id;

    // Create new metric
    const newMetric = await db`
      INSERT INTO latex_metrics (
        user_id,
        name,
        description,
        latex_code,
        formula,
        created_by
      )
      VALUES (
        ${userId},
        ${name},
        ${description},
        ${latexFormula},
        ${JSON.stringify({ sqlFormula, variableMapping, category })},
        ${userId}
      )
      RETURNING
        id as "_id",
        name,
        description,
        latex_code as "latexFormula",
        formula as "sqlFormula",
        created_at as "createdAt",
        updated_at as "updatedAt"
    `;

    return NextResponse.json({ metric: newMetric[0] });

  } catch (error) {
    console.error('Error creating LaTeX metric:', error);
    return NextResponse.json(
      { error: 'Failed to create metric' },
      { status: 500 }
    );
  }
}