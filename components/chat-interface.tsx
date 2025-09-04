'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { AuthSession } from '@/lib/auth/clerk';
import type { Id } from '@/convex/_generated/dataModel';
import { ChatSidebar } from '@/components/chat-sidebar';
import { ChatView } from '@/components/chat-view';

interface ChatInterfaceProps {
  initialChatModel: string;
  session: AuthSession;
}

export function ChatInterface({
  initialChatModel,
  session,
}: ChatInterfaceProps) {
  const [selectedChatId, setSelectedChatId] = useState<Id<"chats"> | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isInitializing, setIsInitializing] = useState(false);
  
  // 获取用户的所有chats
  const chats = useQuery(api.chats.list);
  
  // 获取或创建默认chat的mutation
  const getOrCreateDefault = useMutation(api.chats.getOrCreateDefault);

  // 如果没有选中的chat，自动选择或创建默认chat
  useEffect(() => {
    if (session?.user && !selectedChatId && chats && !isInitializing) {
      setIsInitializing(true);
      if (chats.length > 0) {
        // 优先选择有历史数据的chat（通常是迁移的默认chat）
        // 如果没有，则选择最新的chat
        const chatHistory = chats.find((chat: any) => chat.title === "Chat History");
        const selectedChat = chatHistory || chats.sort((a: any, b: any) => b.updatedAt - a.updatedAt)[0];
        setSelectedChatId(selectedChat._id);
        setIsInitializing(false);
      } else {
        // 创建默认chat
        getOrCreateDefault().then((chatId) => {
          setSelectedChatId(chatId);
          setIsInitializing(false);
        }).catch((error) => {
          console.error('Failed to create default chat:', error);
          setIsInitializing(false);
        });
      }
    }
  }, [session, selectedChatId, chats, isInitializing, getOrCreateDefault]);

  // Loading state - ensure session is fully loaded
  if (!session || !session.user || !chats || !selectedChatId || isInitializing) {
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
        session={session}
      />
      
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        <ChatView
          chatId={selectedChatId}
          initialChatModel={initialChatModel}
          session={session}
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        />
      </div>
    </div>
  );
}