import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth/clerk'

export async function POST(request: NextRequest) {
  try {
    const { message, teamId, chatId } = await request.json()

    // Get user authentication
    const session = await auth()
    if (!session?.user) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Connect to the AgentOS backend (running on port 8012)
    const agentOSUrl = `http://localhost:8012/teams/${teamId}/runs`

    const requestPayload = {
      message: message,
      session_id: chatId || `chat_${session.user.id}`,
      user_id: session.user.id,
      stream: true
    }

    console.log('📡 Sending to AgentOS:', {
      url: agentOSUrl,
      payload: requestPayload
    })

    // Create FormData for AgentOS
    const formData = new FormData()
    formData.append('message', message)
    formData.append('session_id', chatId || `chat_${session.user.id}`)
    formData.append('user_id', session.user.id)
    formData.append('stream', 'true')

    console.log('📡 FormData contents:', {
      message: formData.get('message'),
      session_id: formData.get('session_id'),
      user_id: formData.get('user_id'),
      stream: formData.get('stream')
    })

    const response = await fetch(agentOSUrl, {
      method: 'POST',
      body: formData  // Don't set Content-Type header, let browser set it automatically for FormData
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('AgentOS error response:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText
      })
      throw new Error(`AgentOS responded with status: ${response.status} - ${errorText}`)
    }

    // Create a readable stream from the AgentOS response
    const stream = new ReadableStream({
      start(controller) {
        const reader = response.body?.getReader()
        if (!reader) {
          controller.close()
          return
        }

        function pump(): Promise<void> {
          return reader!.read().then(({ done, value }) => {
            if (done) {
              controller.close()
              return
            }

            // Forward the SSE data from AgentOS
            controller.enqueue(value)
            return pump()
          })
        }

        return pump()
      }
    })

    // Return the stream as SSE
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    })

  } catch (error) {
    console.error('Error connecting to AgentOS:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to connect to AgentOS backend' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}

export async function OPTIONS(request: NextRequest) {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}