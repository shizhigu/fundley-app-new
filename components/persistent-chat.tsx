'use client';

import { useMemo } from 'react';
import useSWR from 'swr';
import { Chat } from '@/components/chat';
import { fetcher, convertToUIMessages } from '@/lib/utils';
import type { AuthSession } from '@/lib/auth/clerk';

interface PersistentChatProps {
  initialChatModel: string;
  session: AuthSession;
}

export function PersistentChat({
  initialChatModel,
  session,
}: PersistentChatProps) {
  // Load messages from Convex
  const { data: chatData, isLoading } = useSWR(
    '/api/chat/permanent/data',
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  );

  // Convert messages once when data changes
  const initialMessages = useMemo(() => {
    console.log('🔍 Debug chatData:', chatData);
    if (chatData?.messages && chatData.messages.length > 0) {
      console.log('📋 Converting', chatData.messages.length, 'messages from Convex');
      console.log('🔍 First message sample:', chatData.messages[0]);
      try {
        const converted = convertToUIMessages(chatData.messages);
        console.log('✅ Converted messages:', converted.length);
        return converted;
      } catch (error) {
        console.error('❌ Error converting messages:', error);
        return [];
      }
    }
    console.log('📋 No messages to convert - chatData?.messages:', chatData?.messages?.length || 'undefined');
    return [];
  }, [chatData?.messages]);

  // Show loading only if we're still fetching and have no data
  if (isLoading && !chatData?.messages) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-muted-foreground">Loading chat history...</div>
      </div>
    );
  }

  return (
    <Chat 
      id="main"
      initialMessages={initialMessages}
      initialChatModel={initialChatModel}
      initialVisibilityType="private"
      isReadonly={false}
      session={session}
      autoResume={false}
    />
  );
}