import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db/config'

/**
 * API endpoint to serve files from analysis blocks
 *
 * GET /api/files/[filename]?session_id={chatId}
 *
 * Files are stored on Python server at: /tmp/fundley/{user_id}/{session_id}/{filename}
 * This endpoint acts as a proxy to the Python file service
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    // 1. Get authenticated user (Clerk userId)
    const { userId: clerkUserId } = await auth()
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Get session_id (chat_id) and download flag from query params
    const searchParams = request.nextUrl.searchParams
    const sessionId = searchParams.get('session_id')
    const download = searchParams.get('download') === 'true'
    const blockTitle = searchParams.get('title') || 'analysis'

    if (!sessionId) {
      return NextResponse.json({ error: 'Missing session_id' }, { status: 400 })
    }

    // 3. Validate filename (security check)
    const { filename } = await params
    if (filename.includes('..') || filename.includes('/')) {
      return NextResponse.json({ error: 'Invalid filename' }, { status: 400 })
    }

    // 4. Get database user_id from clerk_user_id
    const userResult = await db`
      SELECT id FROM users WHERE clerk_user_id = ${clerkUserId}
    `

    if (userResult.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const dbUserId = userResult[0].id

    // 5. Forward request to Python file service
    const pythonServiceUrl = process.env.AGENTSOS_API_URL || 'http://localhost:8012'
    const pythonFileUrl = `${pythonServiceUrl}/api/v1/analysis/files/${dbUserId}/${sessionId}/${filename}`

    console.log(`📁 [File Proxy] Fetching: ${filename} for user ${dbUserId}, session ${sessionId}`)

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

    // 6. Stream the file back to client
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
      const extension = filename.split('.').pop() || 'html'
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