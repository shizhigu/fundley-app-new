import { auth } from '@/lib/auth/clerk';
import { db } from '@/lib/db/config';

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return new Response('Unauthorized', { status: 401 });
    }

    const { messages, chatId } = await request.json();
    const clerkUserId = session.user.id;

    // Verify user owns this chat
    const chatCheck = await db`
      SELECT c.id
      FROM chats c
      JOIN users u ON c.user_id = u.id
      WHERE c.id = ${chatId} AND u.clerk_user_id = ${clerkUserId}
    `;

    if (chatCheck.length === 0) {
      return new Response('Chat not found', { status: 404 });
    }

    // Get the latest user message
    const userMessage = messages[messages.length - 1];
    if (!userMessage || userMessage.role !== 'user') {
      return new Response('Invalid message format', { status: 400 });
    }

    // Save user message to database
    await db`
      INSERT INTO messages (chat_id, role, content, metadata)
      VALUES (${chatId}, 'user', ${userMessage.content}, ${JSON.stringify([{ type: 'text', text: userMessage.content }])})
    `;

    // Convert messages to format expected by Python backend
    const formattedMessages = messages.map((msg: any) => ({
      role: msg.role,
      content: msg.content || msg.parts?.[0]?.text || ''
    }));

    // Call Python LangGraph backend
    const pythonResponse = await fetch('http://localhost:8000/api/v1/chat/stream', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: userMessage.content,
        model: 'grok-3', // Default model
        conversation_id: chatId,
        messages: formattedMessages.slice(0, -1) // Exclude the current message
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