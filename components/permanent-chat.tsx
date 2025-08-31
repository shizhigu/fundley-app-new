'use client';

import { useChat } from '@ai-sdk/react';
import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { ChatHeader } from '@/components/chat-header';
import { fetcher, convertToUIMessages } from '@/lib/utils';
import { Artifact } from './artifact';
import { MultimodalInput } from './multimodal-input';
import { Messages } from './messages';
import { useArtifact } from '@/hooks/use-artifact';
import { useDataStream } from './data-stream-provider';
import type { AuthSession } from '@/lib/auth/clerk';
import type { ChatMessage, Attachment } from '@/lib/types';
import type { VisibilityType } from './visibility-selector';
import { toast } from './toast';

interface PermanentChatProps {
  initialChatModel: string;
  session: AuthSession;
}

export function PermanentChat({
  initialChatModel,
  session,
}: PermanentChatProps) {
  const [selectedModel, setSelectedModel] = useState(initialChatModel);
  const [attachments, setAttachments] = useState<Array<Attachment>>([]);
  const [input, setInput] = useState<string>('');
  const [requestTimeout, setRequestTimeout] = useState<NodeJS.Timeout | null>(null);
  
  // Permanent chat is always private
  const selectedVisibilityType: VisibilityType = 'private';
  
  // Load permanent chat data
  const { data: chatData, mutate, isLoading: isDataLoading, error } = useSWR(
    '/api/chat/permanent/data',
    fetcher,
    {
      fallbackData: { chat: null, messages: [] },
    }
  );

  const {
    messages,
    setMessages,
    handleSubmit,
    sendMessage: chatSendMessage,
    isLoading,
    stop,
    status,
  } = useChat({
    body: {
      selectedChatModel: selectedModel,
    },
    onError: (error) => {
      console.error('Chat error:', error);
      toast({
        type: 'error',
        description: 'Failed to send message. Please try again.',
      });
    },
    onFinish: () => {
      // Refresh permanent chat data after completion
      mutate();
    },
    initialMessages: [],
  });

  // Sync messages when chatData loads (initial load only)
  useEffect(() => {
    if (chatData?.messages && chatData.messages.length > 0 && messages.length === 0) {
      console.log('📋 Initial sync of messages from server:', chatData.messages.length);
      const uiMessages = convertToUIMessages(chatData.messages);
      setMessages(uiMessages);
    }
  }, [chatData?.messages, messages.length]); // Depend on both

  const { data: dataStream } = useDataStream();
  const { selectedArtifact } = useArtifact();

  // Clean up incomplete assistant messages on component mount
  useEffect(() => {
    if (chatData?.messages) {
      const hasIncompleteAssistant = chatData.messages.some(
        (msg: any) => msg.role === 'assistant' && (!msg.parts || msg.parts.length === 0)
      );
      
      if (hasIncompleteAssistant) {
        console.log('🧹 Cleaning up incomplete assistant messages...');
        // Call cleanup API
        fetch('/api/chat/permanent/cleanup', { method: 'POST' })
          .then(res => res.json())
          .then(result => {
            console.log('🧹 Cleanup result:', result);
            // Force refresh after cleanup
            mutate();
            // Reset useChat state if still loading
            if (isLoading) {
              stop();
            }
          })
          .catch(err => {
            console.error('Cleanup failed:', err);
            // Fallback: still try to refresh
            mutate();
          });
      }
    }
  }, [chatData?.messages, isLoading, mutate, stop]);

  const sendMessage = async (
    message: ChatMessage,
  ) => {
    try {
      // Clear any existing timeout
      if (requestTimeout) {
        clearTimeout(requestTimeout);
      }

      // Set a 60-second timeout
      const timeout = setTimeout(() => {
        console.log('⏰ Request timeout - forcing stop');
        stop();
        toast({
          type: 'error',
          description: 'Request timed out. You can try sending another message.',
        });
      }, 60000);
      
      setRequestTimeout(timeout);
      await chatSendMessage(message);
    } catch (error) {
      console.error('Failed to send message:', error);
      // Clear timeout on error
      if (requestTimeout) {
        clearTimeout(requestTimeout);
        setRequestTimeout(null);
      }
      toast({
        type: 'error',
        description: 'Failed to send message. Please try again.',
      });
    }
  };

  // Clear timeout when request completes
  useEffect(() => {
    if (!isLoading && requestTimeout) {
      clearTimeout(requestTimeout);
      setRequestTimeout(null);
    }
  }, [isLoading, requestTimeout]);

  // Show loading if data is still loading
  if (isDataLoading) {
    return (
      <div className="flex h-dvh bg-background items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4" />
          <p className="text-gray-500">Loading workspace...</p>
          {error && (
            <p className="text-red-500 mt-2">Error: {error.message}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-transparent flex flex-col">
      {/* Fixed Header */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-border/10">
        <ChatHeader
          selectedModel={selectedModel}
          onModelChange={setSelectedModel}
          chatTitle={chatData?.chat?.title || "My Workspace"}
          isReadonly={false}
          chatId="workspace"
        />
      </div>
      
      {/* Main Content Area */}
      <div className="flex flex-1 min-h-0">
        {/* Messages Area */}
        <div className="flex-1 flex flex-col min-h-0 max-w-4xl mx-auto w-full relative">
          {/* Full height messages */}
          <div className="flex-1 overflow-hidden">
            <Messages
              chatId="workspace"
              status={status}
              messages={messages}
              setMessages={setMessages}
              regenerate={() => {}} 
              votes={[]}
              isReadonly={false}
              isArtifactVisible={!!selectedArtifact}
            />
          </div>
          
          {/* Floating Input Area */}
          <div className="absolute bottom-0 left-0 right-0 px-4 py-4 bg-transparent pointer-events-none">
            <div className="pointer-events-auto">
              <MultimodalInput
                chatId="workspace"
                input={input}
                setInput={setInput}
                status={status}
                stop={stop}
                attachments={attachments}
                setAttachments={setAttachments}
                messages={messages}
                setMessages={setMessages}
                sendMessage={sendMessage}
                selectedVisibilityType={selectedVisibilityType}
                session={session}
                selectedModelId={selectedModel}
                setSelectedModelId={setSelectedModel}
              />
            </div>
          </div>
        </div>

        {/* Artifact Panel */}
        {selectedArtifact && (
          <div className="w-[600px] border-l border-border/20 bg-background/50">
            <Artifact
              artifact={selectedArtifact}
              messages={messages}
              isLoading={isLoading}
            />
          </div>
        )}
      </div>
    </div>
  );
}