'use client'

import React, { useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FileText, BarChart, ChevronUp, ChevronDown, Loader2, ChevronRight, Maximize2, X } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  useReactTable,
  getCoreRowModel,
  createColumnHelper,
  flexRender,
  getSortedRowModel,
  getPaginationRowModel,
  SortingState,
} from '@tanstack/react-table'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

interface AnalysisBlockProps {
  block: {
    id: string
    content: any
    created_at: string
    chat_id?: string  // Added to pass session ID
  }
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
export function AnalysisBlockRenderer({ block }: AnalysisBlockProps) {
  const { content } = block

  // Get session ID from URL or context (you need to pass this from parent)
  // For now, we'll extract from the block's metadata if available
  const sessionId = block.chat_id || window.location.pathname.split('/').pop()

  // Extract title (flexible field naming)
  const title = content.title || content.name || 'Analysis Block'

  // Main collapsed/expanded state for the entire block
  const [isBlockExpanded, setIsBlockExpanded] = useState(false)

  // State for collapsible sections (only used when block is expanded)
  const [isChartExpanded, setIsChartExpanded] = useState(true)
  const [isDataExpanded, setIsDataExpanded] = useState(true)
  const [dataLoading, setDataLoading] = useState(false)
  const [tableData, setTableData] = useState<any[]>([])
  const [sorting, setSorting] = useState<SortingState>([])

  // State for fullscreen/maximized view
  const [isChartMaximized, setIsChartMaximized] = useState(false)
  const [isDataMaximized, setIsDataMaximized] = useState(false)

  // Fetch JSON data from backend
  const loadTableData = useCallback(async (filename: string) => {
    setDataLoading(true)
    try {
      const response = await fetch(`/api/files/${filename}?session_id=${sessionId}`)

      if (response.ok) {
        // JSON files contain array of records directly
        if (filename.endsWith('.json')) {
          const data = await response.json()
          // Data should be in format: [{col1: val1, col2: val2}, ...]
          setTableData(Array.isArray(data) ? data : [])
        } else {
          console.log('Unsupported file format:', filename)
          setTableData([])
        }
      }
    } catch (error) {
      console.error('Failed to load table data:', error)
      setTableData([])
    } finally {
      setDataLoading(false)
    }
  }, [sessionId])

  // Load data when block is expanded and data file exists
  React.useEffect(() => {
    if (isBlockExpanded && content.files?.data && tableData.length === 0) {
      loadTableData(content.files.data)
    }
  }, [isBlockExpanded, content.files?.data, loadTableData, tableData.length])

  // Extract summary for collapsed view (first 150 chars of text content)
  const summary = content.text
    ? content.text.split('\n').find((line: string) => line.trim().length > 20)?.slice(0, 150) + '...'
    : 'Click to view analysis details'

  // Count available content types
  const hasText = !!content.text
  const hasChart = !!content.files?.chart
  const hasData = !!content.files?.data
  const contentTypesCount = [hasText, hasChart, hasData].filter(Boolean).length

  // Dynamic table columns
  const columns = React.useMemo(() => {
    if (tableData.length === 0) return []

    const firstRow = tableData[0]
    const columnHelper = createColumnHelper<any>()

    return Object.keys(firstRow).map(key =>
      columnHelper.accessor(key, {
        header: key,
        cell: info => {
          const value = info.getValue()
          if (typeof value === 'number') {
            return <span className="font-mono text-xs">{value.toLocaleString()}</span>
          }
          return <span className="text-xs">{String(value)}</span>
        },
      })
    )
  }, [tableData])

  // Create table instance
  const table = useReactTable({
    data: tableData,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: { pageSize: 10 }
    }
  })

