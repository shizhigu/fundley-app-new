'use client';

import { useState, useRef, } from 'react';
import { cn } from '@/lib/utils';
import { TrendingUp, Info, BarChart3 } from 'lucide-react';
import * as Popover from '@radix-ui/react-popover';

interface StockSymbolProps {
  symbol: string;
  className?: string;
  onClose?: () => void;
}

export function StockSymbol({ symbol, className, onClose }: StockSymbolProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'fundamentals'>('info');
  const [dateRange, setDateRange] = useState('12M');
  const [showDateSelector, setShowDateSelector] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Clean up the symbol (remove any whitespace)
  const cleanSymbol = symbol.trim().toUpperCase();

  return (
    <Popover.Root open={isOpen} onOpenChange={(open) => {
      setIsOpen(open);
      if (!open && onClose) {
        onClose();
      }
    }}>
      <Popover.Trigger asChild>
        <button
          ref={triggerRef}
          className={cn(
            "inline-flex items-center gap-0.5 px-1.5 py-0 rounded",
            "backdrop-blur-md bg-white/50 dark:bg-gray-900/30",
            "border border-gray-200/40 dark:border-gray-700/20",
            "hover:bg-white/70 dark:hover:bg-gray-900/40",
            "hover:shadow-sm transition-all duration-200",
            "text-[0.95em] font-medium",
            "text-gray-700 dark:text-gray-300",
            "align-baseline",
            "my-0 inline", // Ensure inline display
            className
          )}
          style={{ verticalAlign: 'baseline', display: 'inline-flex' }}
        >
          <TrendingUp className="w-3 h-3 text-gray-600 dark:text-gray-400" />
          <span>{cleanSymbol}</span>
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          className="z-50 w-[600px] h-[400px] rounded-xl overflow-hidden shadow-2xl"
          sideOffset={5}
        >
          {/* Glassmorphism container */}
          <div className="w-full h-full backdrop-blur-xl bg-white/90 dark:bg-gray-900/90 border border-gray-200/50 dark:border-gray-700/50">
            {/* Tab bar */}
            <div className="flex border-b border-gray-200/30 dark:border-gray-700/30">
              <button
                onClick={() => {
                  if (activeTab === 'info') {
                    setShowDateSelector(!showDateSelector);
                  } else {
                    setActiveTab('info');
                    setShowDateSelector(false);
                  }
                }}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all flex-1",
                  activeTab === 'info'
                    ? "text-gray-900 dark:text-gray-100 border-b-2 border-blue-500"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                )}
              >
                <Info className="w-4 h-4" />
                <span>Info</span>
                {activeTab === 'info' && (
                  <span className="text-[10px] text-gray-400 dark:text-gray-500 ml-1">· {dateRange}</span>
                )}
              </button>
              <button
                onClick={() => {
                  setActiveTab('fundamentals');
                  setShowDateSelector(false);
                }}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all flex-1",
                  activeTab === 'fundamentals'
                    ? "text-gray-900 dark:text-gray-100 border-b-2 border-blue-500"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                )}
              >
                <BarChart3 className="w-4 h-4" />
                Fundamentals
              </button>
            </div>

            {/* Content area */}
            <div className="p-4 h-[calc(100%-48px)] overflow-auto">
              {activeTab === 'info' && (
                <div className="w-full h-full flex flex-col">
                  {/* Animated Date Range Selector */}
                  <div 
                    className={cn(
                      "overflow-hidden transition-all duration-300 ease-in-out",
                      showDateSelector ? "max-h-12 opacity-100 mb-2" : "max-h-0 opacity-0"
                    )}
                  >
                    <div className="flex gap-1 p-1 bg-gray-100/50 dark:bg-gray-800/50 rounded-lg">
                      {['1D', '5D', '1M', '3M', '6M', 'YTD', '12M', 'ALL'].map((range) => (
                        <button
                          key={range}
                          onClick={() => {
                            setDateRange(range);
                            setShowDateSelector(false);
                          }}
                          className={cn(
                            "flex-1 px-2 py-1 text-xs font-medium rounded transition-all",
                            dateRange === range
                              ? "bg-blue-500 text-white"
                              : "text-gray-600 dark:text-gray-400 hover:bg-gray-200/50 dark:hover:bg-gray-700/50"
                          )}
                        >
                          {range}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  {/* TradingView Mini Chart Widget */}
                  <div className="tradingview-widget-container flex-1">
                    <iframe
                      key={dateRange} // Force re-render when date range changes
                      src={`https://s.tradingview.com/embed-widget/mini-symbol-overview/?${new URLSearchParams({
                        symbol: cleanSymbol,
                        width: '100%',
                        height: '100%',
                        locale: 'en',
                        dateRange: dateRange,
                        colorTheme: 'auto',
                        isTransparent: 'true',
                        autosize: 'true',
                        chartType: 'area'
                      }).toString()}`}
                      width="100%"
                      height="100%"
                      frameBorder="0"
                      allowTransparency
                      scrolling="no"
                    />
                  </div>
                </div>
              )}
              
              {activeTab === 'fundamentals' && (
                <div className="w-full h-full">
                  {/* TradingView Fundamental Data Widget */}
                  <div className="tradingview-widget-container h-full">
                    <iframe
                      src={`https://s.tradingview.com/embed-widget/financials/?${new URLSearchParams({
                        symbol: cleanSymbol,
                        width: '100%',
                        height: '100%',
                        locale: 'en',
                        colorTheme: 'auto',
                        isTransparent: 'true',
                        displayMode: 'regular',
                        autosize: 'true'
                      }).toString()}`}
                      width="100%"
                      height="100%"
                      frameBorder="0"
                      allowTransparency
                      scrolling="no"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}