'use client'

import React, { useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FileText, BarChart, ChevronUp, ChevronDown, Loader2, ChevronRight, Maximize2, X, Download, FileSpreadsheet, Search } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
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
} from '@tanstack/react-table'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import * as XLSX from 'xlsx'

interface AnalysisBlockProps {
  block: {
    id: string
    content: any
    created_at: string
    chat_id?: string  // Added to pass session ID
  }
  isExpanded: boolean
  onToggle: () => void
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
export function AnalysisBlockRenderer({ block, isExpanded, onToggle }: AnalysisBlockProps) {
  const { content } = block

  // Get session ID from URL or context (you need to pass this from parent)
  // For now, we'll extract from the block's metadata if available
  const sessionId = block.chat_id || window.location.pathname.split('/').pop()

  // Extract title (flexible field naming)
  const title = content.title || content.name || 'Analysis Block'

  // State for collapsible sections (only used when block is expanded)
  const [isChartExpanded, setIsChartExpanded] = useState(true)
  const [isDataExpanded, setIsDataExpanded] = useState(true)
  const [dataLoading, setDataLoading] = useState(false)
  const [tableData, setTableData] = useState<any[]>([])
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [selectedDataIndex, setSelectedDataIndex] = useState(0) // Track which data table to show

  // State for fullscreen/maximized view - support multiple charts
  const [maximizedChart, setMaximizedChart] = useState<string | null>(null)
  const [isDataMaximized, setIsDataMaximized] = useState(false)

  // Normalize files to arrays (support both single file and multiple files)
  const charts = React.useMemo(() => {
    if (content.files?.charts) return content.files.charts // Multiple files
    if (content.files?.chart) return [content.files.chart] // Single file (backward compatible)
    return []
  }, [content.files])

  const dataFiles = React.useMemo(() => {
    if (Array.isArray(content.files?.data)) return content.files.data // Multiple files
    if (content.files?.data) return [content.files.data] // Single file (backward compatible)
    return []
  }, [content.files])

  const reports = React.useMemo(() => {
    if (content.files?.reports) return content.files.reports // Multiple PDFs
    if (content.files?.report) return [content.files.report] // Single PDF
    return []
  }, [content.files])

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

  // Load data when block is expanded or selected data index changes
  React.useEffect(() => {
    if (isExpanded && dataFiles.length > 0) {
      // Load selected data file
      const selectedFile = dataFiles[selectedDataIndex] || dataFiles[0]
      loadTableData(selectedFile)
    }
  }, [isExpanded, dataFiles, selectedDataIndex, loadTableData])

  // Extract summary for collapsed view (first 150 chars of text content)
  const summary = content.text
    ? content.text.split('\n').find((line: string) => line.trim().length > 20)?.slice(0, 150) + '...'
    : 'Click to view analysis details'

  // PDF download handler
  const handleDownloadPDF = useCallback((filename: string) => {
    const url = `/api/files/${filename}?session_id=${sessionId}`
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.click()
  }, [sessionId])

  // Excel export handler
  const handleExportExcel = useCallback(() => {
    if (tableData.length === 0) return

    const worksheet = XLSX.utils.json_to_sheet(tableData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Data')

    const fileName = dataFiles[selectedDataIndex]?.replace('.json', '.xlsx') || 'table_export.xlsx'
    XLSX.writeFile(workbook, fileName)
  }, [tableData, dataFiles, selectedDataIndex])

  // Count available content types
  const hasText = !!content.text
  const hasChart = charts.length > 0
  const hasData = dataFiles.length > 0
  const hasReport = reports.length > 0
  const contentTypesCount = [hasText, hasChart, hasData, hasReport].filter(Boolean).length

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
      pagination: { pageSize: 10 }
    }
  })

  // Collapsed view - small card
  if (!isExpanded) {
    return (
      <Card
        className="w-full cursor-pointer group"
        onClick={onToggle}
      >
        <CardContent className="p-5">
          <div className="flex items-start gap-4">
            {/* Icon indicator - neumorphic circle */}
            <div className="flex-shrink-0 w-10 h-10 rounded-full neuro-raised-sm bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/30 dark:to-orange-800/30 flex items-center justify-center">
              <BarChart className="h-5 w-5 text-primary" />
            </div>

            {/* Content preview */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-base truncate">{title}</h3>
                <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0 group-hover:translate-x-1 transition-transform" />
              </div>

              <p className="text-sm text-muted-foreground line-clamp-2 mb-3 leading-relaxed">
                {summary}
              </p>

              {/* Content type badges - neumorphic pills */}
              <div className="flex items-center gap-2 text-xs">
                {hasText && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full neuro-raised-sm bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 text-blue-700 dark:text-blue-400 font-medium">
                    <FileText className="h-3 w-3" />
                    Text
                  </span>
                )}
                {hasChart && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full neuro-raised-sm bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 text-green-700 dark:text-green-400 font-medium">
                    <BarChart className="h-3 w-3" />
                    Chart
                  </span>
                )}
                {hasData && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full neuro-raised-sm bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/30 dark:to-orange-800/30 text-orange-700 dark:text-orange-400 font-medium">
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
    )
  }

  // Expanded view - full content
  return (
    <Card className="w-full overflow-hidden">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">{title}</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
            className="h-8 w-8 p-0"
          >
            <ChevronUp className="h-4 w-4" />
          </Button>
        </div>
        <span className="text-xs text-muted-foreground">
          {new Date(block.created_at).toLocaleString()}
        </span>
      </CardHeader>
      <CardContent className="space-y-4 w-full max-w-full overflow-hidden">
        {/* Markdown Text Content */}
        {content.text && (
          <div className="prose prose-sm dark:prose-invert max-w-full break-words">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {content.text}
            </ReactMarkdown>
          </div>
        )}

        {/* Visualization Charts (HTML) - Support multiple charts */}
        {charts.length > 0 && (
          <div className="space-y-4">
            {charts.length > 1 && (
              <div className="flex items-center gap-2">
                <BarChart className="h-4 w-4" />
                <span className="text-sm font-semibold">Visualizations ({charts.length})</span>
              </div>
            )}
            {charts.map((chartFile: string, index: number) => (
              <div key={chartFile} className="border rounded-lg overflow-hidden w-full max-w-full">
                <div className="p-3 flex items-center justify-between hover:bg-accent hover:text-accent-foreground transition-colors">
                  <button
                    onClick={() => setIsChartExpanded(!isChartExpanded)}
                    className="flex items-center gap-2 flex-1"
                  >
                    <BarChart className="h-4 w-4" />
                    <span className="text-sm font-medium">
                      {charts.length === 1 ? 'Visualization' : `Visualization ${index + 1}`}
                    </span>
                    {isChartExpanded ? <ChevronUp className="h-4 w-4 ml-2" /> : <ChevronDown className="h-4 w-4 ml-2" />}
                  </button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      setMaximizedChart(chartFile)
                    }}
                    className="h-8 w-8 p-0"
                  >
                    <Maximize2 className="h-4 w-4" />
                  </Button>
                </div>

                {isChartExpanded && (
                  <div className="w-full h-[400px] bg-white overflow-auto">
                    <iframe
                      src={`/api/files/${chartFile}?session_id=${sessionId}`}
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
                  key={index}
                  onClick={() => handleDownloadPDF(reportFile)}
                  variant="outline"
                  className="w-full justify-start gap-2 neuro-inset hover:neuro-raised transition-all"
                >
                  <Download className="w-4 h-4" />
                  <span className="flex-1 text-left truncate">{reportFile}</span>
                  <span className="text-xs text-gray-500 px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800">PDF</span>
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Data Table (JSON) - Support multiple data files */}
        {dataFiles.length > 0 && (
          <div className="border rounded-lg w-full" style={{ maxWidth: '100%' }}>
            {/* Header with collapse button and actions */}
            <div className="p-3 flex items-center justify-between hover:bg-accent hover:text-accent-foreground transition-colors">
              <button
                onClick={() => setIsDataExpanded(!isDataExpanded)}
                className="flex items-center gap-2 flex-1"
              >
                <FileText className="h-4 w-4" />
                <span className="text-sm font-medium">
                  {dataFiles.length === 1 ? 'Data Table' : `Data Tables (${dataFiles.length})`}
                </span>
                {tableData.length > 0 && (
                  <span className="text-xs text-muted-foreground">
                    ({table.getFilteredRowModel().rows.length} / {tableData.length} rows)
                  </span>
                )}
                {isDataExpanded ? <ChevronUp className="h-4 w-4 ml-2" /> : <ChevronDown className="h-4 w-4 ml-2" />}
              </button>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleExportExcel()
                  }}
                  className="h-8 px-3"
                  disabled={tableData.length === 0}
                >
                  <FileSpreadsheet className="h-4 w-4 mr-1" />
                  <span className="text-xs">Export</span>
                </Button>
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
            </div>

            {/* Tab navigation for multiple data files */}
            {isDataExpanded && dataFiles.length > 1 && (
              <div className="flex gap-1 px-3 py-2 bg-muted/50 border-t overflow-x-auto">
                {dataFiles.map((file: string, index: number) => (
                  <button
                    key={file}
                    onClick={() => setSelectedDataIndex(index)}
                    className={cn(
                      "px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap",
                      selectedDataIndex === index
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                    )}
                  >
                    Table {index + 1}
                  </button>
                ))}
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
                    <div className="border-t max-h-[500px] overflow-auto" style={{ width: '100%', display: 'block' }}>
                      <table className="divide-y divide-gray-200" style={{ width: 'max-content', minWidth: '100%' }}>
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
      <Dialog open={!!maximizedChart} onOpenChange={(open) => !open && setMaximizedChart(null)}>
        <DialogContent className="max-w-[90vw] max-h-[90vh] p-0">
          <DialogHeader className="p-6 pb-4">
            <DialogTitle>Visualization - {title}</DialogTitle>
          </DialogHeader>
          <div className="w-full h-[calc(90vh-8rem)] bg-white">
            {maximizedChart && (
              <iframe
                src={`/api/files/${maximizedChart}?session_id=${sessionId}`}
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
              <DialogTitle>Data Table - {title}</DialogTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportExcel}
                className="h-8 px-3"
                disabled={tableData.length === 0}
              >
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Export to Excel
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
                    Showing {table.getFilteredRowModel().rows.length} of {tableData.length} rows
                  </div>
                </div>

                {/* Maximized TanStack Table with horizontal scroll */}
                <div className="h-[calc(90vh-16rem)] overflow-auto" style={{ width: '100%', display: 'block' }}>
                    <table className="divide-y divide-gray-200" style={{ width: 'max-content', minWidth: '100%' }}>
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