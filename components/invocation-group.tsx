'use client';

import React from 'react';
import { PreviewMessage } from './message';
import { ToolStatusList } from './tool-status';
import { JSVisualizationMessage } from './js-visualization-message';
import type { MessageInvocation } from '@/lib/types';

// Import JSVisualizationEngine for generating HTML
class JSVisualizationEngine {
  static generateChartJSHTML(data: any[], chartjsConfig: any, vizId: string = 'default'): string {
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
    const ctx = document.getElementById('chart-${vizId}').getContext('2d');
    const config = ${JSON.stringify(chartjsConfig)};
    new Chart(ctx, config);
  </script>
</body>
</html>`;
  }
}

interface InvocationGroupProps {
  invocation: MessageInvocation;
}

export function InvocationGroup({ invocation }: InvocationGroupProps) {
  const { userMessage, assistantMessage, toolMessages } = invocation;

  // 分离特殊工具和普通工具 - 只有 create_visualization 是特殊工具
  const specialTools = ['create_visualization'];
  const specialToolMessages = toolMessages.filter(toolMsg =>
    specialTools.includes((toolMsg as any).tool_name?.toLowerCase() || '')
  );
  const normalToolMessages = toolMessages.filter(toolMsg =>
    !specialTools.includes((toolMsg as any).tool_name?.toLowerCase() || '')
  );

  // 普通工具转换为ToolStatus格式，去重相同名称的工具
  const uniqueTools = new Map<string, any>();

  normalToolMessages.forEach(toolMsg => {
    const toolName = (toolMsg as any).tool_name || 'Unknown Tool';
    if (!uniqueTools.has(toolName)) {
      uniqueTools.set(toolName, {
        name: toolName,
        status: 'completed' as const,
        displayAction: undefined,
        displayResult: toolMsg.content || 'Tool completed'
      });
    }
  });

  const toolStatuses = Array.from(uniqueTools.values());

  return (
    <div className="invocation-group mb-6">
      {/* 用户消息 */}
      {userMessage && (
        <PreviewMessage
          message={userMessage}
          isLoading={false}
          isLatest={false}
          vote={undefined}
          setMessages={() => {}}
          regenerate={() => {}}
          isReadonly={false}
          requiresScrollPadding={false}
        />
      )}

      {/* 工具区域：特殊工具和普通工具 */}
      {(specialToolMessages.length > 0 || toolStatuses.length > 0) && (
        <div className="my-4">
          {/* 特殊工具专属渲染 */}
          {specialToolMessages.map((toolMsg, index) => {
            const toolName = (toolMsg as any).tool_name?.toLowerCase();

            if (toolName === 'create_visualization') {
              // 使用JSVisualizationMessage渲染可视化
              const toolResult = (toolMsg as any).tool_result;
              let parsedResult;
              try {
                parsedResult = typeof toolResult === 'string' ? JSON.parse(toolResult) : toolResult;
              } catch (e) {
                parsedResult = toolResult;
              }

              console.log('🔍 create_visualization tool result:', {
                toolMsg,
                toolResult,
                parsedResult,
                hasType: parsedResult?.type,
                hasCachedHtml: !!parsedResult?.cachedHtml
              });

              // 生成HTML如果有chartjsConfig
              if (parsedResult && parsedResult.chartjsConfig) {
                const vizId = `viz-${toolMsg.id}`;
                const cachedHtml = JSVisualizationEngine.generateChartJSHTML(
                  [], // data array not needed for Chart.js config
                  parsedResult.chartjsConfig,
                  vizId
                );

                return (
                  <div key={`special-${toolMsg.id}-${index}`} className="mb-4">
                    <JSVisualizationMessage
                      id={vizId}
                      title={parsedResult.title || 'Data Visualization'}
                      description={parsedResult.description}
                      cachedHtml={cachedHtml}
                      metadata={parsedResult.metadata || {}}
                    />
                  </div>
                );
              }
            }


            return null;
          })}

          {/* 普通工具横排显示 */}
          {toolStatuses.length > 0 && (
            <ToolStatusList tools={toolStatuses} />
          )}
        </div>
      )}

      {/* 助手回复 */}
      {assistantMessage && (
        <PreviewMessage
          message={assistantMessage}
          isLoading={false}
          isLatest={false}
          vote={undefined}
          setMessages={() => {}}
          regenerate={() => {}}
          isReadonly={false}
          requiresScrollPadding={false}
        />
      )}
    </div>
  );
}