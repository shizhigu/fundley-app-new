'use client';

import { useState } from 'react';
import { useSQLMutation } from '@/lib/hooks/use-sql-query';
import type { AuthSession } from '@/lib/auth/clerk';
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
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
}

interface ChatSidebarProps {
  chats: Chat[];
  selectedChatId: string | null;
  onChatSelect: (chatId: string) => void;
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
  const [isRenaming, setIsRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [chatToDelete, setChatToDelete] = useState<Chat | null>(null);

  const { mutate: createChat } = useSQLMutation<{ chat: Chat }, { title: string }>('/api/chats');
  const { mutate: updateChatMutation } = useSQLMutation<{ chat: Chat }, { title: string }>('/api/chats/:id', { method: 'PUT' });
  const { mutate: deleteChatMutation } = useSQLMutation<{ success: boolean }, {}>('/api/chats/:id', { method: 'DELETE' });

  const handleNewChat = async () => {
    try {
      const result = await createChat({ title: 'New Chat' });
      onChatSelect(result.chat.id);
    } catch (error) {
      console.error('Failed to create chat:', error);
    }
  };

  const handleRename = (chat: Chat) => {
    setIsRenaming(chat.id);
    setRenameValue(chat.title);
  };

  const confirmRename = async () => {
    if (!isRenaming || !renameValue.trim()) return;

    try {
      // Create URL with specific chat ID
      const endpoint = `/api/chats/${isRenaming}`;
      const { mutate } = useSQLMutation<{ chat: Chat }, { title: string }>(endpoint, { method: 'PUT' });
      await mutate({ title: renameValue.trim() });

      setIsRenaming(null);
      setRenameValue('');
      // Trigger refetch by parent component
    } catch (error) {
      console.error('Failed to rename chat:', error);
    }
  };

  const handleDelete = (chat: Chat) => {
    setChatToDelete(chat);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!chatToDelete) return;

    try {
      const endpoint = `/api/chats/${chatToDelete.id}`;
      const { mutate } = useSQLMutation<{ success: boolean }, {}>(endpoint, { method: 'DELETE' });
      await mutate({});

      if (selectedChatId === chatToDelete.id) {
        onChatSelect('');
      }
      setIsDeleteDialogOpen(false);
      setChatToDelete(null);
      // Trigger refetch by parent component
    } catch (error) {
      console.error('Failed to delete chat:', error);
    }
  };

  return (
    <>
      <div className={cn(
        'flex flex-col border-r bg-background transition-all duration-300',
        isOpen ? 'w-80' : 'w-16'
      )}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          {isOpen && (
            <h2 className="text-lg font-semibold">Chats</h2>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
            className="h-8 w-8 p-0"
          >
            {isOpen ? (
              <ChevronLeftIcon className="h-4 w-4" />
            ) : (
              <ChevronRightIcon className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* New Chat Button */}
        <div className="p-4">
          <Button
            onClick={handleNewChat}
            className="w-full justify-start"
            variant="outline"
          >
            <PlusIcon className="h-4 w-4" />
            {isOpen && <span className="ml-2">New Chat</span>}
          </Button>
        </div>

        {/* Chat List */}
        <ScrollArea className="flex-1">
          <div className="space-y-1 p-2">
            {chats.map((chat) => (
              <ContextMenu key={chat.id}>
                <ContextMenuTrigger>
                  <Button
                    variant="ghost"
                    className={cn(
                      'group flex w-full items-center gap-2 rounded-lg p-3 text-left text-sm transition-colors hover:bg-accent',
                      selectedChatId === chat.id
                        ? 'bg-accent text-accent-foreground'
                        : 'text-muted-foreground'
                    )}
                    onClick={() => onChatSelect(chat.id)}
                  >
                    <MessageSquare className="h-4 w-4 flex-shrink-0" />
                    {isOpen && (
                      <>
                        {isRenaming === chat.id ? (
                          <Input
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onBlur={confirmRename}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                confirmRename();
                              } else if (e.key === 'Escape') {
                                setIsRenaming(null);
                                setRenameValue('');
                              }
                            }}
                            className="h-auto p-0 text-sm"
                            autoFocus
                          />
                        ) : (
                          <span className="flex-1 truncate">{chat.title}</span>
                        )}
                      </>
                    )}
                  </Button>
                </ContextMenuTrigger>
                {isOpen && (
                  <ContextMenuContent>
                    <ContextMenuItem onClick={() => handleRename(chat)}>
                      <EditIcon className="h-4 w-4 mr-2" />
                      Rename
                    </ContextMenuItem>
                    <ContextMenuSeparator />
                    <ContextMenuItem
                      onClick={() => handleDelete(chat)}
                      className="text-red-600"
                    >
                      <TrashIcon className="h-4 w-4 mr-2" />
                      Delete
                    </ContextMenuItem>
                  </ContextMenuContent>
                )}
              </ContextMenu>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Chat</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{chatToDelete?.title}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}