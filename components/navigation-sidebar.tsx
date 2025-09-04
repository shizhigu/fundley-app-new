'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { MessageCircle, Briefcase, Layout } from 'lucide-react';
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

interface NavigationSidebarProps {
  user: AuthSession['user'];
  selectedChatId?: string;
  onChatSelect?: (chatId: string) => void;
}

type NavigationItem = 'chats' | 'portfolio' | 'spaces';

export function NavigationSidebar({ user, selectedChatId, onChatSelect }: NavigationSidebarProps) {
  const router = useRouter();
  const [hoveredItem, setHoveredItem] = useState<NavigationItem | null>(null);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // 获取用户的所有chats
  const chats = useQuery(api.chats.list);
  const createChat = useMutation(api.chats.create);

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
                      <Button
                        key={chat._id}
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
    </div>
  );
}