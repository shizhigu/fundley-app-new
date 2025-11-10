'use client';

import { useState } from 'react';
import { TrendingUp, BarChart3, Layers, Search, Star, ChevronsRight, Newspaper, Calendar, Clock, LayoutDashboard, FolderOpen } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { TradingChart } from './trading-chart';
import { FinancialDataPanel } from './financial-data-panel';
import { DeliverablesPanel } from './deliverables-panel';
import { CalendarDeliverablesPanel } from './calendar-deliverables-panel';
import { ScreenerPanel } from './screener-panel';
import { WatchlistTablePanel } from './watchlist-table-panel';
import { NewsletterPanel } from './newsletter-panel';
import { AIWorkforcePanel } from './ai-workforce-panel';
import { DataAppsPanel } from './data-apps-panel';
import { MyDataPanel } from './my-data-panel';
import { useChatContext } from '@/lib/contexts/chat-context';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

type TabType = 'data' | 'blocks' | 'calendar' | 'chart' | 'screener' | 'watchlist' | 'schedule' | 'dashboards' | 'mydata';

interface Tab {
  id: TabType;
  label: string;
  icon: React.ElementType;
  disabled?: boolean;
}

interface RightPanelTabsComponentProps {
  onCollapse?: () => void;
}

function RightPanelTabsComponent({ onCollapse }: RightPanelTabsComponentProps = {}) {
  // 默认显示分析块
  const [activeTab, setActiveTab] = useState<TabType>('blocks');
  const [showCalendarView, setShowCalendarView] = useState(false);
  const { currentChatId } = useChatContext();
  const t = useTranslations('panels');

  const tabs: Tab[] = [
    // Financial Data tab hidden but kept in code
    // { id: 'data', label: t('financialData'), icon: BarChart3 },
    { id: 'blocks', label: t('analysis'), icon: Layers },
    { id: 'dashboards', label: 'My Dashboards', icon: LayoutDashboard },
    { id: 'mydata', label: 'My Data', icon: FolderOpen },
    { id: 'schedule', label: 'Schedule', icon: Clock },
    { id: 'watchlist', label: t('watchlist'), icon: Star },
    // Screener tab hidden but kept in code
    // { id: 'screener', label: t('screener'), icon: Search },
    // Chart tab hidden but kept in code
    // { id: 'chart', label: t('chart'), icon: TrendingUp },
    // Newsletter tab hidden but kept in code
    // { id: 'newsletter', label: t('newsletter'), icon: Newspaper },
  ];

  // Handle tab change
  const handleTabChange = (tabId: TabType) => {
    setActiveTab(tabId);
    // Reset calendar view when switching tabs
    if (tabId !== 'blocks') {
      setShowCalendarView(false);
    }
  };

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-background">
      {/* Tab Navigation */}
      <nav className="flex items-center gap-1 p-2 border-b border-border bg-card" role="tablist">
        {/* Collapse button - Left side */}
        {onCollapse && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  'h-8 w-8 rounded-md flex-shrink-0',
                  'hover:bg-muted hover:text-foreground',
                  'transition-all duration-200'
                )}
                onClick={onCollapse}
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p className="text-xs">
                Close panel <kbd className="ml-1 px-1 py-0.5 bg-muted rounded text-xs">⌘B</kbd>
              </p>
            </TooltipContent>
          </Tooltip>
        )}

        <div className="flex gap-1 flex-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const isDisabled = tab.disabled;

            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-controls={`${tab.id}-panel`}
                data-tour={tab.id === 'schedule' ? 'schedule-tab' : undefined}
                onClick={() => !isDisabled && handleTabChange(tab.id)}
                disabled={isDisabled}
                className={cn(
                  'flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200',
                  isDisabled && 'opacity-40 cursor-not-allowed',
                  !isDisabled && isActive
                    ? 'bg-brand-primary/10 text-brand-primary border border-brand-primary/20'
                    : !isDisabled && 'text-muted-foreground hover:text-foreground hover:bg-muted'
                )}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Tab Content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {activeTab === 'data' && (
          <div id="data-panel" role="tabpanel" aria-labelledby="data-tab" className="h-full">
            <FinancialDataPanel />
          </div>
        )}

        {activeTab === 'blocks' && (
          <div id="blocks-panel" role="tabpanel" aria-labelledby="blocks-tab" data-tour="deliverables-panel" className="h-full">
            {currentChatId ? (
              showCalendarView ? (
                <CalendarDeliverablesPanel
                  chatId={currentChatId}
                  onSwitchToList={() => setShowCalendarView(false)}
                />
              ) : (
                <DeliverablesPanel
                  chatId={currentChatId}
                  onSwitchToCalendar={() => setShowCalendarView(true)}
                />
              )
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                Select a chat to view deliverables
              </div>
            )}
          </div>
        )}

        {activeTab === 'schedule' && (
          <div id="schedule-panel" role="tabpanel" aria-labelledby="schedule-tab" className="h-full">
            <AIWorkforcePanel />
          </div>
        )}

        {activeTab === 'dashboards' && (
          <div id="dashboards-panel" role="tabpanel" aria-labelledby="dashboards-tab" className="h-full">
            <DataAppsPanel />
          </div>
        )}

        {activeTab === 'mydata' && (
          <div id="mydata-panel" role="tabpanel" aria-labelledby="mydata-tab" className="h-full">
            <MyDataPanel />
          </div>
        )}

        {activeTab === 'watchlist' && (
          <div id="watchlist-panel" role="tabpanel" aria-labelledby="watchlist-tab" className="h-full">
            <WatchlistTablePanel />
          </div>
        )}

        {activeTab === 'screener' && (
          <div id="screener-panel" role="tabpanel" aria-labelledby="screener-tab" className="h-full">
            <ScreenerPanel />
          </div>
        )}

        {/* Newsletter tab kept in code but hidden from UI */}
        {/* {activeTab === 'newsletter' && (
          <div id="newsletter-panel" role="tabpanel" aria-labelledby="newsletter-tab" className="h-full">
            <NewsletterPanel />
          </div>
        )} */}

        {/* Chart tab kept in code but hidden from UI */}
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
