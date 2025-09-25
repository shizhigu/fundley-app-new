'use client';

import { useState, useEffect } from 'react';
import { ChatSidebar } from '@/components/chat-sidebar';
import { PersistentChat } from '@/components/persistent-chat';
import { useSQLQuery } from '@/lib/hooks/use-sql-query';
import type { AuthSession } from '@/lib/auth/clerk';

interface Chat {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
}

interface ChatWithSidebarProps {
  initialChatModel: string;
  user: AuthSession['user'];
  preloadedMessages: any;
}

export function ChatWithSidebar({
  initialChatModel,
  user,
  preloadedMessages,
}: ChatWithSidebarProps) {
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Fetch user's chats
  const { data: chatsData, loading: chatsLoading } = useSQLQuery<{ chats: Chat[] }>('/api/chats');
  const chats = chatsData?.chats || [];

  // Get default chat if no chat is selected
  const { data: defaultChatData } = useSQLQuery<{ chatId: string }>('/api/chats/default');

  // Set default chat ID when it's available
  useEffect(() => {
    console.log('🔄 ChatWithSidebar state:', {
      selectedChatId,
      chatsCount: chats.length,
      chatsLoading,
      defaultChatData
    });
    if (!selectedChatId && defaultChatData?.chatId) {
      console.log('🔄 Setting default chat ID:', defaultChatData.chatId);
      setSelectedChatId(defaultChatData.chatId);
    }
  }, [selectedChatId, defaultChatData?.chatId, chats.length, chatsLoading]);

  const handleChatSelect = (chatId: string) => {
    console.log('🔄 ChatWithSidebar: Chat selected:', chatId);
    setSelectedChatId(chatId);
  };

  const handleSidebarToggle = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className="flex h-full">
      {/* Chat Sidebar */}
      <ChatSidebar
        chats={chats}
        selectedChatId={selectedChatId}
        onChatSelect={handleChatSelect}
        isOpen={isSidebarOpen}
        onToggle={handleSidebarToggle}
        user={user}
      />

      {/* Main Chat Area */}
      <div className="flex-1 min-w-0">
        {selectedChatId ? (
          <PersistentChat
            key={selectedChatId} // Re-render when chat changes
            initialChatModel={initialChatModel}
            user={user}
            preloadedMessages={preloadedMessages}
            chatId={selectedChatId}
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <div className="text-muted-foreground">
              {chatsLoading ? 'Loading chats...' : 'Select a chat to start'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}