'use client';

import { useMemo, useEffect } from 'react';
import { Preloaded, usePreloadedQuery, useQuery } from 'convex/react';
import { Chat } from '@/components/chat';
import { convertToUIMessages } from '@/lib/utils';
import { api } from '@/convex/_generated/api';
import type { AuthSession } from '@/lib/auth/clerk';
import { useChatContext } from '@/components/chat-layout-provider';
import { logSystemPrompt } from '@/lib/ai/prompts';

interface PersistentChatProps {
  initialChatModel: string;
  user: AuthSession['user'];
  preloadedMessages: Preloaded<typeof api.messages.list> | null;
}

export function PersistentChat({
  initialChatModel,
  user,
  preloadedMessages,
}: PersistentChatProps) {
  // 使用Context获取选中的chatId
  const { selectedChatId } = useChatContext();
  // 获取选中chat的消息（如果提供了selectedChatId）
  const selectedChatMessages = useQuery(
    selectedChatId ? api.messages.list : ("skip" as any),
    selectedChatId ? { chatId: selectedChatId as any } : ("skip" as any)
  );
  
  // 🔄 实时更新（认证后） - 这是主要的数据源（默认chat）
  const realtimeMessages = useQuery(
    user && !selectedChatId ? api.messages.listForPersistentChat : ("skip" as any),
    user && !selectedChatId ? {} : ("skip" as any)
  );
  
  // 暂时简化：不使用预加载数据，只使用实时数据
  // TODO: 重构预加载逻辑以符合React Hook规则
  
  // 优先使用选中chat的消息，回退到实时数据
  const messages = selectedChatMessages ?? realtimeMessages;
  
  // 只在用户已认证但没有数据时显示加载状态
  const isLoading = user && !messages;

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

  // Debug: Log complete system prompt on component mount (development only)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      try {
        console.log('🔍 About to log system prompt...');
        logSystemPrompt();
      } catch (error) {
        console.error('❌ Error logging system prompt:', error);
      }
    }
  }, []);

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
      id={selectedChatId || "main"}
      initialMessages={initialMessages}
      initialChatModel={initialChatModel}
      initialVisibilityType="private"
      isReadonly={false}
      user={user}
      autoResume={false}
    />
  );
}