'use client';
import { cn } from '@/lib/utils';

export interface TickerButtonProps {
  symbol: string;
  className?: string;
}

/**
 * Simple ticker button that shows stock symbol
 */
export function TickerButton({ symbol, className }: TickerButtonProps) {
  return (
    <div className="inline-block">
      <span
        className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md",
          "bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200/40 dark:border-blue-800/20",
          "hover:bg-blue-100/60 dark:hover:bg-blue-900/30 hover:border-blue-300/50 dark:hover:border-blue-700/30",
          "transition-colors duration-200",
          "text-xs font-medium text-blue-600 dark:text-blue-400",
          "cursor-default",
          className
        )}
      >
        {symbol}
      </span>
    </div>
  );
}

/**
 * Group of ticker buttons with consistent spacing
 */
export function TickerButtonGroup({ tickers, className }: { 
  tickers: string[];
  className?: string;
}) {
  if (!tickers.length) return null;

  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {tickers.map((symbol) => (
        <TickerButton key={symbol} symbol={symbol} />
      ))}
    </div>
  );
}