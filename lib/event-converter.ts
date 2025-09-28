import type { ChatMessage } from '@/lib/types';
import type { EventRecord, EventContent } from '@/app/api/chats/[chatId]/events/route';

export function convertSingleEventToMessages(event: EventRecord): ChatMessage[] {
  const { content, author, id, timestamp } = event;
  const messages: ChatMessage[] = [];

  // User message
  if (author === 'user' && content.role === 'user') {
    const textPart = content.parts.find(p => p.text);
    if (textPart?.text) {
      messages.push({
        id: `user-${id}`,
        role: 'user',
        content: textPart.text,
        parts: [{ type: 'text', text: textPart.text }],
        timestamp: new Date(timestamp),
        createdAt: new Date(timestamp),
      });
    }
  }

  // orchestrator_agent events can contain multiple parts
  if (author === 'orchestrator_agent') {

    // Assistant text response first (if exists)
    if (content.role === 'model') {
      const textPart = content.parts.find(p => p.text);
      if (textPart?.text) {
        messages.push({
          id: `assistant-${id}`,
          role: 'assistant',
          content: textPart.text,
          parts: [{ type: 'text', text: textPart.text }],
          timestamp: new Date(timestamp),
          createdAt: new Date(timestamp),
        });
      }

      // Then tool calls (if exists)
      const functionCall = content.parts.find(p => p.function_call);
      if (functionCall?.function_call) {
        messages.push({
          id: `tool-call-${functionCall.function_call.id}`,
          role: 'tool',
          content: `Calling ${functionCall.function_call.name}`,
          parts: [{ type: 'text', text: `Calling ${functionCall.function_call.name}` }],
          timestamp: new Date(timestamp),
          createdAt: new Date(timestamp),
          messageType: 'tool_call',
          toolData: {
            toolName: functionCall.function_call.name,
            status: 'running',
            args: functionCall.function_call.args,
            callId: functionCall.function_call.id
          }
        });
      }
    }

    // Tool response
    if (content.role === 'user') {
      const functionResponse = content.parts.find(p => p.function_response);
      if (functionResponse?.function_response) {
        messages.push({
          id: `tool-response-${functionResponse.function_response.id}`,
          role: 'tool',
          content: `${functionResponse.function_response.name} completed`,
          parts: [{ type: 'text', text: `${functionResponse.function_response.name} completed` }],
          timestamp: new Date(timestamp),
          createdAt: new Date(timestamp),
          messageType: 'tool_call',
          toolData: {
            toolName: functionResponse.function_response.name,
            status: 'completed',
            result: typeof functionResponse.function_response.response === 'object'
              ? functionResponse.function_response.response.content
              : functionResponse.function_response.response,
            callId: functionResponse.function_response.id
          }
        });
      }
    }
  }

  return messages;
}

// 保持向后兼容的单消息版本
export function convertEventToMessage(event: EventRecord): ChatMessage | null {
  const messages = convertSingleEventToMessages(event);
  return messages.length > 0 ? messages[0] : null;
}

export function convertEventsToMessages(events: EventRecord[]): ChatMessage[] {
  const messages: ChatMessage[] = [];

  // 按 invocation_id 分组 events
  const invocationGroups = new Map<string, EventRecord[]>();

  for (const event of events) {
    const invocationId = (event as any).invocation_id || 'no-invocation';

    if (!invocationGroups.has(invocationId)) {
      invocationGroups.set(invocationId, []);
    }
    invocationGroups.get(invocationId)!.push(event);
  }

  // 为每个 invocation 创建一个完整的 message
  for (const [invocationId, groupEvents] of invocationGroups) {
    // 按时间排序 events
    groupEvents.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    // 分析这组 events 的内容
    let userMessage: ChatMessage | null = null;
    let assistantContent = '';
    let toolCalls: any[] = [];
    let finalTimestamp = groupEvents[0].timestamp;

    for (const event of groupEvents) {
      const { content, author, id, timestamp } = event;
      finalTimestamp = timestamp; // 保持最新的时间戳

      // 用户消息
      if (author === 'user' && content.role === 'user') {
        const textPart = content.parts.find(p => p.text);
        if (textPart?.text && !userMessage) {
          userMessage = {
            id: `user-${id}`,
            role: 'user',
            content: textPart.text,
            parts: [{ type: 'text', text: textPart.text }],
            timestamp: new Date(timestamp),
            createdAt: new Date(timestamp),
          };
        }
      }

      // 助手内容（文本 + 工具调用）
      if (author === 'orchestrator_agent') {
        // 收集文本内容
        if (content.role === 'model') {
          const textPart = content.parts.find(p => p.text);
          if (textPart?.text) {
            assistantContent += textPart.text;
          }

          // 收集工具调用
          const functionCall = content.parts.find(p => p.function_call);
          if (functionCall?.function_call) {
            toolCalls.push({
              type: 'function_call',
              name: functionCall.function_call.name,
              args: functionCall.function_call.args,
              id: functionCall.function_call.id
            });
          }
        }

        // 收集工具响应
        if (content.role === 'user') {
          const functionResponse = content.parts.find(p => p.function_response);
          if (functionResponse?.function_response) {
            const existingCall = toolCalls.find(call => call.id === functionResponse.function_response?.id);
            if (existingCall) {
              existingCall.result = typeof functionResponse.function_response?.response === 'object'
                ? functionResponse.function_response?.response?.content
                : functionResponse.function_response?.response;
              existingCall.status = 'completed';
            }
          }
        }
      }
    }

    // 添加用户消息
    if (userMessage) {
      messages.push(userMessage);
    }

    // 创建合并的助手消息
    if (assistantContent || toolCalls.length > 0) {
      const assistantMessage: ChatMessage = {
        id: `assistant-${invocationId}`,
        role: 'assistant',
        content: assistantContent,
        parts: [{ type: 'text', text: assistantContent }],
        timestamp: new Date(finalTimestamp),
        createdAt: new Date(finalTimestamp),
      };

      // 如果有工具调用，添加工具数据
      if (toolCalls.length > 0) {
        assistantMessage.messageType = 'tool_call';
        assistantMessage.toolData = {
          toolCalls: toolCalls,
          status: toolCalls.every(call => call.status === 'completed') ? 'completed' : 'running'
        };
      }

      messages.push(assistantMessage);
    }
  }

  return messages.sort((a, b) => (a.createdAt || a.timestamp).getTime() - (b.createdAt || b.timestamp).getTime());
}