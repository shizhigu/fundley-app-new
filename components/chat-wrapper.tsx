'use client';

import { useEffect, useState } from 'react';
import { Chat } from './chat';
import { ChatLoading } from './chat-loading';
import { DataStreamHandler } from './data-stream-handler';
import type { AuthSession } from '@/lib/auth/clerk';
import type { ChatMessage } from '@/lib/types';
import { convertToUIMessages } from '@/lib/utils';
import { DEFAULT_MODEL } from '@/lib/ai/models';
import type { VisibilityType } from './visibility-selector';

interface ChatWrapperProps {
  id: string;
  session: AuthSession;
}

export function ChatWrapper({ id, session }: ChatWrapperProps) {
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [visibility, setVisibility] = useState<VisibilityType>('private');
  const [isReadonly, setIsReadonly] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadChat = async () => {
      try {
        setLoading(true);
        
        // Fetch chat data
        const response = await fetch(`/api/chat/${id}/data`);
        if (!response.ok) {
          if (response.status === 404) {
            setError('Chat not found');
            return;
          }
          throw new Error('Failed to load chat');
        }
        
        const data = await response.json();
        
        const uiMessages = convertToUIMessages(data.messages, new Map(
          data.vizCaches.map((cache: any) => [cache.messageId, cache])
        ));
        
        setMessages(uiMessages);
        setVisibility(data.chat.visibility);
        setIsReadonly(session?.user?.id !== data.chat.userId);
      } catch (err) {
        console.error('Failed to load chat:', err);
        setError('Failed to load chat');
      } finally {
        setLoading(false);
      }
    };

    loadChat();
  }, [id, session?.user?.id]);

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">{error}</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <ChatLoading />
      </div>
    );
  }

  return (
    <>
      <Chat
        id={id}
        initialMessages={messages}
        initialChatModel={DEFAULT_MODEL}
        initialVisibilityType={visibility}
        isReadonly={isReadonly}
        session={session}
        autoResume={true}
      />
      <DataStreamHandler />
    </>
  );
}