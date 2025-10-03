'use client';

import { useState, useEffect } from 'react';
import { useChatContext } from '@/lib/contexts/chat-context';
import { SimpleChatSelector } from '@/components/simple-chat-selector';
import { NewChatInterface } from '@/components/new-chat-interface';
import type { ChatManagerProps } from '@/lib/types/chat';

/**
 * 聊天管理器组件
 * 整合聊天侧边栏和聊天界面，使用统一的聊天Context
 */
export function ChatManager({ user, initialChatModel }: ChatManagerProps) {
  // 在桌面端默认展开侧边栏，移动端默认收起
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 1024; // lg breakpoint
    }
    return true; // 服务端渲染时默认展开
  });

  // 使用全局聊天Context（共享状态）
  const chat = useChatContext();

  // 监听窗口大小变化，在移动端自动收起侧边栏
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setIsSidebarOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleSidebarToggle = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const handleChatSelect = (chatId: string) => {
    chat.selectChat(chatId);
  };

  const handleNewChat = async () => {
    try {
      const newChatId = await chat.createChat();
      chat.selectChat(newChatId);
    } catch (error) {
      console.error('Failed to create new chat:', error);
    }
  };

  const handleDeleteChat = (chatId: string) => {
    chat.deleteChat(chatId);
  };

  const handleRenameChat = (chatId: string, newTitle: string) => {
    chat.renameChat(chatId, newTitle);
  };

  return (
    <div className="flex h-full relative">
      {/* 聊天侧边栏 */}
      <div className={`${isSidebarOpen ? 'w-80' : 'w-0'} transition-all duration-300 overflow-hidden`}>
        <SimpleChatSelector
          chats={chat.chats}
          selectedChatId={chat.currentChatId}
          onChatSelect={handleChatSelect}
          onNewChat={handleNewChat}
          onDeleteChat={handleDeleteChat}
          onRenameChat={handleRenameChat}
          isLoading={chat.isLoading}
          user={user}
          onToggleSidebar={handleSidebarToggle}
          isSidebarOpen={isSidebarOpen}
        />
      </div>

      {/* 侧边栏展开按钮 - 当侧边栏收起时显示 */}
      {!isSidebarOpen && (
        <button
          onClick={handleSidebarToggle}
          className="absolute left-2 top-4 z-50 p-2 bg-background border border-border rounded-md shadow-md hover:bg-accent hover:text-accent-foreground transition-colors"
          title="展开聊天列表"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 12h18M3 6h18M3 18h18" />
          </svg>
        </button>
      )}

      {/* 聊天界面 */}
      <div className="flex-1 min-w-0">
        {chat.currentChatId ? (
          <NewChatInterface
            chatId={chat.currentChatId}
            user={user}
            initialChatModel={initialChatModel}
            messages={chat.messages}
            groupedMessages={chat.groupedMessages}
            isLoading={chat.isLoading}
            error={chat.error}
            onSendMessage={chat.sendMessage}
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <div className="text-muted-foreground mb-4">No chat selected</div>
              <button
                onClick={handleNewChat}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                disabled={chat.isLoading}
              >
                Create New Chat
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}