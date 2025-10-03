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
    <div className="flex flex-col h-full bg-transparent">
      <div className="flex border-b border-border bg-transparent">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <Button
              key={tab.id}
              variant="ghost"
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 rounded-none border-r border-border last:border-r-0 h-12 ${
                activeTab === tab.id
                  ? 'bg-secondary text-foreground border-b-2 border-b-blue-500'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
              }`}
            >
              <Icon size={16} className="mr-2" />
              {tab.name}
            </Button>
          );
        })}
      </div>

      <div className="flex-1 overflow-hidden bg-transparent">
        {renderTabContent()}
      </div>
    </div>
  );
}

export { RightPanelTabsComponent as RightPanelTabs };