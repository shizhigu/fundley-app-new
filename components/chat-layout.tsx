'use client';

import { ChatManager } from '@/components/chat-manager';
import { RightPanelTabs } from '@/components/right-panel-tabs';
import { MobileTabs } from '@/components/mobile-tabs';
import { ResizableSplitPanel } from '@/components/resizable-split-panel';
import { ChatProvider } from '@/lib/contexts/chat-context';
import type { ChatLayoutProps } from '@/lib/types/chat';

/**
 * Ultra-Clean 2025 Chat Layout
 * Desktop: Resizable split panel (chat | data)
 * Mobile: Tab-based navigation
 */
export function ChatLayout({ user }: { user: ChatLayoutProps['user'] }) {
  return (
    <ChatProvider>
      {/* Desktop Layout: Resizable Split Panel */}
      <div className="hidden lg:flex h-screen w-full overflow-hidden bg-background">
        <ResizableSplitPanel
          leftPanel={<ChatManager user={user} />}
          rightPanel={<RightPanelTabs />}
          defaultLeftWidth={55}
          minLeftWidth={30}
          minRightWidth={25}
          className="w-full h-full"
        />
      </div>

      {/* Mobile Layout: Tabbed Interface */}
      <div className="lg:hidden h-screen w-full overflow-hidden bg-background">
        <MobileTabs user={user} />
      </div>
    </ChatProvider>
  );
}
