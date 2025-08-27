import { z } from 'zod';
import { tool } from 'ai';

export const executeVisualization = tool({
  description: 'Execute Python code that generates visualizations and return the results',
  parameters: z.object({
    code: z.string().describe('Python code to execute'),
    title: z.string().optional().describe('Title for the visualization'),
  }),
  execute: async ({ code, title }) => {
    try {
      // This will be executed on the client side via data stream
      // The actual execution happens in the browser with Pyodide
      return {
        type: 'visualization-request',
        code,
        title: title || 'Visualization',
        timestamp: Date.now(),
      };
    } catch (error: any) {
      return {
        error: error.message || 'Failed to execute visualization',
      };
    }
  },
});