import { NextRequest, NextResponse } from 'next/server'
import { auth as clerkAuth } from '@clerk/nextjs/server'
import { auth } from '@/lib/auth/clerk'
import { api } from '@/convex/_generated/api'
import { ConvexHttpClient } from 'convex/browser'

/**
 * GET /api/custom-metrics/[id]
 * 获取指定ID的自定义指标详情
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    const token = await getToken({ template: 'convex' })
    if (token) {
      convex.setAuth(token)
    }

    const { id } = await params

    if (!id) {
      return NextResponse.json(
        { error: 'Missing metric ID' },
        { status: 400 }
      )
    }

    // 调用Convex query
    const metric = await convex.query(api.customMetrics.getById, {
      id: id as any // Convex ID类型
    })

    if (!metric) {
      return NextResponse.json(
        { error: 'Metric not found or access denied' },
        { status: 404 }
      )
    }

    return NextResponse.json(metric)

  } catch (error) {
    console.error('Get custom metric by ID API error:', error)
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '获取指标失败' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/custom-metrics/[id]
 * 更新指定ID的自定义指标
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    const token = await getToken({ template: 'convex' })
    if (token) {
      convex.setAuth(token)
    }

    const { id } = await params
    const body = await request.json()

    if (!id) {
      return NextResponse.json(
        { error: 'Missing metric ID' },
        { status: 400 }
      )
    }

    // 调用Convex mutation
    const updatedId = await convex.mutation(api.customMetrics.update, {
      id: id as any,
      ...body
    })

    return NextResponse.json({
      success: true,
      id: updatedId.toString(),
      message: 'Metric updated successfully'
    })

  } catch (error) {
    console.error('Update custom metric API error:', error)
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '更新指标失败' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/custom-metrics/[id]
 * 删除指定ID的自定义指标
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    const token = await getToken({ template: 'convex' })
    if (token) {
      convex.setAuth(token)
    }

    const { id } = await params

    if (!id) {
      return NextResponse.json(
        { error: 'Missing metric ID' },
        { status: 400 }
      )
    }

    // 调用Convex mutation
    await convex.mutation(api.customMetrics.remove, {
      id: id as any
    })

    return NextResponse.json({
      success: true,
      message: 'Metric deleted successfully'
    })

  } catch (error) {
    console.error('Delete custom metric API error:', error)
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '删除指标失败' },
      { status: 500 }
    )
  }
}