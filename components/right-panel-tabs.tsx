'use client';

import { useState, useMemo, memo } from 'react';
import { TradingChart } from './trading-chart';
import { FinancialDataPanel } from './financial-data-panel';
import { ResearchPanel } from './research-panel';
import { Button } from './ui/button';
import { TrendingUp, BarChart3, FileText } from 'lucide-react';

type TabType = 'research' | 'data' | 'chart';

function RightPanelTabsComponent() {
  const [activeTab, setActiveTab] = useState<TabType>('data');

  const tabs = [
    {
      id: 'research' as TabType,
      name: '调研报告',
      icon: FileText,
      component: ResearchPanel
    },
    {
      id: 'data' as TabType,
      name: '财务数据',
      icon: BarChart3,
      component: FinancialDataPanel
    },
    {
      id: 'chart' as TabType,
      name: '交易图表',
      icon: TrendingUp,
      component: TradingChart
    }
  ];

  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component || FinancialDataPanel;

  return (
    <div className="flex flex-col h-full bg-transparent">
      {/* Tab Header */}
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

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden bg-transparent">
        <ActiveComponent />
      </div>
    </div>
  );
}

export { RightPanelTabsComponent as RightPanelTabs };