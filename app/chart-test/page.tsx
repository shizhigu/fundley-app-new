'use client';

import { TradingChart } from '@/components/trading-chart';
import { useState } from 'react';

// 从TradingChart组件复制类型定义
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
    text: string;
    size: number;
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

export default function ChartTestPage() {
  const [indicators, setIndicators] = useState<ChartIndicator[]>([]);

  // 模拟添加指标的示例
  const addVolumeIndicator = () => {
    // 这里应该通过AI工具调用来生成真实数据
    // 为了演示，我们创建一个简单的模拟数据
    const mockVolumeData = Array.from({ length: 30 }, (_, i) => ({
      time: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      value: Math.random() * 100000000 + 50000000
    }));

    const volumeIndicator: ChartIndicator = {
      id: 'volume-indicator',
      name: 'Volume',
      type: 'histogram',
      data: mockVolumeData,
      color: '#26a69a',
      paneHeight: 100
    };

    setIndicators(prev => [...prev, volumeIndicator]);
  };

  const addRSIIndicator = () => {
    // 模拟RSI数据
    const mockRSIData = Array.from({ length: 30 }, (_, i) => ({
      time: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      value: Math.random() * 40 + 30 // RSI between 30-70
    }));

    const rsiIndicator: ChartIndicator = {
      id: 'rsi-indicator',
      name: 'RSI (14)',
      type: 'line',
      data: mockRSIData,
      color: '#ef5350',
      paneHeight: 80
    };

    setIndicators(prev => [...prev, rsiIndicator]);
  };

  const addFundamentalIndicator = () => {
    // 模拟季度ROCE数据（简化版本）
    const quarterlyData = [
      { fiscalQuarter: '2023Q4', filingDate: '2024-01-31', value: 15.2 },
      { fiscalQuarter: '2024Q1', filingDate: '2024-05-01', value: 18.7 },
      { fiscalQuarter: '2024Q2', filingDate: '2024-08-01', value: 12.4 },
      { fiscalQuarter: '2024Q3', filingDate: '2024-11-01', value: 16.8 },
    ];

    // 简化：每个季度一个数据点
    const stepData: IndicatorData[] = quarterlyData.map(quarter => ({
      time: quarter.filingDate,
      value: quarter.value
    }));

    const fundamentalIndicator: ChartIndicator = {
      id: 'fundamental-indicator',
      name: 'ROCE (%)',
      type: 'step-line',
      data: stepData,
      color: '#FF6D00',
      paneHeight: 100,
      markers: quarterlyData.map(q => ({
        time: q.filingDate,
        position: 'aboveBar' as const,
        color: '#FF6D00',
        shape: 'circle' as const,
        text: q.fiscalQuarter,
        size: 1
      })),
      metadata: {
        dataType: 'quarterly-fundamental',
        quarters: quarterlyData.map(q => q.fiscalQuarter),
        unit: '%'
      }
    };

    setIndicators(prev => [...prev, fundamentalIndicator]);
  };

  const clearIndicators = () => {
    setIndicators([]);
  };

  return (
    <div className="h-screen w-full flex flex-col">
      <div className="p-4 border-b bg-gray-50">
        <h1 className="text-2xl font-bold mb-4">TradingView Chart with AI Indicators Test</h1>
        <div className="flex gap-2">
          <button
            onClick={addVolumeIndicator}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Add Volume Indicator
          </button>
          <button
            onClick={addRSIIndicator}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            Add RSI Indicator
          </button>
          <button
            onClick={addFundamentalIndicator}
            className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
          >
            Add ROCE (Step-line)
          </button>
          <button
            onClick={clearIndicators}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            Clear Indicators
          </button>
        </div>
        <div className="mt-2 text-sm text-gray-600">
          Current indicators: {indicators.length}
          {indicators.length > 0 && ` (${indicators.map(i => i.name).join(', ')})`}
        </div>
      </div>

      <div className="flex-1">
        <TradingChart
          symbol="AAPL"
          indicators={indicators}
          className="w-full h-full"
        />
      </div>
    </div>
  );
}