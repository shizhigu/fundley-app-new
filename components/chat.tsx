'use client';

import { DefaultChatTransport } from 'ai';
import { useChat } from '@ai-sdk/react';
import { useEffect, useState, useMemo } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { ChatHeader } from '@/components/chat-header';
import type { Vote } from '@/lib/db/schema';
import { fetcher, fetchWithErrorHandlers, generateUUID } from '@/lib/utils';
import { Artifact } from './artifact';
import { MultimodalInput } from './multimodal-input';
import { Messages } from './messages';
import type { VisibilityType } from './visibility-selector';
import { useArtifactSelector } from '@/hooks/use-artifact';
import { useArtifactPersistence } from '@/hooks/use-artifact-persistence';
// import { getChatHistoryPaginationKey } from './sidebar-history'; // Removed as not needed with Convex
import { toast } from './toast';
import type { AuthSession } from '@/lib/auth/clerk';
import { useSearchParams } from 'next/navigation';
import { useChatVisibility } from '@/hooks/use-chat-visibility';
import { useAutoResume } from '@/hooks/use-auto-resume';
import { ChatSDKError } from '@/lib/errors';
import type { Attachment, ChatMessage } from '@/lib/types';
import { useDataStream } from './data-stream-provider';
import { useArtifact } from '@/hooks/use-artifact';

export function Chat({
  id,
  initialMessages,
  initialChatModel,
  initialVisibilityType,
  isReadonly,
  user,
  autoResume,
}: {
  id: string;
  initialMessages: ChatMessage[];
  initialChatModel: string;
  initialVisibilityType: VisibilityType;
  isReadonly: boolean;
  user: AuthSession['user'];
  autoResume: boolean;
}) {
  // Simple state-based model selection - no cookies needed
  const [selectedModel, setSelectedModel] = useState(initialChatModel);

  const { visibilityType } = useChatVisibility({
    chatId: id,
    initialVisibilityType,
  });

  const { mutate } = useSWRConfig();
  const { setDataStream } = useDataStream();

  const [input, setInput] = useState<string>('');

  // 简化transport - 模型参数现在直接通过sendMessage传递
  const transport = useMemo(
    () => new DefaultChatTransport({
      api: '/api/chat',
      fetch: fetchWithErrorHandlers,
      prepareSendMessagesRequest({ messages, id, body }) {
        return {
          body: {
            id,
            message: messages.at(-1),
            selectedChatModel: selectedModel, // 添加当前选择的模型
            selectedVisibilityType: visibilityType,
            ...body, // body中可能包含其他参数
          },
        };
      },
    }),
    [visibilityType, selectedModel]
  );

  const {
    messages,
    setMessages,
    sendMessage,
    status,
    stop,
    regenerate,
    resumeStream,
    addToolResult,
  } = useChat<ChatMessage>({
    id,
    messages: initialMessages,
    experimental_throttle: 100,
    generateId: generateUUID,
    transport,
    
    onData: (dataPart) => {
      setDataStream((ds) => [...(ds || []), dataPart]);
    },
    onFinish: () => {
      // mutate(unstable_serialize(getChatHistoryPaginationKey)); // Removed with Convex migration
    },
    onError: (error) => {
      if (error instanceof ChatSDKError) {
        toast({
          type: 'error',
          description: error.message,
        });
      }
    },
  });

  const searchParams = useSearchParams();
  const query = searchParams.get('query');

  const [hasAppendedQuery, setHasAppendedQuery] = useState(false);

  useEffect(() => {
    if (query && !hasAppendedQuery) {
      sendMessage({
        role: 'user' as const,
        parts: [{ type: 'text', text: query }],
      });

      setHasAppendedQuery(true);
    }
  }, [query, sendMessage, hasAppendedQuery, id]);

  // 临时禁用voting以减少错误和内存占用
  const votes: Array<Vote> = [];

  const [attachments, setAttachments] = useState<Array<Attachment>>([]);
  const isArtifactVisible = useArtifactSelector((state) => state.isVisible);
  const { setArtifact } = useArtifact();
  
  // Enable artifact persistence per chat (this handles initialization)
  useArtifactPersistence(id);

  useAutoResume({
    autoResume,
    initialMessages,
    resumeStream,
    setMessages,
  });

  return (
    <>
      <div className="flex flex-col h-screen w-full max-w-full relative" style={{ background: 'transparent !important' }}>
        {/* ChatHeader moved to floating DevTools only */}
        <ChatHeader
          chatId={id}
          selectedModelId={selectedModel}
          selectedVisibilityType={initialVisibilityType}
          isReadonly={isReadonly}
          user={user}
        />

        {/* Messages area with full height and internal scrolling */}
        <div className="flex-1 min-h-0 max-w-full" style={{ background: 'transparent !important' }}>
          <Messages
            status={status}
            votes={votes}
            messages={messages}
            setMessages={setMessages}
            regenerate={regenerate}
            isReadonly={isReadonly}
            isArtifactVisible={isArtifactVisible}
            addToolResult={addToolResult}
          />
        </div>

        {/* Fixed input at bottom with transparent background */}
        {!isReadonly && (
          <div className="absolute bottom-0 left-0 right-0 z-10 px-4 pb-4 md:pb-6 pt-4" style={{ background: 'transparent !important' }}>
            <MultimodalInput
              input={input}
              setInput={setInput}
              status={status}
              stop={stop}
              attachments={attachments}
              setAttachments={setAttachments}
              messages={messages}
              setMessages={setMessages}
              sendMessage={sendMessage}
              selectedVisibilityType={visibilityType}
              user={user}
              selectedModelId={selectedModel}
              setSelectedModelId={setSelectedModel}
            />
          </div>
        )}
      </div>

      <Artifact
        chatId={id}
        input={input}
        setInput={setInput}
        status={status}
        stop={stop}
        attachments={attachments}
        setAttachments={setAttachments}
        sendMessage={sendMessage}
        messages={messages}
        setMessages={setMessages}
        regenerate={regenerate}
        votes={votes}
        isReadonly={isReadonly}
        selectedVisibilityType={visibilityType}
      />
    </>
  );
}
