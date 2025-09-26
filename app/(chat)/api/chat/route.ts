import { auth } from '@/lib/auth/clerk';
import { db } from '@/lib/db/config';

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return new Response('Unauthorized', { status: 401 });
    }

    const { messages, id: chatId, state_delta } = await request.json();
    const userId = session.user.id; // PostgreSQL user ID

    console.log('🔍 Next.js API received:', { chatId, userId, hasStateDelta: !!state_delta });

    // Verify user owns this chat
    const chatCheck = await db`
      SELECT c.id
      FROM chats c
      WHERE c.id = ${chatId} AND c.user_id = ${userId}
    `;

    if (chatCheck.length === 0) {
      return new Response('Chat not found', { status: 404 });
    }

    // Get the latest user message
    const userMessage = messages[messages.length - 1];
    if (!userMessage || userMessage.role !== 'user') {
      return new Response('Invalid message format', { status: 400 });
    }

    // Extract content from parts-based message format
    const userContent = userMessage.content || userMessage.parts?.[0]?.text || '';

    // Extract attachments from the user message
    const userAttachments = userMessage.attachments || [];

    console.log('💾 Saving user message with attachments:', {
      chatId,
      content: userContent.substring(0, 50) + '...',
      attachmentCount: userAttachments.length
    });

    // Save user message to database with attachments
    await db`
      INSERT INTO messages (chat_id, role, content, metadata, attachments)
      VALUES (
        ${chatId},
        'user',
        ${userContent},
        ${JSON.stringify([{ type: 'text', text: userContent }])},
        ${JSON.stringify(userAttachments)}
      )
    `;

    // Call ADK service with state_delta support
    const pythonServiceUrl = process.env.ADK_SERVICE_URL || 'http://localhost:8012';

    console.log('🚀 Next.js API: Forwarding to ADK service with state_delta:', state_delta ? 'INCLUDED' : 'NOT_INCLUDED');

    const pythonResponse = await fetch(`${pythonServiceUrl}/api/v1/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: userContent,
        session_id: chatId,
        user_id: userId,
        context: {
          messages: messages.slice(0, -1) // Previous messages for context
        },
        state_delta: state_delta // Forward state_delta to ADK service
      }),
    });

    if (!pythonResponse.ok) {
      console.error('Python backend error:', await pythonResponse.text());
      return new Response('AI service unavailable', { status: 503 });
    }

    // Create a transform stream to save the AI response to database
    let assistantContent = '';

    const transformStream = new TransformStream({
      transform(chunk, controller) {
        const text = new TextDecoder().decode(chunk);

        // Parse SSE data
        const lines = text.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data.trim() && data !== '[DONE]') {
              try {
                const parsed = JSON.parse(data);
                if (parsed.content) {
                  assistantContent += parsed.content;
                }
              } catch (e) {
                // Not JSON, treat as plain text
                assistantContent += data;
              }
            }
          }
        }

        controller.enqueue(chunk);
      },

      flush: async () => {
        // Save assistant message to database when stream ends
        if (assistantContent.trim()) {
          try {
            await db`
              INSERT INTO messages (chat_id, role, content, metadata)
              VALUES (${chatId}, 'assistant', ${assistantContent}, ${JSON.stringify([{ type: 'text', text: assistantContent }])})
            `;

            // Update chat's updated_at timestamp
            await db`
              UPDATE chats
              SET updated_at = NOW()
              WHERE id = ${chatId}
            `;
          } catch (error) {
            console.error('Error saving assistant message:', error);
          }
        }
      }
    });

    // Return streaming response
    return new Response(
      pythonResponse.body?.pipeThrough(transformStream),
      {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      }
    );

  } catch (error) {
    console.error('Chat API error:', error);
    return new Response('Internal server error', { status: 500 });
  }
}