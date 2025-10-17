'use client';

import { useState } from 'react';
import { TrendingUp, BarChart3, Layers, Search, Star } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { TradingChart } from './trading-chart';
import { FinancialDataPanel } from './financial-data-panel';
import { AnalysisBlocksPanel } from './analysis-blocks-panel';
import { ScreenerPanel } from './screener-panel';
import { WatchlistPanel } from './watchlist-panel';
import { useChatContext } from '@/lib/contexts/chat-context';
import { cn } from '@/lib/utils';

type TabType = 'data' | 'blocks' | 'chart' | 'screener' | 'watchlist';

interface Tab {
  id: TabType;
  label: string;
  icon: React.ElementType;
}

function RightPanelTabsComponent() {
  // 默认显示分析块
  const [activeTab, setActiveTab] = useState<TabType>('blocks');
  const { currentChatId } = useChatContext();
  const t = useTranslations('panels');

  const tabs: Tab[] = [
    { id: 'data', label: t('financialData'), icon: BarChart3 },
    { id: 'blocks', label: t('analysis'), icon: Layers },
    { id: 'watchlist', label: t('watchlist'), icon: Star },
    { id: 'screener', label: t('screener'), icon: Search },
    { id: 'chart', label: t('chart'), icon: TrendingUp },
  ];

  // Handle tab change
  const handleTabChange = (tabId: TabType) => {
    setActiveTab(tabId);
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
              onClick={() => handleTabChange(tab.id)}
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
        {activeTab === 'data' && (
          <div id="data-panel" role="tabpanel" aria-labelledby="data-tab" className="h-full">
            <FinancialDataPanel />
          </div>
        )}

        {activeTab === 'blocks' && (
          <div id="blocks-panel" role="tabpanel" aria-labelledby="blocks-tab" className="h-full">
            {currentChatId ? (
              <AnalysisBlocksPanel chatId={currentChatId} />
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                Select a chat to view analysis blocks
              </div>
            )}
          </div>
        )}

        {activeTab === 'watchlist' && (
          <div id="watchlist-panel" role="tabpanel" aria-labelledby="watchlist-tab" className="h-full">
            <WatchlistPanel />
          </div>
        )}

        {activeTab === 'screener' && (
          <div id="screener-panel" role="tabpanel" aria-labelledby="screener-tab" className="h-full">
            <ScreenerPanel />
          </div>
        )}

        {activeTab === 'chart' && (
          <div id="chart-panel" role="tabpanel" aria-labelledby="chart-tab" className="h-full">
            <TradingChart />
          </div>
        )}
      </div>
    </div>
  );
}

export { RightPanelTabsComponent as RightPanelTabs };
