import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/clerk'
import { api } from '@/convex/_generated/api'
import { ConvexHttpClient } from 'convex/browser'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

/**
 * GET /api/custom-metrics/search
 * 搜索自定义财务指标
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' }, 
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const query = searchParams.get('query')
    const includePublic = searchParams.get('includePublic') === 'true'

    if (!query) {
      return NextResponse.json(
        { error: 'Missing search query' },
        { status: 400 }
      )
    }

    // 调用Convex query
    const results = await convex.query(api.metrics.search, {
      query,
      includePublic
    })

    return NextResponse.json(results)

  } catch (error) {
    console.error('Search custom metrics API error:', error)
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '搜索失败' },
      { status: 500 }
    )
  }
}