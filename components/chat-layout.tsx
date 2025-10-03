'use client';

import { ChatManager } from '@/components/chat-manager';
import { RightPanelTabs } from '@/components/right-panel-tabs';
import { MobileTabs } from '@/components/mobile-tabs';
import { ResizableSplitPanel } from '@/components/resizable-split-panel';
import { ChatProvider } from '@/lib/contexts/chat-context';
import type { ChatLayoutProps } from '@/lib/types/chat';

/**
 * 主聊天布局组件
 * 负责整体布局：左侧聊天管理器 + 右侧财务数据面板
 */
export function ChatLayout({ user, initialChatModel }: ChatLayoutProps) {
  return (
    <ChatProvider>
      {/* 桌面端分屏布局：可拖拽调整的左右分割面板 */}
      <div className="hidden lg:block h-screen bg-transparent">
        <ResizableSplitPanel
          leftPanel={
            <ChatManager
              user={user}
              initialChatModel={initialChatModel}
            />
          }
          rightPanel={<RightPanelTabs />}
          defaultLeftWidth={50}
          minLeftWidth={30}
          minRightWidth={25}
          className="h-full"
        />
      </div>

      {/* 移动端标签页布局 */}
      <div className="lg:hidden h-screen">
        <MobileTabs
          user={user}
          initialChatModel={initialChatModel}
        />
      </div>
    </ChatProvider>
  );
}