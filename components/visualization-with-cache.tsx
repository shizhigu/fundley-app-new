import { getVisualizationCacheByMessageId } from '@/lib/db/queries';
import { VisualizationMessage } from './visualization-message';

interface VisualizationWithCacheProps {
  messageId: string;
  vizId: string;
  title: string;
  code: string;
  description?: string;
}

export async function VisualizationWithCache({
  messageId,
  vizId,
  title,
  code,
  description,
}: VisualizationWithCacheProps) {
  // Server-side: fetch cache from database
  const cache = await getVisualizationCacheByMessageId(messageId);
  
  return (
    <VisualizationMessage
      id={vizId}
      messageId={messageId}
      title={title}
      code={code}
      description={description}
      cachedHtml={cache?.htmlContent || undefined}
      cachedImage={cache?.imageUrl || undefined}
    />
  );
}