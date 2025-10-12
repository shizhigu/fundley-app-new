'use client';

import { useState } from 'react';
import { X, FileText, File, Image as ImageIcon, Eye, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Attachment } from '@/lib/types';

interface EnhancedAttachmentPreviewProps {
  attachments: Attachment[];
  onRemove: (index: number) => void;
  isUploading?: boolean;
  className?: string;
  showRemoveButton?: boolean;
}

/**
 * Get appropriate icon for file type
 */
const getFileIcon = (contentType: string) => {
  if (contentType.startsWith('image/')) {
    return <ImageIcon className="w-4 h-4 text-brand-primary" />;
  }
  if (contentType === 'application/pdf') {
    return <FileText className="w-4 h-4 text-brand-primary" />;
  }
  if (contentType.includes('word') || contentType.includes('document')) {
    return <FileText className="w-4 h-4 text-brand-primary" />;
  }
  if (contentType.includes('excel') || contentType.includes('spreadsheet')) {
    return <FileText className="w-4 h-4 text-brand-primary" />;
  }
  if (contentType === 'text/csv' || contentType === 'application/json') {
    return <FileText className="w-4 h-4 text-brand-primary" />;
  }
  return <File className="w-4 h-4 text-muted-foreground" />;
};

/**
 * Format file size for display
 */
const formatFileSize = (bytes?: number): string => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

/**
 * Get file type label
 */
const getFileTypeLabel = (contentType: string): string => {
  if (contentType.startsWith('image/')) return 'Image';
  if (contentType === 'application/pdf') return 'PDF';
  if (contentType.includes('word') || contentType.includes('document')) return 'Document';
  if (contentType.includes('excel') || contentType.includes('spreadsheet')) return 'Spreadsheet';
  if (contentType === 'text/csv') return 'CSV';
  if (contentType === 'application/json') return 'JSON';
  if (contentType.startsWith('text/')) return 'Text';
  return 'File';
};

/**
 * Ultra-Premium 2025 Attachment Preview
 * Clean, minimal, professional file display
 */
export function EnhancedAttachmentPreview({
  attachments,
  onRemove,
  isUploading = false,
  className,
  showRemoveButton = true
}: EnhancedAttachmentPreviewProps) {
  const [expandedImage, setExpandedImage] = useState<string | null>(null);

  if (attachments.length === 0) return null;

  return (
    <div className={cn("space-y-2", className)}>
      {/* Attachment List - Horizontal Scroll */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {attachments.map((attachment, index) => {
          const { name, contentType, file, size } = attachment;
          const url = file ? URL.createObjectURL(file) : attachment.url;
          const isImage = contentType.startsWith('image/');

          return (
            <div
              key={index}
              className="flex-shrink-0 relative group bg-card border border-border rounded-lg p-3 min-w-[180px] max-w-[240px]"
            >
              {/* Remove Button */}
              {showRemoveButton && (
                <button
                  onClick={() => onRemove(index)}
                  className="absolute -top-2 -right-2 z-10 w-6 h-6 bg-destructive text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Remove attachment"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}

              <div className="flex items-start gap-2.5">
                {/* File Preview/Icon */}
                <div className="flex-shrink-0">
                  {isImage ? (
                    <div className="relative">
                      <img
                        src={url}
                        alt={name}
                        className="w-12 h-12 object-cover rounded border border-border cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => url && setExpandedImage(url)}
                      />
                      <button
                        onClick={() => url && setExpandedImage(url)}
                        className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 hover:opacity-100 transition-opacity rounded"
                      >
                        <Eye className="w-4 h-4 text-white" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-12 h-12 bg-muted rounded border border-border flex items-center justify-center">
                      {getFileIcon(contentType)}
                    </div>
                  )}
                </div>

                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground truncate" title={name}>
                    {name}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {getFileTypeLabel(contentType)}
                    {size && ` • ${formatFileSize(size)}`}
                  </div>
                  {isUploading && (
                    <div className="flex items-center gap-1.5 mt-1.5 text-xs text-brand-primary">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>Uploading...</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Image Expanded View */}
      {expandedImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setExpandedImage(null)}
        >
          <div className="relative max-w-5xl max-h-full">
            <button
              onClick={() => setExpandedImage(null)}
              className="absolute -top-12 right-0 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={expandedImage}
              alt="Expanded view"
              className="max-w-full max-h-full object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
}
