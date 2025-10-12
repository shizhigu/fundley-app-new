'use client';

import { useState, useRef, useEffect } from 'react';
import { Plus, MessageSquare, Trash2, Edit2, ChevronLeft, MoreHorizontal } from 'lucide-react';
import { SidebarUserNav } from '@/components/sidebar-user-nav';
import type { Chat } from '@/lib/types/chat';
import type { AuthSession } from '@/lib/auth/clerk';

interface SimpleChatSelectorProps {
  chats: Chat[];
  selectedChatId: string | null;
  onChatSelect: (chatId: string) => void;
  onNewChat: () => void;
  onDeleteChat: (chatId: string) => void;
  onRenameChat: (chatId: string, newTitle: string) => void;
  isLoading?: boolean;
  user?: AuthSession['user'];
  onToggleSidebar?: () => void;
  isSidebarOpen?: boolean;
}

export function SimpleChatSelector({
  chats,
  selectedChatId,
  onChatSelect,
  onNewChat,
  onDeleteChat,
  onRenameChat,
  isLoading = false,
  user,
  onToggleSidebar,
  isSidebarOpen
}: SimpleChatSelectorProps) {
  const [hoveredChatId, setHoveredChatId] = useState<string | null>(null);
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [showMenuChatId, setShowMenuChatId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when editing starts
  useEffect(() => {
    if (editingChatId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingChatId]);

  const handleRename = (chatId: string, currentTitle: string) => {
    setEditingChatId(chatId);
    setEditTitle(currentTitle);
    setShowMenuChatId(null);
  };

  const saveRename = () => {
    if (editingChatId && editTitle.trim()) {
      onRenameChat(editingChatId, editTitle.trim());
    }
    setEditingChatId(null);
    setEditTitle('');
  };

  const cancelRename = () => {
    setEditingChatId(null);
    setEditTitle('');
  };

  return (
    <div className="flex flex-col h-full bg-background border-r border-border">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">Chats</h2>

          {/* Collapse sidebar button */}
          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-200"
              title="Collapse sidebar"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* New chat button */}
        <button
          onClick={onNewChat}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-primary text-white rounded-lg font-medium transition-all duration-200 hover:bg-brand-primary/90 active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" />
          <span className="text-sm">New Chat</span>
        </button>
      </div>

      {/* Chat list */}
      <div className="flex-1 overflow-y-auto">
        {isLoading && chats.length === 0 ? (
          <div className="p-4 text-center">
            <div className="text-sm text-muted-foreground">Loading chats...</div>
          </div>
        ) : chats.length === 0 ? (
          <div className="p-8 text-center">
            <MessageSquare className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
            <div className="text-sm text-muted-foreground">
              No chats yet. Create your first chat!
            </div>
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {chats.map((chat) => {
              const isSelected = selectedChatId === chat.id;
              const isHovered = hoveredChatId === chat.id;
              const isEditing = editingChatId === chat.id;

              return (
                <div
                  key={chat.id}
                  className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-200 ${
                    isSelected
                      ? 'bg-brand-primary/10 border border-brand-primary/20 text-brand-primary'
                      : 'text-foreground hover:bg-muted border border-transparent'
                  }`}
                  onMouseEnter={() => setHoveredChatId(chat.id)}
                  onMouseLeave={() => setHoveredChatId(null)}
                  onClick={() => !isEditing && onChatSelect(chat.id)}
                >
                  {/* Icon */}
                  <MessageSquare className={`w-4 h-4 flex-shrink-0 transition-all duration-200 ${
                    isSelected ? 'text-brand-primary' : 'text-muted-foreground'
                  }`} />

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    {isEditing ? (
                      <input
                        ref={inputRef}
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveRename();
                          if (e.key === 'Escape') cancelRename();
                        }}
                        onBlur={saveRename}
                        className="w-full text-sm font-medium bg-background border border-border rounded-md px-2 py-1 outline-none focus:border-brand-primary transition-all duration-200"
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <>
                        <div className={`text-sm font-medium truncate transition-all duration-200 ${
                          isSelected ? 'text-brand-primary' : 'text-foreground'
                        }`}>
                          {chat.title}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {new Date(chat.createdAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Actions menu */}
                  {isHovered && !isEditing && (
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowMenuChatId(showMenuChatId === chat.id ? null : chat.id);
                        }}
                        className={`p-1.5 rounded-md transition-all duration-200 ${
                          showMenuChatId === chat.id
                            ? 'bg-muted text-foreground'
                            : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                        }`}
                        title="More options"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </button>

                      {/* Dropdown menu */}
                      {showMenuChatId === chat.id && (
                        <>
                          {/* Backdrop */}
                          <div
                            className="fixed inset-0 z-40"
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowMenuChatId(null);
                            }}
                          />

                          {/* Menu */}
                          <div className="absolute right-0 top-8 z-50 w-40 bg-card border border-border rounded-lg shadow-lg overflow-hidden">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRename(chat.id, chat.title);
                              }}
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted transition-all duration-200"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                              <span>Rename</span>
                            </button>
                            <div className="h-px bg-border" />
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteChat(chat.id);
                                setShowMenuChatId(null);
                              }}
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-all duration-200"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Delete</span>
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* User navigation */}
      <div className="p-4 border-t border-border">
        <SidebarUserNav user={user} />
      </div>
    </div>
  );
}
