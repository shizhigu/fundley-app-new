'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { MessageCircle, Briefcase, Layout, Brain, EditIcon, TrashIcon } from 'lucide-react';
import { PlusIcon } from './icons';
import { Button } from './ui/button';
import { SidebarUserNav } from './sidebar-user-nav';
import type { AuthSession } from '@/lib/auth/clerk';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { GlassmorphismPanel } from './glassmorphism-panel';
import { ComingSoon } from './coming-soon';
import { useSQLQuery, useSQLMutation } from '@/lib/hooks/use-sql-query';
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

interface NavigationSidebarProps {
  user: AuthSession['user'];
  selectedChatId?: string;
  onChatSelect?: (chatId: string) => void;
}

type NavigationItem = 'chats' | 'portfolio' | 'spaces' | 'research';

export function NavigationSidebar({ user, selectedChatId, onChatSelect }: NavigationSidebarProps) {
  const router = useRouter();
  const [hoveredItem, setHoveredItem] = useState<NavigationItem | null>(null);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [renameDialog, setRenameDialog] = useState<{ open: boolean; chat: any | null }>({ open: false, chat: null });
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; chat: any | null }>({ open: false, chat: null });
  const [newTitle, setNewTitle] = useState('');

  // 获取用户的所有chats
  const { data: chatsData } = useSQLQuery<{ chats: any[] }>('/api/chats');
  const chats = chatsData?.chats;
  const { mutate: createChat } = useSQLMutation<{ chat: any }, { title: string }>('/api/chats');

  const handleRename = (chat: any) => {
    setNewTitle(chat.title);
    setRenameDialog({ open: true, chat });
  };

  const handleDelete = (chat: any) => {
    setDeleteDialog({ open: true, chat });
  };

  const confirmRename = async () => {
    if (!renameDialog.chat || !newTitle.trim()) return;

    try {
      const endpoint = `/api/chats/${renameDialog.chat.id}`;
      const { mutate } = useSQLMutation<{ chat: any }, { title: string }>(endpoint, { method: 'PUT' });
      await mutate({ title: newTitle.trim() });
      setRenameDialog({ open: false, chat: null });
      setNewTitle('');
    } catch (error) {
      console.error('Failed to rename chat:', error);
    }
  };

  const confirmDelete = async () => {
    if (!deleteDialog.chat) return;

    try {
      const endpoint = `/api/chats/${deleteDialog.chat.id}`;
      const { mutate } = useSQLMutation<{ success: boolean }, {}>(endpoint, { method: 'DELETE' });
      await mutate({});
      setDeleteDialog({ open: false, chat: null });
      // If deleted chat was selected, clear selection
      if (selectedChatId === deleteDialog.chat.id) {
        onChatSelect?.('');
      }
    } catch (error) {
      console.error('Failed to delete chat:', error);
    }
  };

  const clearHideTimeout = () => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
  };

  const handleNewChat = async () => {
    try {
      const result = await createChat({ title: 'New Chat' });
      router.push(`/chat/${result.chat.id}`);
    } catch (error) {
      console.error('Failed to create chat:', error);
    }
  };

  const navigationItems = [
    { id: 'chats' as const, label: 'Chats', icon: MessageCircle, href: '/' },
    { id: 'portfolio' as const, label: 'Portfolio', icon: Briefcase, href: '/portfolio' },
    { id: 'spaces' as const, label: 'Spaces', icon: Layout, href: '/spaces' },
    { id: 'research' as const, label: 'Research', icon: Brain, href: '/research' },
  ];

  return (
    <>
      <div className="flex h-screen w-16 flex-col bg-background border-r">
        {/* Navigation Items */}
        <div className="flex flex-col items-center py-4 space-y-2">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.id}
                className="relative"
                onMouseEnter={() => {
                  clearHideTimeout();
                  setHoveredItem(item.id);
                }}
                onMouseLeave={() => {
                  hideTimeoutRef.current = setTimeout(() => {
                    setHoveredItem(null);
                  }, 300);
                }}
              >
                <Link href={item.href}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-12 w-12 p-0"
                  >
                    <Icon className="h-5 w-5" />
                  </Button>
                </Link>

                {/* Hover Panel for Chats */}
                {hoveredItem === item.id && item.id === 'chats' && (
                  <GlassmorphismPanel className="absolute left-full top-0 ml-2 w-80 z-50">
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold">Recent Chats</h3>
                        <Button
                          size="sm"
                          onClick={handleNewChat}
                          className="h-8"
                        >
                          <PlusIcon className="h-4 w-4 mr-1" />
                          New
                        </Button>
                      </div>

                      <div className="space-y-1 max-h-96 overflow-y-auto">
                        {chats && chats.length > 0 ? (
                          chats.slice(0, 10).map((chat) => (
                            <ContextMenu key={chat.id}>
                              <ContextMenuTrigger>
                                <Button
                                  variant="ghost"
                                  key={chat.id}
                                  onClick={() => {
                                    router.push(`/chat/${chat.id}`);
                                    clearHideTimeout();
                                  }}
                                  className={cn(
                                    "flex w-full items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors",
                                    selectedChatId === chat.id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-accent"
                                  )}
                                >
                                  <MessageCircle className="h-4 w-4 flex-shrink-0" />
                                  <span className="flex-1 truncate text-left">
                                    {chat.title}
                                  </span>
                                </Button>
                              </ContextMenuTrigger>
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
                            </ContextMenu>
                          ))
                        ) : (
                          <div className="text-sm text-muted-foreground text-center py-4">
                            No chats yet. Create your first chat!
                          </div>
                        )}
                      </div>
                    </div>
                  </GlassmorphismPanel>
                )}

                {/* Hover Panel for Other Items */}
                {hoveredItem === item.id && item.id !== 'chats' && (
                  <GlassmorphismPanel className="absolute left-full top-0 ml-2 w-80 z-50">
                    <ComingSoon feature={item.label} />
                  </GlassmorphismPanel>
                )}
              </div>
            );
          })}
        </div>

        {/* User Navigation at Bottom */}
        <div className="mt-auto p-2">
          <SidebarUserNav user={user} />
        </div>
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
                confirmRename();
              }
            }}
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRenameDialog({ open: false, chat: null })}
            >
              Cancel
            </Button>
            <Button onClick={confirmRename}>Rename</Button>
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
            <Button
              variant="outline"
              onClick={() => setDeleteDialog({ open: false, chat: null })}
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