import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/clerk';
import { db } from '@/lib/db/config';

// 保存消息到数据库
async function saveMessage(
  chatId: string,
  role: string,
  content: string,
  toolName?: string,
  toolArgs?: any,
  toolResult?: any,
  attachments?: any[]
) {
  try {
    const [newMessage] = await db`
      INSERT INTO messages (chat_id, role, content, tool_name, tool_args, tool_result, attachments, created_at)
      VALUES (
        ${chatId},
        ${role},
        ${content},
        ${toolName || null},
        ${toolArgs ? JSON.stringify(toolArgs) : null},
        ${toolResult ? JSON.stringify(toolResult) : null},
        ${attachments ? JSON.stringify(attachments) : '[]'},
        NOW()
      )
      RETURNING id, role, content, tool_name, tool_args, tool_result, attachments, created_at as timestamp
    `;

    console.log(`✅ Saved ${role} message:`, content.substring(0, 50));
    return {
      id: newMessage.id,
      role: newMessage.role,
      content: newMessage.content,
      tool_name: newMessage.tool_name,
      tool_args: newMessage.tool_args,
      tool_result: newMessage.tool_result,
      attachments: newMessage.attachments,
      timestamp: newMessage.timestamp.toISOString(),
    };
  } catch (error) {
    console.error(`❌ Error saving ${role} message:`, error);
    throw error;
  }
}

