'use client';

import { useState } from 'react';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { AuthSession } from '@/lib/auth/clerk';
import type { Id } from '@/convex/_generated/dataModel';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { PlusIcon, MessageSquare, ChevronLeftIcon, ChevronRightIcon, EditIcon, TrashIcon } from 'lucide-react';
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
  user: AuthSession['user'];
}

export function ChatSidebar({
  chats,
  selectedChatId,
  onChatSelect,
  isOpen,
  onToggle,
  user,
}: ChatSidebarProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [renameDialog, setRenameDialog] = useState<{ open: boolean; chat: Chat | null }>({ open: false, chat: null });
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; chat: Chat | null }>({ open: false, chat: null });
  const [newTitle, setNewTitle] = useState('');
  
  const createChat = useMutation(api.chats.create);
  const updateChat = useMutation(api.chats.update);
  const deleteChat = useMutation(api.chats.remove);

  const handleCreateChat = async () => {
    if (!user || isCreating) return;
    
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

  const handleRename = (chat: Chat) => {
    setNewTitle(chat.title);
    setRenameDialog({ open: true, chat });
  };

  const handleDelete = (chat: Chat) => {
    setDeleteDialog({ open: true, chat });
  };

  const confirmRename = async () => {
    if (!renameDialog.chat || !newTitle.trim()) return;
    
    try {
      await updateChat({
        id: renameDialog.chat._id,
        title: newTitle.trim(),
      });
      setRenameDialog({ open: false, chat: null });
      setNewTitle('');
    } catch (error) {
      console.error('Failed to rename chat:', error);
    }
  };

  const confirmDelete = async () => {
    if (!deleteDialog.chat) return;
    
    try {
      await deleteChat({ id: deleteDialog.chat._id });
      setDeleteDialog({ open: false, chat: null });
      // If deleted chat was selected, clear selection
      if (selectedChatId === deleteDialog.chat._id) {
        // Select first available chat or null
        const remainingChats = chats.filter(c => c._id !== deleteDialog.chat!._id);
        if (remainingChats.length > 0) {
          onChatSelect(remainingChats[0]._id);
        }
      }
    } catch (error) {
      console.error('Failed to delete chat:', error);
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
                  <ContextMenu key={chat._id}>
                    <ContextMenuTrigger asChild>
                      <Button
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
                    </ContextMenuTrigger>
                    <ContextMenuContent className="w-48">
                      <ContextMenuItem onClick={() => handleRename(chat)}>
                        <EditIcon className="h-4 w-4 mr-2" />
                        Rename Chat
                      </ContextMenuItem>
                      <ContextMenuSeparator />
                      <ContextMenuItem 
                        onClick={() => handleDelete(chat)}
                        className="text-destructive focus:text-destructive"
                      >
                        <TrashIcon className="h-4 w-4 mr-2" />
                        Delete Chat
                      </ContextMenuItem>
                    </ContextMenuContent>
                  </ContextMenu>
                ))
            )}
          </div>
        </ScrollArea>

        {/* User info */}
        {user && (
          <div className="border-t p-4">
            <div className="flex items-center space-x-3">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-sm font-medium">
                  {user.email?.[0]?.toUpperCase() || 'U'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {user.email}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {chats.length} chat{chats.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Rename Dialog */}
      <Dialog open={renameDialog.open} onOpenChange={(open) => setRenameDialog({ open, chat: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Chat</DialogTitle>
            <DialogDescription>
              Enter a new name for this chat.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Chat name"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                confirmRename();
              }
            }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameDialog({ open: false, chat: null })}>
              Cancel
            </Button>
            <Button onClick={confirmRename} disabled={!newTitle.trim()}>
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open, chat: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Chat</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deleteDialog.chat?.title}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog({ open: false, chat: null })}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}