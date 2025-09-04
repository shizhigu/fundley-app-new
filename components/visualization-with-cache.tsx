
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
  // TODO: Re-implement visualization cache with Convex
  const cache: { htmlContent?: string; imageUrl?: string } | null = null; // await convexQueries.getVisualizationCacheByMessageId(messageId);
  
  return (
    <VisualizationMessage
      id={vizId}
      messageId={messageId}
      title={title}
      code={code}
      description={description}
      cachedHtml={undefined}
      cachedImage={undefined}
    />
  );
}