// 更新消息内容
async function updateMessage(messageId: string, content: string) {
  try {
    const [updatedMessage] = await db`
      UPDATE messages
      SET content = ${content}, updated_at = NOW()
      WHERE id = ${messageId}
      RETURNING id, role, content, tool_name, created_at as timestamp
    `;

    return {
      id: updatedMessage.id,
      role: updatedMessage.role,
      content: updatedMessage.content,
      tool_name: updatedMessage.tool_name,
      timestamp: updatedMessage.timestamp.toISOString(),
    };
  } catch (error) {
    console.error(`❌ Error updating message:`, error);
    throw error;
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ chatId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { chatId } = await params;
    const userId = session.user.id;

    // 支持JSON和FormData两种请求格式
    const contentType = request.headers.get('content-type');
    let message: string;
    let sessionState: any = {};
    let files: File[] = [];

    if (contentType?.includes('application/json')) {
      const body = await request.json();
      message = body.message;
      sessionState = body.sessionState || {};

      console.log('📨 Received JSON request with sessionState keys:', Object.keys(sessionState));
      if (sessionState['financial metrics data']) {
        console.log('📊 Financial data found in sessionState:', sessionState['financial metrics data'].length, 'records');
      } else {
        console.log('❌ No financial data found in sessionState');
      }
    } else {
      // FormData格式（文件上传）
      const formData = await request.formData();
      message = formData.get('message') as string;
      files = formData.getAll('files') as File[];

      // 解析sessionState
      const sessionStateStr = formData.get('sessionState') as string;
      if (sessionStateStr) {
        try {
          sessionState = JSON.parse(sessionStateStr);
        } catch (e) {
          console.warn('Failed to parse sessionState from FormData:', e);
        }
      }

      console.log('📁 Received files:', files.map(f => ({ name: f.name, type: f.type, size: f.size })));
      console.log('📊 Parsed sessionState from FormData:', Object.keys(sessionState).length > 0 ? 'Yes' : 'No');
    }

    // 验证用户拥有这个chat
    const chatCheck = await db`
      SELECT c.id FROM chats c WHERE c.id = ${chatId} AND c.user_id = ${userId}
    `;

    if (chatCheck.length === 0) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
    }

    console.log(
      `🎯 Starting stream for chat ${chatId}, message:`,
      message.substring(0, 50),
    );

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // 1. 立即保存用户消息（包括附件）
          // 将文件转换为附件格式
          const attachments = files.map(file => ({
            name: file.name,
            contentType: file.type,
            size: file.size,
            // 注意：这里我们不保存实际的文件内容，只保存元数据
            // 在真实应用中，你可能需要将文件上传到存储服务（如S3）并保存URL
          }));

          const userMessage = await saveMessage(chatId, 'user', message, undefined, undefined, undefined, attachments);
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: 'user_saved',
                message: userMessage,
              })}\n\n`,
            ),
          );

          // 2. 准备assistant消息，但暂不保存到数据库
          let assistantMessage: any = null;
          let isFirstContent = true;

          // 3. 调用AgentOS Python服务
          const agentosUrl =
            process.env.AGENTSOS_API_URL || 'http://localhost:8012';
          console.log('🌐 Calling AgentOS Python service at:', agentosUrl);

          // 根据是否有文件决定请求格式
          let agentResponse: Response;

          if (files.length > 0) {
            // 有文件时使用FormData
            const formData = new FormData();
            formData.append('message', message);
            formData.append('session_id', chatId);
            formData.append('user_id', userId);
            formData.append('stream', 'true');

            // 添加sessionState
            if (sessionState && Object.keys(sessionState).length > 0) {
              formData.append('session_state', JSON.stringify(sessionState));
            }

            // 添加文件
            files.forEach((file) => {
              formData.append('files', file);
            });

            console.log('📁 Sending FormData request with', files.length, 'files');

            agentResponse = await fetch(
              `${agentosUrl}/teams/financial-team/runs`,
              {
                method: 'POST',
                body: formData,
              },
            );
          } else {
            // 没有文件时使用URLSearchParams（原有逻辑）
            const requestParams: any = {
              message: message,
              session_id: chatId,
              user_id: userId,
              stream: 'true',
            };

            // 如果有sessionState，添加为JSON字符串
            if (sessionState && Object.keys(sessionState).length > 0) {
              requestParams.session_state = JSON.stringify(sessionState);
              console.log('📊 Adding session_state to AgentOS request:', JSON.stringify(sessionState).substring(0, 200));
            }

            agentResponse = await fetch(
              `${agentosUrl}/teams/financial-team/runs`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams(requestParams).toString(),
              },
            );
          }

          if (!agentResponse.ok) {
            throw new Error(`AgentOS API error: ${agentResponse.status}`);
          }

          const reader = agentResponse.body?.getReader();
          if (!reader) {
            throw new Error('No response body from AgentOS');
          }

          const decoder = new TextDecoder();
          let buffer = '';
          let assistantContent = '';

          // 4. 处理AgentOS的流式响应
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            buffer += chunk;

            // 处理完整的行
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (line.trim() === '') continue;

              // 解析SSE格式
              if (line.startsWith('data: ')) {
                try {
                  const jsonData = line.slice(6);
                  if (jsonData === '[DONE]') {
                    break;
                  }

                  const eventData = JSON.parse(jsonData);

                  // 根据事件类型处理
                  if (
                    eventData.event === 'TeamRunContent' ||
                    eventData.event === 'content'
                  ) {
                    const content =
                      eventData.content || eventData.data?.content || '';
                    if (content) {
                      // 第一次收到内容时，创建assistant消息
                      if (isFirstContent) {
                        assistantMessage = await saveMessage(
                          chatId,
                          'assistant',
                          content,
                        );
                        assistantContent = content;
                        isFirstContent = false;

                        // 发送assistant_start事件
                        controller.enqueue(
                          encoder.encode(
                            `data: ${JSON.stringify({
                              type: 'assistant_start',
                              message: assistantMessage,
                            })}\n\n`,
                          ),
                        );

                        console.log(
                          '📝 Created assistant message on first content:',
                          content.substring(0, 50),
                        );
                      } else {
                        // 后续内容累加并更新
                        assistantContent += content;
                        await updateMessage(
                          assistantMessage.id,
                          assistantContent,
                        );
                      }

                      controller.enqueue(
                        encoder.encode(
                          `data: ${JSON.stringify({
                            type: 'assistant_content',
                            messageId: assistantMessage.id,
                            content,
                          })}\n\n`,
                        ),
                      );
                    }
                  }

                  if (eventData.event === 'TeamToolCallStarted') {
                    const toolData = eventData.tool || eventData.data?.tool;
                    const toolMessage = await saveMessage(
                      chatId,
                      'tool',
                      `🔧 Calling ${toolData?.tool_name || 'tool'}...`,
                      toolData?.tool_name,
                      toolData?.tool_args || toolData?.arguments,
                    );
                    controller.enqueue(
                      encoder.encode(
                        `data: ${JSON.stringify({
                          type: 'tool_start',
                          message: toolMessage,
                        })}\n\n`,
                      ),
                    );
                  }

                  if (eventData.event === 'TeamToolCallCompleted') {
                    const toolData = eventData.tool || eventData.data?.tool;
                    const toolCompleteMessage = await saveMessage(
                      chatId,
                      'tool',
                      `✅ ${toolData?.tool_name || 'Tool'} completed`,
                      toolData?.tool_name,
                      toolData?.tool_args || toolData?.arguments,
                      toolData?.result,
                    );
                    controller.enqueue(
                      encoder.encode(
                        `data: ${JSON.stringify({
                          type: 'tool_complete',
                          message: toolCompleteMessage,
                        })}\n\n`,
                      ),
                    );
                  }
                } catch (err) {
                  console.warn('Failed to parse SSE data:', line, err);
                }
              }
            }
          }

          // 5. 完成assistant消息
          if (assistantMessage && assistantContent.trim()) {
            // 如果已经创建了assistant消息，则发送完成事件
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: 'assistant_complete',
                  message: {
                    id: assistantMessage.id,
                    role: 'assistant',
                    content: assistantContent.trim(),
                    timestamp: new Date().toISOString(),
                  },
                })}\n\n`,
              ),
            );

            console.log(
              '✅ Assistant message completed:',
              assistantContent.substring(0, 50),
            );
          } else if (!assistantMessage && assistantContent.trim()) {
            // 如果没有创建assistant消息但有内容，创建一个
            const finalAssistantMessage = await saveMessage(
              chatId,
              'assistant',
              assistantContent.trim(),
            );
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: 'assistant_complete',
                  message: finalAssistantMessage,
                })}\n\n`,
              ),
            );

            console.log(
              '📝 Created final assistant message:',
              assistantContent.substring(0, 50),
            );
          }

          // 6. 对话完成
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: 'conversation_complete',
              })}\n\n`,
            ),
          );
        } catch (error) {
          console.error('Stream error:', error);
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: 'error',
                error: error instanceof Error ? error.message : 'Unknown error',
              })}\n\n`,
            ),
          );
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
