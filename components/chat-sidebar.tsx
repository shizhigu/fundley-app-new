'use client';

import { useState } from 'react';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { AuthSession } from '@/lib/auth/clerk';
import type { Id } from '@/convex/_generated/dataModel';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PlusIcon, MessageSquare, ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Chat {
  _id: Id<"chats">;
  title: string;
  userId: Id<"users">;
  visibility: "private" | "public";
  createdAt: number;
  updatedAt: number;
}

interface ChatSidebarProps {
  chats: Chat[];
  selectedChatId: Id<"chats"> | null;
  onChatSelect: (chatId: Id<"chats">) => void;
  isOpen: boolean;
  onToggle: () => void;
  session: AuthSession;
}

export function ChatSidebar({
  chats,
  selectedChatId,
  onChatSelect,
  isOpen,
  onToggle,
  session,
}: ChatSidebarProps) {
  const [isCreating, setIsCreating] = useState(false);
  
  const createChat = useMutation(api.chats.create);

  const handleCreateChat = async () => {
    if (!session?.user || isCreating) return;
    
    setIsCreating(true);
    try {
      const newChatId = await createChat({
        title: 'New Chat',
        visibility: 'private'
      });
      onChatSelect(newChatId);
    } catch (error) {
      console.error('Failed to create new chat:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
    } else if (diffInHours < 24 * 7) {
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
    }
  };

  return (
    <>
      {/* Toggle button for collapsed state */}
      {!isOpen && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="fixed left-4 top-4 z-50 h-10 w-10"
        >
          <ChevronRightIcon className="h-4 w-4" />
        </Button>
      )}
      
      {/* Sidebar */}
      <div className={cn(
        "flex h-full flex-col border-r bg-muted/10 transition-all duration-300 ease-in-out",
        isOpen ? "w-80" : "w-0 overflow-hidden"
      )}>
        {/* Header */}
        <div className="flex items-center justify-between border-b p-4">
          <h2 className="text-lg font-semibold">Chats</h2>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCreateChat}
              disabled={isCreating}
              className="h-8 w-8"
            >
              <PlusIcon className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggle}
              className="h-8 w-8"
            >
              <ChevronLeftIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Chat list */}
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {chats.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <MessageSquare className="h-8 w-8 mb-2" />
                <p className="text-sm text-center">No chats yet</p>
                <p className="text-xs text-center mt-1">Create your first chat to get started</p>
              </div>
            ) : (
              chats
                .sort((a, b) => b.updatedAt - a.updatedAt)
                .map((chat) => (
                  <Button
                    key={chat._id}
                    variant={selectedChatId === chat._id ? "secondary" : "ghost"}
                    className={cn(
                      "w-full justify-start text-left h-auto p-3",
                      selectedChatId === chat._id && "bg-secondary"
                    )}
                    onClick={() => onChatSelect(chat._id)}
                  >
                    <div className="flex flex-col items-start w-full min-w-0">
                      <div className="flex items-center justify-between w-full">
                        <MessageSquare className="h-4 w-4 mr-2 shrink-0" />
                        <span className="text-xs text-muted-foreground shrink-0">
                          {formatDate(chat.updatedAt)}
                        </span>
                      </div>
                      <span className="text-sm font-medium truncate w-full mt-1">
                        {chat.title}
                      </span>
                    </div>
                  </Button>
                ))
            )}
          </div>
        </ScrollArea>

        {/* User info */}
        {session?.user && (
          <div className="border-t p-4">
            <div className="flex items-center space-x-3">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-sm font-medium">
                  {session.user.email?.[0]?.toUpperCase() || 'U'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {session.user.email}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {chats.length} chat{chats.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}