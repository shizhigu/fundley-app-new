import { codeDocumentHandler } from '@/artifacts/code/server';
import { sheetDocumentHandler } from '@/artifacts/sheet/server';
import { textDocumentHandler } from '@/artifacts/text/server';
import type { ArtifactKind } from '@/components/artifact';
import type { Document } from '../db/schema';
import { convexQueries } from '../convex/client';
import type { AuthSession } from '@/lib/auth/clerk';
import type { UIMessageStreamWriter } from 'ai';
import type { ChatMessage } from '../types';

export interface SaveDocumentProps {
  id: string;
  title: string;
  kind: ArtifactKind;
  content: string;
  userId: string;
}

export interface CreateDocumentCallbackProps {
  id: string;
  title: string;
  context?: string;
  data?: any;
  instructions?: string;
  dataStream: UIMessageStreamWriter<ChatMessage>;
  session: AuthSession;
}

export interface UpdateDocumentCallbackProps {
  document: Document;
  description: string;
  context?: string;
  data?: any;
  dataStream: UIMessageStreamWriter<ChatMessage>;
  session: AuthSession;
}

export interface DocumentHandler<T = ArtifactKind> {
  kind: T;
  onCreateDocument: (args: CreateDocumentCallbackProps) => Promise<void>;
  onUpdateDocument: (args: UpdateDocumentCallbackProps) => Promise<void>;
}

export function createDocumentHandler<T extends ArtifactKind>(config: {
  kind: T;
  onCreateDocument: (params: CreateDocumentCallbackProps) => Promise<string>;
  onUpdateDocument: (params: UpdateDocumentCallbackProps) => Promise<string>;
}): DocumentHandler<T> {
  return {
    kind: config.kind,
    onCreateDocument: async (args: CreateDocumentCallbackProps) => {
      const draftContent = await config.onCreateDocument({
        id: args.id,
        title: args.title,
        context: args.context,
        data: args.data,
        instructions: args.instructions,
        dataStream: args.dataStream,
        session: args.session,
      });

      if (args.session?.user?.id) {
        await convexQueries.saveDocument({
          title: args.title,
          content: draftContent,
          kind: config.kind,
          userId: args.session.user.id,
        });
      }

      return;
    },
    onUpdateDocument: async (args: UpdateDocumentCallbackProps) => {
      const draftContent = await config.onUpdateDocument({
        document: args.document,
        description: args.description,
        context: args.context,
        data: args.data,
        dataStream: args.dataStream,
        session: args.session,
      });

      if (args.session?.user?.id) {
        await convexQueries.updateDocumentById(
          { id: args.document.id },
          {
            title: args.document.title,
            content: draftContent,
          }
        );
      }

      return;
    },
  };
}

/*
 * Use this array to define the document handlers for each artifact kind.
 * Image handler is commented out but kept for future use.
 */
export const documentHandlersByArtifactKind: Array<DocumentHandler> = [
  textDocumentHandler,
  codeDocumentHandler,
  // imageDocumentHandler, // Disabled but kept for future
  sheetDocumentHandler,
];

// Available artifact kinds - image is disabled but implementation kept for future use
export const artifactKinds = ['text', 'code', 'sheet'] as const;
// export const allArtifactKinds = ['text', 'code', 'image', 'sheet'] as const; // Full list for future
