'use client';

import { useState } from 'react';
import { TrendingUp, BarChart3, Layers } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { TradingChart } from './trading-chart';
import { FinancialDataPanel } from './financial-data-panel';
import { AnalysisBlocksPanel } from './analysis-blocks-panel';
import { useChatContext } from '@/lib/contexts/chat-context';
import { cn } from '@/lib/utils';

type TabType = 'data' | 'blocks' | 'chart';

interface Tab {
  id: TabType;
  label: string;
  icon: React.ElementType;
}

function RightPanelTabsComponent() {
  const [activeTab, setActiveTab] = useState<TabType>('data');
  const { currentChatId } = useChatContext();
  const t = useTranslations('panels');

  const tabs: Tab[] = [
    { id: 'data', label: t('financialData'), icon: BarChart3 },
    { id: 'blocks', label: t('analysis'), icon: Layers },
    { id: 'chart', label: t('chart'), icon: TrendingUp },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'data':
        return <FinancialDataPanel />;

      case 'blocks':
        return currentChatId ? (
          <AnalysisBlocksPanel chatId={currentChatId} />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            Select a chat to view analysis blocks
          </div>
        );

      case 'chart':
        return <TradingChart />;

      default:
        return <FinancialDataPanel />;
    }
  };

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-background">
      {/* Tab Navigation */}
      <nav className="flex gap-1 p-2 border-b border-border bg-card" role="tablist">
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
                'flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200',
                isActive
                  ? 'bg-brand-primary/10 text-brand-primary border border-brand-primary/20'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              )}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Tab Content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <div
          id="data-panel"
          role="tabpanel"
          aria-labelledby="data-tab"
          className={cn('h-full', activeTab === 'data' ? 'block' : 'hidden')}
        >
          <FinancialDataPanel />
        </div>

        <div
          id="blocks-panel"
          role="tabpanel"
          aria-labelledby="blocks-tab"
          className={cn('h-full', activeTab === 'blocks' ? 'block' : 'hidden')}
        >
          {currentChatId ? (
            <AnalysisBlocksPanel chatId={currentChatId} />
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
              Select a chat to view analysis blocks
            </div>
          )}
        </div>

        <div
          id="chart-panel"
          role="tabpanel"
          aria-labelledby="chart-tab"
          className={cn('h-full', activeTab === 'chart' ? 'block' : 'hidden')}
        >
          <TradingChart />
        </div>
      </div>
    </div>
  );
}

export { RightPanelTabsComponent as RightPanelTabs };
