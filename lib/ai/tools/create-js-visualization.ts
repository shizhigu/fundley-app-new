// @ts-nocheck
import { z } from 'zod';
import { tool, type UIMessageStreamWriter } from 'ai';
import type { AuthSession } from '@/lib/auth/clerk';
import type { ChatMessage } from '@/lib/types';
import { generateUUID } from '@/lib/utils';

interface CreateJSVisualizationProps {
  session: AuthSession | null;
  dataStream: UIMessageStreamWriter<ChatMessage>;
}

// Chart configuration schema - Chart.js only
const ChartConfigSchema = z.object({
  data: z.array(z.any()).describe('Array of data objects with symbol/category and metric_value/value fields'),
  spec: z.object({
    type: z.enum(['bar', 'line']).describe('Chart type: bar or line'),
    label: z.string().describe('Data series label')
  }).describe('Chart specification object')
});

/**
 * Chart.js Only Visualization Engine
 * Enhanced to support multi-series data visualization
 */
class JSVisualizationEngine {
  
  // 检测数据是否为多系列格式
  static detectMultiSeries(data: any) {
    if (!data || data.length === 0) return false;
    
    const sample = data[0];
    const keys = Object.keys(sample);
    
    console.log('🔍 Multi-series detection:', {
      dataLength: data.length,
      sampleKeys: keys,
      sampleData: sample
    });
    
    // 多系列数据特征：
    // 1. 有多个数值字段（除了x轴字段）
    // 2. 或者有series/symbol字段且数据按时间期间重复
    const labelFields = ['period', 'date', 'x', 'label', 'category'];
    const numericFields = keys.filter(key => 
      !labelFields.includes(key) && 
      typeof sample[key] === 'number'
    );
    
    console.log('🔍 Numeric fields:', numericFields);
    
    // 方式1: 多个数值字段 (如 {period: 'Q1', AAPL: 100, MSFT: 90})
    if (numericFields.length > 1) {
      console.log('✅ Multi-series detected: Multiple numeric fields');
      return true;
    }
    
    // 方式2: 重复的x轴值 + symbol字段 (如多个Q1数据点)
    if (data.length > 1) {
      const xValues = data.map((d: any) => d.period || d.date || d.x || d.label);
      const uniqueXValues = new Set(xValues);
      console.log('🔍 X-axis analysis:', {
        xValues,
        uniqueCount: uniqueXValues.size,
        totalCount: xValues.length,
        hasSymbolField: data.some((d: any) => d.symbol || d.series)
      });
      
      if (xValues.length > uniqueXValues.size) {
        console.log('✅ Multi-series detected: Repeated x-axis values');
        return true; // 有重复的x轴值
      }
    }
    
    console.log('❌ Single series detected');
    return false;
  }
  
  // 创建多系列柱状图数据
  static createMultiSeriesBarData(data: any, colors: any) {
    const sample = data[0];
    const keys = Object.keys(sample);
    const labelFields = ['period', 'date', 'x', 'label', 'category'];
    
    // 获取x轴标签
    const labels = [...new Set(data.map((d: any) => 
      d.period || d.date || d.x || d.label || d.category || 'Unknown'
    ))].sort();
    
    // 方式1: 多个数值字段
    const numericFields = keys.filter(key => 
      !labelFields.includes(key) && 
      typeof sample[key] === 'number'
    );
    
    if (numericFields.length > 1) {
      // 为每个数值字段创建一个dataset
      const datasets = numericFields.map((field, index) => ({
        label: field,
        data: labels.map(label => {
          const item = data.find((d: any) => (d.period || d.date || d.x || d.label || d.category) === label);
          return item ? (item[field] || 0) : 0;
        }),
        backgroundColor: `rgba(${parseInt(colors[index % colors.length].slice(1, 3), 16)}, ${parseInt(colors[index % colors.length].slice(3, 5), 16)}, ${parseInt(colors[index % colors.length].slice(5, 7), 16)}, 0.8)`,
        borderColor: colors[index % colors.length],
        borderWidth: 1
      }));
      
      return { labels, datasets };
    }
    
    // 方式2: 按symbol分组
    const seriesMap = new Map();
    data.forEach(d => {
      const series = d.symbol || d.series || 'Series';
      const xValue = d.period || d.date || d.x || d.label || 'Unknown';
      const yValue = d.value || d.metric_value || d.y || 0;
      
      if (!seriesMap.has(series)) {
        seriesMap.set(series, {});
      }
      seriesMap.get(series)[xValue] = yValue;
    });
    
    const datasets = [];
    let colorIndex = 0;
    
    for (const [series, seriesData] of seriesMap) {
      datasets.push({
        label: series,
        data: labels.map(label => seriesData[label] || 0),
        backgroundColor: `rgba(${parseInt(colors[colorIndex % colors.length].slice(1, 3), 16)}, ${parseInt(colors[colorIndex % colors.length].slice(3, 5), 16)}, ${parseInt(colors[colorIndex % colors.length].slice(5, 7), 16)}, 0.8)`,
        borderColor: colors[colorIndex % colors.length],
        borderWidth: 1
      });
      colorIndex++;
    }
    
    return { labels, datasets };
  }
  
