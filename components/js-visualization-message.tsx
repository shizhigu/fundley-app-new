'use client';

import { useState } from 'react';
import { ChevronDownIcon, ChevronRightIcon } from '@radix-ui/react-icons';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';

interface JSVisualizationMessageProps {
  id: string;
  title: string;
  description?: string;
  cachedHtml: string;
  metadata?: {
    library?: string;
    dataPoints?: number;
    renderTime?: string;
    generatedAt?: string;
  };
}

export function JSVisualizationMessage({
  id,
  title,
  description,
  cachedHtml,
  metadata
}: JSVisualizationMessageProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  // Generate unique iframe key to ensure independent rendering
  const iframeKey = `js-viz-${id}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

  console.log(`🎨 Rendering JSVisualizationMessage:`, {
    id,
    title,
    iframeKey,
    htmlLength: cachedHtml?.length,
    metadata
  });

  return (
    <div className="my-2 border rounded-lg overflow-hidden bg-background">
      <Button
        variant="ghost"
        size="sm"
        className="w-full justify-start p-3 hover:bg-muted/50"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {isExpanded ? (
          <ChevronDownIcon className="mr-2 h-4 w-4" />
        ) : (
          <ChevronRightIcon className="mr-2 h-4 w-4" />
        )}
        <span className="text-sm font-medium">
          📊 {title}
        </span>
        {description && (
          <span className="ml-2 text-xs text-muted-foreground">
            {description}
          </span>
        )}
        {metadata && (
          <span className="ml-auto text-xs text-muted-foreground">
            {metadata.library} • {metadata.dataPoints} points • {metadata.renderTime}
          </span>
        )}
      </Button>

      <div
        className={cn(
          'overflow-hidden transition-all duration-200',
          isExpanded ? 'max-h-[800px]' : 'max-h-0'
        )}
      >
        {cachedHtml ? (
          <div className="w-full min-h-[500px] max-h-[700px] bg-white overflow-auto">
            <iframe
              key={iframeKey}
              srcDoc={cachedHtml}
              className="w-full min-h-[500px] border-0"
              title={`Interactive Chart - ${title}`}
              sandbox="allow-scripts"
              style={{ height: '100%' }}
            />
          </div>
        ) : (
          <div className="p-4 text-red-500 text-sm text-center">
            ❌ No visualization data available
          </div>
        )}
      </div>
    </div>
  );
}