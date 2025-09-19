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

    const clerkUserId = session.user.id;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100');

    // Get user's accessible metrics via organization
    const metrics = await db`
      SELECT
        lm.id as "_id",
        lm.name,
        lm.description,
        lm.latex_code as "latexFormula",
        lm.formula as "sqlFormula",
        lm.created_at as "createdAt",
        lm.updated_at as "updatedAt",
        o.name as "organizationName"
      FROM users u
      LEFT JOIN organizations o ON u.clerk_organization_id = o.clerk_organization_id
      LEFT JOIN latex_metrics lm ON o.id = lm.organization_id
      WHERE u.clerk_user_id = ${clerkUserId}
        AND lm.is_active = true
      ORDER BY lm.name
      LIMIT ${limit}
    `;

    // Filter out null results (users without organizations or metrics)
    const validMetrics = metrics.filter(m => m._id !== null);

    return NextResponse.json({ metrics: validMetrics });

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

    const clerkUserId = session.user.id;

    // Get user and organization
    const user = await db`
      SELECT id, clerk_organization_id
      FROM users
      WHERE clerk_user_id = ${clerkUserId}
    `;

    if (user.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userId = user[0].id;
    const clerkOrgId = user[0].clerk_organization_id;

    if (!clerkOrgId) {
      return NextResponse.json(
        { error: 'User must belong to an organization to create metrics' },
        { status: 400 }
      );
    }

    // Get organization
    const org = await db`
      SELECT id
      FROM organizations
      WHERE clerk_organization_id = ${clerkOrgId}
    `;

    if (org.length === 0) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const organizationId = org[0].id;

    // Create new metric
    const newMetric = await db`
      INSERT INTO latex_metrics (
        organization_id,
        name,
        description,
        latex_code,
        formula,
        created_by
      )
      VALUES (
        ${organizationId},
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