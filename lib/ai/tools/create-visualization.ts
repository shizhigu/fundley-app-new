import { z } from 'zod';
import { tool, type UIMessageStreamWriter } from 'ai';
import type { AuthSession } from '@/lib/auth/clerk';
import type { ChatMessage } from '@/lib/types';
import { generateUUID } from '@/lib/utils';

interface CreateVisualizationProps {
  session: AuthSession | null;
  dataStream: UIMessageStreamWriter<ChatMessage>;
}

export const createVisualization = ({ session, dataStream }: CreateVisualizationProps) =>
  tool({
    description: 'Create and execute Python code for data visualization. The chart will be displayed directly in the chat.',
    inputSchema: z.object({
      title: z.string().describe('Title of the visualization'),
      code: z.string().describe('Python code using plotly or matplotlib for visualization'),
      description: z.string().optional().describe('Description of what the visualization shows'),
    }),
    execute: async ({ title, code, description }) => {
      try {
        // Generate a unique ID for this visualization
        const vizId = generateUUID();
        
        // Return the visualization data that will be rendered in the message
        // This will be saved in message.parts when the message is persisted
        return {
          id: vizId,
          title,
          code,
          description: description || 'Interactive visualization',
          type: 'visualization',
          status: 'created',
          // These will be populated by the client after execution
          cachedHtml: null,
          cachedImage: null,
        };
      } catch (error: any) {
        return {
          error: error.message || 'Failed to create visualization',
        };
      }
    },
  });