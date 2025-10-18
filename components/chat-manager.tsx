'use client';

import { useState, useEffect } from 'react';
import { Menu } from 'lucide-react';
import { useChatContext } from '@/lib/contexts/chat-context';
import { SimpleChatSelector } from '@/components/simple-chat-selector';
import { NewChatInterface } from '@/components/new-chat-interface';
import { Button } from '@/components/ui/button';
import type { ChatManagerProps } from '@/lib/types/chat';

/**
 * Chat Manager Component
 * Manages sidebar and chat interface with unified chat context
 */
export function ChatManager({ user }: ChatManagerProps) {
  // Desktop: expanded by default, Mobile: collapsed by default
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    if (typeof window === 'undefined') return true; // SSR default
    return window.innerWidth >= 1024; // lg breakpoint
  });

  const chat = useChatContext();

  // Responsive: auto-collapse sidebar on mobile
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
    <div className="flex h-full relative overflow-hidden">
      {/* Sidebar */}
      <div
        className={`
          ${isSidebarOpen ? 'w-80' : 'w-0'}
          transition-all duration-300 overflow-hidden
        `}
      >
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

      {/* Sidebar Toggle Button - Show when sidebar is collapsed */}
      {!isSidebarOpen && (
        <Button
          variant="outline"
          size="icon"
          onClick={handleSidebarToggle}
          className="absolute left-2 top-4 z-50 bg-card border-border hover:border-brand-primary/30 shadow-sm"
          title="Expand chat list"
        >
          <Menu className="w-4 h-4" />
        </Button>
      )}

      {/* Chat Interface */}
      <div className="flex-1 min-w-0 overflow-hidden">
        {chat.currentChatId ? (
          <NewChatInterface
            chatId={chat.currentChatId}
            user={user}
            messages={chat.messages}
            groupedMessages={chat.groupedMessages}
            isLoading={chat.isLoading}
            error={chat.error}
            onSendMessage={chat.sendMessage}
            setLoading={chat.setLoading}
            currentDisplayMessage={chat.currentDisplayMessage}
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-background">
            <div className="text-center space-y-4">
              <p className="text-muted-foreground text-sm">No chat selected</p>
              <Button
                onClick={handleNewChat}
                disabled={chat.isLoading}
                className="bg-brand-primary text-white hover:opacity-90"
              >
                Create New Chat
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
