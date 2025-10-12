'use client';

import { cn } from '@/lib/utils';

export interface TickerButtonProps {
  symbol: string;
  className?: string;
}

/**
 * Simple ticker button showing stock symbol
 * Clean 2025 design with brand color
 */
export function TickerButton({ symbol, className }: TickerButtonProps) {
  return (
    <div className="inline-block">
      <span
        className={cn(
          'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md',
          'bg-brand-primary/10 border border-brand-primary/20',
          'hover:bg-brand-primary/15 hover:border-brand-primary/30',
          'transition-all duration-200',
          'text-xs font-medium text-brand-primary',
          'cursor-default',
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
export function TickerButtonGroup({
  tickers,
  className,
}: {
  tickers: string[];
  className?: string;
}) {
  if (!tickers.length) return null;

  return (
    <div className={cn('flex flex-wrap gap-1.5', className)}>
      {tickers.map((symbol) => (
        <TickerButton key={symbol} symbol={symbol} />
      ))}
    </div>
  );
}
