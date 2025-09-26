'use client';

import { ChatManager } from '@/components/chat-manager';
import { RightPanelTabs } from '@/components/right-panel-tabs';
import { MobileTabs } from '@/components/mobile-tabs';
import type { ChatLayoutProps } from '@/lib/types/chat';

/**
 * 主聊天布局组件
 * 负责整体布局：左侧聊天管理器 + 右侧财务数据面板
 */
export function ChatLayout({ user, initialChatModel }: ChatLayoutProps) {
  return (
    <>
      {/* 桌面端分屏布局：左半边(聊天管理器) + 右半边(财务数据+交易图表) */}
      <div className="hidden lg:flex h-screen bg-transparent">
        {/* 左半边：聊天管理器 */}
        <div className="flex-1 min-w-0 border-r border-border">
          <ChatManager
            user={user}
            initialChatModel={initialChatModel}
          />
        </div>

        {/* 右半边：财务数据 + 交易图表标签页 */}
        <div className="flex-1 min-w-0 bg-transparent">
          <RightPanelTabs />
        </div>
      </div>

      {/* 移动端标签页布局 */}
      <div className="lg:hidden h-screen">
        <MobileTabs
          user={user}
          initialChatModel={initialChatModel}
        />
      </div>
    </>
  );
}