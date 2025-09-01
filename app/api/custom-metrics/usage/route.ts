import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/clerk'
import { api } from '@/convex/_generated/api'
import { ConvexHttpClient } from 'convex/browser'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

/**
 * POST /api/custom-metrics/usage
 * 记录自定义指标使用情况
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' }, 
        { status: 401 }
      )
    }

    const body = await request.json()
    const { metricId, calculationTime, success } = body

    if (!metricId) {
      return NextResponse.json(
        { error: 'Missing metricId' },
        { status: 400 }
      )
    }

    // 调用Convex mutation
    await convex.mutation(api.customMetrics.recordUsage, {
      metricId: metricId as any,
      calculationTime: calculationTime || 0,
      success: success !== false
    })

    return NextResponse.json({
      success: true,
      message: 'Usage recorded'
    })

  } catch (error) {
    console.error('Record usage API error:', error)
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '记录使用情况失败' },
      { status: 500 }
    )
  }
}