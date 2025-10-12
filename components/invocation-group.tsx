'use client';

import { PreviewMessage } from './message';
import { ToolStatusList } from './tool-status';
import { JSVisualizationMessage } from './js-visualization-message';
import type { MessageInvocation } from '@/lib/types';

/**
 * JS Visualization Engine - Generate HTML for Chart.js visualizations
 */
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

/**
 * Invocation Group Component
 * Groups user message, tool executions, and assistant response together
 * Ultra-clean 2025 design with minimal styling
 */
export function InvocationGroup({ invocation }: InvocationGroupProps) {
  const { userMessage, assistantMessage, toolMessages } = invocation;

  // Separate special tools from normal tools
  const specialTools = ['create_visualization'];
  const specialToolMessages = toolMessages.filter((toolMsg) =>
    specialTools.includes((toolMsg as any).tool_name?.toLowerCase() || '')
  );
  const normalToolMessages = toolMessages.filter(
    (toolMsg) => !specialTools.includes((toolMsg as any).tool_name?.toLowerCase() || '')
  );

  // Convert normal tools to ToolStatus format, deduplicate by name
  const uniqueTools = new Map<string, any>();

  normalToolMessages.forEach((toolMsg) => {
    const toolName = (toolMsg as any).tool_name || 'Unknown Tool';
    if (!uniqueTools.has(toolName)) {
      uniqueTools.set(toolName, {
        name: toolName,
        status: 'completed' as const,
        displayAction: undefined,
        displayResult: toolMsg.content || 'Tool completed',
      });
    }
  });

  const toolStatuses = Array.from(uniqueTools.values());

  return (
    <div className="invocation-group mb-6 space-y-4">
      {/* User Message */}
      {userMessage && (
        <PreviewMessage
          message={userMessage}
          isLoading={false}
          isLatest={false}
          setMessages={() => {}}
          regenerate={() => {}}
          isReadonly={false}
          requiresScrollPadding={false}
        />
      )}

      {/* Tool Area: Special tools and normal tools */}
      {(specialToolMessages.length > 0 || toolStatuses.length > 0) && (
        <div className="space-y-4">
          {/* Special tool rendering */}
          {specialToolMessages.map((toolMsg, index) => {
            const toolName = (toolMsg as any).tool_name?.toLowerCase();

            if (toolName === 'create_visualization') {
              // Use JSVisualizationMessage to render visualization
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
                hasCachedHtml: !!parsedResult?.cachedHtml,
              });

              // Generate HTML if chartjsConfig exists
              if (parsedResult && parsedResult.chartjsConfig) {
                const vizId = `viz-${toolMsg.id}`;
                const cachedHtml = JSVisualizationEngine.generateChartJSHTML(
                  [], // data array not needed for Chart.js config
                  parsedResult.chartjsConfig,
                  vizId
                );

                return (
                  <div key={`special-${toolMsg.id}-${index}`}>
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

          {/* Normal tools - horizontal display */}
          {toolStatuses.length > 0 && <ToolStatusList tools={toolStatuses} />}
        </div>
      )}

      {/* Assistant Response */}
      {assistantMessage && (
        <PreviewMessage
          message={assistantMessage}
          isLoading={false}
          isLatest={false}
          setMessages={() => {}}
          regenerate={() => {}}
          isReadonly={false}
          requiresScrollPadding={false}
        />
      )}
    </div>
  );
}
