'use client';

import { ChatInterface } from '@/components/chat-interface';
import { useSQLQuery } from '@/lib/hooks/use-sql-query';
import type { AuthSession } from '@/lib/auth/clerk';

interface PersistentChatProps {
  initialChatModel: string;
  user: AuthSession['user'];
  preloadedMessages: any;
  chatId?: string; // Optional prop to override default chat
}

export function PersistentChat({
  initialChatModel,
  user,
  preloadedMessages,
  chatId: propChatId,
}: PersistentChatProps) {
  console.log('🔄 PersistentChat render:', { propChatId });

  // 获取默认聊天或创建一个（仅当没有提供chatId时）
  const { data: defaultChatData } = useSQLQuery<{ chatId: string }>(
    propChatId ? null : '/api/chats/default'
  );
  const chatId = propChatId || defaultChatData?.chatId || "main";

  // Show loading only if we're still fetching chat ID
  if (!chatId) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-muted-foreground">Loading chat...</div>
      </div>
    );
  }

  return (
    <ChatInterface
      chatId={chatId}
      initialChatModel={initialChatModel}
      user={user}
      isReadonly={false}
    />
  );
}