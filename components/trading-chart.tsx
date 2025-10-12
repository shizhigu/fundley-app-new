'use client';

import { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import { createChart, IChartApi, LineSeries, CandlestickSeries, HistogramSeries, AreaSeries, ISeriesApi, createSeriesMarkers } from 'lightweight-charts';
import type { ChartIndicator as ImportedChartIndicator } from '@/lib/types';

interface TradingChartProps {
  symbol?: string;
  className?: string;
  indicators?: ChartIndicator[];
}

interface ChartIndicator {
  id: string;
  name: string;
  type: 'line' | 'histogram' | 'area' | 'step-line';
  data: IndicatorData[];
  color?: string;
  paneHeight?: number;
  markers?: Array<{
    time: string;
    position: 'aboveBar' | 'belowBar';
    color: string;
    shape: 'circle' | 'square' | 'arrowUp' | 'arrowDown';
    text?: string; // Optional text label
    size?: number; // Optional size (use 0 to hide marker)
  }>;
  metadata?: {
    dataType?: string;
    quarters?: string[];
    filingDates?: string[];
    unit?: string;
    dataPoints?: number;
  };
}

interface IndicatorData {
  time: string;
  value: number;
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

export function TradingChart({ symbol: initialSymbol, className = '', indicators = [] }: TradingChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const indicatorSeriesRef = useRef<Map<string, { series: ISeriesApi<any>, pane?: any, markers?: any }>>(new Map());

  // Load symbol from localStorage or use default
  const [currentSymbol, setCurrentSymbol] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('trading-chart-symbol') || initialSymbol || 'AAPL';
    }
    return initialSymbol || 'AAPL';
  });
  const [symbolInput, setSymbolInput] = useState(currentSymbol);

  const [currentPeriod, setCurrentPeriod] = useState('1M');
  const [currentInterval, setCurrentInterval] = useState('daily');
  const [isLoading, setIsLoading] = useState(false);
  const [latestPrice, setLatestPrice] = useState<number>(0);
  const [priceChange, setPriceChange] = useState<number>(0);
  // Crosshair数据状态 - 显示鼠标位置的数据
  const [crosshairData, setCrosshairData] = useState<{
    time: string;
    price: number;
    panes: { [paneId: string]: { indicators: { [key: string]: { value: number; quarter?: string } } } };
  } | null>(null);

  const [paneInfo, setPaneInfo] = useState<Map<any, { indicators: string[], position: { top: number, left: number } }>>(new Map());

  // Use indicators from props only (data stream removed)
  const allIndicators = useMemo(() => indicators, [indicators]);

  // Debug: Log indicators loaded (simplified to avoid loops)
  useEffect(() => {
    console.log('🔍 Indicators count:', allIndicators.length);
  }, [allIndicators.length]);

  // 从API获取真实股票数据
  const fetchChartData = useCallback(async (stockSymbol: string, period: string, interval: string): Promise<ChartData[]> => {
    setIsLoading(true);
    try {
      console.log(`📊 Fetching chart data for ${stockSymbol}, period: ${period}, interval: ${interval}`);

      const response = await fetch(`/api/stock/chart-data?symbol=${stockSymbol}&period=${period}&interval=${interval}`);
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

    // Create chart with clean 2025 configuration
    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
      layout: {
        background: { color: 'transparent' },
        textColor: 'hsl(var(--foreground))',
        fontSize: 12,
      },
      grid: {
        vertLines: {
          color: 'hsl(var(--border))',
          style: 1,
          visible: true,
        },
        horzLines: {
          color: 'hsl(var(--border))',
          style: 1,
          visible: true,
        },
      },
      crosshair: {
        mode: 1,
        vertLine: {
          width: 1,
          color: 'hsl(var(--muted-foreground) / 0.3)',
          style: 0,
          labelVisible: true,
        },
        horzLine: {
          width: 1,
          color: 'hsl(var(--muted-foreground) / 0.3)',
          style: 0,
          labelVisible: true,
        },
      },
      timeScale: {
        borderColor: 'hsl(var(--border))',
        timeVisible: true,
        secondsVisible: false,
        tickMarkFormatter: (time: any) => {
          const date = new Date(time * 1000);
          return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        },
      },
      rightPriceScale: {
        borderColor: 'hsl(var(--border))',
        scaleMargins: {
          top: 0.1,
          bottom: 0.1,
        },
      },
    });

    // Add candlestick series with semantic colors
    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#10b981',
      downColor: '#ef4444',
      borderVisible: false,
      wickUpColor: '#10b981',
      wickDownColor: '#ef4444',
    });

    // Store references
    chartRef.current = chart;
    candlestickSeriesRef.current = candlestickSeries;

    // Crosshair事件监听器将在单独的useEffect中添加

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

  // 创建ref来存储最新的indicators
  const latestIndicatorsRef = useRef(allIndicators);

  // 每次allIndicators变化时更新ref
  useEffect(() => {
    latestIndicatorsRef.current = allIndicators;
  }, [allIndicators]);

  // 简化的crosshair事件处理 - 只处理数据显示，不订阅太多依赖
  useEffect(() => {
    if (!chartRef.current) return;

    const handleCrosshairMove = (param: any) => {
      if (!param.point) {
        setCrosshairData(null);
        return;
      }

      const timeStr = param.time ? (typeof param.time === 'string' ? param.time : new Date(param.time * 1000).toISOString().split('T')[0]) : '';
      let price = 0;
      const panes: { [paneId: string]: { indicators: { [key: string]: { value: number; quarter?: string } } } } = {};

      // 获取主价格
      if (candlestickSeriesRef.current) {
        const candleData = param.seriesData.get(candlestickSeriesRef.current);
        if (candleData && typeof candleData === 'object' && 'close' in candleData) {
          price = (candleData as any).close;
        }
      }

      // 获取指标数据 - 简化版本
      const currentIndicators = latestIndicatorsRef.current || [];
      indicatorSeriesRef.current.forEach((indicatorRef, indicatorId) => {
        const indicator = currentIndicators.find(ind => ind.id === indicatorId);
        if (!indicator) return;

        let value = null;
        let quarter = undefined;

        // 查找最近的数据点
        if (indicator.data && indicator.data.length > 0 && timeStr) {
          const currentTime = new Date(timeStr).getTime();
          let latestPoint = null;
          let latestIndex = -1;

          for (let i = 0; i < indicator.data.length; i++) {
            const pointTime = new Date(indicator.data[i].time).getTime();
            if (pointTime <= currentTime) {
              latestPoint = indicator.data[i];
              latestIndex = i;
            } else {
              break;
            }
          }

          if (latestPoint) {
            value = latestPoint.value;
            if (indicator.metadata?.quarters && latestIndex >= 0 && latestIndex < indicator.metadata.quarters.length) {
              quarter = indicator.metadata.quarters[latestIndex];
            }
          }
        }

        // 如果有精确数据点，则覆盖
        const indicatorData = param.seriesData.get(indicatorRef.series);
        if (indicatorData && typeof indicatorData === 'object' && 'value' in indicatorData) {
          value = (indicatorData as any).value;
          if (indicator.metadata?.filingDates && indicator.metadata?.quarters && timeStr) {
            const index = indicator.metadata.filingDates.indexOf(timeStr);
            if (index >= 0) {
              quarter = indicator.metadata.quarters[index];
            }
          }
        }

        if (value !== null) {
          const paneId = indicatorRef.pane ? `pane_${indicatorId}` : 'main';
          if (!panes[paneId]) {
            panes[paneId] = { indicators: {} };
          }
          panes[paneId].indicators[indicator.name] = { value, quarter };
        }
      });

      setCrosshairData({ time: timeStr, price, panes });
    };

    chartRef.current.subscribeCrosshairMove(handleCrosshairMove);

    return () => {
      if (chartRef.current) {
        chartRef.current.unsubscribeCrosshairMove(handleCrosshairMove);
      }
    };
  }, []); // 空依赖数组，避免重复订阅

  // Save symbol to localStorage when it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('trading-chart-symbol', currentSymbol);
    }
  }, [currentSymbol]);

  // 加载股票数据的独立effect
  useEffect(() => {
    const loadChartData = async () => {
      const data = await fetchChartData(currentSymbol, currentPeriod, currentInterval);
      if (data.length > 0 && candlestickSeriesRef.current) {
        candlestickSeriesRef.current.setData(data);
        // Fit content after data is loaded
        chartRef.current?.timeScale().fitContent();

        // 数据加载完成后，处理指标（如果有的话）
        if (allIndicators.length > 0 && chartRef.current) {
          // processIndicators will be called in its own useEffect
        }
      }
    };

    loadChartData();
  }, [currentSymbol, currentPeriod, currentInterval, fetchChartData]);


  // 处理指标的函数
  const processIndicators = useCallback(() => {
    if (!chartRef.current) return;

    // 清除旧的指标
    indicatorSeriesRef.current.forEach(({ series, pane, markers }) => {
      // 清理 markers (在v5中，markers会随系列一起自动清理)
      if (markers) {
        // markers实例会在系列移除时自动清理，但我们可以显式清理
        try {
          markers.setMarkers([]);
        } catch (error) {
          // 忽略清理错误
        }
      }

      if (pane) {
        // 如果有专门的面板，移除系列会自动清理面板
        chartRef.current?.removeSeries(series);
      } else {
        chartRef.current?.removeSeries(series);
      }
    });
    indicatorSeriesRef.current.clear();

    // 添加新的指标
    allIndicators.forEach((indicator) => {
      let pane = null;
      let series = null;

      // 为fundamental指标创建子面板（step-line类型或有paneHeight的指标）
      if ((indicator.type === 'step-line' && indicator.metadata?.dataType === 'quarterly-fundamental') ||
          (indicator.paneHeight && indicator.paneHeight > 0)) {
        console.log(`📊 Creating pane for fundamental indicator: ${indicator.name}`);
        pane = chartRef.current?.addPane();
        console.log(`📊 Pane created:`, !!pane);
      }

      // 根据类型创建系列
      if (indicator.type === 'line') {
        if (pane) {
          // 在子面板中创建系列
          series = pane.addSeries(LineSeries, {
            color: indicator.color || '#26a69a',
            lineWidth: 2,
          });
        } else {
          // 在主面板中创建系列
          series = chartRef.current?.addSeries(LineSeries, {
            color: indicator.color || '#26a69a',
            lineWidth: 2,
          });
        }
      } else if (indicator.type === 'step-line') {
        if (pane) {
          // 在子面板中创建线性系列，使用较粗的线条表示阶梯效果
          series = pane.addSeries(LineSeries, {
            color: indicator.color || '#FF6D00',
            lineWidth: 3,
            lineStyle: 0, // 实线
            pointMarkersVisible: false, // 不显示点标记
            lastValueVisible: true,
            priceLineVisible: false,
            title: indicator.name // 显示指标名称
          });
        } else {
          series = chartRef.current?.addSeries(LineSeries, {
            color: indicator.color || '#FF6D00',
            lineWidth: 3,
            lineStyle: 0,
            pointMarkersVisible: false,
            lastValueVisible: true,
            priceLineVisible: false,
            title: indicator.name // 显示指标名称
          });
        }
      } else if (indicator.type === 'histogram') {
        if (pane) {
          series = pane.addSeries(HistogramSeries, {
            color: indicator.color || '#26a69a',
          });
        } else {
          series = chartRef.current?.addSeries(HistogramSeries, {
            color: indicator.color || '#26a69a',
          });
        }
      } else if (indicator.type === 'area') {
        if (pane) {
          series = pane.addSeries(AreaSeries, {
            topColor: indicator.color || '#26a69a',
            bottomColor: (indicator.color || '#26a69a') + '20',
            lineColor: indicator.color || '#26a69a',
            lineWidth: 2,
          });
        } else {
          series = chartRef.current?.addSeries(AreaSeries, {
            topColor: indicator.color || '#26a69a',
            bottomColor: (indicator.color || '#26a69a') + '20',
            lineColor: indicator.color || '#26a69a',
            lineWidth: 2,
          });
        }
      }

      if (series && indicator.data.length > 0) {
        console.log(`📊 Setting data for ${indicator.name}:`, indicator.data);
        series.setData(indicator.data);

        // 简化：不添加marker，依靠crosshair显示数据
        indicatorSeriesRef.current.set(indicator.id, { series, pane });
      }
    });
  }, [allIndicators]);

  // 时间周期按钮点击处理
  const handlePeriodChange = (period: string) => {
    setCurrentPeriod(period);
  };

  // 时间间隔按钮点击处理
  const handleIntervalChange = (interval: string) => {
    setCurrentInterval(interval);
  };

  // 切换指标显示状态
  const [hiddenIndicators, setHiddenIndicators] = useState<Set<string>>(new Set());

  const toggleIndicator = (indicatorId: string) => {
    const indicatorRef = indicatorSeriesRef.current.get(indicatorId);
    if (indicatorRef) {
      const isHidden = hiddenIndicators.has(indicatorId);
      indicatorRef.series.applyOptions({ visible: !isHidden });

      setHiddenIndicators(prev => {
        const newSet = new Set(prev);
        if (isHidden) {
          newSet.delete(indicatorId);
        } else {
          newSet.add(indicatorId);
        }
        return newSet;
      });
    }
  };

  // Handle symbol change
  const handleSymbolSubmit = () => {
    const trimmedSymbol = symbolInput.trim().toUpperCase();
    if (trimmedSymbol && trimmedSymbol !== currentSymbol) {
      setCurrentSymbol(trimmedSymbol);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSymbolSubmit();
    }
  };

  // 处理指标更新 - 只在指标数量变化时执行
  useEffect(() => {
    if (chartRef.current && candlestickSeriesRef.current && allIndicators.length > 0) {
      processIndicators();
    }
  }, [allIndicators.length]); // 只依赖数量，不依赖整个数组


  return (
    <div className={`flex flex-col w-full h-full bg-card border border-border rounded-lg ${className}`}>
      {/* Chart Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={symbolInput}
              onChange={(e) => setSymbolInput(e.target.value.toUpperCase())}
              onKeyPress={handleKeyPress}
              onBlur={handleSymbolSubmit}
              placeholder="SYMBOL"
              className="w-24 h-8 px-2 text-sm font-medium bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all duration-200"
            />
            <h2 className="text-lg font-semibold text-foreground">{currentSymbol}</h2>
          </div>
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="animate-spin w-4 h-4 border-2 border-brand-primary border-t-transparent rounded-full"></div>
              <span>Loading...</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm">
              <span className={`flex items-center gap-1 px-2 py-1 rounded-md font-medium transition-all duration-200 ${
                priceChange >= 0
                  ? 'bg-green-500/10 text-green-600 dark:bg-green-500/20 dark:text-green-400'
                  : 'bg-red-500/10 text-red-600 dark:bg-red-500/20 dark:text-red-400'
              }`}>
                {priceChange >= 0 ? '↗' : '↘'} {priceChange.toFixed(2)}%
              </span>
              <span className="font-semibold text-foreground">${latestPrice.toFixed(2)}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-6">
          {/* 时间间隔选择器 */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">INTERVAL</span>
            <div className="flex gap-1 p-1 bg-background border border-border rounded-lg">
              {[
                { value: 'daily', label: 'Daily' },
                { value: 'weekly', label: 'Weekly' },
                { value: 'monthly', label: 'Monthly' }
              ].map((interval) => (
                <button
                  key={interval.value}
                  onClick={() => handleIntervalChange(interval.value)}
                  disabled={isLoading}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-all duration-200 ${
                    currentInterval === interval.value
                      ? 'bg-brand-primary text-white shadow-sm'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed'
                  }`}
                >
                  {interval.label}
                </button>
              ))}
            </div>
          </div>

          {/* 时间周期选择器 */}
          <div className="flex gap-1 p-1 bg-background border border-border rounded-lg">
            {['1M', '6M', '1Y', 'ALL'].map((period) => (
              <button
                key={period}
                onClick={() => handlePeriodChange(period)}
                disabled={isLoading}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all duration-200 ${
                  currentPeriod === period
                    ? 'bg-brand-primary text-white shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed'
                }`}
              >
                {period}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chart Container */}
      <div className="relative flex-1 w-full min-h-0">
        <div ref={chartContainerRef} className="w-full h-full" />

        {/* Crosshair数据显示 */}
        {crosshairData && (
          <div className="absolute top-3 left-3 bg-popover/95 backdrop-blur-sm border border-border rounded-lg shadow-lg p-3 text-xs font-mono z-10 pointer-events-none">
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-4 pb-1.5 border-b border-border">
                <span className="text-muted-foreground">Time</span>
                <span className="font-medium text-foreground">{crosshairData.time}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">Price</span>
                <span className="font-semibold text-foreground">${crosshairData.price.toFixed(2)}</span>
              </div>
              {Object.entries(crosshairData.panes).map(([paneId, paneData]) => (
                <div key={paneId} className="mt-1.5 pt-1.5 border-t border-border">
                  {Object.entries(paneData.indicators).map(([name, data]) => (
                    <div key={name} className="flex items-center justify-between gap-4">
                      <span className="text-muted-foreground">{name}</span>
                      <span className="font-medium text-foreground">
                        {data.value.toFixed(2)}% {data.quarter && <span className="text-muted-foreground">({data.quarter})</span>}
                      </span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}