  // Collapsed view - small card
  if (!isBlockExpanded) {
    return (
      <Card
        className="w-full cursor-pointer hover:bg-accent/50 transition-colors"
        onClick={() => setIsBlockExpanded(true)}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            {/* Icon indicator */}
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <BarChart className="h-4 w-4 text-primary" />
            </div>

            {/* Content preview */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-semibold text-sm truncate">{title}</h3>
                <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              </div>

              <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                {summary}
              </p>

              {/* Content type badges */}
              <div className="flex items-center gap-2 text-xs">
                {hasText && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                    <FileText className="h-3 w-3" />
                    Text
                  </span>
                )}
                {hasChart && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                    <BarChart className="h-3 w-3" />
                    Chart
                  </span>
                )}
                {hasData && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">
                    <FileText className="h-3 w-3" />
                    Data
                  </span>
                )}
                <span className="text-muted-foreground ml-auto">
                  {new Date(block.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Expanded view - full content
  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">{title}</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsBlockExpanded(false)}
            className="h-8 w-8 p-0"
          >
            <ChevronUp className="h-4 w-4" />
          </Button>
        </div>
        <span className="text-xs text-muted-foreground">
          {new Date(block.created_at).toLocaleString()}
        </span>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Markdown Text Content */}
        {content.text && (
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {content.text}
            </ReactMarkdown>
          </div>
        )}

        {/* Visualization Chart (HTML) */}
        {content.files?.chart && (
          <div className="border rounded-lg overflow-hidden">
            <div className="p-3 flex items-center justify-between hover:bg-accent hover:text-accent-foreground transition-colors">
              <button
                onClick={() => setIsChartExpanded(!isChartExpanded)}
                className="flex items-center gap-2 flex-1"
              >
                <BarChart className="h-4 w-4" />
                <span className="text-sm font-medium">Visualization</span>
                {isChartExpanded ? <ChevronUp className="h-4 w-4 ml-2" /> : <ChevronDown className="h-4 w-4 ml-2" />}
              </button>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  setIsChartMaximized(true)
                }}
                className="h-8 w-8 p-0"
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
            </div>

            {isChartExpanded && (
              <div className="w-full h-[400px] bg-white overflow-hidden">
                <iframe
                  src={`/api/files/${content.files.chart}?session_id=${sessionId}`}
                  className="w-full h-full border-0"
                  title="Visualization"
                  sandbox="allow-scripts allow-same-origin"
                  style={{ maxWidth: '100%' }}
                />
              </div>
            )}
          </div>
        )}

        {/* Data Table (JSON) */}
        {content.files?.data && (
          <div className="border rounded-lg overflow-hidden">
            <div className="p-3 flex items-center justify-between hover:bg-accent hover:text-accent-foreground transition-colors">
              <button
                onClick={() => setIsDataExpanded(!isDataExpanded)}
                className="flex items-center gap-2 flex-1"
              >
                <FileText className="h-4 w-4" />
                <span className="text-sm font-medium">Data Table</span>
                {tableData.length > 0 && (
                  <span className="text-xs text-muted-foreground">
                    ({tableData.length} rows)
                  </span>
                )}
                {isDataExpanded ? <ChevronUp className="h-4 w-4 ml-2" /> : <ChevronDown className="h-4 w-4 ml-2" />}
              </button>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  setIsDataMaximized(true)
                }}
                className="h-8 w-8 p-0"
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
            </div>

            {isDataExpanded && (
              <div className="w-full">
                {dataLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : tableData.length > 0 ? (
                  <>
                    {/* TanStack Table with horizontal scroll */}
                    <div className="overflow-x-auto border-t">
                      <div className="inline-block min-w-full align-middle">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50 sticky top-0">
                            {table.getHeaderGroups().map(headerGroup => (
                              <tr key={headerGroup.id}>
                                {headerGroup.headers.map(header => (
                                  <th
                                    key={header.id}
                                    className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 whitespace-nowrap"
                                    onClick={header.column.getToggleSortingHandler()}
                                  >
                                    {flexRender(
                                      header.column.columnDef.header,
                                      header.getContext()
                                    )}
                                    {header.column.getIsSorted() === 'asc' && ' ↑'}
                                    {header.column.getIsSorted() === 'desc' && ' ↓'}
                                  </th>
                                ))}
                              </tr>
                            ))}
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {table.getRowModel().rows.map(row => (
                              <tr key={row.id} className="hover:bg-gray-50">
                                {row.getVisibleCells().map(cell => (
                                  <td key={cell.id} className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                                    {flexRender(
                                      cell.column.columnDef.cell,
                                      cell.getContext()
                                    )}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Pagination Controls */}
                    <div className="flex items-center justify-between p-4 border-t bg-gray-50">
                      <div className="text-sm text-muted-foreground">
                        Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
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
              </div>
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
      <Dialog open={isChartMaximized} onOpenChange={setIsChartMaximized}>
        <DialogContent className="max-w-[90vw] max-h-[90vh] p-0">
          <DialogHeader className="p-6 pb-4">
            <DialogTitle>Visualization - {title}</DialogTitle>
          </DialogHeader>
          <div className="w-full h-[calc(90vh-8rem)] bg-white">
            <iframe
              src={`/api/files/${content.files?.chart}?session_id=${sessionId}`}
              className="w-full h-full border-0"
              title="Visualization (Maximized)"
              sandbox="allow-scripts allow-same-origin"
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Maximized Data Table Dialog */}
      <Dialog open={isDataMaximized} onOpenChange={setIsDataMaximized}>
        <DialogContent className="max-w-[90vw] max-h-[90vh] p-0 flex flex-col">
          <DialogHeader className="p-6 pb-4 border-b">
            <DialogTitle>Data Table - {title}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden">
            {dataLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : tableData.length > 0 ? (
              <>
                {/* Maximized TanStack Table with horizontal scroll */}
                <div className="overflow-x-auto h-[calc(90vh-12rem)]">
                  <div className="inline-block min-w-full align-middle">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50 sticky top-0 z-10">
                        {table.getHeaderGroups().map(headerGroup => (
                          <tr key={headerGroup.id}>
                            {headerGroup.headers.map(header => (
                              <th
                                key={header.id}
                                className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 whitespace-nowrap"
                                onClick={header.column.getToggleSortingHandler()}
                              >
                                {flexRender(
                                  header.column.columnDef.header,
                                  header.getContext()
                                )}
                                {header.column.getIsSorted() === 'asc' && ' ↑'}
                                {header.column.getIsSorted() === 'desc' && ' ↓'}
                              </th>
                            ))}
                          </tr>
                        ))}
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {table.getRowModel().rows.map(row => (
                          <tr key={row.id} className="hover:bg-gray-50">
                            {row.getVisibleCells().map(cell => (
                              <td key={cell.id} className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                {flexRender(
                                  cell.column.columnDef.cell,
                                  cell.getContext()
                                )}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Pagination Controls */}
                <div className="flex items-center justify-between p-4 border-t bg-gray-50">
                  <div className="text-sm text-muted-foreground">
                    Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
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
    </Card>
  )
}