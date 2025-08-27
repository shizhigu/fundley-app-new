'use client';

import { useState } from 'react';
import { ChevronDownIcon, ChevronRightIcon } from '@radix-ui/react-icons';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';

export interface VisualizationData {
  type: 'plotly' | 'matplotlib';
  html?: string;
  imageUrl?: string;
  title?: string;
}

interface InlineVisualizationProps {
  data: VisualizationData;
  defaultExpanded?: boolean;
}

export function InlineVisualization({ 
  data, 
  defaultExpanded = true 
}: InlineVisualizationProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

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
          📊 {data.title || 'Visualization'}
        </span>
        <span className="ml-2 text-xs text-muted-foreground">
          ({data.type === 'plotly' ? 'Interactive' : 'Static'})
        </span>
      </Button>
      
      <div
        className={cn(
          'overflow-hidden transition-all duration-200',
          isExpanded ? 'max-h-[600px]' : 'max-h-0'
        )}
      >
        {data.type === 'plotly' && data.html ? (
          <div className="w-full h-[500px] bg-white">
            <iframe
              srcDoc={data.html}
              className="w-full h-full border-0"
              title="Interactive Chart"
              sandbox="allow-scripts"
            />
          </div>
        ) : data.type === 'matplotlib' && data.imageUrl ? (
          <div className="p-4 bg-white">
            <img
              src={data.imageUrl}
              alt="Chart"
              className="max-w-full h-auto mx-auto"
            />
          </div>
        ) : (
          <div className="p-4 text-muted-foreground text-sm">
            No visualization data available
          </div>
        )}
      </div>
    </div>
  );
}