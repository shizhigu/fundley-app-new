'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Folder,
  FileText,
  FileImage,
  FileSpreadsheet,
  FileCode,
  File as FileIcon,
  ChevronRight,
  Home,
  Upload,
  Download,
  Trash2,
  Grid3x3,
  List,
  Search,
  X,
  RefreshCw,
  Eye,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface FileItem {
  name: string;
  path: string;
  type: 'file' | 'folder';
  size?: number;
  modified?: Date;
  extension?: string;
  children?: FileItem[];
}

// 根据文件扩展名获取图标
function getFileIcon(item: FileItem, size: 'sm' | 'lg' = 'lg') {
  const className = size === 'sm' ? 'h-5 w-5' : 'h-12 w-12';

  if (item.type === 'folder') {
    return <Folder className={cn(className, 'text-blue-500')} />;
  }

  const ext = item.extension?.toLowerCase();
  switch (ext) {
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'gif':
    case 'svg':
    case 'webp':
      return <FileImage className={cn(className, 'text-purple-500')} />;
    case 'csv':
    case 'xlsx':
    case 'xls':
      return <FileSpreadsheet className={cn(className, 'text-green-500')} />;
    case 'py':
    case 'js':
    case 'ts':
    case 'tsx':
    case 'jsx':
    case 'json':
      return <FileCode className={cn(className, 'text-yellow-500')} />;
    case 'md':
    case 'txt':
    case 'html':
      return <FileText className={cn(className, 'text-gray-500')} />;
    default:
      return <FileIcon className={cn(className, 'text-gray-400')} />;
  }
}

// 格式化文件大小
function formatFileSize(bytes?: number): string {
  if (!bytes) return '-';
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
}

