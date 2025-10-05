'use client';

import { useState } from 'react';
import { TradingChart } from './trading-chart';
import { FinancialDataPanel } from './financial-data-panel';
import { AnalysisBlocksPanel } from './analysis-blocks-panel';
import { Button } from './ui/button';
import { TrendingUp, BarChart3, Layers } from 'lucide-react';
import { useChatContext } from '@/lib/contexts/chat-context';

type TabType = 'data' | 'blocks' | 'chart';

function RightPanelTabsComponent() {
  const [activeTab, setActiveTab] = useState<TabType>('data');
  const { currentChatId } = useChatContext();

  const tabs = [
    { id: 'data' as TabType, name: '财务数据', icon: BarChart3 },
    { id: 'blocks' as TabType, name: '分析块', icon: Layers },
    { id: 'chart' as TabType, name: '交易图表', icon: TrendingUp }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'data':
        return <FinancialDataPanel />;
      case 'blocks':
        return currentChatId ? (
          <AnalysisBlocksPanel chatId={currentChatId} />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            请选择一个聊天会话
          </div>
        );
      case 'chart':
        return <TradingChart />;
      default:
        return <FinancialDataPanel />;
    }
  };

  return (
    <div className="flex flex-col h-full bg-transparent w-full" style={{ maxWidth: '100%' }}>
      <div className="flex gap-1 p-2 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-zinc-800 dark:to-zinc-900 shadow-[inset_2px_2px_4px_rgba(0,0,0,0.06),inset_-2px_-2px_4px_rgba(255,255,255,0.9)] dark:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.5),inset_-2px_-2px_4px_rgba(255,255,255,0.05)] rounded-t-2xl" style={{ width: '100%' }}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl transition-all duration-300 ease-out ${
                activeTab === tab.id
                  ? 'neuro-pill-active text-foreground font-semibold'
                  : 'neuro-pill text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon size={16} />
              {tab.name}
            </button>
          );
        })}
      </div>

      <div className="flex-1 bg-transparent" style={{ width: '100%', minWidth: 0, overflow: 'hidden' }}>
        {renderTabContent()}
      </div>
    </div>
  );
}

export { RightPanelTabsComponent as RightPanelTabs };