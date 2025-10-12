'use client';

import { useState } from 'react';
import { ChatManager } from '@/components/chat-manager';
import { TradingChart } from '@/components/trading-chart';
import type { AuthSession } from '@/lib/auth/clerk';

interface MobileTabsProps {
  user: AuthSession['user'];
}

export function MobileTabs({ user }: MobileTabsProps) {
  const [activeTab, setActiveTab] = useState<'chat' | 'chart'>('chat');

  return (
    <div className="lg:hidden h-screen bg-gray-50">
      <div className="flex h-full flex-col">
        {/* 标签栏 */}
        <div className="flex border-b border-gray-200 bg-white">
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'chat'
                ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            💬 Chat
          </button>
          <button
            onClick={() => setActiveTab('chart')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'chart'
                ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            📊 Chart
          </button>
        </div>

        {/* 内容区域 */}
        <div className="flex-1 min-h-0">
          {/* 聊天面板 */}
          <div className={`h-full ${activeTab === 'chat' ? 'block' : 'hidden'}`}>
            <ChatManager
              user={user}
            />
          </div>

          {/* 图表面板 */}
          <div className={`h-full bg-white ${activeTab === 'chart' ? 'block' : 'hidden'}`}>
            <TradingChart />
          </div>
        </div>
      </div>
    </div>
  );
}