'use client';

import { useState } from 'react';
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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { cn } from '@/lib/utils';

// Mock data - 后续替换为真实 API
interface FileItem {
  name: string;
  path: string;
  type: 'file' | 'folder';
  size?: number;
  modified?: Date;
  extension?: string;
}

const MOCK_DATA: Record<string, FileItem[]> = {
  '/': [
    { name: 'workspace', path: '/workspace', type: 'folder' },
    { name: 'tasks', path: '/tasks', type: 'folder' },
    { name: 'data_apps', path: '/data_apps', type: 'folder' },
    { name: 'scratch', path: '/scratch', type: 'folder' },
    { name: 'README.md', path: '/README.md', type: 'file', extension: 'md', size: 1024 },
  ],
  '/workspace': [
    { name: 'report.html', path: '/workspace/report.html', type: 'file', extension: 'html', size: 15360 },
    { name: 'data.csv', path: '/workspace/data.csv', type: 'file', extension: 'csv', size: 8192 },
    { name: 'chart.png', path: '/workspace/chart.png', type: 'file', extension: 'png', size: 245760 },
    { name: 'analysis.py', path: '/workspace/analysis.py', type: 'file', extension: 'py', size: 4096 },
  ],
  '/tasks': [
    { name: 'dcf_valuation', path: '/tasks/dcf_valuation', type: 'folder' },
    { name: 'earnings_analysis', path: '/tasks/earnings_analysis', type: 'folder' },
  ],
};

// 根据文件扩展名获取图标
function getFileIcon(item: FileItem) {
  if (item.type === 'folder') {
    return <Folder className="h-12 w-12 text-blue-500" />;
  }

  const ext = item.extension?.toLowerCase();
  switch (ext) {
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'gif':
    case 'svg':
      return <FileImage className="h-12 w-12 text-purple-500" />;
    case 'csv':
    case 'xlsx':
    case 'xls':
      return <FileSpreadsheet className="h-12 w-12 text-green-500" />;
    case 'py':
    case 'js':
    case 'ts':
    case 'tsx':
    case 'jsx':
      return <FileCode className="h-12 w-12 text-yellow-500" />;
    case 'md':
    case 'txt':
    case 'html':
      return <FileText className="h-12 w-12 text-gray-500" />;
    default:
      return <FileIcon className="h-12 w-12 text-gray-400" />;
  }
}

// 格式化文件大小
function formatFileSize(bytes?: number): string {
  if (!bytes) return '-';
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
}

type ViewMode = 'grid' | 'list';

export function FileManager() {
  const [currentPath, setCurrentPath] = useState('/');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState('');

  // 获取当前目录的文件列表
  const currentFiles = MOCK_DATA[currentPath] || [];

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
      // 文件点击 - 后续实现预览/下载
      console.log('Open file:', item.path);
    }
  };

  // 面包屑导航
  const breadcrumbs = currentPath.split('/').filter(Boolean);

  return (
    <div className="flex h-full flex-col">
      {/* 工具栏 */}
      <div className="flex items-center gap-2 border-b p-4">
        <Button variant="outline" size="sm">
          <Upload className="mr-2 h-4 w-4" />
          上传
        </Button>
        <div className="flex-1" />
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="搜索文件..."
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
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
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
                  {item.type === 'file' && (
                    <ContextMenuItem>
                      <Download className="mr-2 h-4 w-4" />
                      下载
                    </ContextMenuItem>
                  )}
                  <ContextMenuItem className="text-destructive">
                    <Trash2 className="mr-2 h-4 w-4" />
                    删除
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
                      {item.type === 'folder' ? (
                        <Folder className="h-5 w-5 text-blue-500" />
                      ) : (
                        <FileIcon className="h-5 w-5 text-gray-400" />
                      )}
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
                  {item.type === 'file' && (
                    <ContextMenuItem>
                      <Download className="mr-2 h-4 w-4" />
                      下载
                    </ContextMenuItem>
                  )}
                  <ContextMenuItem className="text-destructive">
                    <Trash2 className="mr-2 h-4 w-4" />
                    删除
                  </ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>
            ))}
          </div>
        )}

        {filteredFiles.length === 0 && (
          <div className="flex h-64 items-center justify-center text-muted-foreground">
            {searchQuery ? '未找到匹配的文件' : '此文件夹为空'}
          </div>
        )}
      </div>
    </div>
  );
}
