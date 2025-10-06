import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/clerk';
import { db } from '@/lib/db/config';

// 自动命名聊天函数
async function autoNameChat(
  chatId: string,
  firstMessage: string,
  userId: string,
) {
  try {
    const agentosUrl = process.env.AGENTSOS_API_URL || 'http://localhost:8000';
    console.log('🤖 Calling conversation naming agent:', agentosUrl);

    const response = await fetch(
      `${agentosUrl}/agents/conversation-naming-agent/runs`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          message: firstMessage,
          stream: 'false',
        }).toString(),
      },
    );

    if (!response.ok) {
      console.warn(
        'Failed to get chat title from naming agent:',
        response.status,
      );
      return;
    }

    const data = await response.json();
    const suggestedTitle = data?.content?.title;

    if (suggestedTitle && typeof suggestedTitle === 'string') {
      console.log('✨ Auto-naming chat to:', suggestedTitle);

      // 更新聊天标题（带用户验证）
      await db`
        UPDATE chats
        SET title = ${suggestedTitle}, updated_at = NOW()
        WHERE id = ${chatId} AND user_id = ${userId}
      `;

      console.log('✅ Chat auto-named successfully');
    }
  } catch (error) {
    console.warn('Error in auto-naming:', error);
    // 静默失败，不影响正常聊天功能
  }
}

