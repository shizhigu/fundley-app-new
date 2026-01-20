'use client';

import { useState } from 'react';
import { ChatManager } from '@/components/chat-manager';
import { RightPanelTabs } from '@/components/right-panel-tabs';
import { MobileTabs } from '@/components/mobile-tabs';
import { EnhancedResizablePanel } from '@/components/enhanced-resizable-panel';
import { ChatProvider } from '@/lib/contexts/chat-context';
import type { ChatLayoutProps } from '@/lib/types/chat';
import { AuroraBackground } from '@/components/ui/aurora-background';
import { WelcomeSplash } from '@/components/welcome-splash';

/**
 * Ultra-Clean 2025 Chat Layout
 * Desktop: Resizable split panel (chat | analysis) with floating chat selector
 * Mobile: Tab-based navigation
 */
export function ChatLayout({ user }: { user: ChatLayoutProps['user'] }) {
  const [showSplash, setShowSplash] = useState(true);

  const handleSplashComplete = () => {
    setShowSplash(false);
  };

  return (
    <ChatProvider>
      {/* Welcome Splash Screen */}
      {showSplash && (
        <WelcomeSplash onComplete={handleSplashComplete} />
      )}

      <AuroraBackground>
        {/* Desktop Layout: Enhanced Resizable Panel */}
        <div className="hidden lg:flex h-screen w-full overflow-hidden">
          <EnhancedResizablePanel
            leftPanel={<ChatManager user={user} />}
            rightPanel={(onCollapse) => <RightPanelTabs onCollapse={onCollapse} />}
            defaultLeftSize={40}
            minLeftSize={25}
            minRightSize={30}
            className="w-full h-full"
          />
        </div>

        {/* Mobile Layout: Tabbed Interface */}
        <div className="lg:hidden h-screen w-full overflow-hidden">
          <MobileTabs user={user} />
        </div>
      </AuroraBackground>
    </ChatProvider>
  );
}
