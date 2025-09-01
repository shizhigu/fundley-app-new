'use client';

import { useMemo } from 'react';
import { Preloaded, usePreloadedQuery, useQuery } from 'convex/react';
import { Chat } from '@/components/chat';
import { convertToUIMessages } from '@/lib/utils';
import { api } from '@/convex/_generated/api';
import type { AuthSession } from '@/lib/auth/clerk';

interface PersistentChatProps {
  initialChatModel: string;
  session: AuthSession;
  preloadedMessages: Preloaded<typeof api.messages.list> | null;
}

export function PersistentChat({
  initialChatModel,
  session,
  preloadedMessages,
}: PersistentChatProps) {
  // 🔄 实时更新（认证后） - 这是主要的数据源
  const realtimeMessages = useQuery(
    session?.user ? api.messages.list : "skip"
  );
  
  // 🔒 使用预加载数据作为初始状态（如果可用）
  const preloadedData = preloadedMessages ? usePreloadedQuery(preloadedMessages) : null;
  
  // 优先使用实时数据，回退到预加载数据
  const messages = realtimeMessages ?? preloadedData;
  
  // 只在用户已认证但没有数据时显示加载状态
  const isLoading = session?.user && !messages;

  // Convert messages once when data changes
  const initialMessages = useMemo(() => {
    if (messages && messages.length > 0) {
      try {
        return convertToUIMessages(messages);
      } catch (error) {
        console.error('❌ Error converting messages:', error);
        return [];
      }
    }
    return [];
  }, [messages]);

  // Show loading only if we're still fetching and have no data
  if (isLoading) {
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