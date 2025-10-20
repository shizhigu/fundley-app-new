'use client';

import { useState } from 'react';
import { MessageSquare, BarChart3 } from 'lucide-react';
import { ChatManager } from '@/components/chat-manager';
import { RightPanelTabs } from '@/components/right-panel-tabs';
import type { AuthSession } from '@/lib/auth/clerk';
import { cn } from '@/lib/utils';

interface MobileTabsProps {
  user: AuthSession['user'];
}

type TabType = 'chat' | 'analysis';

export function MobileTabs({ user }: MobileTabsProps) {
  const [activeTab, setActiveTab] = useState<TabType>('chat');

  const tabs = [
    {
      id: 'chat' as const,
      label: 'Chat',
      icon: MessageSquare,
    },
    {
      id: 'analysis' as const,
      label: 'Analysis',
      icon: BarChart3,
    },
  ];

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background lg:hidden">
      {/* Tab Navigation */}
      <nav className="flex border-b border-border bg-card" role="tablist">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={`${tab.id}-panel`}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors duration-200 relative',
                isActive
                  ? 'text-brand-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>

              {/* Active indicator */}
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-primary" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Tab Content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {/* Chat Panel */}
        <div
          id="chat-panel"
          role="tabpanel"
          aria-labelledby="chat-tab"
          className={cn(
            'h-full',
            activeTab === 'chat' ? 'block' : 'hidden'
          )}
        >
          <ChatManager user={user} />
        </div>

        {/* Analysis Panel */}
        <div
          id="analysis-panel"
          role="tabpanel"
          aria-labelledby="analysis-tab"
          className={cn(
            'h-full',
            activeTab === 'analysis' ? 'block' : 'hidden'
          )}
        >
          <RightPanelTabs onCollapse={() => {}} />
        </div>
      </div>
    </div>
  );
}
