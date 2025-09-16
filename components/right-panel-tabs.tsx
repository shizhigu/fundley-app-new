'use client';

import { useState } from 'react';
import { TradingChart } from './trading-chart';
import { FinancialDataPanel } from './financial-data-panel';
import { Button } from './ui/button';
import { TrendingUp, BarChart3 } from 'lucide-react';

type TabType = 'chart' | 'data';

export function RightPanelTabs() {
  const [activeTab, setActiveTab] = useState<TabType>('data');

  const tabs = [
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