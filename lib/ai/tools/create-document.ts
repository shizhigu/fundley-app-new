import { generateUUID } from '@/lib/utils';
import { tool, type UIMessageStreamWriter } from 'ai';
import { z } from 'zod';
import type { AuthSession } from '@/lib/auth/clerk';
import {
  artifactKinds,
  documentHandlersByArtifactKind,
} from '@/lib/artifacts/server';
import type { ChatMessage } from '@/lib/types';

interface CreateDocumentProps {
  session: AuthSession;
  dataStream: UIMessageStreamWriter<ChatMessage>;
}

export const createDocument = ({ session, dataStream }: CreateDocumentProps) =>
  tool({
    description:
      'Create a document for a writing or content creation activities. Pass all relevant context, data, and instructions to the document handler for proper generation.',
    inputSchema: z.object({
      title: z.string().describe('Document title'),
      kind: z.enum(artifactKinds).describe('Type of document to create'),
      context: z.string().optional().describe('Full context including any data, analysis results, or specific requirements'),
      data: z.any().optional().describe('Structured data to include (e.g., financial data, comparisons, metrics)'),
      instructions: z.string().optional().describe('Specific instructions for how to format or present the content'),
    }),
    execute: async ({ title, kind, context, data, instructions }) => {
      const id = generateUUID();

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

      const documentHandler = documentHandlersByArtifactKind.find(
        (documentHandlerByArtifactKind) =>
          documentHandlerByArtifactKind.kind === kind,
      );

      if (!documentHandler) {
        throw new Error(`No document handler found for kind: ${kind}`);
      }

      await documentHandler.onCreateDocument({
        id,
        title,
        context,
        data,
        instructions,
        dataStream,
        session,
      });

      dataStream.write({ type: 'data-finish', data: null, transient: true });

      return {
        id,
        title,
        kind,
        content: 'A document was created and is now visible to the user.',
        // This will be saved in the message parts and persist across sessions
        documentMetadata: {
          id,
          title,
          kind,
          createdAt: new Date().toISOString()
        }
      };
    },
  });