  // 创建多系列线图数据
  static createMultiSeriesLineData(data, colors) {
    const sample = data[0];
    const keys = Object.keys(sample);
    const labelFields = ['period', 'date', 'x', 'label', 'category'];
    
    // 获取x轴标签
    const labels = [...new Set(data.map(d => 
      d.period || d.date || d.x || d.label || d.category || 'Unknown'
    ))].sort();
    
    // 方式1: 多个数值字段
    const numericFields = keys.filter(key => 
      !labelFields.includes(key) && 
      typeof sample[key] === 'number'
    );
    
    if (numericFields.length > 1) {
      // 为每个数值字段创建一个dataset
      const datasets = numericFields.map((field, index) => ({
        label: field,
        data: data.map(d => d[field] || 0),
        borderColor: colors[index % colors.length],
        backgroundColor: `rgba(${parseInt(colors[index % colors.length].slice(1, 3), 16)}, ${parseInt(colors[index % colors.length].slice(3, 5), 16)}, ${parseInt(colors[index % colors.length].slice(5, 7), 16)}, 0.1)`,
        tension: 0.1,
        fill: false
      }));
      
      return { labels, datasets };
    }
    
    // 方式2: 按symbol分组
    const seriesMap = new Map();
    data.forEach(d => {
      const series = d.symbol || d.series || 'Series';
      const xValue = d.period || d.date || d.x || d.label || 'Unknown';
      const yValue = d.value || d.metric_value || d.y || 0;
      
      if (!seriesMap.has(series)) {
        seriesMap.set(series, {});
      }
      seriesMap.get(series)[xValue] = yValue;
    });
    
    const datasets = [];
    let colorIndex = 0;
    
    for (const [series, seriesData] of seriesMap) {
      datasets.push({
        label: series,
        data: labels.map(label => seriesData[label] || 0),
        borderColor: colors[colorIndex % colors.length],
        backgroundColor: `rgba(${parseInt(colors[colorIndex % colors.length].slice(1, 3), 16)}, ${parseInt(colors[colorIndex % colors.length].slice(3, 5), 16)}, ${parseInt(colors[colorIndex % colors.length].slice(5, 7), 16)}, 0.1)`,
        tension: 0.1,
        fill: false
      });
      colorIndex++;
    }
    
    return { labels, datasets };
  }
  
  // 颜色工具函数
  static darkenColor(color) {
    // 简单变暗处理
    const colorMap = {
      '#3b82f6': '#1d4ed8', '#ef4444': '#dc2626', '#10b981': '#059669',
      '#f59e0b': '#d97706', '#8b5cf6': '#7c3aed', '#06b6d4': '#0891b2',
      '#f97316': '#ea580c', '#84cc16': '#65a30d', '#ec4899': '#db2777',
      '#6b7280': '#4b5563'
    };
    return colorMap[color] || color;
  }
  
