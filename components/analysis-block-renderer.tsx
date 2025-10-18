'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  FileText,
  BarChart,
  ChevronUp,
  ChevronDown,
  Loader2,
  ChevronRight,
  Maximize2,
  X,
  Download,
  FileSpreadsheet,
  Search,
  RefreshCw,
  MessageSquare,
  ArrowUpRight,
  Edit2,
  Save,
  XCircle,
  Plus,
  Trash2,
  Pin,
  PinOff,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useChatContext } from '@/lib/contexts/chat-context';
import { MarkdownSectionEditor } from '@/components/markdown-section-editor';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  useReactTable,
  getCoreRowModel,
  createColumnHelper,
  flexRender,
  getSortedRowModel,
  getPaginationRowModel,
  getFilteredRowModel,
  SortingState,
  ColumnFiltersState,
} from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import * as XLSX from 'xlsx';

const extractPlainText = (value: string) => {
  if (!value) return '';

  return value
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/(\*|_)(.*?)\1/g, '$2')
    .replace(/~~(.*?)~~/g, '$1')
    .replace(/^>+\s?/gm, '')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\n+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

interface AnalysisBlockProps {
  block: {
    id: string;
    content: any;
    created_at: string;
    chat_id?: string; // Added to pass session ID
    isPinned?: boolean;
    sourceChat?: {
      id: string;
      title: string;
    };
  };
  isExpanded: boolean;
  isActive?: boolean;
  onToggle: () => void;
  onSelect?: () => void;
  onUpdate?: (updatedBlock: any) => void;
  onDelete?: (blockId: string) => void;
  onPin?: (blockId: string, isPinned: boolean) => void;
}

/**
 * Simplified Analysis Block Renderer
 * Only 3 types of content:
 * 1. text - Markdown text (includes metrics, insights, small tables)
 * 2. files.chart - Visualization file (HTML)
 * 3. files.data - Large data table (JSON)
 *
 * Default state: Collapsed (small card)
 * Click to expand: Full content
 */
