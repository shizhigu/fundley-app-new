'use client';

import { useState } from 'react';
import { Plus, MessageSquare, X, MoreHorizontal } from 'lucide-react';
import { SidebarUserNav } from '@/components/sidebar-user-nav';
import type { Chat } from '@/lib/types/chat';
import type { AuthSession } from '@/lib/auth/clerk';

interface SimpleChatSelectorProps {
  chats: Chat[];
  selectedChatId: string | null;
  onChatSelect: (chatId: string) => void;
  onNewChat: () => void;
  onDeleteChat: (chatId: string) => void;
  isLoading?: boolean;
  user?: AuthSession['user'];
}

export function SimpleChatSelector({
  chats,
  selectedChatId,
  onChatSelect,
  onNewChat,
  onDeleteChat,
  isLoading = false,
  user
}: SimpleChatSelectorProps) {
  const [hoveredChatId, setHoveredChatId] = useState<string | null>(null);

  return (
    <div className="flex flex-col h-full bg-background border-r border-border">
      {/* 头部 */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Chats</h2>
        </div>

        {/* 新建聊天按钮 */}
        <button
          onClick={onNewChat}
          disabled={isLoading}
          className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-accent hover:text-accent-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="w-4 h-4" />
          <span>New Chat</span>
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
          <div className="p-2 space-y-1">
            {chats.map((chat) => (
              <div
                key={chat.id}
                className={`group relative flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                  selectedChatId === chat.id
                    ? 'bg-accent text-accent-foreground'
                    : 'hover:bg-accent/50'
                }`}
                onMouseEnter={() => setHoveredChatId(chat.id)}
                onMouseLeave={() => setHoveredChatId(null)}
                onClick={() => onChatSelect(chat.id)}
              >
                <MessageSquare className="w-4 h-4 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">
                    {chat.title}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(chat.createdAt).toLocaleDateString()}
                  </div>
                </div>

                {/* 删除按钮 */}
                {hoveredChatId === chat.id && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteChat(chat.id);
                    }}
                    className="p-1 rounded hover:bg-destructive hover:text-destructive-foreground transition-colors"
                    title="Delete chat"
                  >
                    <X className="w-3 h-3" />
                  </button>
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