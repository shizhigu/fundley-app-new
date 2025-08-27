import { generateUUID } from '@/lib/utils';
import { tool, type UIMessageStreamWriter } from 'ai';
import { z } from 'zod';
import type { Session } from '@/lib/auth/clerk';
import { saveDocument } from '@/lib/db/queries';
import type { ChatMessage } from '@/lib/types';

interface CreateDocumentWithDataProps {
  session: Session;
  dataStream: UIMessageStreamWriter<ChatMessage>;
}

/**
 * Enhanced document creation tool that accepts initial CSV data
 * This is specifically designed for creating spreadsheets with pre-existing data
 * like financial reports, comparison tables, etc.
 */
export const createDocumentWithData = ({ session, dataStream }: CreateDocumentWithDataProps) =>
  tool({
    description:
      'Create a spreadsheet document with pre-existing CSV data. Use this when you already have structured data to display in a table format.',
    inputSchema: z.object({
      title: z.string().describe('Title of the document'),
      csvData: z.string().describe('CSV formatted data with headers and rows'),
    }),
    execute: async ({ title, csvData }) => {
      const id = generateUUID();
      const kind = 'sheet' as const;

      try {
        // Save the document to database FIRST before streaming
        // This ensures the document is persisted even if the UI is closed
        if (session?.user?.id) {
          await saveDocument({
            id,
            title,
            content: csvData,
            kind,
            userId: session.user.id,
          });
        }

        // Send metadata to UI for display
        dataStream.write({
          type: 'data-kind',
          data: kind,
          transient: true,
        });

        dataStream.write({
          type: 'data-id',
          data: id,
          transient: true,
        });

        dataStream.write({
          type: 'data-title',
          data: title,
          transient: true,
        });

        dataStream.write({
          type: 'data-clear',
          data: null,
          transient: true,
        });

        // Send the CSV data directly to the UI
        dataStream.write({
          type: 'data-sheetDelta',
          data: csvData,
          transient: true,
        });

        dataStream.write({ type: 'data-finish', data: null, transient: true });

        // Return structured data that will be saved in message parts
        return {
          id,
          title,
          kind,
          content: csvData, // Return the actual CSV data
          success: true,
          message: `Spreadsheet "${title}" created successfully with ${csvData.split('\n').length - 1} rows of data.`,
          // This will be saved in the message parts and persist across sessions
          documentMetadata: {
            id,
            title,
            kind,
            createdAt: new Date().toISOString(),
            rowCount: csvData.split('\n').length - 1
          }
        };
      } catch (error) {
        console.error('Error creating document with data:', error);
        
        // Still try to show in UI even if save failed
        dataStream.write({
          type: 'data-error',
          data: 'Failed to save document, but displaying data',
          transient: true,
        });
        
        return {
          id,
          title,
          kind,
          content: csvData,
          success: false,
          message: `Document displayed but not saved: ${error instanceof Error ? error.message : 'Unknown error'}`,
        };
      }
    },
  });