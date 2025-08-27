'use client';

import { memo, useState } from 'react';
import { cn } from '@/lib/utils';
import { 
  FileTextIcon, 
  TableIcon, 
  CodeIcon, 
  ImageIcon,
  ExternalLinkIcon,
  ChevronRightIcon,
  FileSpreadsheetIcon
} from 'lucide-react';
import { useArtifact } from '@/hooks/use-artifact';
import type { Document } from '@/lib/db/schema';
import { Button } from './ui/button';
import useSWR from 'swr';
import { fetcher } from '@/lib/utils';

interface DocumentMessageProps {
  documentId: string;
  title: string;
  kind: 'text' | 'code' | 'sheet' | 'image';
  preview?: string;
  createdAt?: Date;
}

const kindConfig = {
  text: {
    icon: FileTextIcon,
    label: 'Document',
    glowColor: 'shadow-blue-500/20',
    borderGradient: 'from-blue-400/50 to-cyan-400/50',
    iconColor: 'text-blue-500 dark:text-blue-400'
  },
  code: {
    icon: CodeIcon,
    label: 'Code',
    glowColor: 'shadow-purple-500/20',
    borderGradient: 'from-purple-400/50 to-pink-400/50',
    iconColor: 'text-purple-500 dark:text-purple-400'
  },
  sheet: {
    icon: FileSpreadsheetIcon,
    label: 'Spreadsheet',
    glowColor: 'shadow-emerald-500/20',
    borderGradient: 'from-emerald-400/50 to-teal-400/50',
    iconColor: 'text-emerald-500 dark:text-emerald-400'
  },
  image: {
    icon: ImageIcon,
    label: 'Image',
    glowColor: 'shadow-amber-500/20',
    borderGradient: 'from-amber-400/50 to-orange-400/50',
    iconColor: 'text-amber-500 dark:text-amber-400'
  }
};

export const DocumentMessage = memo(function DocumentMessage({
  documentId,
  title,
  kind,
  preview,
  createdAt
}: DocumentMessageProps) {
  const { setArtifact } = useArtifact();
  const [isLoading, setIsLoading] = useState(false);
  
  const config = kindConfig[kind];
  const Icon = config.icon;

  // Fetch document data when needed
  const { data: documents } = useSWR<Document[]>(
    isLoading ? `/api/document?id=${documentId}` : null,
    fetcher,
    {
      onSuccess: (data) => {
        if (data && data.length > 0) {
          const doc = data[0];
          // Open the artifact with the document data
          setArtifact({
            documentId: doc.id,
            title: doc.title,
            kind: doc.kind as any,
            content: doc.content || '',
            isVisible: true,
            status: 'idle',
            boundingBox: {
              top: 0,
              left: 0,
              width: 0,
              height: 0,
            }
          });
          setIsLoading(false);
        }
      },
      onError: () => {
        setIsLoading(false);
      }
    }
  );

  const handleOpen = () => {
    setIsLoading(true);
  };

  // Format preview text for spreadsheets
  const getPreviewText = () => {
    if (!preview) return `${config.label} created`;
    
    if (kind === 'sheet') {
      const lines = preview.split('\n').filter(l => l.trim());
      const rowCount = lines.length - 1; // Subtract header row
      if (rowCount > 0) {
        return `${rowCount} rows of data`;
      }
    }
    
    // For other types, show first line or truncated preview
    const firstLine = preview.split('\n')[0];
    if (firstLine.length > 50) {
      return firstLine.substring(0, 47) + '...';
    }
    return firstLine;
  };

  return (
    <button
      type="button"
      className={cn(
        "relative group w-fit flex flex-row gap-3 items-start",
        "py-3 px-4 rounded-xl cursor-pointer",
        "backdrop-blur-md bg-white/50 dark:bg-gray-900/30",
        "border border-gray-200/50 dark:border-gray-700/30",
        "hover:bg-white/70 dark:hover:bg-gray-900/40",
        "hover:shadow-lg hover:shadow-gray-200/30 dark:hover:shadow-gray-900/30",
        "hover:border-gray-300/50 dark:hover:border-gray-600/30",
        "transition-all duration-200"
      )}
      onClick={handleOpen}
      disabled={isLoading}
    >
      {/* Subtle gradient accent */}
      <div className={cn(
        "absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300",
        "bg-gradient-to-br",
        config.borderGradient,
        "blur-2xl"
      )} style={{ zIndex: -1 }} />
      
      {/* Icon */}
      <div className={cn(
        "flex-shrink-0 mt-0.5 p-2 rounded-lg",
        "bg-gradient-to-br from-gray-50/80 to-white/50",
        "dark:from-gray-800/50 dark:to-gray-700/30",
        "border border-gray-200/30 dark:border-gray-700/20"
      )}>
        <Icon className={cn("h-4 w-4", config.iconColor)} />
      </div>
      
      {/* Content */}
      <div className="text-left flex-1">
        {isLoading ? (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-700 dark:text-gray-200">Opening {title}</span>
            <div className="flex gap-1">
              <span className="w-1.5 h-1.5 bg-gray-400 dark:bg-gray-500 rounded-full animate-pulse" />
              <span className="w-1.5 h-1.5 bg-gray-400 dark:bg-gray-500 rounded-full animate-pulse delay-100" />
              <span className="w-1.5 h-1.5 bg-gray-400 dark:bg-gray-500 rounded-full animate-pulse delay-200" />
            </div>
          </div>
        ) : (
          <>
            <div className="text-sm font-medium text-gray-800 dark:text-gray-100">
              {title}
            </div>
            {preview && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {getPreviewText()}
              </p>
            )}
          </>
        )}
      </div>
    </button>
  );
});

