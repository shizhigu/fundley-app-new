'use client';

import { useState, useRef, useEffect } from 'react';
import { Plus, MessageSquare, X, MoreHorizontal, Edit2, Trash2 } from 'lucide-react';
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
    <div className="flex flex-col h-full bg-background border-r border-border/50">
      {/* 头部 */}
      <div className="p-4 border-b border-border/50">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-foreground">Chats</h2>

          {/* 收起侧边栏按钮 */}
          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              title="收起聊天列表"
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
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
          )}
        </div>

        {/* 新建聊天按钮 */}
        <button
          onClick={onNewChat}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl neuro-primary text-white font-semibold transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" />
          <span className="text-sm">New Chat</span>
        </button>
      </div>

      {/* 聊天列表 */}
      <div className="flex-1 overflow-y-auto">
        {isLoading && chats.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">
            Loading chats...
          </div>
        ) : chats.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">
            No chats yet. Create your first chat!
          </div>
        ) : (
          <div className="px-2 py-2 space-y-0.5">
            {chats.map((chat) => (
              <div
                key={chat.id}
                className={`group relative flex items-center gap-2.5 px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-200 ${
                  selectedChatId === chat.id
                    ? 'bg-accent/80 text-foreground border border-primary/20'
                    : 'hover:bg-accent/50 text-muted-foreground hover:text-foreground'
                }`}
                onMouseEnter={() => setHoveredChatId(chat.id)}
                onMouseLeave={() => setHoveredChatId(null)}
                onClick={() => editingChatId !== chat.id && onChatSelect(chat.id)}
              >
                <MessageSquare className="w-4 h-4 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  {editingChatId === chat.id ? (
                    <input
                      ref={inputRef}
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveRename();
                        if (e.key === 'Escape') cancelRename();
                      }}
                      onBlur={saveRename}
                      className="w-full text-sm font-medium bg-background border border-border rounded-md px-2 py-1 outline-none focus:border-primary"
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <div className="text-sm font-medium truncate">
                      {chat.title}
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {new Date(chat.createdAt).toLocaleDateString()}
                  </div>
                </div>

                {/* 更多操作菜单 */}
                {hoveredChatId === chat.id && editingChatId !== chat.id && (
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowMenuChatId(showMenuChatId === chat.id ? null : chat.id);
                      }}
                      className="p-1 rounded-md hover:bg-background transition-colors"
                      title="More options"
                    >
                      <MoreHorizontal className="w-3.5 h-3.5" />
                    </button>

                    {/* 下拉菜单 */}
                    {showMenuChatId === chat.id && (
                      <div className="absolute right-0 top-7 z-50 w-32 bg-popover border border-border rounded-lg shadow-lg overflow-hidden">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRename(chat.id, chat.title);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-accent transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          Rename
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteChat(chat.id);
                            setShowMenuChatId(null);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 用户设置 */}
      <div className="p-4 border-t border-border">
        <SidebarUserNav user={user} />
      </div>
    </div>
  );
}