// Disabled image functionality - placeholder implementation
import { createDocumentHandler } from '@/lib/artifacts/server';

export const imageDocumentHandler = createDocumentHandler<'image'>({
  kind: 'image',
  onCreateDocument: async ({ title, dataStream }) => {
    // Image generation disabled
    const placeholderContent = 'Image generation is currently disabled';
    
    dataStream.write({
      type: 'data-imageDelta',
      data: placeholderContent,
      transient: true,
    });

    return placeholderContent;
  },
  onUpdateDocument: async ({ description, dataStream }) => {
    // Image generation disabled
    const placeholderContent = 'Image generation is currently disabled';
    
    dataStream.write({
      type: 'data-imageDelta',
      data: placeholderContent,
      transient: true,
    });

    return placeholderContent;
  },
});
