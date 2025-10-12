'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

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

  // Generate stable iframe key based on content to prevent unnecessary re-renders
  const iframeKey = `js-viz-iframe-${id}`;

  console.log(`🎨 Rendering JSVisualizationMessage:`, {
    id,
    title,
    iframeKey,
    htmlLength: cachedHtml?.length,
    metadata
  });

  return (
    <div className="my-3 bg-card border border-border rounded-lg overflow-hidden">
      {/* Header with expand/collapse */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-3 p-4 text-left transition-colors hover:bg-brand-primary/10 group"
      >
        <div className="flex-shrink-0 transition-colors group-hover:text-brand-primary">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-semibold text-foreground truncate">
              {title}
            </h3>
          </div>

          {description && (
            <p className="text-xs text-muted-foreground line-clamp-1">
              {description}
            </p>
          )}
        </div>

        {metadata && (
          <div className="flex-shrink-0 flex items-center gap-2 text-xs text-muted-foreground">
            {metadata.library && (
              <span className="hidden sm:inline">{metadata.library}</span>
            )}
            {metadata.dataPoints && (
              <span className="hidden md:inline">{metadata.dataPoints} points</span>
            )}
            {metadata.renderTime && (
              <span className="hidden lg:inline">{metadata.renderTime}</span>
            )}
          </div>
        )}
      </button>

      {/* Visualization content */}
      <div
        className={cn(
          'overflow-hidden transition-all duration-300 ease-in-out',
          isExpanded ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'
        )}
      >
        {cachedHtml ? (
          <div
            className="w-full min-h-[500px] max-h-[700px] bg-white border-t border-border overflow-auto"
            key={`container-${iframeKey}`}
          >
            <iframe
              key={iframeKey}
              srcDoc={cachedHtml}
              className="w-full min-h-[500px] border-0"
              title={`Interactive Chart - ${title}`}
              sandbox="allow-scripts allow-same-origin"
              style={{ height: '100%' }}
              name={`viz-frame-${id}`}
            />
          </div>
        ) : (
          <div className="p-8 text-center border-t border-border">
            <p className="text-sm text-muted-foreground">
              No visualization data available
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
