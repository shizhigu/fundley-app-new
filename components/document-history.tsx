'use client';

import { memo, useState } from 'react';
import useSWR from 'swr';
import { formatDistance } from 'date-fns';
import type { Document } from '@/lib/db/schema';
import { fetcher, cn } from '@/lib/utils';
import { DocumentMessage } from './document-message';
import { 
  FileTextIcon, 
  TableIcon, 
  CodeIcon, 
  ImageIcon,
  FileSpreadsheetIcon,
  ClockIcon,
  FolderOpenIcon
} from 'lucide-react';
import { Button } from './ui/button';

const kindConfig = {
  text: {
    icon: FileTextIcon,
    label: 'Document',
    color: 'text-blue-600 dark:text-blue-400'
  },
  code: {
    icon: CodeIcon,
    label: 'Code',
    color: 'text-purple-600 dark:text-purple-400'
  },
  sheet: {
    icon: FileSpreadsheetIcon,
    label: 'Spreadsheet',
    color: 'text-green-600 dark:text-green-400'
  },
  image: {
    icon: ImageIcon,
    label: 'Image',
    color: 'text-amber-600 dark:text-amber-400'
  }
};

interface DocumentHistoryProps {
  chatId?: string;
  userId?: string;
}

export const DocumentHistory = memo(function DocumentHistory({
  chatId,
  userId
}: DocumentHistoryProps) {
  const [selectedKind, setSelectedKind] = useState<string | null>(null);
  
  // Fetch documents for this chat or user
  const { data: documents, isLoading } = useSWR<Document[]>(
    userId ? `/api/documents?userId=${userId}` : 
    chatId ? `/api/documents?chatId=${chatId}` : null,
    fetcher
  );

  const filteredDocuments = documents?.filter(doc => 
    !selectedKind || doc.kind === selectedKind
  ) || [];

  const groupedByDate = filteredDocuments.reduce((acc, doc) => {
    const date = new Date(doc.createdAt).toLocaleDateString();
    if (!acc[date]) acc[date] = [];
    acc[date].push(doc);
    return acc;
  }, {} as Record<string, Document[]>);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin h-6 w-6 border-2 border-primary rounded-full border-t-transparent" />
      </div>
    );
  }

  if (!documents || documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <FolderOpenIcon className="h-12 w-12 text-muted-foreground/50 mb-3" />
        <h3 className="font-semibold text-sm mb-1">No Documents Yet</h3>
        <p className="text-xs text-muted-foreground">
          Documents you create will appear here
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Filter buttons */}
      <div className="flex gap-2 pb-2 border-b">
        <Button
          variant={selectedKind === null ? "default" : "outline"}
          size="sm"
          onClick={() => setSelectedKind(null)}
          className="h-7"
        >
          All ({documents.length})
        </Button>
        {Object.entries(kindConfig).map(([kind, config]) => {
          const count = documents.filter(d => d.kind === kind).length;
          if (count === 0) return null;
          const Icon = config.icon;
          
          return (
            <Button
              key={kind}
              variant={selectedKind === kind ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedKind(kind)}
              className="h-7"
            >
              <Icon className="h-3 w-3 mr-1" />
              {config.label} ({count})
            </Button>
          );
        })}
      </div>

      {/* Documents grouped by date */}
      <div className="space-y-6">
        {Object.entries(groupedByDate).map(([date, docs]) => (
          <div key={date}>
            <div className="flex items-center gap-2 mb-3">
              <ClockIcon className="h-3.5 w-3.5 text-muted-foreground" />
              <h4 className="text-xs font-medium text-muted-foreground">
                {date === new Date().toLocaleDateString() ? 'Today' : date}
              </h4>
            </div>
            <div className="space-y-2">
              {docs.map(doc => (
                <DocumentMessage
                  key={doc.id}
                  documentId={doc.id}
                  title={doc.title}
                  kind={doc.kind as any}
                  preview={doc.content}
                  createdAt={doc.createdAt}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

// Compact list for sidebar
export const DocumentHistorySidebar = memo(function DocumentHistorySidebar() {
  const { data: documents } = useSWR<Document[]>(
    '/api/documents/recent',
    fetcher
  );

  if (!documents || documents.length === 0) {
    return null;
  }

  return (
    <div className="px-2 py-1">
      <h3 className="text-xs font-semibold text-muted-foreground mb-2 px-2">
        Recent Documents
      </h3>
      <div className="space-y-1">
        {documents.slice(0, 5).map(doc => {
          const config = kindConfig[doc.kind as keyof typeof kindConfig];
          const Icon = config?.icon || FileTextIcon;
          
          return (
            <DocumentMessage
              key={doc.id}
              documentId={doc.id}
              title={doc.title}
              kind={doc.kind as any}
            />
          );
        })}
      </div>
    </div>
  );
});