// Compact version for inline display
export const DocumentMessageCompact = memo(function DocumentMessageCompact({
  documentId,
  title,
  kind
}: Pick<DocumentMessageProps, 'documentId' | 'title' | 'kind'>) {
  const { setArtifact } = useArtifact();
  const [isLoading, setIsLoading] = useState(false);
  
  const config = kindConfig[kind];
  const Icon = config.icon;

  const { data: documents } = useSWR<Document[]>(
    isLoading ? `/api/document?id=${documentId}` : null,
    fetcher,
    {
      onSuccess: (data) => {
        if (data && data.length > 0) {
          const doc = data[0];
          setArtifact({
            documentId: doc.id,
            title: doc.title,
            kind: doc.kind as any,
            content: doc.content || '',
            isVisible: true,
            status: 'idle',
            boundingBox: {
              top: 0,
              left: 0,
              width: 0,
              height: 0,
            }
          });
          setIsLoading(false);
        }
      },
      onError: () => {
        setIsLoading(false);
      }
    }
  );

  return (
    <button
      className={cn(
        "inline-flex items-center gap-2 h-8 px-3 rounded-lg",
        "backdrop-blur-md bg-white/60 dark:bg-gray-900/40",
        "border border-white/20 dark:border-gray-700/30",
        "hover:bg-white/80 dark:hover:bg-gray-900/50",
        "hover:shadow-lg transition-all duration-200",
        "hover:translate-y-[-1px]"
      )}
      onClick={() => setIsLoading(true)}
      disabled={isLoading}
    >
      <Icon className={cn("h-3.5 w-3.5", config.iconColor)} />
      <span className="text-xs font-medium truncate max-w-[150px] text-gray-700 dark:text-gray-300">
        {title}
      </span>
      {isLoading ? (
        <div className="relative w-3 h-3">
          <div className="absolute inset-0 rounded-full border border-gray-400 dark:border-gray-500" />
          <div className="absolute inset-0 rounded-full border-t border-gray-600 dark:border-gray-400 animate-spin" />
        </div>
      ) : (
        <ExternalLinkIcon className="h-3 w-3 text-gray-500 dark:text-gray-400" />
      )}
    </button>
  );
});