import { myProvider } from '@/lib/ai/providers';
import { createDocumentHandler } from '@/lib/artifacts/server';
import { streamObject } from 'ai';
import { z } from 'zod';

export const sheetDocumentHandler = createDocumentHandler<'sheet'>({
  kind: 'sheet',
  onCreateDocument: async ({ title, context, data, instructions, dataStream }) => {
    let draftContent = '';

    // Build comprehensive prompt with all context
    const prompt = `Create a spreadsheet for: ${title}
${context ? `\nContext and Analysis:\n${context}` : ''}
${data ? `\nSource Data:\n${typeof data === 'string' ? data : JSON.stringify(data, null, 2)}` : ''}
${instructions ? `\nSpecific Requirements:\n${instructions}` : ''}

Create a well-structured CSV with appropriate headers and data rows. If financial data is provided, ensure all values are properly formatted and organized.`;

    const { fullStream } = streamObject({
      model: myProvider.languageModel('artifact-model'),
      system: 'You are a spreadsheet creation expert. Create well-structured CSV data based on the provided information. Include all relevant data, ensure proper formatting, and organize information logically. For financial data, include proper headers and format numbers appropriately.',
      prompt,
      schema: z.object({
        csv: z.string().describe('Well-formatted CSV data with headers and rows'),
      }),
    });

    for await (const delta of fullStream) {
      const { type } = delta;

      if (type === 'object') {
        const { object } = delta;
        const { csv } = object;

        if (csv) {
          dataStream.write({
            type: 'data-sheetDelta',
            data: csv,
            transient: true,
          });

          draftContent = csv;
        }
      }
    }

    dataStream.write({
      type: 'data-sheetDelta',
      data: draftContent,
      transient: true,
    });

    return draftContent;
  },
  onUpdateDocument: async ({ document, description, context, data, dataStream }) => {
    let draftContent = '';

    // Build comprehensive update prompt
    const prompt = `Update the spreadsheet: ${description}
${context ? `\nAdditional Context:\n${context}` : ''}
${data ? `\nNew Data to Incorporate:\n${typeof data === 'string' ? data : JSON.stringify(data, null, 2)}` : ''}

Current spreadsheet content:
${document.content}`;

    const { fullStream } = streamObject({
      model: myProvider.languageModel('artifact-model'),
      system: 'Update the spreadsheet based on the request. Maintain data consistency and proper CSV formatting.',
      prompt,
      schema: z.object({
        csv: z.string().describe('Updated CSV data'),
      }),
    });

    for await (const delta of fullStream) {
      const { type } = delta;

      if (type === 'object') {
        const { object } = delta;
        const { csv } = object;

        if (csv) {
          dataStream.write({
            type: 'data-sheetDelta',
            data: csv,
            transient: true,
          });

          draftContent = csv;
        }
      }
    }

    return draftContent;
  },
});
