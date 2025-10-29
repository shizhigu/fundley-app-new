import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db/config'

/**
 * API endpoint to serve files from user workspace (supports relative paths)
 *
 * GET /api/files/[...path]
 *
 * 新架构：
 * - Agent自由组织workspace: /tmp/fundley/{user_id}/
 * - 支持相对路径: nvda_analysis/report.html, projects/2024/chart.html
 * - 此端点代理到Python file service
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> }
) {
  try {
    // 1. Get authenticated user (Clerk userId)
    const { userId: clerkUserId } = await auth()
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Get file path from params
    const { path } = await params
    if (!path || path.length === 0) {
      return NextResponse.json({ error: 'Missing file path' }, { status: 400 })
    }

    // Join path segments (支持多级目录)
    const filePath = path.join('/')

    // 3. Validate file path (security check - prevent directory traversal)
    if (filePath.includes('..')) {
      return NextResponse.json({ error: 'Invalid file path' }, { status: 400 })
    }

    // 4. Get download flag from query params
    const searchParams = request.nextUrl.searchParams
    const download = searchParams.get('download') === 'true'
    const blockTitle = searchParams.get('title') || 'analysis'
    const blockId = searchParams.get('block_id') // For cache busting via v param

    // 5. Get database user_id from clerk_user_id
    const userResult = await db`
      SELECT id FROM users WHERE clerk_user_id = ${clerkUserId}
    `

    if (userResult.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const dbUserId = userResult[0].id

    // 6. Forward request to Python file service (new path structure)
    const pythonServiceUrl = process.env.AGENTSOS_API_URL || 'http://localhost:8012'
    const pythonFileUrl = `${pythonServiceUrl}/api/v1/analysis/files/${dbUserId}/${filePath}`

    console.log(`📁 [File Proxy] Fetching: ${filePath} for user ${dbUserId}`)

    const response = await fetch(pythonFileUrl)

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json({ error: 'File not found' }, { status: 404 })
      }
      return NextResponse.json(
        { error: 'Failed to fetch file from backend' },
        { status: response.status }
      )
    }

    // 7. Stream the file back to client
    const fileBlob = await response.blob()
    const contentType = response.headers.get('content-type') || 'application/octet-stream'

    const headers: Record<string, string> = {
      'Content-Type': contentType,
      'Cache-Control': 'private, max-age=3600', // Cache for 1 hour
      'X-Content-Type-Options': 'nosniff',
    }

    // If download flag is set, add Content-Disposition header with custom filename
    if (download) {
      const timestamp = Date.now()
      // Keep Chinese characters, letters, numbers; replace special chars with underscore
      const baseFilename = blockTitle.replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, '_')
      // Extract original file extension from path
      const extension = filePath.split('.').pop() || 'html'
      // Use UTF-8 encoding for Chinese filenames (RFC 6266)
      const encodedFilename = encodeURIComponent(`${baseFilename}_${timestamp}.${extension}`)
      headers['Content-Disposition'] = `attachment; filename*=UTF-8''${encodedFilename}`
    }

    return new NextResponse(fileBlob, { headers })

  } catch (error) {
    console.error('Error serving file:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
