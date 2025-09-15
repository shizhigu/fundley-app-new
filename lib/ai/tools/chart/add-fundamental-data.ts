import { tool, type UIMessageStreamWriter } from 'ai';
import { z } from 'zod';
import type { ChatMessage } from '@/lib/types';

interface AddFundamentalDataProps {
  dataStream: UIMessageStreamWriter<ChatMessage>;
}

/**
 * 添加季度基本面数据到图表子面板
 * 纯数据可视化工具，不做任何计算，只负责数据对齐和显示
 */
export const addFundamentalData = ({ dataStream }: AddFundamentalDataProps) => tool({
  description: 'Add quarterly fundamental data as step-line indicator to existing chart. Creates step-line visualization with precise time alignment based on earnings report dates.',
  inputSchema: z.object({
    indicatorId: z.string().describe('Unique identifier for this fundamental indicator'),
    indicatorName: z.string().describe('Display name (e.g., "ROCE", "ROE", "Debt Ratio")'),
    quarterlyData: z.array(z.object({
      fiscalQuarter: z.string().describe('Fiscal quarter like "2024Q1", "2024Q2"'),
      filingDate: z.string().describe('Earnings report filing date in YYYY-MM-DD format'),
      value: z.number().describe('The fundamental metric value (e.g., 15.2 for 15.2% ROCE)'),
      endDate: z.string().optional().describe('When this value expires, defaults to next quarter filing date')
    })).describe('Array of quarterly data points with filing dates and values'),
    unit: z.string().optional().default('%').describe('Unit of the metric (%, $, ratio, etc.)'),
    color: z.string().optional().default('#FF6D00').describe('Color for the step-line indicator'),
    paneHeight: z.number().optional().default(80).describe('Height of the subpane in pixels')
  }),
  execute: async ({
    indicatorId,
    indicatorName,
    quarterlyData,
    unit,
    color = '#FF6D00',
    paneHeight = 80
  }) => {
    try {
      console.log(`📊 Creating fundamental indicator: ${indicatorName} with ${quarterlyData.length} quarters`);
      console.log(`📊 Input quarterly data:`, quarterlyData);

      // 按时间排序确保数据正确性
      const sortedData = quarterlyData.sort((a, b) =>
        new Date(a.filingDate).getTime() - new Date(b.filingDate).getTime()
      );
      console.log(`📊 Sorted quarterly data:`, sortedData);

      // 生成阶梯状数据
      const stepLineData = generateStepLineData(sortedData);
      console.log(`📈 Generated step line data:`, stepLineData);

      // 生成季度文字标记（显示季度文字，但不显示圆点）
      const quarterlyMarkers = sortedData.map(quarter => ({
        time: quarter.filingDate,
        position: 'aboveBar' as const,
        color: 'transparent', // 透明圆点
        shape: 'circle' as const,
        text: quarter.fiscalQuarter, // 显示季度文字如"2024Q1"
        size: 0 // 圆点大小为0，只显示文字
      }));

      const result = {
        id: indicatorId,
        name: `${indicatorName} (${unit})`,
        type: 'step-line' as const,
        data: stepLineData,
        color,
        paneHeight,
        markers: quarterlyMarkers,
        metadata: {
          dataType: 'quarterly-fundamental',
          quarters: sortedData.map(q => q.fiscalQuarter),
          filingDates: sortedData.map(q => q.filingDate),
          unit,
          dataPoints: stepLineData.length
        }
      };

      console.log(`✅ Fundamental indicator created: ${stepLineData.length} data points across ${sortedData.length} quarters`);
      console.log(`📊 Full result object:`, JSON.stringify(result, null, 2));

      // Send indicator data to chart via data stream
      console.log(`🚀 Sending to dataStream:`, {
        type: 'data-chartIndicator',
        data: result
      });
      dataStream.write({
        type: 'data-chartIndicator',
        data: result
      });

      return result;

    } catch (error) {
      console.error('❌ Fundamental indicator creation failed:', error);
      return {
        error: error instanceof Error ? error.message : 'Unknown error',
        id: indicatorId,
        name: indicatorName
      };
    }
  }
});

/**
 * 将季度数据转换为阶梯状线条数据
 * 简化版本：每个季度只用一个数据点，让TradingView自然连接
 */
function generateStepLineData(
  quarterlyData: Array<{
    fiscalQuarter: string;
    filingDate: string;
    value: number;
    endDate?: string;
  }>
): Array<{ time: string; value: number }> {
  // 简化：每个季度只用filing date作为数据点
  // TradingView会自然地连接这些点形成阶梯效果
  const stepData = quarterlyData.map(quarter => ({
    time: quarter.filingDate, // 只使用YYYY-MM-DD格式的日期
    value: quarter.value
  }));

  // 确保按时间排序
  stepData.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

  return stepData;
}

/**
 * 辅助类型定义
 */
export interface FundamentalIndicator {
  id: string;
  name: string;
  type: 'step-line';
  data: Array<{ time: string; value: number }>;
  color: string;
  paneHeight: number;
  markers?: Array<{
    time: string;
    position: 'aboveBar' | 'belowBar';
    color: string;
    shape: 'circle' | 'square' | 'arrowUp' | 'arrowDown';
    text: string;
    size: number;
  }>;
  metadata: {
    dataType: 'quarterly-fundamental';
    quarters: string[];
    filingDates: string[];
    unit: string;
    dataPoints: number;
  };
}