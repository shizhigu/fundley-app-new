import type { EventRecord } from '@/app/api/chats/[chatId]/events/route';

// 简化的 Event 类型
export interface SimpleEvent {
  id: string;
  type: 'user_message' | 'assistant_text' | 'tool_call' | 'tool_response';
  content: string;
  toolName?: string;
  toolArgs?: any;
  toolResult?: any;
  timestamp: string;
}

// 简化的 Invocation 类型
export interface SimpleInvocation {
  invocationId: string;
  events: SimpleEvent[];
  timestamp: string;
}

export function convertToSimpleEvents(events: EventRecord[]): SimpleInvocation[] {
  console.log('🔍 Converting events to simple format:', events.length);

  // 按 invocation_id 分组
  const invocationGroups = new Map<string, EventRecord[]>();

  for (const event of events) {
    const invocationId = (event as any).invocation_id || `no-invocation-${event.id}`;

    if (!invocationGroups.has(invocationId)) {
      invocationGroups.set(invocationId, []);
    }
    invocationGroups.get(invocationId)!.push(event);
  }

  const invocations: SimpleInvocation[] = [];

  for (const [invocationId, groupEvents] of invocationGroups) {
    // 按时间排序
    groupEvents.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    const simpleEvents: SimpleEvent[] = [];
    let earliestTimestamp = groupEvents[0]?.timestamp || new Date().toISOString();

    for (const event of groupEvents) {
      const { content, author, id, timestamp } = event;

      // 用户消息
      if (author === 'user' && content.role === 'user') {
        const textPart = content.parts.find(p => p.text);
        if (textPart?.text) {
          simpleEvents.push({
            id: `user-${id}`,
            type: 'user_message',
            content: textPart.text,
            timestamp
          });
        }
      }

      // 助手消息
      if (author === 'orchestrator_agent' && content.role === 'model') {
        const textPart = content.parts.find(p => p.text);
        if (textPart?.text) {
          simpleEvents.push({
            id: `assistant-${id}`,
            type: 'assistant_text',
            content: textPart.text,
            timestamp
          });
        }

        // 工具调用
        const functionCall = content.parts.find(p => p.function_call);
        if (functionCall?.function_call) {
          simpleEvents.push({
            id: `tool-call-${functionCall.function_call.id}`,
            type: 'tool_call',
            content: `Calling ${functionCall.function_call.name}`,
            toolName: functionCall.function_call.name,
            toolArgs: functionCall.function_call.args,
            timestamp
          });
        }
      }

      // 工具响应
      if (author === 'orchestrator_agent' && content.role === 'user') {
        const functionResponse = content.parts.find(p => p.function_response);
        if (functionResponse?.function_response) {
          simpleEvents.push({
            id: `tool-response-${functionResponse.function_response.id}`,
            type: 'tool_response',
            content: `${functionResponse.function_response.name} completed`,
            toolName: functionResponse.function_response.name,
            toolResult: typeof functionResponse.function_response.response === 'object'
              ? functionResponse.function_response.response.content
              : functionResponse.function_response.response,
            timestamp
          });
        }
      }
    }

    if (simpleEvents.length > 0) {
      invocations.push({
        invocationId,
        events: simpleEvents,
        timestamp: earliestTimestamp
      });
    }
  }

  // 按时间排序 invocations
  invocations.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  console.log('✅ Converted to invocations:', invocations.length);
  console.log('📋 Invocations:', invocations);

  return invocations;
}