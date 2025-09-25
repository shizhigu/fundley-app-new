import { NextRequest, NextResponse } from 'next/server'
import { auth as clerkAuth } from '@clerk/nextjs/server'
import { auth } from '@/lib/auth/clerk'
import { db } from '@/lib/db/config'

// 自定义指标响应类型
interface CustomMetricResponse {
  _id: string;
  name: string;
  description?: string;
  formula: any; // JSONB field from database
  latexFormula?: string;
  sqlFormula?: string;
  createdAt?: string;
  updatedAt?: string;
  organizationName?: string;
}

/**
 * POST /api/custom-metrics
 * 创建新的自定义财务指标
 */
export async function POST(request: NextRequest) {
  try {
    // 获取认证信息
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { name, description, category, formula, prompt, isPublic, calculationType } = body

    // 验证必需字段
    if (!name || !description || !formula) {
      return NextResponse.json(
        { error: 'Missing required fields: name, description, formula' },
        { status: 400 }
      )
    }

    // 插入到 PostgreSQL 数据库
    const result = await db`
      INSERT INTO latex_metrics (
        name,
        description,
        latex_code,
        formula,
        created_by,
        is_active,
        created_at
      ) VALUES (
        ${name},
        ${description},
        ${formula.latex || ''},
        ${JSON.stringify(formula)},
        ${session.user.id},
        true,
        NOW()
      )
      RETURNING id::text, name, description, formula, created_at
    `

    return NextResponse.json({
      success: true,
      id: result[0].id,
      message: `创建了自定义指标: ${name}`,
      metric: result[0]
    })

  } catch (error) {
    console.error('Create custom metric API error:', error)

    return NextResponse.json(
      { error: error instanceof Error ? error.message : '创建指标失败' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/custom-metrics
 * 获取用户的自定义指标列表 - 从 PostgreSQL (使用组织访问控制)
 */
export async function GET(request: NextRequest) {
  try {
    // 获取认证信息
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const clerkUserId = session.user.clerkId
    const { searchParams } = new URL(request.url)
    const includePublic = searchParams.get('includePublic') === 'true'

    console.log('📊 Fetching custom metrics from PostgreSQL...')
    console.log('👤 Clerk User ID:', clerkUserId)
    console.log('🌍 Include public metrics:', includePublic)

    // 查询用户所属组织的所有指标（直接使用内部组织ID）
    const metrics = await db`
      SELECT
        lm.id::text as "_id",
        lm.name,
        lm.description,
        lm.latex_code as "latexFormula",
        lm.formula->>'sql' as "sqlFormula",
        lm.formula as "formula",
        lm.created_at as "createdAt",
        lm.updated_at as "updatedAt",
        o.name as "organizationName"
      FROM users u
      JOIN organizations o ON u.organization_id = o.id
      JOIN latex_metrics lm ON o.id = lm.organization_id
      WHERE u.clerk_user_id = ${clerkUserId}
        AND lm.is_active = true
      ORDER BY lm.name
    `

    // 过滤掉空结果（无组织或无指标的用户）
    const validMetrics = metrics.filter(m => m._id !== null)

    console.log(`✅ Found ${validMetrics.length} custom metrics from PostgreSQL`)

    // 转换数据格式以匹配前端期望的格式
    const formattedMetrics: CustomMetricResponse[] = validMetrics.map(metric => ({
      _id: metric._id,
      name: metric.name,
      description: metric.description,
      formula: metric.formula, // 保持 JSONB 格式
      latexFormula: metric.latexFormula,
      sqlFormula: metric.sqlFormula || metric.formula?.sqlFormula || '',
      createdAt: metric.createdAt,
      updatedAt: metric.updatedAt || metric.createdAt,
      organizationName: metric.organizationName || 'Personal'
    }))

    console.log('📝 Sample metric structure:', formattedMetrics[0] ? {
      _id: formattedMetrics[0]._id,
      name: formattedMetrics[0].name,
      hasFormula: !!formattedMetrics[0].formula,
      formulaKeys: formattedMetrics[0].formula ? Object.keys(formattedMetrics[0].formula) : []
    } : 'No metrics found')

    return NextResponse.json(formattedMetrics)

  } catch (error) {
    console.error('Get custom metrics API error:', error)

    return NextResponse.json(
      { error: error instanceof Error ? error.message : '获取指标列表失败' },
      { status: 500 }
    )
  }
}