import { smoothStream, streamText } from 'ai';
import { myProvider } from '@/lib/ai/providers';
import { createDocumentHandler } from '@/lib/artifacts/server';
import { updateDocumentPrompt } from '@/lib/ai/prompts';

export const textDocumentHandler = createDocumentHandler<'text'>({
  kind: 'text',
  onCreateDocument: async ({ title, context, data, instructions, dataStream }) => {
    let draftContent = '';

    // Build comprehensive prompt with all context
    const prompt = `Title: ${title}
${context ? `\nContext:\n${context}` : ''}
${data ? `\nData:\n${typeof data === 'string' ? data : JSON.stringify(data, null, 2)}` : ''}
${instructions ? `\nInstructions:\n${instructions}` : ''}`;

    const { fullStream } = streamText({
      model: myProvider.languageModel('artifact-model'),
      system:
        'Write a comprehensive document based on the provided information. Use all context, data, and instructions to create a complete and well-structured document. Markdown is supported. Use headings wherever appropriate.',
      experimental_transform: smoothStream({ chunking: 'word' }),
      prompt,
    });

    for await (const delta of fullStream) {
      const { type } = delta;

      if (type === 'text') {
        const { text } = delta;

        draftContent += text;

        dataStream.write({
          type: 'data-textDelta',
          data: text,
          transient: true,
        });
      }
    }

    return draftContent;
  },
  onUpdateDocument: async ({ document, description, context, data, dataStream }) => {
    let draftContent = '';

    // Build comprehensive update prompt
    const prompt = `Update request: ${description}
${context ? `\nAdditional Context:\n${context}` : ''}
${data ? `\nNew Data:\n${typeof data === 'string' ? data : JSON.stringify(data, null, 2)}` : ''}`;

    const { fullStream } = streamText({
      model: myProvider.languageModel('artifact-model'),
      system: updateDocumentPrompt(document.content, 'text'),
      experimental_transform: smoothStream({ chunking: 'word' }),
      prompt,
      providerOptions: {
        openai: {
          prediction: {
            type: 'content',
            content: document.content,
          },
        },
      },
    });

    for await (const delta of fullStream) {
      const { type } = delta;

      if (type === 'text') {
        const { text } = delta;

        draftContent += text;

        dataStream.write({
          type: 'data-textDelta',
          data: text,
          transient: true,
        });
      }
    }

    return draftContent;
  },
});