export function AnalysisBlockRenderer({
  block,
  isExpanded,
  isActive = false,
  onToggle,
  onSelect,
  onUpdate,
  onDelete,
  onPin,
}: AnalysisBlockProps) {
  const { content } = block;
  const tAnalysis = useTranslations('analysis');
  const { selectChat } = useChatContext();

  // Block ID for file fetching
  const blockId = block.id;
  const isPinned = block.isPinned || false;

  // Delete confirmation dialog state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Pin state
  const [isPinning, setIsPinning] = useState(false);

  // Extract title (flexible field naming)
  const title = content.title || content.name || 'Analysis Block';

  // Editing state for title only
  const [editingTitleMode, setEditingTitleMode] = useState(false);
  const [editedTitle, setEditedTitle] = useState(title);
  const [isSaving, setIsSaving] = useState(false);

  // Track which section is being edited
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);

  // State for collapsible sections (only used when block is expanded)
  const [isChartExpanded, setIsChartExpanded] = useState(true);
  const [isDataExpanded, setIsDataExpanded] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [tableData, setTableData] = useState<any[]>([]);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [selectedDataIndex, setSelectedDataIndex] = useState(0); // Track which data table to show

  // State for fullscreen/maximized view - support multiple charts
  const [maximizedChart, setMaximizedChart] = useState<string | null>(null);
  const [isDataMaximized, setIsDataMaximized] = useState(false);

  // Normalize files to arrays (support both single file and multiple files)
  const charts = React.useMemo(() => {
    if (content.files?.charts) return content.files.charts; // Multiple files
    if (content.files?.chart) return [content.files.chart]; // Single file (backward compatible)
    return [];
  }, [content.files]);

  const dataFiles = React.useMemo(() => {
    if (Array.isArray(content.files?.data)) return content.files.data; // Multiple files
    if (content.files?.data) return [content.files.data]; // Single file (backward compatible)
    return [];
  }, [content.files]);

  const reports = React.useMemo(() => {
    if (content.files?.reports) return content.files.reports; // Multiple PDFs
    if (content.files?.report) return [content.files.report]; // Single PDF
    return [];
  }, [content.files]);

  // Fetch JSON data from backend
  const loadTableData = useCallback(
    async (filename: string) => {
      setDataLoading(true);
      try {
        const response = await fetch(
          `/api/files/${filename}?block_id=${blockId}`,
        );

        if (response.ok) {
          // JSON files contain array of records directly
          if (filename.endsWith('.json')) {
            const data = await response.json();
            // Data should be in format: [{col1: val1, col2: val2}, ...]
            setTableData(Array.isArray(data) ? data : []);
          } else {
            console.log('Unsupported file format:', filename);
            setTableData([]);
          }
        }
      } catch (error) {
        console.error('Failed to load table data:', error);
        setTableData([]);
      } finally {
        setDataLoading(false);
      }
    },
    [blockId],
  );

  // Load data when block is expanded or selected data index changes
  React.useEffect(() => {
    if (isExpanded && dataFiles.length > 0) {
      // Load selected data file
      const selectedFile = dataFiles[selectedDataIndex] || dataFiles[0];
      loadTableData(selectedFile);
    }
  }, [isExpanded, dataFiles, selectedDataIndex, loadTableData]);

  // Check if content has sections
  const hasSections =
    Array.isArray(content.sections) && content.sections.length > 0;

  // Debug logging
  // React.useEffect(() => {
  //   console.log('🔍 Block content:', {
  //     hasSections,
  //     sections: content.sections,
  //     text: content.text,
  //     title: content.title
  //   })
  // }, [hasSections, content])

  // Extract summary for collapsed view (first 150 chars of content)
  const summary = useMemo(() => {
    const fallback = 'Click to view analysis details';

    if (hasSections && content.sections?.length > 0) {
      const firstSection = content.sections[0];
      const text = extractPlainText(firstSection?.content || '').trim();
      if (text.length > 0) {
        return text.length > 150 ? `${text.slice(0, 150)}...` : text;
      }
    }

    if (content.text) {
      const text = extractPlainText(content.text).trim();
      if (text.length > 0) {
        return text.length > 150 ? `${text.slice(0, 150)}...` : text;
      }
    }

    return fallback;
  }, [hasSections, content.sections, content.text]);

  // PDF download handler
  const handleDownloadPDF = useCallback(
    (filename: string) => {
      const url = `/api/files/${filename}?block_id=${blockId}`;
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
    },
    [blockId],
  );

  // Excel export handler
  const handleExportExcel = useCallback(() => {
    if (tableData.length === 0) return;

    const worksheet = XLSX.utils.json_to_sheet(tableData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');

    const fileName =
      dataFiles[selectedDataIndex]?.replace('.json', '.xlsx') ||
      'table_export.xlsx';
    XLSX.writeFile(workbook, fileName);
  }, [tableData, dataFiles, selectedDataIndex]);

  const [refreshingChart, setRefreshingChart] = useState<string | null>(null);

  // Refresh chart by reloading iframe
  const handleRefreshChart = useCallback((chartFile: string) => {
    setRefreshingChart(chartFile);
    // Find the iframe and reload it
    const iframes = document.querySelectorAll('iframe');
    for (const iframe of iframes) {
      if (iframe.src.includes(chartFile)) {
        // Add timestamp to force reload
        const url = new URL(iframe.src);
        url.searchParams.set('t', Date.now().toString());
        iframe.src = url.toString();
        break;
      }
    }
    // Reset refreshing state after a delay
    setTimeout(() => setRefreshingChart(null), 1000);
  }, []);

  // Export HTML file directly
  const handleExportHtml = useCallback(
    (chartFile: string) => {
      const url = `/api/files/${chartFile}?block_id=${blockId}&download=true&title=${encodeURIComponent(title)}`;
      const link = document.createElement('a');
      link.href = url;
      link.click();
    },
    [blockId, title],
  );

  // Save title
  const handleSaveTitle = useCallback(async () => {
    if (editedTitle === title) {
      setEditingTitleMode(false);
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(`/api/blocks/${block.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: {
            ...content,
            title: editedTitle,
          },
        }),
      });

      if (!response.ok) throw new Error('Failed to save');
      const { block: updatedBlock } = await response.json();
      if (onUpdate) onUpdate(updatedBlock);
      setEditingTitleMode(false);
    } catch (error) {
      console.error('Error saving title:', error);
      setEditedTitle(title); // Revert on error
    } finally {
      setIsSaving(false);
    }
  }, [block.id, content, editedTitle, title, onUpdate]);

  // Save section (called by editor's auto-save)
  const handleSaveSection = useCallback(
    (sectionId: string, newContent: string) => {
      const sections = content.sections || [];
      const originalSection = sections.find((s: any) => s.id === sectionId);

      // Skip if no change
      if (!originalSection || originalSection.content === newContent) {
        return;
      }

      // 静默保存，不阻塞 UI
      const updatedSections = sections.map((s: any) =>
        s.id === sectionId ? { ...s, content: newContent} : s,
      );

      fetch(`/api/blocks/${block.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: {
            ...content,
            sections: updatedSections,
          },
        }),
      })
        .then(async (response) => {
          if (!response.ok) throw new Error('Failed to save');
          const { block: updatedBlock } = await response.json();
          if (onUpdate) onUpdate(updatedBlock);
        })
        .catch((error) => {
          console.error('❌ Save failed:', error);
        });
    },
    [block.id, content, onUpdate],
  );

  // Delete block
  const handleDelete = useCallback(async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/blocks/${block.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete');

      console.log('✅ Block deleted:', block.id);
      setShowDeleteDialog(false);

      // Notify parent component to remove this block from list
      if (onDelete) onDelete(block.id);
    } catch (error) {
      console.error('❌ Error deleting block:', error);
      alert('Failed to delete block. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  }, [block.id, onDelete]);

  // Toggle pin status
  const handleTogglePin = useCallback(async () => {
    setIsPinning(true);
    try {
      const newPinStatus = !isPinned;
      const response = await fetch(`/api/blocks/${block.id}/pin`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPinned: newPinStatus }),
      });

      if (!response.ok) throw new Error('Failed to toggle pin');

      console.log(`📌 Block ${newPinStatus ? 'pinned' : 'unpinned'}:`, block.id);

      // Notify parent component to update block list
      if (onPin) onPin(block.id, newPinStatus);
    } catch (error) {
      console.error('❌ Error toggling pin:', error);
      alert('Failed to toggle pin. Please try again.');
    } finally {
      setIsPinning(false);
    }
  }, [block.id, isPinned, onPin]);

  // Count available content types
  const hasText = hasSections || !!content.text;
  const hasChart = charts.length > 0;
  const hasData = dataFiles.length > 0;
  const hasReport = reports.length > 0;
  const contentTypesCount = [hasText, hasChart, hasData, hasReport].filter(
    Boolean,
  ).length;

  // Dynamic table columns
  const columns = React.useMemo(() => {
    if (tableData.length === 0) return [];

    const firstRow = tableData[0];
    const columnHelper = createColumnHelper<any>();

    return Object.keys(firstRow).map((key) =>
      columnHelper.accessor(
        (row) => row[key], // Use function accessor to avoid dot notation parsing
        {
          id: key, // Unique ID for the column
          header: key,
          cell: (info) => {
            const value = info.getValue();
            if (typeof value === 'number') {
              return (
                <span className="font-mono text-xs">
                  {value.toLocaleString()}
                </span>
              );
            }
            return <span className="text-xs">{String(value)}</span>;
          },
        },
      ),
    );
  }, [tableData]);

  // Create table instance
  const table = useReactTable({
    data: tableData,
    columns,
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: { pageSize: 10 },
    },
  });

  // Collapsed view - small card
  if (!isExpanded) {
    return (
      <>
        <ContextMenu>
          <ContextMenuTrigger asChild>
            <Card
              className={cn(
                'w-full group border-2 transition-all overflow-hidden',
                isActive
                  ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                  : 'border-border hover:border-brand-primary/30',
              )}
            >
          <CardContent className="p-5">
            <div className="flex items-start gap-3 min-w-0">
              {/* Block icon - purely decorative now */}
              <div className="flex-shrink-0 w-12 h-12 p-1 rounded-full bg-brand-avatar flex items-center justify-center">
                <BarChart className="h-6 w-6 text-brand-primary" />
              </div>

              {/* Content preview - clickable to open detail view */}
              <div
                className="flex-1 min-w-0 cursor-pointer"
                onClick={(e) => {
                  console.log('🟡 Card clicked, opening detail view...');
                  onToggle();
                }}
              >
                <div className="flex items-center justify-between mb-2 gap-2">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {isActive && (
                      <div className="flex items-center gap-1.5 px-2 py-1 bg-primary/10 rounded-md border border-primary/20 flex-shrink-0">
                        <span className="text-xs font-medium text-primary">
                          {tAnalysis('workingIn')}
                        </span>
                      </div>
                    )}
                    <h3 className="font-semibold text-base truncate min-w-0">
                      {title}
                    </h3>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0 group-hover:translate-x-1 transition-transform" />
                </div>

                <p className="text-sm text-muted-foreground line-clamp-2 mb-3 leading-relaxed">
                  {summary}
                </p>

                {/* Source chat jump button - only show if sourceChat exists */}
                {block.sourceChat && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent card expansion
                      selectChat(block.sourceChat!.id);
                    }}
                    className="inline-flex items-center gap-1.5 mb-2 text-xs px-2.5 py-1.5 rounded-md border border-border/60 bg-background/80 text-foreground/70 hover:bg-primary/5 hover:text-primary hover:border-primary/30 transition-all group shadow-sm"
                    title="Jump to source chat"
                  >
                    <ArrowUpRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    <span className="font-medium">Jump to chat</span>
                  </button>
                )}

                {/* Content type badges - simple unified style */}
                <div className="flex items-center gap-2 text-xs">
                  {hasText && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted text-muted-foreground font-medium">
                      <FileText className="h-3 w-3" />
                      Text
                    </span>
                  )}
                  {hasChart && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted text-muted-foreground font-medium">
                      <BarChart className="h-3 w-3" />
                      Chart
                    </span>
                  )}
                  {hasData && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted text-muted-foreground font-medium">
                      <FileText className="h-3 w-3" />
                      Data
                    </span>
                  )}
                  <span className="text-muted-foreground ml-auto font-medium">
                    {new Date(block.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
          </ContextMenuTrigger>
          <ContextMenuContent className="w-48">
            <ContextMenuItem
              className="cursor-pointer"
              onSelect={handleTogglePin}
              disabled={isPinning}
            >
              {isPinned ? (
                <>
                  <PinOff className="mr-2 h-4 w-4" />
                  {tAnalysis('unpinBlock')}
                </>
              ) : (
                <>
                  <Pin className="mr-2 h-4 w-4" />
                  {tAnalysis('pinBlock')}
                </>
              )}
            </ContextMenuItem>
            <ContextMenuItem
              className="text-destructive focus:text-destructive cursor-pointer"
              onSelect={() => {
                console.log('🗑️ Delete menu item clicked, opening dialog...');
                setShowDeleteDialog(true);
              }}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {tAnalysis('deleteBlock')}
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>

        {/* Delete Confirmation Dialog - must be outside ContextMenu */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Analysis Block?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{title}"? This action cannot be undone.
                All associated data and modification history will be permanently removed.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={isDeleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }

  // Expanded view - full content
  return (
    <Card
      className={cn(
        'w-full overflow-hidden border-2 transition-all',
        isActive
          ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
          : 'border-border',
      )}
    >
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          {/* Selection button */}
          <button
            onClick={(e) => {
              console.log('🔵 Selection button clicked (expanded)!', block.id);
              e.stopPropagation();
              e.preventDefault();
              onSelect?.();
            }}
            className={cn(
              'flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110 relative z-10',
              isActive
                ? 'bg-primary text-primary-foreground shadow-lg ring-2 ring-primary/50'
                : 'bg-muted hover:bg-primary/20 border-2 border-transparent hover:border-primary/30',
            )}
            title={isActive ? 'Deselect block' : 'Select block for work'}
          >
            {isActive ? (
              <div className="size-3 rounded-full bg-white animate-pulse" />
            ) : (
              <BarChart className="h-5 w-5" />
            )}
          </button>

          {/* Title - Notion-style inline editing */}
          <div className="flex-1 min-w-0 flex items-center gap-2 group">
            {isActive && (
              <div className="flex items-center gap-1.5 px-2 py-1 bg-primary/10 rounded-md border border-primary/20">
                <span className="text-xs font-medium text-primary">
                  {tAnalysis('workingIn')}
                </span>
              </div>
            )}
            {editingTitleMode ? (
              <input
                type="text"
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                onBlur={handleSaveTitle}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveTitle();
                  if (e.key === 'Escape') {
                    setEditedTitle(title);
                    setEditingTitleMode(false);
                  }
                }}
                autoFocus
                className="flex-1 text-lg font-semibold bg-background border border-primary rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Block title"
              />
            ) : (
              <>
                <CardTitle
                  className="text-lg font-semibold truncate cursor-text"
                  onClick={() => setEditingTitleMode(true)}
                >
                  {title}
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingTitleMode(true)}
                  className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Edit2 className="h-3 w-3" />
                </Button>
              </>
            )}
          </div>

          {/* Collapse button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
            className="h-8 w-8 p-0"
          >
            <ChevronUp className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="text-muted-foreground">
            {new Date(block.created_at).toLocaleString()}
          </span>
          {block.sourceChat && (
            <button
              onClick={() => selectChat(block.sourceChat!.id)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-border/60 bg-background/80 text-foreground/70 hover:bg-primary/5 hover:text-primary hover:border-primary/30 transition-all group shadow-sm"
              title="Jump to source chat"
            >
              <ArrowUpRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              <span className="font-medium">Jump to chat</span>
            </button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4 w-full max-w-full overflow-hidden">
        {/* Markdown Content - Sections (Notion-style editing) */}
        {hasSections ? (
          <div className="space-y-6">
            {content.sections
              .sort((a: any, b: any) => a.order - b.order)
              .map((section: any) => {
                return (
                  <div key={section.id} className="group relative">
                    {editingSectionId === section.id ? (
                      <MarkdownSectionEditor
                        content={section.content || ''}
                        onSave={(markdown) => handleSaveSection(section.id, markdown)}
                        onCancel={() => setEditingSectionId(null)}
                      />
                    ) : (
                      <div
                        onClick={() => {
                          console.log('✏️ Click to edit section:', section.id);
                          setEditingSectionId(section.id);
                        }}
                        className="cursor-text rounded-lg hover:bg-muted/30 transition-colors p-3"
                      >
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {section.content.replace(
                              /^(#{1,6})([^\s#])/gm,
                              '$1 $2',
                            )}
                          </ReactMarkdown>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        ) : content.text ? (
          <div className="prose prose-sm dark:prose-invert max-w-full break-words">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {content.text.replace(/^(#{1,6})([^\s#])/gm, '$1 $2')}
            </ReactMarkdown>
          </div>
        ) : null}

        {/* Visualization Charts (HTML) - Support multiple charts */}
        {charts.length > 0 && (
          <div className="space-y-4">
            {charts.length > 1 && (
              <div className="flex items-center gap-2">
                <BarChart className="h-4 w-4" />
                <span className="text-sm font-semibold">
                  Visualizations ({charts.length})
                </span>
              </div>
            )}
            {charts.map((chartFile: string, index: number) => (
              <div
                key={`${chartFile}-${index}`}
                className="border rounded-lg overflow-hidden w-full max-w-full"
              >
                <div className="p-3 flex items-center justify-between hover:bg-accent hover:text-accent-foreground transition-colors">
                  <button
                    onClick={() => setIsChartExpanded(!isChartExpanded)}
                    className="flex items-center gap-2 flex-1"
                  >
                    <BarChart className="h-4 w-4" />
                    <span className="text-sm font-medium">
                      {charts.length === 1
                        ? 'Visualization'
                        : `Visualization ${index + 1}`}
                    </span>
                    {isChartExpanded ? (
                      <ChevronUp className="h-4 w-4 ml-2" />
                    ) : (
                      <ChevronDown className="h-4 w-4 ml-2" />
                    )}
                  </button>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRefreshChart(chartFile);
                      }}
                      disabled={refreshingChart === chartFile}
                      className="h-8 w-8 p-0"
                      title="Refresh"
                    >
                      <RefreshCw
                        className={`h-4 w-4 ${refreshingChart === chartFile ? 'animate-spin' : ''}`}
                      />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleExportHtml(chartFile);
                      }}
                      className="h-8 w-8 p-0"
                      title="Download HTML"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMaximizedChart(chartFile);
                      }}
                      className="h-8 w-8 p-0"
                      title="Fullscreen"
                    >
                      <Maximize2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {isChartExpanded && (
                  <div className="w-full h-[400px] bg-white overflow-auto">
                    <iframe
                      id={`chart-iframe-${block.id}-${index}`}
                      src={`/api/files/${chartFile}?block_id=${blockId}`}
                      className="w-full h-full border-0 min-w-0"
                      title={`Visualization ${index + 1}`}
                      sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-popups"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* PDF Reports - Support multiple PDFs */}
        {reports.length > 0 && (
          <div className="mt-4 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              <FileText className="w-4 h-4" />
              <span>Report{reports.length > 1 ? 's' : ''}</span>
            </div>

            <div className="space-y-2">
              {reports.map((reportFile: string, index: number) => (
                <Button
                  key={`${reportFile}-${index}`}
                  onClick={() => handleDownloadPDF(reportFile)}
                  variant="outline"
                  className="w-full justify-start gap-2 neuro-inset hover:neuro-raised transition-all"
                >
                  <Download className="w-4 h-4" />
                  <span className="flex-1 text-left truncate">
                    {reportFile}
                  </span>
                  <span className="text-xs text-gray-500 px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800">
                    PDF
                  </span>
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Data Table (JSON) - Support multiple data files */}
        {dataFiles.length > 0 && (
          <div
            className="border rounded-lg w-full"
            style={{ maxWidth: '100%' }}
          >
            {/* Header with collapse button and actions */}
            <div className="p-3 flex items-center justify-between hover:bg-accent hover:text-accent-foreground transition-colors">
              <button
                onClick={() => setIsDataExpanded(!isDataExpanded)}
                className="flex items-center gap-2 flex-1"
              >
                <FileText className="h-4 w-4" />
                <span className="text-sm font-medium">
                  {dataFiles.length === 1
                    ? tAnalysis('dataTable')
                    : `${tAnalysis('dataTables')} (${dataFiles.length})`}
                </span>
                {tableData.length > 0 && (
                  <span className="text-xs text-muted-foreground">
                    ({table.getFilteredRowModel().rows.length} /{' '}
                    {tableData.length} rows)
                  </span>
                )}
                {isDataExpanded ? (
                  <ChevronUp className="h-4 w-4 ml-2" />
                ) : (
                  <ChevronDown className="h-4 w-4 ml-2" />
                )}
              </button>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleExportExcel();
                  }}
                  className="h-8 px-3"
                  disabled={tableData.length === 0}
                >
                  <FileSpreadsheet className="h-4 w-4 mr-1" />
                  <span className="text-xs">{tAnalysis('export')}</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsDataMaximized(true);
                  }}
                  className="h-8 w-8 p-0"
                >
                  <Maximize2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Dropdown selector for multiple data files */}
            {isDataExpanded && dataFiles.length > 1 && (
              <div className="px-3 py-2 bg-muted/50 border-t">
                <Select
                  value={selectedDataIndex.toString()}
                  onValueChange={(value) => setSelectedDataIndex(parseInt(value))}
                >
                  <SelectTrigger className="w-[280px] h-8">
                    <SelectValue placeholder="Select table" />
                  </SelectTrigger>
                  <SelectContent>
                    {dataFiles.map((file: string, index: number) => {
                      // Remove .json extension for display
                      const displayName = file.replace('.json', '');
                      return (
                        <SelectItem key={`${file}-${index}`} value={index.toString()}>
                          {displayName}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            )}

            {isDataExpanded && (
              <>
                {dataLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : tableData.length > 0 ? (
                  <>
                    {/* Search bar */}
                    <div className="px-3 py-2 border-t bg-muted/30">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search all columns..."
                          value={globalFilter ?? ''}
                          onChange={(e) => setGlobalFilter(e.target.value)}
                          className="pl-9 h-8 text-xs"
                        />
                      </div>
                    </div>

                    {/* TanStack Table with horizontal scroll - max height with scroll */}
                    <div
                      className="border-t max-h-[500px] overflow-auto"
                      style={{ width: '100%', display: 'block' }}
                    >
                      <table
                        className="divide-y divide-gray-200"
                        style={{ width: 'max-content', minWidth: '100%' }}
                      >
                        <thead className="bg-gray-50 sticky top-0">
                          {table.getHeaderGroups().map((headerGroup) => (
                            <tr key={headerGroup.id}>
                              {headerGroup.headers.map((header) => (
                                <th
                                  key={header.id}
                                  className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 whitespace-nowrap"
                                  onClick={header.column.getToggleSortingHandler()}
                                >
                                  {flexRender(
                                    header.column.columnDef.header,
                                    header.getContext(),
                                  )}
                                  {header.column.getIsSorted() === 'asc' &&
                                    ' ↑'}
                                  {header.column.getIsSorted() === 'desc' &&
                                    ' ↓'}
                                </th>
                              ))}
                            </tr>
                          ))}
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {table.getRowModel().rows.map((row) => (
                            <tr key={row.id} className="hover:bg-gray-50">
                              {row.getVisibleCells().map((cell) => (
                                <td
                                  key={cell.id}
                                  className="px-3 py-2 whitespace-nowrap text-sm text-gray-900"
                                >
                                  {flexRender(
                                    cell.column.columnDef.cell,
                                    cell.getContext(),
                                  )}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination Controls */}
                    <div className="flex items-center justify-between p-4 border-t bg-gray-50">
                      <div className="text-sm text-muted-foreground">
                        Page {table.getState().pagination.pageIndex + 1} of{' '}
                        {table.getPageCount()}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => table.previousPage()}
                          disabled={!table.getCanPreviousPage()}
                        >
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => table.nextPage()}
                          disabled={!table.getCanNextPage()}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8 text-sm text-muted-foreground">
                    No data available
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Fallback for blocks without standard structure */}
        {!content.text && !content.files && (
          <div className="text-sm text-muted-foreground italic">
            No content to display
          </div>
        )}
      </CardContent>

      {/* Maximized Chart Dialog */}
      <Dialog
        open={!!maximizedChart}
        onOpenChange={(open) => !open && setMaximizedChart(null)}
      >
        <DialogContent className="max-w-[90vw] max-h-[90vh] p-0">
          <DialogHeader className="p-6 pb-4 flex flex-row items-center justify-between">
            <DialogTitle>Visualization - {title}</DialogTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (maximizedChart) {
                  handleExportHtml(maximizedChart);
                }
              }}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Download HTML
            </Button>
          </DialogHeader>
          <div className="w-full h-[calc(90vh-8rem)] bg-white">
            {maximizedChart && (
              <iframe
                id={`chart-iframe-${block.id}-maximized`}
                src={`/api/files/${maximizedChart}?block_id=${blockId}`}
                className="w-full h-full border-0"
                title="Visualization (Maximized)"
                sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-popups"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Maximized Data Table Dialog */}
      <Dialog open={isDataMaximized} onOpenChange={setIsDataMaximized}>
        <DialogContent className="max-w-[90vw] max-h-[90vh] p-0 flex flex-col">
          <DialogHeader className="p-6 pb-4 border-b">
            <div className="flex items-center justify-between">
              <DialogTitle>
                {tAnalysis('dataTable')} - {title}
              </DialogTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportExcel}
                className="h-8 px-3"
                disabled={tableData.length === 0}
              >
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                {tAnalysis('exportToExcel')}
              </Button>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-hidden">
            {dataLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : tableData.length > 0 ? (
              <>
                {/* Search bar in maximized view */}
                <div className="px-6 py-3 border-b bg-muted/30">
                  <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search all columns..."
                      value={globalFilter ?? ''}
                      onChange={(e) => setGlobalFilter(e.target.value)}
                      className="pl-9 h-9 text-sm"
                    />
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    Showing {table.getFilteredRowModel().rows.length} of{' '}
                    {tableData.length} rows
                  </div>
                </div>

                {/* Maximized TanStack Table with horizontal scroll */}
                <div
                  className="h-[calc(90vh-16rem)] overflow-auto"
                  style={{ width: '100%', display: 'block' }}
                >
                  <table
                    className="divide-y divide-gray-200"
                    style={{ width: 'max-content', minWidth: '100%' }}
                  >
                    <thead className="bg-gray-50 sticky top-0 z-10">
                      {table.getHeaderGroups().map((headerGroup) => (
                        <tr key={headerGroup.id}>
                          {headerGroup.headers.map((header) => (
                            <th
                              key={header.id}
                              className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 whitespace-nowrap"
                              onClick={header.column.getToggleSortingHandler()}
                            >
                              {flexRender(
                                header.column.columnDef.header,
                                header.getContext(),
                              )}
                              {header.column.getIsSorted() === 'asc' && ' ↑'}
                              {header.column.getIsSorted() === 'desc' && ' ↓'}
                            </th>
                          ))}
                        </tr>
                      ))}
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {table.getRowModel().rows.map((row) => (
                        <tr key={row.id} className="hover:bg-gray-50">
                          {row.getVisibleCells().map((cell) => (
                            <td
                              key={cell.id}
                              className="px-4 py-3 whitespace-nowrap text-sm text-gray-900"
                            >
                              {flexRender(
                                cell.column.columnDef.cell,
                                cell.getContext(),
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                <div className="flex items-center justify-between p-4 border-t bg-gray-50">
                  <div className="text-sm text-muted-foreground">
                    Page {table.getState().pagination.pageIndex + 1} of{' '}
                    {table.getPageCount()}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => table.previousPage()}
                      disabled={!table.getCanPreviousPage()}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => table.nextPage()}
                      disabled={!table.getCanNextPage()}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-12 text-sm text-muted-foreground">
                No data available
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Analysis Block?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{title}"? This action cannot be undone.
              All associated data and modification history will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
