'use client';

import { useState, useEffect } from 'react';
import { useSQLQuery, useSQLMutation } from '@/lib/hooks/use-sql-query';
import type { AuthSession } from '@/lib/auth/clerk';
import { ChatSidebar } from '@/components/chat-sidebar';
import { ChatView } from '@/components/chat-view';

interface ChatInterfaceProps {
  initialChatModel: string;
  user: AuthSession['user'];
}

export function ChatInterface({
  initialChatModel,
  user,
}: ChatInterfaceProps) {
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isInitializing, setIsInitializing] = useState(false);
  
  // 获取用户的所有chats
  const { data: chatsData } = useSQLQuery<{ chats: any[] }>('/api/chats');
  const chats = chatsData?.chats;

  // 获取或创建默认chat的mutation
  const { mutate: getOrCreateDefault } = useSQLMutation<{ chatId: string }, {}>('/api/chats/default');

  // 如果没有选中的chat，自动选择或创建默认chat
  useEffect(() => {
    if (user && !selectedChatId && chats && !isInitializing) {
      setIsInitializing(true);
      if (chats.length > 0) {
        // 优先选择有历史数据的chat（通常是迁移的默认chat）
        // 如果没有，则选择最新的chat
        const chatHistory = chats.find((chat: any) => chat.title === "Chat History");
        const selectedChat = chatHistory || chats.sort((a: any, b: any) => b.updatedAt - a.updatedAt)[0];
        setSelectedChatId(selectedChat.id);
        setIsInitializing(false);
      } else {
        // 创建默认chat
        getOrCreateDefault({}).then((result) => {
          setSelectedChatId(result.chatId);
          setIsInitializing(false);
        }).catch((error) => {
          console.error('Failed to create default chat:', error);
          setIsInitializing(false);
        });
      }
    }
  }, [user, selectedChatId, chats, isInitializing, getOrCreateDefault]);

  // Loading state - ensure session is fully loaded
  if (!user || !chats || !selectedChatId || isInitializing) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Chat Sidebar */}
      <ChatSidebar
        chats={chats}
        selectedChatId={selectedChatId}
        onChatSelect={setSelectedChatId}
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
        user={user}
      />
      
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        <ChatView
          chatId={selectedChatId}
          initialChatModel={initialChatModel}
          user={user}
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        />
      </div>
    </div>
  );
}