'use client';

import { useEffect, useState } from 'react';

interface StockLoaderProps {
  size?: number;
}

interface Candle {
  price: number;     // Price level (0-100)
  high: number;      // Upper shadow length
  low: number;       // Lower shadow length
  bodySize: number;  // Body height
  isHollow: boolean; // Hollow (阴线) or filled (阳线)
  visible: boolean;  // Whether candle has appeared yet
}

export function StockLoader({ size = 16 }: StockLoaderProps) {
  const [candles, setCandles] = useState<Candle[]>([]);
  const [cycle, setCycle] = useState(0);

  useEffect(() => {
    // V-shaped reversal pattern
    const pattern: Candle[] = [
      // 1. Small bearish candle - start of decline (hollow)
      {
        price: 65,
        bodySize: 12,
        high: 3,
        low: 3,
        isHollow: true,
        visible: false,
      },
      // 2. Small bearish candle - decline continues (hollow)
      {
        price: 55,
        bodySize: 10,
        high: 3,
        low: 3,
        isHollow: true,
        visible: false,
      },
      // 3. Small bearish candle - near bottom (hollow)
      {
        price: 45,
        bodySize: 11,
        high: 3,
        low: 4,
        isHollow: true,
        visible: false,
      },
      // 4. HAMMER - reversal signal! (filled with long lower shadow)
      {
        price: 35,
        bodySize: 15,
        high: 3,
        low: 18, // Long lower shadow = buying pressure
        isHollow: false,
        visible: false,
      },
      // 5. Big bullish candle - rally starts (filled)
      {
        price: 50,
        bodySize: 25,
        high: 5,
        low: 3,
        isHollow: false,
        visible: false,
      },
      // 6. Big bullish candle - strong rally (filled)
      {
        price: 70,
        bodySize: 28,
        high: 4,
        low: 3,
        isHollow: false,
        visible: false,
      },
    ];

    setCandles(pattern);

    // Show candles one by one from left to right
    let visibleCount = 0;
    const revealInterval = setInterval(() => {
      setCandles((prev) =>
        prev.map((c, i) => ({
          ...c,
          visible: i <= visibleCount,
        }))
      );
      visibleCount++;

      if (visibleCount >= pattern.length) {
        clearInterval(revealInterval);
        // Wait 1000ms then restart animation
        setTimeout(() => {
          setCycle((c) => c + 1);
        }, 1000);
      }
    }, 200); // 200ms delay between each candle appearance

    return () => clearInterval(revealInterval);
  }, [cycle]); // Re-run when cycle changes

  const containerHeight = size * 4;

  return (
    <div
      className="flex items-end gap-1.5 relative"
      style={{ height: containerHeight }}
    >
      {candles.map((candle, i) => {
        // Calculate positions from bottom (items-end alignment)
        const priceFromBottom = (candle.price / 100) * containerHeight;
        const upperShadowHeight = (candle.high / 100) * containerHeight;
        const lowerShadowHeight = (candle.low / 100) * containerHeight;
        const bodyHeight = Math.max(
          (candle.bodySize / 100) * containerHeight,
          3
        );

        return (
          <div
            key={`${cycle}-${i}`}
            className="relative transition-all duration-300 ease-out"
            style={{
              width: size / 2,
              height: containerHeight,
              opacity: candle.visible ? 0.7 + i * 0.05 : 0,
              transform: candle.visible ? 'scale(1)' : 'scale(0.8)',
            }}
          >
            {/* Upper shadow */}
            <div
              className="absolute left-1/2 -translate-x-1/2 w-px bg-brand-primary transition-all duration-300"
              style={{
                bottom: `${priceFromBottom + bodyHeight / 2}px`,
                height: `${upperShadowHeight}px`,
              }}
            />

            {/* Body (filled or hollow) */}
            <div
              className="absolute left-0 w-full transition-all duration-300"
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
              className="absolute left-1/2 -translate-x-1/2 w-px bg-brand-primary transition-all duration-300"
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
