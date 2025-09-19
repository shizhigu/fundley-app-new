'use client';

import { useState } from 'react';
import { useSQLQuery } from '@/lib/hooks/use-sql-query';
import type { AuthSession } from '@/lib/auth/clerk';
import { ChatSidebar } from '@/components/chat-sidebar';
import { ChatView } from '@/components/chat-view';

interface PersistentChatProps {
  initialChatModel: string;
  user: AuthSession['user'];
  preloadedMessages: any;
}

export function PersistentChat({
  initialChatModel,
  user,
  preloadedMessages,
}: PersistentChatProps) {
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // 获取用户的所有chats
  const { data: chatsData } = useSQLQuery<{ chats: any[] }>('/api/chats');
  const chats = chatsData?.chats || [];

  const handleChatSelect = (chatId: string) => {
    setSelectedChatId(chatId);
  };

  const handleToggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className="flex h-screen">
      {/* Chat Sidebar */}
      <ChatSidebar
        chats={chats}
        selectedChatId={selectedChatId}
        onChatSelect={handleChatSelect}
        isOpen={isSidebarOpen}
        onToggle={handleToggleSidebar}
        user={user}
      />

      {/* Main Chat Area */}
      <div className="flex-1">
        {selectedChatId ? (
          <ChatView
            chatId={selectedChatId}
            initialChatModel={initialChatModel}
            user={user}
            onToggleSidebar={handleToggleSidebar}
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <h2 className="text-xl font-semibold mb-2">Welcome to Fundley AI</h2>
              <p className="text-muted-foreground">Select a chat or create a new one to get started</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}