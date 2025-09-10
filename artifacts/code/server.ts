import { z } from 'zod';
import { streamObject } from 'ai';
import { artifactModel } from '@/lib/ai/providers';
import { codePrompt } from '@/lib/ai/prompts';
import { createDocumentHandler } from '@/lib/artifacts/server';

export const codeDocumentHandler = createDocumentHandler<'code'>({
  kind: 'code',
  onCreateDocument: async ({ title, context, data, instructions, dataStream }) => {
    let draftContent = '';

    // Build comprehensive prompt with all context
    const prompt = `Create code for: ${title}
${context ? `\nContext:\n${context}` : ''}
${data ? `\nData to process:\n${typeof data === 'string' ? data : JSON.stringify(data, null, 2)}` : ''}
${instructions ? `\nSpecific Requirements:\n${instructions}` : ''}`;

    const { fullStream } = streamObject({
      model: artifactModel,
      system: codePrompt,
      prompt,
      schema: z.object({
        code: z.string().describe('Complete, runnable code'),
      }),
    });

    for await (const delta of fullStream) {
      const { type } = delta;

      if (type === 'object') {
        const { object } = delta;
        const { code } = object;

        if (code) {
          dataStream.write({
            type: 'data-codeDelta',
            data: code ?? '',
            transient: true,
          });

          draftContent = code;
        }
      }
    }

    return draftContent;
  },
  onUpdateDocument: async ({ document, description, dataStream }) => {
    let draftContent = '';

    const { fullStream } = streamObject({
      model: artifactModel,
      system: `Improve the following code snippet based on the given prompt.\n\n${document.content}`,
      prompt: description,
      schema: z.object({
        code: z.string(),
      }),
    });

    for await (const delta of fullStream) {
      const { type } = delta;

      if (type === 'object') {
        const { object } = delta;
        const { code } = object;

        if (code) {
          dataStream.write({
            type: 'data-codeDelta',
            data: code ?? '',
            transient: true,
          });

          draftContent = code;
        }
      }
    }

    return draftContent;
  },
});
