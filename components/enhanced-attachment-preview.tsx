'use client';

import { useState } from 'react';
import { X, FileText, File, Image as ImageIcon, Download, Eye, Loader2 } from 'lucide-react';
import type { Attachment } from '@/lib/types';

interface EnhancedAttachmentPreviewProps {
  attachments: Attachment[];
  onRemove: (index: number) => void;
  isUploading?: boolean;
  className?: string;
  showRemoveButton?: boolean; // 新增：控制是否显示删除按钮
}

const getFileIcon = (contentType: string) => {
  if (contentType.startsWith('image/')) {
    return <ImageIcon className="w-4 h-4" />;
  }
  if (contentType === 'application/pdf') {
    return <FileText className="w-4 h-4 text-red-500" />;
  }
  if (contentType.includes('word') || contentType.includes('document')) {
    return <FileText className="w-4 h-4 text-blue-500" />;
  }
  if (contentType.includes('excel') || contentType.includes('spreadsheet')) {
    return <FileText className="w-4 h-4 text-green-500" />;
  }
  if (contentType === 'text/csv') {
    return <FileText className="w-4 h-4 text-orange-500" />;
  }
  if (contentType === 'application/json') {
    return <FileText className="w-4 h-4 text-orange-500" />;
  }
  return <File className="w-4 h-4" />;
};

const formatFileSize = (bytes?: number) => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const getFileTypeLabel = (contentType: string) => {
  if (contentType.startsWith('image/')) return 'Image';
  if (contentType === 'application/pdf') return 'PDF';
  if (contentType.includes('word') || contentType.includes('document')) return 'Word';
  if (contentType.includes('excel') || contentType.includes('spreadsheet')) return 'Excel';
  if (contentType === 'text/csv') return 'CSV';
  if (contentType === 'application/json') return 'JSON';
  if (contentType.startsWith('text/')) return 'Text';
  return 'File';
};

export function EnhancedAttachmentPreview({
  attachments,
  onRemove,
  isUploading = false,
  className = '',
  showRemoveButton = true
}: EnhancedAttachmentPreviewProps) {
  const [expandedImage, setExpandedImage] = useState<string | null>(null);

  if (attachments.length === 0) return null;

  return (
    <div className={`space-y-2 ${className}`}>
      {/* 附件列表 - 横向滚动 */}
      <div className="flex gap-3 overflow-x-auto pb-2 max-w-full">
        {attachments.map((attachment, index) => {
          const { name, contentType, file, size } = attachment;
          const url = file ? URL.createObjectURL(file) : attachment.url;
          const isImage = contentType.startsWith('image/');

          return (
            <div
              key={index}
              className="flex-shrink-0 relative group bg-background border border-border rounded-lg p-3 min-w-[200px] max-w-[280px]"
            >
              {/* 删除按钮 - 只在允许时显示 */}
              {showRemoveButton && (
                <button
                  onClick={() => onRemove(index)}
                  className="absolute -top-2 -right-2 z-10 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center shadow-md hover:bg-destructive/90 transition-colors"
                  title="Remove attachment"
                >
                  <X className="w-3 h-3" />
                </button>
              )}

              <div className="flex items-start gap-3">
                {/* 文件预览/图标 */}
                <div className="flex-shrink-0">
                  {isImage ? (
                    <div className="relative">
                      <img
                        src={url}
                        alt={name}
                        className="w-12 h-12 object-cover rounded border cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => url && setExpandedImage(url)}
                      />
                      <button
                        onClick={() => url && setExpandedImage(url)}
                        className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 hover:opacity-100 transition-opacity rounded"
                      >
                        <Eye className="w-4 h-4 text-white" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-12 h-12 bg-muted rounded border flex items-center justify-center">
                      {getFileIcon(contentType)}
                    </div>
                  )}
                </div>

                {/* 文件信息 */}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground truncate" title={name}>
                    {name}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {getFileTypeLabel(contentType)}
                    {size && ` • ${formatFileSize(size)}`}
                  </div>
                  {isUploading && (
                    <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Uploading...
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 图片放大预览 */}
      {expandedImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setExpandedImage(null)}
        >
          <div className="relative max-w-4xl max-h-full">
            <button
              onClick={() => setExpandedImage(null)}
              className="absolute -top-10 right-0 text-white hover:text-gray-300 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={expandedImage}
              alt="Expanded view"
              className="max-w-full max-h-full object-contain rounded"
            />
          </div>
        </div>
      )}
    </div>
  );
}