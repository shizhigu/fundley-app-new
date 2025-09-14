'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
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
  volume?: number;
  adjClose?: number;
}

interface ChartApiResponse {
  success: boolean;
  symbol: string;
  period: string;
  data: ChartData[];
  count: number;
  latestPrice: number;
  error?: string;
}

export function TradingChart({ symbol = 'AAPL', className = '' }: TradingChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const [currentPeriod, setCurrentPeriod] = useState('3M');
  const [isLoading, setIsLoading] = useState(false);
  const [latestPrice, setLatestPrice] = useState<number>(0);
  const [priceChange, setPriceChange] = useState<number>(0);

  // 从API获取真实股票数据
  const fetchChartData = useCallback(async (stockSymbol: string, period: string): Promise<ChartData[]> => {
    setIsLoading(true);
    try {
      console.log(`📊 Fetching chart data for ${stockSymbol}, period: ${period}`);

      const response = await fetch(`/api/stock/chart-data?symbol=${stockSymbol}&period=${period}`);
      const result: ChartApiResponse = await response.json();

      if (!result.success) {
        console.error('❌ API Error:', result.error);
        return [];
      }

      console.log(`✅ Loaded ${result.count} data points for ${stockSymbol}`);

      // 更新价格信息
      setLatestPrice(result.latestPrice);

      // 计算涨跌幅
      if (result.data.length > 1) {
        const firstPrice = result.data[0].close;
        const change = ((result.latestPrice - firstPrice) / firstPrice) * 100;
        setPriceChange(change);
      }

      return result.data;

    } catch (error) {
      console.error('❌ Chart data fetch failed:', error);
      return [];
    } finally {
      setIsLoading(false);
    }
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
  }, []);

  // 加载股票数据的独立effect
  useEffect(() => {
    const loadChartData = async () => {
      const data = await fetchChartData(symbol, currentPeriod);
      if (data.length > 0 && candlestickSeriesRef.current) {
        candlestickSeriesRef.current.setData(data);
        // Fit content after data is loaded
        chartRef.current?.timeScale().fitContent();
      }
    };

    loadChartData();
  }, [symbol, currentPeriod, fetchChartData]);

  // 时间周期按钮点击处理
  const handlePeriodChange = (period: string) => {
    setCurrentPeriod(period);
  };

  return (
    <div className={`w-full h-full ${className}`}>
      {/* Chart Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center space-x-4">
          <h2 className="text-xl font-semibold">{symbol}</h2>
          {isLoading ? (
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
              <span>Loading...</span>
            </div>
          ) : (
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <span className={`px-2 py-1 rounded ${
                priceChange >= 0
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}>
                {priceChange >= 0 ? '↗' : '↘'} {priceChange.toFixed(2)}%
              </span>
              <span>${latestPrice.toFixed(2)}</span>
            </div>
          )}
        </div>
        <div className="flex items-center space-x-2">
          {['1W', '1M', '3M', '6M', '1Y', '5Y'].map((period) => (
            <button
              key={period}
              onClick={() => handlePeriodChange(period)}
              disabled={isLoading}
              className={`px-3 py-1 text-sm rounded transition-colors ${
                currentPeriod === period
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 hover:bg-gray-200 disabled:opacity-50'
              }`}
            >
              {period}
            </button>
          ))}
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