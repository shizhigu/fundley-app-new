'use client';

import { useState, useEffect, useRef } from 'react';
import { Menu, X } from 'lucide-react';
import { useChatContext } from '@/lib/contexts/chat-context';
import { SimpleChatSelector } from '@/components/simple-chat-selector';
import { NewChatInterface } from '@/components/new-chat-interface';
import { Button } from '@/components/ui/button';
import type { ChatManagerProps } from '@/lib/types/chat';

/**
 * Chat Manager Component
 * Floating sidebar design - no responsive layout shifts
 */
export function ChatManager({ user }: ChatManagerProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const chat = useChatContext();

  // Close sidebar when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;

      // Don't close if clicking inside the sidebar
      if (sidebarRef.current?.contains(target)) {
        return;
      }

      // Don't close if clicking on Radix UI portals (dropdown menus, dialogs)
      // Check for common Radix portal markers
      const isPortalClick =
        target.closest('[role="menu"]') !== null ||
        target.closest('[data-radix-popper-content-wrapper]') !== null ||
        target.closest('[data-radix-portal]') !== null ||
        // Settings dialog portal
        target.closest('[role="dialog"]') !== null;

      if (isPortalClick) {
        return;
      }

      // Close sidebar if clicking outside and sidebar is open
      if (isSidebarOpen) {
        setIsSidebarOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isSidebarOpen]);

  // Close sidebar on Escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isSidebarOpen) {
        setIsSidebarOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isSidebarOpen]);

  const handleSidebarToggle = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const handleChatSelect = (chatId: string) => {
    chat.selectChat(chatId);
    setIsSidebarOpen(false);
  };

  const handleNewChat = async () => {
    try {
      const newChatId = await chat.createChat();
      chat.selectChat(newChatId);
      setIsSidebarOpen(false);
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
    <div className="flex h-full w-full relative overflow-hidden">
      {/* Menu Button - Always visible in top-left */}
      <Button
        variant="ghost"
        size="icon"
        onClick={handleSidebarToggle}
        className="absolute left-4 top-4 z-[70] hover:bg-accent/80 transition-colors"
        title={isSidebarOpen ? 'Close chat list' : 'Open chat list'}
      >
        {isSidebarOpen ? (
          <X className="w-5 h-5" />
        ) : (
          <Menu className="w-5 h-5" />
        )}
      </Button>

      {/* Backdrop overlay - only show when sidebar is open */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[40] transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Floating Sidebar - slides in from left */}
      <div
        ref={sidebarRef}
        className={`
          fixed left-0 top-0 h-full w-80 bg-background border-r border-border
          shadow-2xl z-[60] transition-transform duration-300 ease-in-out
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
        style={{ pointerEvents: isSidebarOpen ? 'auto' : 'none' }}
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

      {/* Chat Interface - always full width, no responsive shifts */}
      <div className="flex-1 w-full min-w-0 overflow-hidden">
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
