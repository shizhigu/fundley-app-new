/**
 * ADK聊天流式API - 简单转发和数据库保存
 * Python ADK服务负责转换消息格式，NextJS负责转发和保存到messages表
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/clerk';
import { db } from '@/lib/db/config';

// 获取聊天的ADK session ID (使用langgraph_thread_id字段存储)
async function getChatSessionId(chatId: string, userId: string): Promise<string | null> {
  const result = await db`
    SELECT c.langgraph_thread_id as session_id
    FROM chats c
    WHERE c.id = ${chatId} AND c.user_id = ${userId}
  `;

  return result.length > 0 ? result[0].session_id : null;
}

// 保存消息到数据库
async function saveMessage(chatId: string, messageData: any): Promise<string> {
  const { role, content, tool_name, tool_args, tool_result } = messageData;

  const result = await db`
    INSERT INTO messages (chat_id, role, content, tool_name, tool_args, tool_result)
    VALUES (${chatId}, ${role}, ${content || null},
            ${tool_name || null}, ${tool_args || null}, ${tool_result || null})
    RETURNING id
  `;

  return result[0].id;
}


export async function POST(req: NextRequest) {
  try {
    console.log('🎯 STEP 1: NextJS API route - Request received');

    const { content, message, chatId, attachments = [], state_delta } = await req.json();
    console.log('🎯 STEP 2: NextJS API route - Request parsed, chatId:', chatId);

    const messageContent = content || message; // 兼容两种参数名

    console.log('🎯 STEP 3: NextJS API route - Starting auth check');
    const session = await auth();
    console.log('🎯 STEP 4: NextJS API route - Auth completed, user:', session.user?.id);

    if (!session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 直接使用chatId作为session_id，不再查询数据库
    const sessionId = chatId;
    const userId = session.user.id;

    console.log('🚀 Starting ADK stream for session:', sessionId, 'user:', userId);

    // 直接转发到ADK后端，包含state_delta和user_id
    const adkServiceUrl = process.env.ADK_SERVICE_URL || 'http://localhost:8012';
    console.log('🎯 STEP 5: NextJS API route - About to fetch Python backend:', adkServiceUrl);

    const adkResponse = await fetch(`${adkServiceUrl}/api/v1/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        session_id: sessionId,
        user_id: userId,
        message: messageContent,
        attachments,
        state_delta: state_delta || null
      }),
    });

    console.log('🎯 STEP 6: NextJS API route - Python backend responded, status:', adkResponse.status);

    if (!adkResponse.ok) {
      const errorData = await adkResponse.text();
      throw new Error(`ADK API error: ${adkResponse.status} - ${errorData}`);
    }

    // 流式转发ADK响应
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const reader = adkResponse.body?.getReader();
          if (!reader) {
            throw new Error('No response stream from ADK');
          }

          const decoder = new TextDecoder();
          let buffer = '';
          let dataBuffer = ''; // 专门用于拼接不完整的JSON数据

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            buffer += chunk;

            // 解析 SSE 数据
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6).trim();

                if (data === '[DONE]') {
                  console.log('✅ Stream completed');
                  if (!controller.desiredSize || controller.desiredSize > 0) {
                    controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                  }
                  return;
                }

                if (data) {
                  // 拼接可能被分割的JSON数据
                  dataBuffer += data;

                  try {
                    const parsed = JSON.parse(dataBuffer);
                    console.log('📨 Parsed SSE Event:', parsed.type);

                    // 保存消息到数据库（异步，不阻塞流）
                    if (parsed.type === 'message' && parsed.data) {
                      saveMessage(chatId, parsed.data).catch(err =>
                        console.error('Failed to save message:', err)
                      );
                    }

                    // 转发完整的JSON消息给前端
                    controller.enqueue(encoder.encode(`data: ${dataBuffer}\n\n`));

                    // 成功解析后清空缓冲区
                    dataBuffer = '';
                  } catch (parseError) {
                    // JSON不完整，继续等待更多数据
                    console.log('📝 Incomplete JSON, buffering...', dataBuffer.length);

                    // 如果缓冲区过大，可能是真的解析错误，重置缓冲区
                    if (dataBuffer.length > 50000) {
                      console.error('Buffer too large, resetting:', dataBuffer.substring(0, 100) + '...');
                      dataBuffer = '';
                    }
                  }
                }
              }
            }
          }

          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (error) {
          console.error('❌ Stream error:', error);
          controller.error(error);
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('❌ Chat stream error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}