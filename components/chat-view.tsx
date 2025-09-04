'use client';

import { useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { AuthSession } from '@/lib/auth/clerk';
import type { Id } from '@/convex/_generated/dataModel';
import { Button } from '@/components/ui/button';
import { MenuIcon } from 'lucide-react';
import { Messages } from '@/components/messages';
import { MultimodalInput } from '@/components/multimodal-input';
import { DataStreamProvider } from '@/components/data-stream-provider';
import { convertToUIMessages, generateUUID } from '@/lib/utils';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import type { Vote } from '@/lib/db/schema';
import { useArtifactSelector } from '@/hooks/use-artifact';
import type { Attachment, ChatMessage } from '@/lib/types';
import type { VisibilityType } from '@/components/visibility-selector';

interface ChatViewProps {
  chatId: Id<"chats">;
  initialChatModel: string;
  user: AuthSession['user'];
  onToggleSidebar: () => void;
}

export function ChatView({
  chatId,
  initialChatModel,
  user,
  onToggleSidebar,
}: ChatViewProps) {
  // Get messages for this specific chat
  const messagesFromDb = useQuery(api.messages.list, { chatId });
  
  // Get chat info for title
  const chat = useQuery(api.chats.get, { id: chatId });

  // Show loading until all data is ready
  if (messagesFromDb === undefined || chat === undefined) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-muted-foreground">Loading chat...</div>
      </div>
    );
  }

  return (
    <ChatViewContent
      chatId={chatId}
      initialChatModel={initialChatModel}
      user={session?.user || null}
      onToggleSidebar={onToggleSidebar}
      messagesFromDb={messagesFromDb}
      chat={chat}
    />
  );
}

// Internal component that only renders when data is ready
function ChatViewContent({
  chatId,
  initialChatModel,
  user,
  onToggleSidebar,
  messagesFromDb,
  chat,
}: ChatViewProps & {
  messagesFromDb: any[];
  chat: any;
}) {
  const [selectedChatModel, setSelectedChatModel] = useState(initialChatModel);
  const [attachments, setAttachments] = useState<Array<Attachment>>([]);
  const [uploadQueue, setUploadQueue] = useState<Array<{ file: File; progress: number }>>([]);
  const [input, setInput] = useState<string>('');
  const isArtifactVisible = useArtifactSelector((state) => state.isVisible);
  
  // Convert messages once data is loaded
  const uiMessages = convertToUIMessages(messagesFromDb);
  console.log(`🔍 ChatView: uiMessages length: ${uiMessages.length}`);
  
  const {
    messages,
    setMessages,
    status,
    stop,
    regenerate,
    sendMessage,
  } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/chat',
      body: {
        selectedChatModel,
      },
    }),
    messages: uiMessages,
    id: chatId, // Use chatId as the chat session identifier
    onError: (error) => {
      console.error('Chat error:', error);
    },
  });
  
  console.log(`🔍 ChatView: useChat messages length: ${messages.length}`);

  return (
    <>
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b bg-background px-4 py-3">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleSidebar}
              className="h-9 w-9"
            >
              <MenuIcon className="h-4 w-4" />
            </Button>
            <div className="flex flex-col">
              <h1 className="text-lg font-semibold">
                {chat?.title || 'Loading...'}
              </h1>
              <p className="text-xs text-muted-foreground">
                Model: {selectedChatModel}
              </p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-hidden">
          <Messages
            status={status}
            votes={undefined} // Will implement votes later if needed
            messages={messages}
            setMessages={setMessages}
            regenerate={regenerate}
            isReadonly={false}
            isArtifactVisible={isArtifactVisible}
          />
        </div>

        {/* Input */}
        <div className="border-t bg-background p-4">
          <MultimodalInput
            input={input}
            setInput={setInput}
            status={status}
            stop={stop}
            messages={messages}
            setMessages={setMessages}
            sendMessage={sendMessage}
            attachments={attachments}
            setAttachments={setAttachments}
            selectedVisibilityType="private"
            user={session?.user || null}
            selectedModelId={selectedChatModel}
            setSelectedModelId={setSelectedChatModel}
          />
        </div>
      </div>
    </>
  );
}