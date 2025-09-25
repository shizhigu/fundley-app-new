'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { WebSearchResultCard } from './web-search-result-card';
import { ToolStatus } from './tool-status';
import { Markdown } from './markdown';
import { JSVisualizationMessage } from './js-visualization-message';
import type { ChatMessage } from '@/lib/types';
import { generateUUID } from '@/lib/utils';
import { useState, useMemo, forwardRef, lazy, Suspense } from 'react';

// Import Chart.js visualization engine for frontend execution
const JSVisualizationEngine = {
  generateChartJSHTML: (data: any[], spec: any, vizId: string = 'default'): string => {
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
    <canvas id="chart-${vizId}"></canvas>
  </div>
  <script>
    try {
      console.log('🔥 JS Visualization v2025.1.14 - Unique IDs: ${vizId}');
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

      // 检测多系列：检查是否有多个symbol
      const symbols = rawData.map(d => d.symbol).filter(s => s); // 过滤掉undefined
      const uniqueSymbols = new Set(symbols);
      const isMultiSeries = uniqueSymbols.size > 1;

      console.log('📊 Multi-series analysis:', {
        totalData: rawData.length,
        symbolsFound: Array.from(uniqueSymbols),
        isMultiSeries: isMultiSeries
      });

      console.log('📊 Multi-series detected:', isMultiSeries);

      if (chartType === 'bar' && isMultiSeries) {
        // 多系列柱状图 - 只处理有symbol的数据
        const validData = rawData.filter(d => d.symbol); // 过滤掉没有symbol的数据
        const seriesMap = new Map();

        // 获取所有时间点 - 使用backend指定的x_axis字段，有安全后备
        const xAxisField = spec.x_axis || 'period';
        const yAxisField = spec.y_axis || 'roce_value';

        console.log('🔍 Field mapping:', { xAxisField, yAxisField, spec });
        const allPeriods = validData.map(d => d[xAxisField] || 'Unknown');
        const sortedLabels = [...new Set(allPeriods)].sort();

        console.log('📊 Processing valid data for multi-series bar:', {
          validDataCount: validData.length,
          periods: sortedLabels
        });

        validData.forEach(d => {
          const series = d.symbol;
          const xValue = d[xAxisField] || 'Unknown';
          const yValue = d[yAxisField] || 0;

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
        // 多系列线图 - 只处理有symbol的数据
        const validData = rawData.filter(d => d.symbol); // 过滤掉没有symbol的数据
        const seriesMap = new Map();

        // 获取所有时间点 - 使用backend指定的x_axis字段，有安全后备
        const xAxisField = spec.x_axis || 'period';
        const yAxisField = spec.y_axis || 'roce_value';

        console.log('🔍 Field mapping:', { xAxisField, yAxisField, spec });
        const allPeriods = validData.map(d => d[xAxisField] || 'Unknown');
        const sortedLabels = [...new Set(allPeriods)].sort();

        console.log('📊 Processing valid data for multi-series line:', {
          validDataCount: validData.length,
          periods: sortedLabels
        });

        validData.forEach(d => {
          const series = d.symbol;
          const xValue = d[xAxisField] || 'Unknown';
          const yValue = d[yAxisField] || 0;

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
        } else if (chartType === 'pie' || chartType === 'doughnut') {
          // 饼图和环形图
          const labels = rawData.map(d => d.symbol || d.category || d.label || d.name || 'Unknown');
          const values = rawData.map(d => valueField ? d[valueField] : (d.metric_value || d.value || d.y || 0));

          const backgroundColors = values.map((_, index) => {
            const r = parseInt(colors[index % colors.length].slice(1, 3), 16);
            const g = parseInt(colors[index % colors.length].slice(3, 5), 16);
            const b = parseInt(colors[index % colors.length].slice(5, 7), 16);
            return \`rgba(\${r}, \${g}, \${b}, 0.8)\`;
          });

          processedData = {
            labels: labels,
            datasets: [{
              label: chartLabel,
              data: values,
              backgroundColor: backgroundColors,
              borderColor: colors.slice(0, values.length),
              borderWidth: 1
            }]
          };
        } else if (chartType === 'scatter') {
          // 散点图
          const scatterData = rawData.map(d => ({
            x: d.x || d.metric_value || d.value || 0,
            y: d.y || d.secondary_value || d.value || 0
          }));

          processedData = {
            datasets: [{
              label: chartLabel,
              data: scatterData,
              backgroundColor: colors[0],
              borderColor: colors[0]
            }]
          };
        } else if (chartType === 'radar') {
          // 雷达图
          const labels = rawData.map(d => d.symbol || d.category || d.label || d.name || 'Unknown');
          const values = rawData.map(d => valueField ? d[valueField] : (d.metric_value || d.value || d.y || 0));

          const r = parseInt(colors[0].slice(1, 3), 16);
          const g = parseInt(colors[0].slice(3, 5), 16);
          const b = parseInt(colors[0].slice(5, 7), 16);

          processedData = {
            labels: labels,
            datasets: [{
              label: chartLabel,
              data: values,
              backgroundColor: \`rgba(\${r}, \${g}, \${b}, 0.2)\`,
              borderColor: colors[0],
              borderWidth: 2
            }]
          };
        } else {
          processedData = { labels: [], datasets: [] };
        }
      }

      console.log('📊 Processed data:', processedData);

      const ctx = document.getElementById('chart-${vizId}').getContext('2d');

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
      const chartElement = document.getElementById('chart-${vizId}');
      if (chartElement) {
        chartElement.innerHTML =
          '<p style="color: red; text-align: center; padding: 20px;">Failed to render chart: ' + error.message + '</p>';
      }
    }
  </script>
</body>
</html>`;
  },

  // 新方法：从完整Chart.js配置生成HTML
  generateChartJSHTMLFromConfig: (chartConfig: any, vizId: string) => {
    return `<!DOCTYPE html>
<html>
<head>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <style>
    body { margin: 0; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, sans-serif; }
    .chart-container { position: relative; height: 400px; width: 100%; }
  </style>
</head>
<body>
  <div class="chart-container">
    <canvas id="chart-${vizId}"></canvas>
  </div>
  <script>
    try {
      console.log('🎯 Chart.js - Rendering with complete config');

      const chartConfig = ${JSON.stringify(chartConfig)};
      console.log('📋 Complete Chart.js config:', chartConfig);

      const ctx = document.getElementById('chart-${vizId}').getContext('2d');

      // 直接使用完整的Chart.js配置
      new Chart(ctx, chartConfig);

      console.log('✅ Chart.js rendered successfully from complete config');
    } catch (error) {
      console.error('❌ Chart.js rendering failed:', error);
      const chartElement = document.getElementById('chart-${vizId}');
      if (chartElement) {
        chartElement.innerHTML =
          '<p style="color: red; text-align: center; padding: 20px;">Failed to render chart: ' + error.message + '</p>';
      }
    }
  </script>
</body>
</html>`;
  }
};

// 简化的 Event 类型定义
interface SimpleEvent {
  id: string;
  type: 'user_message' | 'assistant_text' | 'tool_call' | 'tool_response';
  content: string;
  toolName?: string;
  toolArgs?: any;
  toolResult?: any;
  timestamp: string;
}

// 单个 Event 组件
const EventComponent = ({ event }: { event: SimpleEvent }) => {
  // 添加调试日志
  console.log('🔍 EventComponent processing:', event.type, event.toolName, !!event.toolResult);

  switch (event.type) {
    case 'user_message':
      return (
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 mb-2">
          <div className="text-sm text-blue-600 font-medium mb-1">User</div>
          <div className="text-gray-900 dark:text-gray-100">{event.content}</div>
        </div>
      );

    case 'assistant_text':
      // 检查assistant_text中是否包含可视化数据
      if (event.content && event.content.includes('"type": "frontend_visualization"')) {
        try {
          // 尝试提取JSON数据
          const jsonMatch = event.content.match(/\{[\s\S]*"type":\s*"frontend_visualization"[\s\S]*\}/);
          if (jsonMatch) {
            const vizData = JSON.parse(jsonMatch[0]);
            console.log('🎨 Found visualization data in assistant text:', vizData);
            console.log('🔍 Data structure:', vizData.config?.data);
            console.log('🔍 Chart spec:', vizData.config?.spec);

            if (vizData.type === 'frontend_visualization' && vizData.config) {
              // 生成稳定的唯一ID（基于内容哈希，避免重复渲染）
              const contentHash = JSON.stringify(vizData).length + '_' + vizData.title.replace(/\s/g, '_');
              const vizId = `adk_text_viz_${contentHash}`;

              // 使用Chart.js引擎生成HTML
              const htmlOutput = JSVisualizationEngine.generateChartJSHTML(
                vizData.config.data,
                vizData.config.spec,
                vizId
              );

              console.log('✅ Generated Chart.js HTML from assistant text');

              return (
                <div className="mb-2">
                  <JSVisualizationMessage
                    id={vizId}
                    title={vizData.title}
                    description={vizData.description}
                    cachedHtml={htmlOutput}
                    metadata={{
                      library: 'chart-js',
                      dataPoints: vizData.config.data.length,
                      renderTime: '< 1 second',
                      generatedAt: new Date().toISOString()
                    }}
                  />
                </div>
              );
            }
          }
        } catch (error) {
          console.warn('Failed to parse visualization from assistant text:', error);
        }
      }

      return (
        <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 mb-2">
          <div className="text-sm text-green-600 font-medium mb-1">Assistant</div>
          <div className="text-gray-900 dark:text-gray-100">
            <Markdown>{event.content}</Markdown>
          </div>
        </div>
      );

    case 'tool_call':
      // 对于web_search工具，使用简化的运行状态显示
      if (event.toolName === 'web_search') {
        return (
          <div className="mb-2">
            <ToolStatus
              name="web_search"
              status="running"
              displayAction="Searching web for insights"
            />
          </div>
        );
      }

      // 其他工具使用通用的工具调用显示
      return (
        <div className="mb-2">
          <ToolStatus
            name={event.toolName || 'unknown'}
            status="running"
            displayAction={event.content}
          />
        </div>
      );

    case 'tool_response':
      // 添加详细调试信息
      console.log('🔍 Tool response event:', {
        toolName: event.toolName,
        hasToolResult: !!event.toolResult,
        toolResultType: typeof event.toolResult,
        toolResultPreview: event.toolResult ? String(event.toolResult).substring(0, 200) + '...' : 'null'
      });

      // 对于create_visualization工具，执行前端可视化
      if (event.toolName === 'create_visualization') {
        console.log('🎨 Found create_visualization tool!', {
          hasToolResult: !!event.toolResult,
          hasVisualizationData: !!event.toolArgs?.visualization_data,
          toolResultType: typeof event.toolResult,
          toolArgsType: typeof event.toolArgs,
          toolResultPreview: event.toolResult ? JSON.stringify(event.toolResult).substring(0, 300) : 'null',
          toolArgsPreview: event.toolArgs ? JSON.stringify(event.toolArgs).substring(0, 300) : 'null'
        });

        try {
          // 解析toolResult（可能是字符串）
          let parsedToolResult = null;
          if (event.toolResult) {
            if (typeof event.toolResult === 'string') {
              try {
                parsedToolResult = JSON.parse(event.toolResult);
                console.log('📋 Parsed toolResult from string:', parsedToolResult);
              } catch (e) {
                console.warn('Failed to parse toolResult string:', e);
                parsedToolResult = event.toolResult;
              }
            } else {
              parsedToolResult = event.toolResult;
              console.log('📋 Using toolResult object directly:', parsedToolResult);
            }
          }

          // 首先检查 toolResult 中的 chartjsConfig（新格式）
          if (parsedToolResult && typeof parsedToolResult === 'object' && parsedToolResult.chartjsConfig) {
            const vizData = parsedToolResult;
            console.log('🎨 Found chartjsConfig visualization:', vizData);

            const stableVizId = `chart_${event.id || Date.now()}`;
            const chartConfig = vizData.chartjsConfig;

            console.log('📊 Using chartjsConfig:', chartConfig);

            // chartjsConfig已经是完整的Chart.js配置，直接使用
            const htmlOutput = JSVisualizationEngine.generateChartJSHTMLFromConfig(
              chartConfig,
              stableVizId
            );

            console.log('✅ Generated Chart.js HTML from chartjsConfig');

            return (
              <div className="mb-2">
                <JSVisualizationMessage
                  id={stableVizId}
                  title={vizData.title || "Financial Chart"}
                  description={vizData.description || "Generated from financial analysis"}
                  cachedHtml={htmlOutput}
                  metadata={{
                    library: 'chart-js',
                    dataPoints: chartConfig.data?.datasets?.[0]?.data?.length || 0,
                    renderTime: '< 1 second',
                    generatedAt: new Date().toISOString()
                  }}
                />
              </div>
            );
          }

          // 然后检查 toolArgs.visualization_data（AgentOS格式）
          if (event.toolArgs?.visualization_data) {
            const vizDataArray = event.toolArgs.visualization_data;
            console.log('📊 Found visualization_data array:', vizDataArray);

            if (Array.isArray(vizDataArray) && vizDataArray.length > 0) {
              const firstVizItem = vizDataArray[0];
              console.log('🔍 First visualization item:', firstVizItem);

              // 检查是否包含图表数据
              if (firstVizItem && typeof firstVizItem === 'object') {
                // 生成稳定的唯一ID
                const stableVizId = `adk_viz_${event.id || Date.now()}`;

                // 转换数据格式为Chart.js
                let chartData, chartConfig;

                // 如果数据中包含 data 和 spec/config 字段
                if (firstVizItem.data && firstVizItem.spec) {
                  chartData = firstVizItem.data;
                  chartConfig = firstVizItem.spec;
                } else if (firstVizItem.config) {
                  chartData = firstVizItem.config.data;
                  chartConfig = firstVizItem.config.spec;
                } else {
                  // 假设整个对象就是数据
                  chartData = [firstVizItem];
                  chartConfig = { type: 'bar', label: 'Chart' };
                }

                console.log('📊 Chart data:', chartData);
                console.log('📊 Chart config:', chartConfig);

                // 使用Chart.js引擎生成HTML
                const htmlOutput = JSVisualizationEngine.generateChartJSHTML(chartData, chartConfig, stableVizId);

                console.log('✅ Generated Chart.js HTML from AgentOS data');

                return (
                  <div className="mb-2">
                    <JSVisualizationMessage
                      id={stableVizId}
                      title="Financial Chart"
                      description="Generated from financial analysis"
                      cachedHtml={htmlOutput}
                      metadata={{
                        library: 'chart-js',
                        dataPoints: Array.isArray(chartData) ? chartData.length : 1,
                        renderTime: '< 1 second',
                        generatedAt: new Date().toISOString()
                      }}
                    />
                  </div>
                );
              }
            }
          }

          // 回退到原来的 toolResult 处理
          if (event.toolResult) {
            const vizData = typeof event.toolResult === 'string'
              ? JSON.parse(event.toolResult)
              : event.toolResult;

            console.log('🎨 Processing visualization tool result:', vizData);

            // 检查是否是简单的数组数据格式
            if (Array.isArray(vizData) && vizData.length > 0) {
              console.log('📊 Detected array format visualization data, converting to Chart.js format');

              // 生成稳定的唯一ID
              const stableVizId = `adk_array_viz_${event.id || Date.now()}`;

              // 使用Chart.js引擎生成HTML
              const chartSpec = { type: 'line', label: 'Data Visualization' }; // 默认使用折线图
              const htmlOutput = JSVisualizationEngine.generateChartJSHTML(vizData, chartSpec, stableVizId);

              console.log('✅ Generated Chart.js HTML from array data');

              return (
                <div className="mb-2">
                  <JSVisualizationMessage
                    id={stableVizId}
                    title="Data Visualization"
                    description="Generated from AgentOS visualization data"
                    cachedHtml={htmlOutput}
                    metadata={{
                      library: 'chart-js',
                      dataPoints: vizData.length,
                      renderTime: '< 1 second',
                      generatedAt: new Date().toISOString()
                    }}
                  />
                </div>
                );
            }
          }

          // 检查是否是前端可视化数据
          if (vizData.type === 'frontend_visualization') {

            // NEW: Check for simplified Chart.js config approach
            if (vizData.chartjsConfig) {
              console.log('📊 Chart visualization detected, but Chart.js is not available:', vizData.chartjsConfig);

              return (
                <div className="mb-2">
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                    <h3 className="text-lg font-semibold mb-2">{vizData.title}</h3>
                    {vizData.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{vizData.description}</p>
                    )}
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
                      <p className="text-blue-700 dark:text-blue-300 font-medium">📊 Chart Visualization Available</p>
                      <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                        Chart data has been generated but rendering is temporarily disabled.
                      </p>
                    </div>
                  </div>
                </div>
              );
            }

            // LEGACY: Old iframe approach for backward compatibility
            if (vizData.config) {
              // 使用useMemo缓存可视化内容，只有数据变化时才重新生成
              const stableVizId = `adk_viz_${event.id || 'default'}`;

              const cachedVisualization = useMemo(() => {
                // 生成HTML（只有当数据真正变化时才重新计算）
                const htmlOutput = JSVisualizationEngine.generateChartJSHTML(
                  vizData.config.data,
                  vizData.config.spec,
                  stableVizId
                );

                return {
                  htmlOutput,
                  metadata: {
                    library: 'chart-js',
                    dataPoints: vizData.config.data.length,
                    renderTime: '< 1 second',
                    generatedAt: vizData.metadata?.generatedAt || new Date().toISOString()
                  }
                };
              }, [JSON.stringify(vizData.config.data), vizData.config.spec.type, stableVizId]);

              return (
                <div className="mb-2">
                  <JSVisualizationMessage
                    id={stableVizId}
                    title={vizData.title}
                    description={vizData.description}
                    cachedHtml={cachedVisualization.htmlOutput}
                    metadata={cachedVisualization.metadata}
                  />
                </div>
              );
            }
          }
        } catch (error) {
          console.warn('Failed to parse visualization result:', error);
        }
      }

      // 对于web_search工具，使用专门的WebSearchResultCard
      if (event.toolName === 'web_search' && event.toolResult) {
        try {
          const searchData = typeof event.toolResult === 'string'
            ? JSON.parse(event.toolResult)
            : event.toolResult;

          // 检查是否有搜索结果数据
          if (searchData.content || searchData.citations) {
            // 构造WebSearchResultCard需要的数据格式
            const query = event.toolArgs?.query || 'Search results';
            const results = [];

            // 如果有citations，转换为结果格式
            if (searchData.citations && Array.isArray(searchData.citations)) {
              results.push(...searchData.citations.map((url: string) => ({
                title: new URL(url).hostname,
                url: url,
                snippet: '',
                source: new URL(url).hostname
              })));
            }

            return (
              <div className="mb-2">
                <WebSearchResultCard
                  query={query}
                  results={results}
                  summary={searchData.content || searchData.summary}
                />
              </div>
            );
          }
        } catch (error) {
          console.warn('Failed to parse web search result:', error);
        }
      }

      // 其他工具或解析失败时使用通用显示
      return (
        <div className="mb-2">
          <ToolStatus
            name={event.toolName || 'unknown'}
            status="completed"
            displayAction={event.content}
            formattedData={event.toolResult}
          />
        </div>
      );

    default:
      return null;
  }
};

// 简化的 Message 组件 - 基于 invocation
interface SimpleMessageProps {
  invocationId: string;
  events: SimpleEvent[];
  timestamp: string;
}

export const SimpleMessage = ({ invocationId, events, timestamp }: SimpleMessageProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="w-full max-w-4xl mx-auto mb-6"
    >
      {/* Invocation Header */}
      <div className="text-xs text-gray-500 dark:text-gray-400 mb-2 px-2">
        Invocation: {invocationId} • {new Date(timestamp).toLocaleTimeString()}
      </div>

      {/* Events Container */}
      <div className="space-y-1">
        {events.map((event, index) => (
          <EventComponent key={`${event.id}-${index}`} event={event} />
        ))}
      </div>
    </motion.div>
  );
};

// 简化的消息类型定义
interface SimpleMessageData {
  id: string;
  role: 'user' | 'assistant' | 'tool';
  content: string;
  tool_name?: string;
  tool_args?: any;
  tool_result?: any;
  timestamp: string;
}


// 简化的 Messages 容器
interface SimpleMessagesProps {
  messages: SimpleMessageData[];
  onSuggestionClick?: (suggestion: string) => void;
  endRef?: React.RefObject<HTMLDivElement>;
}

export const SimpleMessages = forwardRef<HTMLDivElement, SimpleMessagesProps>(
  ({ messages, onSuggestionClick, endRef }, ref) => {
    return (
      <div
        ref={ref}
        className="flex flex-col min-w-0 max-w-full gap-2 h-full overflow-y-auto overflow-x-hidden pt-4 pb-24 px-4 md:px-6 custom-scrollbar relative"
      >
      {messages.length === 0 && (
        <div className="text-center text-gray-500 dark:text-gray-400 py-8">
          开始对话...
        </div>
      )}

      {messages.map((message, index) => {

        return (
          <motion.div
            key={message.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="w-full max-w-4xl mx-auto mb-2"
          >
            <div>
              <EventComponent event={{
                id: message.id,
                type: message.role === 'user' ? 'user_message' :
                      message.role === 'assistant' ? 'assistant_text' :
                      message.role === 'tool' && message.tool_result ? 'tool_response' :
                      'tool_call',
                content: message.content,
                toolName: message.tool_name,
                toolArgs: message.tool_args,
                toolResult: message.tool_result,
                timestamp: message.timestamp
              }} />
            </div>
          </motion.div>
        );
      })}

        {/* Scroll target for detecting bottom */}
        {endRef && <div ref={endRef} className="h-1" />}
      </div>
    );
  }
);