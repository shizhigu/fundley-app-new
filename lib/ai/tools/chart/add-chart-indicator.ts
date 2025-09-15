import { tool } from 'ai';
import { z } from 'zod';

/**
 * AI工具：为TradingView图表添加技术指标或自定义数据可视化
 * 确保时间轴与主图表完全对齐
 */
export const addChartIndicator = tool({
  description: 'Add a technical indicator or custom visualization to the trading chart as a subpane. Data must have time alignment with the main chart.',
  inputSchema: z.object({
    indicatorId: z.string().describe('Unique identifier for this indicator'),
    indicatorName: z.string().describe('Display name for the indicator'),
    indicatorType: z.enum(['line', 'histogram', 'area']).describe('Chart type for the indicator'),
    symbol: z.string().describe('Stock symbol to generate indicator for'),
    period: z.string().describe('Time period (1M, 6M, 1Y, ALL)'),
    interval: z.string().describe('Time interval (daily, weekly, monthly)'),
    calculation: z.string().describe('Mathematical formula or calculation method for the indicator'),
    color: z.string().optional().describe('Color for the indicator (hex color)'),
    paneHeight: z.number().optional().default(100).describe('Height of the subpane in pixels')
  }),
  execute: async ({
    indicatorId,
    indicatorName,
    indicatorType,
    symbol,
    period,
    interval,
    calculation,
    color = '#26a69a',
    paneHeight = 100
  }) => {
    try {
      console.log(`🔧 Generating indicator: ${indicatorName} for ${symbol}`);

      // 首先获取基础价格数据用于时间对齐
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3003';
      const chartResponse = await fetch(`${baseUrl}/api/stock/chart-data?symbol=${symbol}&period=${period}&interval=${interval}`);

      if (!chartResponse.ok) {
        throw new Error(`Failed to fetch chart data: ${chartResponse.statusText}`);
      }

      const chartData = await chartResponse.json();

      if (!chartData.success) {
        throw new Error(`Chart data error: ${chartData.error}`);
      }

      // 基于价格数据计算指标
      const indicatorData = calculateIndicator(chartData.data, calculation);

      // 确保时间格式一致
      const alignedData = indicatorData.map(item => ({
        time: item.time, // 保持与主图表相同的时间格式 (YYYY-MM-DD)
        value: item.value
      }));

      const result = {
        id: indicatorId,
        name: indicatorName,
        type: indicatorType,
        data: alignedData,
        color,
        paneHeight,
        metadata: {
          symbol,
          period,
          interval,
          calculation,
          dataPoints: alignedData.length
        }
      };

      console.log(`✅ Indicator generated: ${alignedData.length} data points`);
      return result;

    } catch (error) {
      console.error('❌ Indicator generation failed:', error);
      return {
        error: error instanceof Error ? error.message : 'Unknown error',
        id: indicatorId,
        name: indicatorName
      };
    }
  }
});

/**
 * 根据计算公式生成指标数据
 */
function calculateIndicator(priceData: any[], calculation: string): { time: string; value: number }[] {
  // 简单的计算示例 - 可以扩展为更复杂的技术指标
  switch (calculation.toLowerCase()) {
    case 'volume':
      return priceData.map(d => ({
        time: d.time,
        value: d.volume || 0
      }));

    case 'rsi':
      return calculateRSI(priceData);

    case 'sma20':
      return calculateSMA(priceData, 20);

    case 'price_change':
      return calculatePriceChange(priceData);

    default:
      // 默认返回收盘价
      return priceData.map(d => ({
        time: d.time,
        value: d.close
      }));
  }
}

/**
 * 计算RSI指标
 */
function calculateRSI(data: any[], period: number = 14): { time: string; value: number }[] {
  if (data.length < period + 1) return [];

  const rsiData: { time: string; value: number }[] = [];

  for (let i = period; i < data.length; i++) {
    let gains = 0;
    let losses = 0;

    for (let j = i - period + 1; j <= i; j++) {
      const change = data[j].close - data[j - 1].close;
      if (change > 0) {
        gains += change;
      } else {
        losses -= change;
      }
    }

    const avgGain = gains / period;
    const avgLoss = losses / period;
    const rs = avgGain / (avgLoss || 0.01);
    const rsi = 100 - (100 / (1 + rs));

    rsiData.push({
      time: data[i].time,
      value: rsi
    });
  }

  return rsiData;
}

/**
 * 计算简单移动平均线
 */
function calculateSMA(data: any[], period: number): { time: string; value: number }[] {
  if (data.length < period) return [];

  const smaData: { time: string; value: number }[] = [];

  for (let i = period - 1; i < data.length; i++) {
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) {
      sum += data[j].close;
    }

    smaData.push({
      time: data[i].time,
      value: sum / period
    });
  }

  return smaData;
}

/**
 * 计算价格变化百分比
 */
function calculatePriceChange(data: any[]): { time: string; value: number }[] {
  if (data.length < 2) return [];

  const changeData: { time: string; value: number }[] = [];

  for (let i = 1; i < data.length; i++) {
    const change = ((data[i].close - data[i - 1].close) / data[i - 1].close) * 100;
    changeData.push({
      time: data[i].time,
      value: change
    });
  }

  return changeData;
}