  static addTransparency(color, alpha) {
    // 简单的透明度处理
    if (color.startsWith('#')) {
      const r = parseInt(color.slice(1, 3), 16);
      const g = parseInt(color.slice(3, 5), 16);
      const b = parseInt(color.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    return color;
  }
  
  static generateChartJSHTML(data: any[], spec: any): string {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Chart</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <style>
    body { 
      margin: 0; 
      padding: 20px; 
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
      background: white;
    }
    .chart-container { 
      width: 100%; 
      height: 400px; 
      position: relative; 
    }
  </style>
</head>
<body>
  <div class="chart-container">
    <canvas id="chart"></canvas>
  </div>
  <script>
    try {
      console.log('🔥 NEW VERSION v2025.1.10-fix2 - NO JSVisualizationEngine calls!');
      const rawData = ${JSON.stringify(data)};
      const chartType = "${spec.type || 'bar'}";
      const chartLabel = "${spec.label || 'Data'}";
      
      console.log('📊 Raw data:', rawData);
      console.log('📊 Chart type:', chartType);
      console.log('📊 Chart label:', chartLabel);
      
      // Auto-detect fields in data
      const sampleItem = rawData[0] || {};
      const allFields = Object.keys(sampleItem);
      
      // Find the first numeric field (excluding known label fields)
      const labelFields = ['symbol', 'category', 'label', 'name', 'period', 'date', 'marketCap'];
      const valueField = allFields.find(field => 
        !labelFields.includes(field) && 
        typeof sampleItem[field] === 'number'
      );
      
      console.log('📊 Available fields:', allFields);
      console.log('📊 Detected value field:', valueField);
      
      // 颜色调色板
      const colors = [
        '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
        '#06b6d4', '#f97316', '#84cc16', '#ec4899', '#6b7280'
      ];
      
      // Process data for Chart.js - 支持多系列（内联处理避免HTML中调用外部类）
      let processedData;
      
      // 检测多系列：有重复的period值
      const periods = rawData.map(d => d.period || d.date || d.x || d.label);
      const uniquePeriods = new Set(periods);
      const isMultiSeries = periods.length > uniquePeriods.size && rawData.some(d => d.symbol);
      
      console.log('📊 Multi-series detected:', isMultiSeries);
      
      if (chartType === 'bar' && isMultiSeries) {
        // 多系列柱状图 - 按symbol分组
        const seriesMap = new Map();
        const sortedLabels = [...uniquePeriods].sort();
        
        rawData.forEach(d => {
          const series = d.symbol || 'Series';
          const xValue = d.period || d.date || d.x || d.label || 'Unknown';
          const yValue = d.metric_value || d.value || d.y || 0;
          
          if (!seriesMap.has(series)) {
            seriesMap.set(series, {});
          }
          seriesMap.get(series)[xValue] = yValue;
        });
        
        const datasets = [];
        let colorIndex = 0;
        
        for (const [series, seriesData] of seriesMap) {
          const r = parseInt(colors[colorIndex % colors.length].slice(1, 3), 16);
          const g = parseInt(colors[colorIndex % colors.length].slice(3, 5), 16);
          const b = parseInt(colors[colorIndex % colors.length].slice(5, 7), 16);
          
          datasets.push({
            label: series,
            data: sortedLabels.map(label => seriesData[label] || 0),
            backgroundColor: \`rgba(\${r}, \${g}, \${b}, 0.8)\`,
            borderColor: colors[colorIndex % colors.length],
            borderWidth: 1
          });
          colorIndex++;
        }
        
        processedData = { labels: sortedLabels, datasets };
        
      } else if (chartType === 'line' && isMultiSeries) {
        // 多系列线图
        const seriesMap = new Map();
        const sortedLabels = [...uniquePeriods].sort();
        
        rawData.forEach(d => {
          const series = d.symbol || 'Series';
          const xValue = d.period || d.date || d.x || d.label || 'Unknown';
          const yValue = d.metric_value || d.value || d.y || 0;
          
          if (!seriesMap.has(series)) {
            seriesMap.set(series, {});
          }
          seriesMap.get(series)[xValue] = yValue;
        });
        
        const datasets = [];
        let colorIndex = 0;
        
        for (const [series, seriesData] of seriesMap) {
          const r = parseInt(colors[colorIndex % colors.length].slice(1, 3), 16);
          const g = parseInt(colors[colorIndex % colors.length].slice(3, 5), 16);
          const b = parseInt(colors[colorIndex % colors.length].slice(5, 7), 16);
          
          datasets.push({
            label: series,
            data: sortedLabels.map(label => seriesData[label] || 0),
            borderColor: colors[colorIndex % colors.length],
            backgroundColor: \`rgba(\${r}, \${g}, \${b}, 0.1)\`,
            tension: 0.1,
            fill: false
          });
          colorIndex++;
        }
        
        processedData = { labels: sortedLabels, datasets };
        
      } else {
        // 单系列图表（原逻辑）
        if (chartType === 'bar') {
          const labels = rawData.map(d => d.symbol || d.category || d.x || d.label || d.name || 'Unknown');
          const values = rawData.map(d => valueField ? d[valueField] : (d.metric_value || d.value || d.y || 0));
          
          const r = parseInt(colors[0].slice(1, 3), 16);
          const g = parseInt(colors[0].slice(3, 5), 16);
          const b = parseInt(colors[0].slice(5, 7), 16);
          
          processedData = {
            labels: labels,
            datasets: [{
              label: chartLabel,
              data: values,
              backgroundColor: \`rgba(\${r}, \${g}, \${b}, 0.8)\`,
              borderColor: colors[0],
              borderWidth: 1
            }]
          };
        } else if (chartType === 'line') {
          const labels = rawData.map(d => d.period || d.date || d.x || d.label || d.symbol || d.name || 'Unknown');
          const values = rawData.map(d => valueField ? d[valueField] : (d.metric_value || d.value || d.y || 0));
          
          const r = parseInt(colors[0].slice(1, 3), 16);
          const g = parseInt(colors[0].slice(3, 5), 16);
          const b = parseInt(colors[0].slice(5, 7), 16);
          
          processedData = {
            labels: labels,
            datasets: [{
              label: chartLabel,
              data: values,
              borderColor: colors[0],
              backgroundColor: \`rgba(\${r}, \${g}, \${b}, 0.1)\`,
              tension: 0.1
            }]
          };
        } else {
          processedData = { labels: [], datasets: [] };
        }
      }
      
      console.log('📊 Processed data:', processedData);
      
      const ctx = document.getElementById('chart').getContext('2d');
      
      new Chart(ctx, {
        type: chartType,
        data: processedData,
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: true
            }
          },
          scales: {
            y: {
              beginAtZero: false,
              grid: {
                display: true
              }
            }
          }
        }
      });
      
      console.log('✅ Chart.js rendered successfully');
    } catch (error) {
      console.error('❌ Chart.js rendering failed:', error);
      document.getElementById('chart').innerHTML = 
        '<p style="color: red; text-align: center; padding: 20px;">Failed to render chart: ' + error.message + '</p>';
    }
  </script>
</body>
</html>`;
  }
  
}

export const createJSVisualization = ({ session, dataStream }: CreateJSVisualizationProps) =>
  tool({
    description: `Create fast, interactive data visualizations using Chart.js.
    
    ⚡ Renders in 1-3 seconds vs 30+ seconds for Python charts.
    
    REQUIRED FORMAT (Chart.js only):
    {
      "title": "Chart Title",
      "config": {
        "data": [{"symbol": "AAPL", "metric_value": 0.95}],
        "spec": {"type": "bar", "label": "Data Label"}
      }
    }
    
    Chart types: "bar", "line"
    Data fields: symbol, metric_value, value, category, period, date, x, y`,
    
    inputSchema: z.object({
      title: z.string().describe('Chart title'),
      description: z.string().optional().describe('Description of what the chart shows'),
      config: ChartConfigSchema.describe('Chart configuration object'),
    }),
    
    execute: async ({ title, description, config }) => {
      try {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 8);
        const vizId = `js_viz_${timestamp}_${random}`;
        
        console.log(`🚀 Creating JS visualization: ${title} (${config.library})`);
        
        // Generate Chart.js HTML only
        const htmlOutput = JSVisualizationEngine.generateChartJSHTML(config.data, config.spec);
        
        console.log(`✅ Generated Chart.js HTML (${htmlOutput.length} chars)`);
        console.log('📊 Chart config:', JSON.stringify(config, null, 2));
        
        // Return format compatible with existing VisualizationMessage component
        return {
          id: vizId,
          title,
          description: description || `Interactive Chart.js chart`,
          type: 'visualization',
          status: 'ready', // Ready immediately, no execution needed
          // Pre-populated HTML (key difference from Python approach)
          cachedHtml: htmlOutput,
          cachedImage: null,
          metadata: {
            library: 'chart-js',
            generatedAt: new Date().toISOString(),
            dataPoints: config.data.length,
            renderTime: '< 1 second'
          }
        };
        
      } catch (error: any) {
        console.error('❌ JS Visualization creation failed:', error);
        return {
          error: error.message || 'Failed to create visualization',
          type: 'error'
        };
      }
    },
  });

