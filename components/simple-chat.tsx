'use client';

import { useState, useRef } from 'react';
import { SimpleMessages } from './simple-message';
import { useSimpleEvents } from '@/lib/hooks/use-simple-events';
import { MultimodalInput } from './multimodal-input';
import type { Attachment } from '@/lib/types';

interface SimpleChatProps {
  id: string;
  user: any;
}

type ChatStatus = 'idle' | 'loading' | 'streaming' | 'error';

export function SimpleChat({ id, user }: SimpleChatProps) {
  const { invocations, loading: eventsLoading, error: eventsError, refreshEvents } = useSimpleEvents(id);
  const [status, setStatus] = useState<ChatStatus>('idle');
  const [input, setInput] = useState<string>('');
  const [attachments, setAttachments] = useState<Array<Attachment>>([]);

  const abortControllerRef = useRef<AbortController | null>(null);

  const sendMessage = async (content: string, attachmentFiles?: Attachment[]) => {
    if (!content.trim() && (!attachmentFiles || attachmentFiles.length === 0)) {
      return;
    }

    setStatus('loading');
    setInput('');
    setAttachments([]);

    try {
      // Create abort controller
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      // Call ADK streaming API
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content,
          chatId: id,
          attachments: attachmentFiles || attachments,
        }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      setStatus('streaming');

      // Handle SSE stream
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response stream');
      }

      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;

        const lines = buffer.split('\\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();

            if (data === '[DONE]') {
              setStatus('idle');
              console.log('✅ Streaming completed');
              // 刷新一次获取完整结果
              refreshEvents();
              return;
            }

            if (data) {
              console.log('🔍 Processing SSE data:', data);
              // 收到任何数据就刷新一次
              refreshEvents();
            }
          }
        }
      }

      setStatus('idle');

    } catch (error: any) {
      console.error('Simple chat error:', error);

      if (error.name !== 'AbortError') {
        console.error('Error:', error.message || 'Failed to send message');
      }

      setStatus('error');
    } finally {
      abortControllerRef.current = null;
    }
  };

  const stop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setStatus('idle');
    }
  };

  if (eventsLoading) {
    return <div className="p-4 text-center">Loading...</div>;
  }

  if (eventsError) {
    return <div className="p-4 text-center text-red-500">Error: {eventsError}</div>;
  }

  return (
    <div className="flex flex-col h-full w-full max-w-full relative">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h1 className="text-lg font-semibold">Simple Chat (Clean Architecture)</h1>
        <p className="text-sm text-gray-500">Invocation-based message grouping</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <SimpleMessages messages={
          invocations.flatMap(inv =>
            inv.events.map(event => ({
              id: event.id,
              role: event.type === 'user_message' ? 'user' as const :
                    event.type === 'assistant_text' ? 'assistant' as const :
                    'tool' as const,
              content: event.content,
              tool_name: event.toolName,
              tool_args: event.toolArgs,
              tool_result: event.toolResult,
              timestamp: event.timestamp
            }))
          )
        } />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <MultimodalInput
          input={input}
          setInput={setInput}
          status={status === 'idle' ? 'ready' : status}
          stop={stop}
          attachments={attachments}
          setAttachments={setAttachments}
          messages={[]} // 简化版本不需要
          setMessages={() => {}} // 简化版本不需要
          sendMessage={(message: any) => {
            if (typeof message === 'string') {
              sendMessage(message);
            } else {
              sendMessage(message.parts?.[0]?.text || '',
                message.parts?.filter((p: any) => p.type === 'file').map((p: any) => ({
                  url: p.url,
                  name: p.name,
                  contentType: p.mediaType || '',
                }))
              );
            }
          }}
          selectedVisibilityType="private"
          user={user}
          selectedModelId="grok-beta"
          setSelectedModelId={() => {}}
        />
      </div>
    </div>
  );
}