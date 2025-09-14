'use client';

import { useEffect, useRef, useCallback } from 'react';
import { createChart, IChartApi, LineSeries, CandlestickSeries, ISeriesApi } from 'lightweight-charts';

interface TradingChartProps {
  symbol?: string;
  className?: string;
}

interface ChartData {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  value?: number;
}

export function TradingChart({ symbol = 'AAPL', className = '' }: TradingChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);

  // Generate sample data for demonstration
  const generateSampleData = useCallback((): ChartData[] => {
    const data: ChartData[] = [];
    const now = Math.floor(Date.now() / 1000);
    const oneDay = 24 * 60 * 60;
    
    for (let i = 100; i >= 0; i--) {
      const time = now - (i * oneDay);
      const basePrice = 150 + Math.sin(i / 10) * 20;
      const open = basePrice + (Math.random() - 0.5) * 10;
      const close = open + (Math.random() - 0.5) * 20;
      const high = Math.max(open, close) + Math.random() * 10;
      const low = Math.min(open, close) - Math.random() * 10;
      
      data.push({
        time: new Date(time * 1000).toISOString().split('T')[0],
        open: Number(open.toFixed(2)),
        high: Number(high.toFixed(2)),
        low: Number(low.toFixed(2)),
        close: Number(close.toFixed(2)),
        value: Number(close.toFixed(2))
      });
    }
    
    return data;
  }, []);

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Create chart
    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
      layout: {
        background: { color: 'transparent' },
        textColor: '#333',
      },
      grid: {
        vertLines: { color: '#f0f0f0' },
        horzLines: { color: '#f0f0f0' },
      },
      timeScale: {
        borderColor: '#D1D4DC',
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: {
        borderColor: '#D1D4DC',
      },
    });

    // Add candlestick series
    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderVisible: false,
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
    });

    // Set sample data
    const sampleData = generateSampleData();
    candlestickSeries.setData(sampleData);

    // Fit content to screen
    chart.timeScale().fitContent();

    // Store references
    chartRef.current = chart;
    candlestickSeriesRef.current = candlestickSeries;

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [generateSampleData]);

  // Update data when symbol changes
  useEffect(() => {
    if (candlestickSeriesRef.current) {
      const newData = generateSampleData();
      candlestickSeriesRef.current.setData(newData);
    }
  }, [symbol, generateSampleData]);

  return (
    <div className={`w-full h-full ${className}`}>
      {/* Chart Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center space-x-4">
          <h2 className="text-xl font-semibold">{symbol}</h2>
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <span className="bg-green-100 text-green-800 px-2 py-1 rounded">
              ↗ +2.45%
            </span>
            <span>$156.78</span>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded">
            1D
          </button>
          <button className="px-3 py-1 text-sm bg-blue-500 text-white rounded">
            1W
          </button>
          <button className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded">
            1M
          </button>
          <button className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded">
            1Y
          </button>
        </div>
      </div>
      
      {/* Chart Container */}
      <div 
        ref={chartContainerRef} 
        className="flex-1 w-full"
        style={{ height: 'calc(100% - 73px)' }}
      />
    </div>
  );
}