// 扁平化文件树（用于搜索和显示）
function flattenFiles(items: FileItem[], currentPath: string): FileItem[] {
  const result: FileItem[] = [];

  for (const item of items) {
    // 排除当前路径本身（避免显示自己）
    if (item.path === currentPath) {
      // 如果是文件夹，直接返回其子项
      if (item.children) {
        return item.children;
      }
      continue;
    }

    if (item.path.startsWith(currentPath)) {
      // 只显示当前目录的直接子项
      const relativePath = item.path.slice(currentPath.length).replace(/^\//, '');
      const isDirectChild = !relativePath.includes('/') || (item.type === 'folder' && relativePath.split('/').length === 1);

      if (isDirectChild) {
        result.push(item);
      }
    }

    if (item.children) {
      result.push(...flattenFiles(item.children, currentPath));
    }
  }

  return result;
}

type ViewMode = 'grid' | 'list';

export function WorkspaceFilesPanel() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [currentPath, setCurrentPath] = useState('/');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);

  // 加载文件列表
  const loadFiles = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/workspace/files?path=${encodeURIComponent(currentPath)}`);
      if (response.ok) {
        const data = await response.json();
        setFiles(data.items || []);
      } else {
        toast.error('Failed to load files');
      }
    } catch (error) {
      console.error('Error loading files:', error);
      toast.error('Failed to load files');
    } finally {
      setLoading(false);
    }
  }, [currentPath]);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  // 获取当前目录的文件
  const currentFiles = flattenFiles(files, currentPath);

  // 过滤搜索结果
  const filteredFiles = searchQuery
    ? currentFiles.filter((file) =>
        file.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : currentFiles;

  // 处理文件/文件夹点击
  const handleItemClick = (item: FileItem) => {
    if (item.type === 'folder') {
      setCurrentPath(item.path);
    } else {
      // 预览文件
      setPreviewFile(item);
    }
  };

  // 下载文件
  const handleDownload = async (item: FileItem) => {
    try {
      const response = await fetch(`/api/workspace/download?path=${encodeURIComponent(item.path)}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = item.name;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success(`Downloaded ${item.name}`);
      } else {
        toast.error('Failed to download file');
      }
    } catch (error) {
      console.error('Error downloading file:', error);
      toast.error('Failed to download file');
    }
  };

  // 删除文件/文件夹
  const handleDelete = async (item: FileItem) => {
    if (!confirm(`Are you sure you want to delete "${item.name}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/workspace/files?path=${encodeURIComponent(item.path)}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success(`Deleted ${item.name}`);
        loadFiles();
      } else {
        toast.error('Failed to delete');
      }
    } catch (error) {
      console.error('Error deleting file:', error);
      toast.error('Failed to delete');
    }
  };

  // 上传文件
  const handleUpload = async (fileList: FileList) => {
    const files = Array.from(fileList);

    for (const file of files) {
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('path', currentPath);

        const response = await fetch('/api/workspace/files', {
          method: 'POST',
          body: formData,
        });

        if (response.ok) {
          toast.success(`Uploaded ${file.name}`);
        } else {
          toast.error(`Failed to upload ${file.name}`);
        }
      } catch (error) {
        console.error('Error uploading file:', error);
        toast.error(`Failed to upload ${file.name}`);
      }
    }

    loadFiles();
  };

  // 拖拽上传处理
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounter.current = 0;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleUpload(e.dataTransfer.files);
    }
  };

  // 面包屑导航
  const breadcrumbs = currentPath.split('/').filter(Boolean);

  // 判断是否可以预览
  const canPreview = (item: FileItem) => {
    const ext = item.extension?.toLowerCase();
    return ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'html', 'txt', 'md', 'json', 'py', 'js', 'ts', 'tsx', 'jsx', 'css'].includes(ext || '');
  };

  return (
    <div
      className="flex h-full flex-col"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* 拖拽覆盖层 */}
      {isDragging && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4 rounded-lg border-2 border-dashed border-primary bg-card p-12">
            <Upload className="h-16 w-16 text-primary" />
            <p className="text-lg font-medium">Drop files to upload</p>
          </div>
        </div>
      )}

      {/* 工具栏 */}
      <div className="flex items-center gap-2 border-b p-4">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && handleUpload(e.target.files)}
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="mr-2 h-4 w-4" />
          Upload
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={loadFiles}
          disabled={loading}
        >
          <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
        </Button>
        <div className="flex-1" />
        <div className="relative w-48">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-1">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('grid')}
          >
            <Grid3x3 className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* 面包屑导航 */}
      <div className="flex items-center gap-1 border-b px-4 py-2 text-sm">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2"
          onClick={() => setCurrentPath('/')}
        >
          <Home className="h-4 w-4" />
        </Button>
        {breadcrumbs.map((crumb, index) => {
          const path = '/' + breadcrumbs.slice(0, index + 1).join('/');
          return (
            <div key={path} className="flex items-center gap-1">
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2"
                onClick={() => setCurrentPath(path)}
              >
                {crumb}
              </Button>
            </div>
          );
        })}
      </div>

      {/* 文件列表 */}
      <div className="flex-1 overflow-auto p-4">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {filteredFiles.map((item) => (
              <ContextMenu key={item.path}>
                <ContextMenuTrigger>
                  <div
                    className={cn(
                      'flex cursor-pointer flex-col items-center gap-2 rounded-lg border p-4 transition-colors hover:bg-accent',
                      'select-none'
                    )}
                    onDoubleClick={() => handleItemClick(item)}
                  >
                    {getFileIcon(item)}
                    <p className="line-clamp-2 w-full break-all text-center text-sm">
                      {item.name}
                    </p>
                    {item.type === 'file' && (
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(item.size)}
                      </p>
                    )}
                  </div>
                </ContextMenuTrigger>
                <ContextMenuContent>
                  {item.type === 'file' && canPreview(item) && (
                    <ContextMenuItem onClick={() => setPreviewFile(item)}>
                      <Eye className="mr-2 h-4 w-4" />
                      Preview
                    </ContextMenuItem>
                  )}
                  {item.type === 'file' && (
                    <ContextMenuItem onClick={() => handleDownload(item)}>
                      <Download className="mr-2 h-4 w-4" />
                      Download
                    </ContextMenuItem>
                  )}
                  <ContextMenuItem
                    className="text-destructive"
                    onClick={() => handleDelete(item)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>
            ))}
          </div>
        ) : (
          <div className="space-y-1">
            {filteredFiles.map((item) => (
              <ContextMenu key={item.path}>
                <ContextMenuTrigger>
                  <div
                    className={cn(
                      'flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-accent',
                      'select-none'
                    )}
                    onDoubleClick={() => handleItemClick(item)}
                  >
                    <div className="shrink-0">
                      {getFileIcon(item, 'sm')}
                    </div>
                    <p className="flex-1 truncate text-sm">{item.name}</p>
                    {item.type === 'file' && (
                      <>
                        <p className="text-xs text-muted-foreground">
                          {item.extension?.toUpperCase()}
                        </p>
                        <p className="w-20 text-right text-xs text-muted-foreground">
                          {formatFileSize(item.size)}
                        </p>
                      </>
                    )}
                  </div>
                </ContextMenuTrigger>
                <ContextMenuContent>
                  {item.type === 'file' && canPreview(item) && (
                    <ContextMenuItem onClick={() => setPreviewFile(item)}>
                      <Eye className="mr-2 h-4 w-4" />
                      Preview
                    </ContextMenuItem>
                  )}
                  {item.type === 'file' && (
                    <ContextMenuItem onClick={() => handleDownload(item)}>
                      <Download className="mr-2 h-4 w-4" />
                      Download
                    </ContextMenuItem>
                  )}
                  <ContextMenuItem
                    className="text-destructive"
                    onClick={() => handleDelete(item)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>
            ))}
          </div>
        )}

        {filteredFiles.length === 0 && !loading && (
          <div className="flex h-64 flex-col items-center justify-center gap-2 text-muted-foreground">
            <Folder className="h-12 w-12 opacity-20" />
            <p>{searchQuery ? 'No files found' : 'This folder is empty'}</p>
            <p className="text-sm">Drag files here to upload</p>
          </div>
        )}
      </div>

      {/* 文件预览对话框 */}
      <FilePreviewDialog
        file={previewFile}
        onClose={() => setPreviewFile(null)}
        onDownload={() => previewFile && handleDownload(previewFile)}
      />
    </div>
  );
}

// 文件预览对话框组件
function FilePreviewDialog({
  file,
  onClose,
  onDownload,
}: {
  file: FileItem | null;
  onClose: () => void;
  onDownload: () => void;
}) {
  if (!file) return null;

  const ext = file.extension?.toLowerCase();
  const isImage = ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(ext || '');
  const isHtml = ext === 'html';

  // 使用 preview API（inline）而不是 download API（attachment）
  const previewUrl = `/api/workspace/preview?path=${encodeURIComponent(file.path)}`;

  return (
    <Dialog open={!!file} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{file.name}</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={onDownload}>
                <Download className="mr-2 h-4 w-4" />
                Download
              </Button>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>
        <div className="mt-4">
          {isImage ? (
            <img
              src={previewUrl}
              alt={file.name}
              className="max-w-full rounded-lg"
            />
          ) : isHtml ? (
            <iframe
              src={previewUrl}
              className="h-[600px] w-full rounded-lg border"
              title={file.name}
              sandbox="allow-scripts allow-same-origin"
            />
          ) : (
            <div className="flex flex-col items-center gap-4 p-12">
              {getFileIcon(file)}
              <p className="text-lg font-medium">{file.name}</p>
              <p className="text-sm text-muted-foreground">
                Preview not available for this file type
              </p>
              <Button onClick={onDownload}>
                <Download className="mr-2 h-4 w-4" />
                Download to view
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