// 保存消息到数据库
async function saveMessage(
  chatId: string,
  role: string,
  content: string,
  toolName?: string,
  toolArgs?: any,
  toolResult?: any,
  attachments?: any[],
  toolCallId?: string,
  invocationId?: string,
) {
  try {
    const [newMessage] = await db`
      INSERT INTO messages (chat_id, role, content, tool_name, tool_args, tool_result, attachments, tool_call_id, invocation_id, created_at)
      VALUES (
        ${chatId},
        ${role},
        ${content},
        ${toolName || null},
        ${toolArgs ? JSON.stringify(toolArgs) : null},
        ${toolResult ? JSON.stringify(toolResult) : null},
        ${attachments ? JSON.stringify(attachments) : '[]'},
        ${toolCallId || null},
        ${invocationId || null},
        NOW()
      )
      RETURNING id, role, content, tool_name, tool_args, tool_result, attachments, tool_call_id, invocation_id, created_at as timestamp
    `;

    console.log(
      `✅ Saved ${role} message:`,
      content.substring(0, 50),
      `invocationId: ${invocationId}`,
    );
    console.log(`📝 Returned invocation_id from DB:`, newMessage.invocation_id);
    return {
      id: newMessage.id,
      role: newMessage.role,
      content: newMessage.content,
      tool_name: newMessage.tool_name,
      tool_args: newMessage.tool_args,
      tool_result: newMessage.tool_result,
      attachments: newMessage.attachments,
      tool_call_id: newMessage.tool_call_id,
      invocation_id: newMessage.invocation_id,
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

// 判断是否应该保存工具结果
function shouldSaveTool(toolName: string): boolean {
  // 不保存的工具类型（内部工具、元数据工具等）
  const skipTools = [
    'internal_search',
    'metadata_extraction',
    'context_processing',
    'memory_update',
    'session_state',
    'delegate_task_to_member',
    'team_coordination',
    'task_delegation',
    'member_assignment',
    'create_new_sandbox',
    'set_sandbox_timeout',
    'get_sandbox_status',
    'list_running_sandboxes',
    'get_current_sandbox_id',
    'get_chat_history',
    'list_files',
  ];

  return !skipTools.includes(toolName?.toLowerCase() || '');
}

// 格式化工具结果用于显示
function formatToolResult(toolData: any): { content: string; result: any } {
  const toolName = toolData?.tool_name || 'Tool';

  // 特殊工具类型的格式化
  if (toolData?.result?.type === 'frontend_visualization') {
    return {
      content: `📊 Generated visualization: ${toolData.result.title || 'Chart'}`,
      result: toolData.result,
    };
  }

  if (toolName.includes('financial') || toolName.includes('data')) {
    return {
      content: `📈 Retrieved financial data using ${toolName}`,
      result: toolData.result,
    };
  }

  // 默认格式
  return {
    content: `✅ ${toolName} completed`,
    result: toolData.result,
  };
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

      console.log(
        '📨 Received JSON request with sessionState keys:',
        Object.keys(sessionState),
      );
      if (sessionState['financial metrics data']) {
        console.log(
          '📊 Financial data found in sessionState:',
          sessionState['financial metrics data'].length,
          'records',
        );
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

      console.log(
        '📁 Received files:',
        files.map((f) => ({ name: f.name, type: f.type, size: f.size })),
      );
      console.log(
        '📊 Parsed sessionState from FormData:',
        Object.keys(sessionState).length > 0 ? 'Yes' : 'No',
      );
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
        // Track if controller is closed to prevent writing to closed stream
        let isControllerClosed = false;

        // Safe enqueue wrapper that checks if controller is still open
        const safeEnqueue = (data: Uint8Array) => {
          if (!isControllerClosed) {
            try {
              controller.enqueue(data);
            } catch (error) {
              if (
                error instanceof TypeError &&
                error.message.includes('Controller is already closed')
              ) {
                isControllerClosed = true;
                console.warn('⚠️ Controller closed, stopping stream writes');
              } else {
                throw error;
              }
            }
          }
        };

        // Keep-alive: Send heartbeat every 15 seconds to prevent timeout
        const heartbeatInterval = setInterval(() => {
          safeEnqueue(encoder.encode(': heartbeat\n\n'));
        }, 15000);

        try {
          // 0. 检查是否是第一条消息（用于自动命名）
          const existingMessages = await db`
            SELECT COUNT(*) as count FROM messages WHERE chat_id = ${chatId}
          `;
          const isFirstMessage = Number(existingMessages[0].count) === 0;
          console.log(`📝 Is first message: ${isFirstMessage}`);

          // 1. 生成本次invocation的唯一ID
          const invocationId = crypto.randomUUID();
          console.log(`🔄 Starting new invocation: ${invocationId}`);

          // 1. 立即保存用户消息（包括附件）
          // 将文件转换为附件格式
          const attachments = files.map((file) => ({
            name: file.name,
            contentType: file.type,
            size: file.size,
            // 注意：这里我们不保存实际的文件内容，只保存元数据
            // 在真实应用中，你可能需要将文件上传到存储服务（如S3）并保存URL
          }));

          const userMessage = await saveMessage(
            chatId,
            'user',
            message,
            undefined,
            undefined,
            undefined,
            attachments,
            undefined,
            invocationId,
          );
          safeEnqueue(
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

            console.log(
              '📁 Sending FormData request with',
              files.length,
              'files',
            );

            agentResponse = await fetch(
              `${agentosUrl}/agents/financial-analyst/runs`,
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
              console.log(
                '📊 Adding session_state to AgentOS request:',
                JSON.stringify(sessionState).substring(0, 200),
              );
            }

            agentResponse = await fetch(
              `${agentosUrl}/agents/financial-analyst/runs`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/x-www-form-urlencoded',
                },
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
                    eventData.event === 'RunContent'
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
                          undefined,
                          undefined,
                          undefined,
                          [],
                          undefined,
                          invocationId,
                        );
                        assistantContent = content;
                        isFirstContent = false;

                        // 发送assistant_start事件
                        safeEnqueue(
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

                      safeEnqueue(
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

                  if (
                    eventData.event === 'TeamToolCallCompleted' ||
                    eventData.event === 'ToolCallCompleted'
                  ) {
                    const toolData = eventData.tool || eventData.data?.tool;
                    const toolName = toolData?.tool_name || '';

                    // 过滤：只保存有用的工具结果
                    if (!shouldSaveTool(toolName)) {
                      console.log(`⏭️ Skipping tool save for: ${toolName}`);
                      continue;
                    }

                    // 格式化工具结果
                    const { content, result } = formatToolResult(toolData);

                    // 保存工具完成消息
                    const toolCompleteMessage = await saveMessage(
                      chatId,
                      'tool',
                      content,
                      toolName,
                      toolData?.tool_args || toolData?.arguments,
                      result,
                      [],
                      toolData?.tool_call_id,
                      invocationId,
                    );

                    console.log(
                      `✅ Saved tool result for ${toolName}:`,
                      content,
                    );

                    safeEnqueue(
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
            safeEnqueue(
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
              undefined,
              undefined,
              undefined,
              [],
              undefined,
              invocationId,
            );
            safeEnqueue(
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

          // 6. 如果是第一条消息，自动命名聊天（并行处理，不影响响应）
          if (isFirstMessage) {
            console.log('🤖 Triggering auto-naming for first message...');
            // 异步调用，不等待结果，不影响流式响应
            autoNameChat(chatId, message, userId).catch((err) =>
              console.warn('Auto-naming failed:', err),
            );
          }

          // 7. 对话完成
          safeEnqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: 'conversation_complete',
              })}\n\n`,
            ),
          );
        } catch (error) {
          console.error('Stream error:', error);
          safeEnqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: 'error',
                error: error instanceof Error ? error.message : 'Unknown error',
              })}\n\n`,
            ),
          );
        } finally {
          // Clear heartbeat interval
          clearInterval(heartbeatInterval);

          if (!isControllerClosed) {
            controller.close();
            isControllerClosed = true;
          }
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
