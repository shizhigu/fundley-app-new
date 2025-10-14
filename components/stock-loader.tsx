'use client';

import { useEffect, useState } from 'react';

interface StockLoaderProps {
  size?: number;
}

interface Candle {
  price: number;
  bodySize: number;
  high: number;
  low: number;
  isHollow: boolean;
}

export function StockLoader({ size = 16 }: StockLoaderProps) {
  const [visibleCount, setVisibleCount] = useState(0);
  const [cycle, setCycle] = useState(0);

  // V-shaped reversal pattern
  const pattern: Candle[] = [
    { price: 65, bodySize: 12, high: 3, low: 3, isHollow: true },   // Decline 1
    { price: 50, bodySize: 10, high: 3, low: 3, isHollow: true },   // Decline 2
    { price: 38, bodySize: 11, high: 3, low: 4, isHollow: true },   // Decline 3
    { price: 35, bodySize: 15, high: 3, low: 18, isHollow: false }, // Hammer - reversal!
    { price: 58, bodySize: 28, high: 5, low: 3, isHollow: false },  // Rally 1
    { price: 75, bodySize: 30, high: 4, low: 3, isHollow: false },  // Rally 2 - breaks high!
  ];

  useEffect(() => {
    setVisibleCount(0);

    const showCandles = async () => {
      for (let i = 0; i < pattern.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 220));
        setVisibleCount(i + 1);
      }

      // Wait then restart
      await new Promise(resolve => setTimeout(resolve, 1200));
      setCycle(c => c + 1);
    };

    showCandles();
  }, [cycle, pattern.length]);

  const containerHeight = size * 4;

  return (
    <div
      className="flex items-end gap-1.5 relative"
      style={{ height: containerHeight }}
    >
      {pattern.map((candle, i) => {
        const isVisible = i < visibleCount;

        const priceFromBottom = (candle.price / 100) * containerHeight;
        const upperShadowHeight = (candle.high / 100) * containerHeight;
        const lowerShadowHeight = (candle.low / 100) * containerHeight;
        const bodyHeight = Math.max((candle.bodySize / 100) * containerHeight, 3);

        const finalOpacity = 0.7 + i * 0.05;

        return (
          <div
            key={`${cycle}-${i}`}
            className="relative transition-opacity duration-500 ease-out"
            style={{
              width: size / 2,
              height: containerHeight,
              opacity: isVisible ? finalOpacity : 0,
            }}
          >
            {/* Upper shadow */}
            <div
              className="absolute left-1/2 -translate-x-1/2 w-px bg-brand-primary"
              style={{
                bottom: `${priceFromBottom + bodyHeight / 2}px`,
                height: `${upperShadowHeight}px`,
              }}
            />

            {/* Body */}
            <div
              className="absolute left-0 w-full"
              style={{
                bottom: `${priceFromBottom - bodyHeight / 2}px`,
                height: `${bodyHeight}px`,
                backgroundColor: candle.isHollow
                  ? 'transparent'
                  : 'hsl(var(--brand-primary))',
                border: candle.isHollow
                  ? '1.5px solid hsl(var(--brand-primary))'
                  : 'none',
              }}
            />

            {/* Lower shadow */}
            <div
              className="absolute left-1/2 -translate-x-1/2 w-px bg-brand-primary"
              style={{
                bottom: `${priceFromBottom - bodyHeight / 2 - lowerShadowHeight}px`,
                height: `${lowerShadowHeight}px`,
              }}
            />
          </div>
        );
      })}
    </div>
  );
}
