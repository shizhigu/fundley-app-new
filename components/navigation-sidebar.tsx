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
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
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
  const chats = useQuery(api.chats.list);
  const createChat = useMutation(api.chats.create);
  const updateChat = useMutation(api.chats.update);
  const deleteChat = useMutation(api.chats.remove);

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

  const startHideTimeout = () => {
    clearHideTimeout();
    hideTimeoutRef.current = setTimeout(() => {
      setHoveredItem(null);
    }, 500); // 500ms delay for better UX
  };

  const handleItemHover = (itemId: NavigationItem) => {
    clearHideTimeout();
    setHoveredItem(itemId);
  };

  const handleNavBarMouseEnter = () => {
    clearHideTimeout();
    // Don't change hoveredItem, just prevent hiding
  };

  const handleNavBarMouseLeave = () => {
    // Only start hide timeout if not moving to panel
    startHideTimeout();
  };

  const handlePanelMouseEnter = () => {
    clearHideTimeout();
    // Keep current hoveredItem active
  };

  const handlePanelMouseLeave = () => {
    startHideTimeout();
  };

  const navigationItems = [
    {
      id: 'chats' as NavigationItem,
      label: 'Chats',
      icon: MessageCircle,
      description: 'AI Chat Conversations',
    },
    {
      id: 'research' as NavigationItem,
      label: 'Research',
      icon: Brain,
      description: 'AI Native Investment Research',
    },
    {
      id: 'portfolio' as NavigationItem,
      label: 'Portfolio',
      icon: Briefcase,
      description: 'Investment Portfolio',
    },
    {
      id: 'spaces' as NavigationItem,
      label: 'Spaces',
      icon: Layout,
      description: 'Collaborative Workspaces',
    },
  ];


  const renderExpandedContent = (itemId: NavigationItem) => {
    switch (itemId) {
      case 'chats':
        return (
          <GlassmorphismPanel>
            {/* Header */}
            <div className="p-4 border-b border-gray-300 dark:border-gray-600">
              <div className="flex items-center justify-between mb-3">
                <div className="flex flex-col">
                  <div className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">
                    FUNDLEY A.I+
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Financial Intelligence
                  </div>
                </div>
              </div>
              
              {/* New Chat Button */}
              <Button
                variant="ghost"
                className="w-full bg-gradient-to-r from-orange-500/50 to-amber-500/50 hover:from-orange-500/60 hover:to-amber-500/60 !text-white hover:!text-white rounded-xl py-2 px-3 flex items-center gap-2 transition-all duration-200 shadow-md hover:shadow-lg backdrop-blur-sm border border-orange-400/30 hover:border-orange-400/40 [&>*]:!text-white [&:hover>*]:!text-white text-sm"
                onClick={async () => {
                  const newChatId = await createChat({
                    title: 'New Chat',
                    visibility: 'private'
                  });
                  onChatSelect?.(newChatId);
                }}
              >
                <PlusIcon size={16} />
                <span className="font-medium">New chat</span>
              </Button>
            </div>

            {/* Chat List */}
            <div className="flex-1 overflow-hidden flex flex-col">
              {chats && chats.length > 0 ? (
                <div className="flex-1 overflow-y-auto px-2 py-2">
                  {chats
                    .sort((a, b) => b.updatedAt - a.updatedAt)
                    .map((chat) => (
                      <ContextMenu key={chat._id}>
                        <ContextMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            className={cn(
                              "w-full justify-start text-left h-auto p-2 mb-1 rounded-lg text-sm transition-colors",
                              selectedChatId === chat._id
                                ? "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300"
                                : "hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                            )}
                            onClick={() => onChatSelect?.(chat._id)}
                          >
                            <div className="flex flex-col items-start w-full min-w-0">
                              <span className="font-medium truncate w-full">
                                {chat.title}
                              </span>
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {new Date(chat.updatedAt).toLocaleDateString()}
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
                    ))}
                </div>
              ) : (
                <div className="px-4 py-6 text-center">
                  <MessageCircle className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    No chats yet
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                    Create your first chat above
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-3">
              {user && <SidebarUserNav user={user} />}
            </div>
          </GlassmorphismPanel>
        );
      
      case 'research':
        return (
          <GlassmorphismPanel>
            <div className="p-4 border-b border-gray-300 dark:border-gray-600">
              <div className="flex flex-col">
                <div className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">
                  AI Native Research
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Intelligent Investment Analysis
                </div>
              </div>
              
              <Link href="/research">
                <Button
                  variant="ghost"
                  className="w-full bg-gradient-to-r from-primary/50 to-primary/70 hover:from-primary/60 hover:to-primary/80 !text-white hover:!text-white rounded-xl py-2 px-3 flex items-center gap-2 transition-all duration-200 shadow-md hover:shadow-lg backdrop-blur-sm border border-primary/30 hover:border-primary/40 [&>*]:!text-white [&:hover>*]:!text-white text-sm mt-3"
                >
                  <Brain size={16} />
                  <span className="font-medium">Open Research Platform</span>
                </Button>
              </Link>
            </div>

            <div className="p-4">
              <div className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                Features:
              </div>
              <ul className="space-y-2 text-xs text-gray-500 dark:text-gray-400">
                <li>• AI-powered financial analysis</li>
                <li>• Block-based document editor</li>
                <li>• Real-time data integration</li>
                <li>• Custom metric calculations</li>
                <li>• Interactive charts & visualizations</li>
              </ul>
            </div>
          </GlassmorphismPanel>
        );
        
      case 'portfolio':
        return (
          <GlassmorphismPanel>
            <ComingSoon feature="portfolio" />
          </GlassmorphismPanel>
        );
        
      case 'spaces':
        return (
          <GlassmorphismPanel>
            <ComingSoon feature="spaces" />
          </GlassmorphismPanel>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="flex h-screen">
      {/* Vertical Navigation Bar */}
      <div 
        className="w-16 bg-gray-900 dark:bg-gray-950 flex flex-col items-center py-6 z-30"
        onMouseEnter={handleNavBarMouseEnter}
        onMouseLeave={handleNavBarMouseLeave}
      >
        {/* Logo */}
        <Link href="/" className="mb-8">
          <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
            <div className="text-gray-900 font-bold text-lg">F</div>
          </div>
        </Link>

        {/* Navigation Items */}
        <div className="flex flex-col space-y-4 flex-1">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isHovered = hoveredItem === item.id;
            
            return (
              <div
                key={item.id}
                onMouseEnter={() => handleItemHover(item.id)}
                className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-200 relative group",
                  isHovered
                    ? "bg-orange-500/20 text-orange-400 shadow-lg"
                    : "bg-gray-800 dark:bg-gray-900 text-gray-400 hover:text-white hover:bg-gray-700 dark:hover:bg-gray-800"
                )}
              >
                <Icon size={20} />
                
                {/* Tooltip */}
                <div className="absolute left-16 bg-gray-800 text-white px-2 py-1 rounded text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                  {item.label}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Expandable Content Panel */}
      <div 
        className={cn(
          "bg-transparent transition-all duration-300 ease-in-out overflow-hidden",
          hoveredItem 
            ? "w-64 opacity-100" 
            : "w-0 opacity-0"
        )}
        onMouseEnter={handlePanelMouseEnter}
        onMouseLeave={handlePanelMouseLeave}
      >
        {hoveredItem && (
          <div className="w-64 h-full">
            {renderExpandedContent(hoveredItem)}
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
    </div>
  );
}