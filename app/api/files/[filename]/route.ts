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

    // 2. Get session_id (chat_id) from query params
    const searchParams = request.nextUrl.searchParams
    const sessionId = searchParams.get('session_id')

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

    return new NextResponse(fileBlob, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'private, max-age=3600', // Cache for 1 hour
        'X-Content-Type-Options': 'nosniff',
      },
    })

  } catch (error) {
    console.error('Error serving file:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}