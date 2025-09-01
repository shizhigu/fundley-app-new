import { NextRequest, NextResponse } from 'next/server'
import { auth as clerkAuth } from '@clerk/nextjs/server'
import { auth } from '@/lib/auth/clerk'
import { api } from '@/convex/_generated/api'
import { ConvexHttpClient } from 'convex/browser'

/**
 * POST /api/custom-metrics
 * 创建新的自定义财务指标
 */
export async function POST(request: NextRequest) {
  try {
    // 获取认证信息
    const { getToken } = await clerkAuth()
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' }, 
        { status: 401 }
      )
    }

    // 创建认证的 Convex 客户端
    const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)
    convex.setAuth(await getToken({ template: 'convex' }))

    const body = await request.json()
    const { name, description, category, formula, prompt, isPublic } = body

    // 验证必需字段
    if (!name || !description || !formula?.code) {
      return NextResponse.json(
        { error: 'Missing required fields: name, description, formula.code' },
        { status: 400 }
      )
    }

    // 调用Convex mutation
    const metricId = await convex.mutation(api.customMetrics.create, {
      name,
      description,
      category: category || 'custom',
      formula,
      prompt: prompt || `自定义财务指标: ${name}`,
      isPublic: isPublic || false
    })

    return NextResponse.json({
      success: true,
      id: metricId.toString(),
      message: `创建了自定义指标: ${name}`
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
 * 获取用户的自定义指标列表
 */
export async function GET(request: NextRequest) {
  try {
    // 获取认证信息
    const { getToken } = await clerkAuth()
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' }, 
        { status: 401 }
      )
    }

    // 创建认证的 Convex 客户端
    const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)
    convex.setAuth(await getToken({ template: 'convex' }))

    const { searchParams } = new URL(request.url)
    const includePublic = searchParams.get('includePublic') === 'true'

    // 调用Convex query
    const metrics = await convex.query(api.customMetrics.getByUser, {
      includePublic
    })

    return NextResponse.json(metrics)

  } catch (error) {
    console.error('Get custom metrics API error:', error)
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '获取指标列表失败' },
      { status: 500 }
    )
  }
}