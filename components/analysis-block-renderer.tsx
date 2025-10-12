'use client'

import React, { useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  FileText,
  BarChart,
  ChevronUp,
  ChevronDown,
  Loader2,
  ChevronRight,
  Maximize2,
  Download,
  FileSpreadsheet,
  Search,
  Copy,
  Check
} from 'lucide-react'
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
    chat_id?: string
  }
  isExpanded: boolean
  onToggle: () => void
}

/**
 * Analysis Block Renderer - Ultra-premium 2025 design
 * Clean, minimal styling with Stripe/Linear inspiration
 * Only gray + brand color system, no neumorphism or gradients
 */
export function AnalysisBlockRenderer({ block, isExpanded, onToggle }: AnalysisBlockProps) {
  const { content } = block

  // Get session ID from URL or context
  const sessionId = block.chat_id || window.location.pathname.split('/').pop()

  // Extract title
  const title = content.title || content.name || 'Analysis Block'

  // State management
  const [isChartExpanded, setIsChartExpanded] = useState(true)
  const [isDataExpanded, setIsDataExpanded] = useState(true)
  const [dataLoading, setDataLoading] = useState(false)
  const [tableData, setTableData] = useState<any[]>([])
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [selectedDataIndex, setSelectedDataIndex] = useState(0)
  const [maximizedChart, setMaximizedChart] = useState<string | null>(null)
  const [isDataMaximized, setIsDataMaximized] = useState(false)
  const [copied, setCopied] = useState(false)

  // Normalize files to arrays
  const charts = React.useMemo(() => {
    if (content.files?.charts) return content.files.charts
    if (content.files?.chart) return [content.files.chart]
    return []
  }, [content.files])

  const dataFiles = React.useMemo(() => {
    if (Array.isArray(content.files?.data)) return content.files.data
    if (content.files?.data) return [content.files.data]
    return []
  }, [content.files])

  const reports = React.useMemo(() => {
    if (content.files?.reports) return content.files.reports
    if (content.files?.report) return [content.files.report]
    return []
  }, [content.files])

  // Fetch JSON data from backend
  const loadTableData = useCallback(async (filename: string) => {
    setDataLoading(true)
    try {
      const response = await fetch(`/api/files/${filename}?session_id=${sessionId}`)

      if (response.ok) {
        if (filename.endsWith('.json')) {
          const data = await response.json()
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

  // Load data when block is expanded
  React.useEffect(() => {
    if (isExpanded && dataFiles.length > 0) {
      const selectedFile = dataFiles[selectedDataIndex] || dataFiles[0]
      loadTableData(selectedFile)
    }
  }, [isExpanded, dataFiles, selectedDataIndex, loadTableData])

  // Extract summary for collapsed view
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

  // Copy handler
  const handleCopy = useCallback(() => {
    if (content.text) {
      navigator.clipboard.writeText(content.text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [content.text])

  // Count available content types
  const hasText = !!content.text
  const hasChart = charts.length > 0
  const hasData = dataFiles.length > 0
  const hasReport = reports.length > 0

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

  // Collapsed view - minimal card
  if (!isExpanded) {
    return (
      <Card
        className="w-full cursor-pointer group hover:border-brand-primary/20 transition-all duration-200"
        onClick={onToggle}
      >
        <CardContent className="p-5">
          <div className="flex items-start gap-4">
            {/* Icon indicator */}
            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-muted flex items-center justify-center group-hover:bg-brand-primary/10 transition-colors duration-200">
              <BarChart className="h-5 w-5 text-muted-foreground group-hover:text-brand-primary transition-colors duration-200" />
            </div>

            {/* Content preview */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-base truncate text-foreground">{title}</h3>
                <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0 group-hover:translate-x-1 transition-transform duration-200" />
              </div>

              <p className="text-sm text-muted-foreground line-clamp-2 mb-3 leading-relaxed">
                {summary}
              </p>

              {/* Content type badges - clean pills */}
              <div className="flex items-center gap-2 text-xs">
                {hasText && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted text-muted-foreground font-medium">
                    <FileText className="h-3 w-3" />
                    Text
                  </span>
                )}
                {hasChart && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted text-muted-foreground font-medium">
                    <BarChart className="h-3 w-3" />
                    Chart
                  </span>
                )}
                {hasData && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted text-muted-foreground font-medium">
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
    <Card className="w-full overflow-hidden border-brand-primary/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-foreground">{title}</CardTitle>
          <div className="flex items-center gap-2">
            {content.text && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopy}
                className="h-8 w-8 p-0 hover:bg-muted transition-colors duration-200"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-brand-primary" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggle}
              className="h-8 w-8 p-0 hover:bg-muted transition-colors duration-200"
            >
              <ChevronUp className="h-4 w-4" />
            </Button>
          </div>
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

        {/* Visualization Charts */}
        {charts.length > 0 && (
          <div className="space-y-4">
            {charts.length > 1 && (
              <div className="flex items-center gap-2">
                <BarChart className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-semibold text-foreground">Visualizations ({charts.length})</span>
              </div>
            )}
            {charts.map((chartFile: string, index: number) => (
              <div key={chartFile} className="border border-border rounded-lg overflow-hidden w-full max-w-full">
                <div className="p-3 flex items-center justify-between bg-card hover:bg-muted/50 transition-colors duration-200">
                  <button
                    onClick={() => setIsChartExpanded(!isChartExpanded)}
                    className="flex items-center gap-2 flex-1 text-foreground"
                  >
                    <BarChart className="h-4 w-4" />
                    <span className="text-sm font-medium">
                      {charts.length === 1 ? 'Visualization' : `Visualization ${index + 1}`}
                    </span>
                    {isChartExpanded ? (
                      <ChevronUp className="h-4 w-4 ml-2 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 ml-2 text-muted-foreground" />
                    )}
                  </button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      setMaximizedChart(chartFile)
                    }}
                    className="h-8 w-8 p-0 hover:bg-muted transition-colors duration-200"
                  >
                    <Maximize2 className="h-4 w-4" />
                  </Button>
                </div>

                {isChartExpanded && (
                  <div className="w-full h-[400px] bg-muted/50 overflow-auto">
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

        {/* PDF Reports */}
        {reports.length > 0 && (
          <div className="mt-4 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <FileText className="w-4 h-4" />
              <span>Report{reports.length > 1 ? 's' : ''}</span>
            </div>

            <div className="space-y-2">
              {reports.map((reportFile: string, index: number) => (
                <Button
                  key={index}
                  onClick={() => handleDownloadPDF(reportFile)}
                  variant="outline"
                  className="w-full justify-start gap-2 hover:bg-muted transition-colors duration-200"
                >
                  <Download className="w-4 h-4" />
                  <span className="flex-1 text-left truncate">{reportFile}</span>
                  <span className="text-xs text-muted-foreground px-2 py-0.5 rounded-md bg-muted">PDF</span>
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Data Table */}
        {dataFiles.length > 0 && (
          <div className="border border-border rounded-lg w-full" style={{ maxWidth: '100%' }}>
            {/* Header with collapse button and actions */}
            <div className="p-3 flex items-center justify-between bg-card hover:bg-muted/50 transition-colors duration-200">
              <button
                onClick={() => setIsDataExpanded(!isDataExpanded)}
                className="flex items-center gap-2 flex-1 text-foreground"
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
                {isDataExpanded ? (
                  <ChevronUp className="h-4 w-4 ml-2 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 ml-2 text-muted-foreground" />
                )}
              </button>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleExportExcel()
                  }}
                  className="h-8 px-3 hover:bg-muted transition-colors duration-200"
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
                  className="h-8 w-8 p-0 hover:bg-muted transition-colors duration-200"
                >
                  <Maximize2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Tab navigation for multiple data files */}
            {isDataExpanded && dataFiles.length > 1 && (
              <div className="flex gap-1 px-3 py-2 bg-muted/50 border-t border-border overflow-x-auto">
                {dataFiles.map((file: string, index: number) => (
                  <button
                    key={file}
                    onClick={() => setSelectedDataIndex(index)}
                    className={cn(
                      "px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 whitespace-nowrap",
                      selectedDataIndex === index
                        ? "bg-background text-foreground border border-border shadow-sm"
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
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : tableData.length > 0 ? (
                  <>
                    {/* Search bar */}
                    <div className="px-3 py-2 border-t border-border bg-muted/30">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search all columns..."
                          value={globalFilter ?? ''}
                          onChange={(e) => setGlobalFilter(e.target.value)}
                          className="pl-9 h-8 text-xs bg-background"
                        />
                      </div>
                    </div>

                    {/* TanStack Table with horizontal scroll */}
                    <div className="border-t border-border max-h-[500px] overflow-auto" style={{ width: '100%', display: 'block' }}>
                      <table className="divide-y divide-border" style={{ width: 'max-content', minWidth: '100%' }}>
                        <thead className="bg-muted/50 sticky top-0">
                          {table.getHeaderGroups().map(headerGroup => (
                            <tr key={headerGroup.id}>
                              {headerGroup.headers.map(header => (
                                <th
                                  key={header.id}
                                  className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:bg-muted transition-colors duration-200 whitespace-nowrap"
                                  onClick={header.column.getToggleSortingHandler()}
                                >
                                  <div className="flex items-center gap-1">
                                    {flexRender(
                                      header.column.columnDef.header,
                                      header.getContext()
                                    )}
                                    {header.column.getIsSorted() === 'asc' && <ChevronUp className="h-3 w-3" />}
                                    {header.column.getIsSorted() === 'desc' && <ChevronDown className="h-3 w-3" />}
                                  </div>
                                </th>
                              ))}
                            </tr>
                          ))}
                        </thead>
                        <tbody className="bg-background divide-y divide-border">
                          {table.getRowModel().rows.map(row => (
                            <tr key={row.id} className="hover:bg-muted/50 transition-colors duration-200">
                              {row.getVisibleCells().map(cell => (
                                <td key={cell.id} className="px-3 py-2 whitespace-nowrap text-sm text-foreground">
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
                    <div className="flex items-center justify-between p-4 border-t border-border bg-muted/50">
                      <div className="text-sm text-muted-foreground">
                        Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => table.previousPage()}
                          disabled={!table.getCanPreviousPage()}
                          className="transition-colors duration-200"
                        >
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => table.nextPage()}
                          disabled={!table.getCanNextPage()}
                          className="transition-colors duration-200"
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
        <DialogContent className="max-w-[90vw] max-h-[90vh] p-0 bg-card border border-border">
          <DialogHeader className="p-6 pb-4 border-b border-border">
            <DialogTitle className="text-foreground">Visualization - {title}</DialogTitle>
          </DialogHeader>
          <div className="w-full h-[calc(90vh-8rem)] bg-muted/50">
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
        <DialogContent className="max-w-[90vw] max-h-[90vh] p-0 flex flex-col bg-card border border-border">
          <DialogHeader className="p-6 pb-4 border-b border-border">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-foreground">Data Table - {title}</DialogTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportExcel}
                className="h-8 px-3 transition-colors duration-200"
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
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : tableData.length > 0 ? (
              <>
                {/* Search bar in maximized view */}
                <div className="px-6 py-3 border-b border-border bg-muted/30">
                  <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search all columns..."
                      value={globalFilter ?? ''}
                      onChange={(e) => setGlobalFilter(e.target.value)}
                      className="pl-9 h-9 text-sm bg-background"
                    />
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    Showing {table.getFilteredRowModel().rows.length} of {tableData.length} rows
                  </div>
                </div>

                {/* Maximized TanStack Table */}
                <div className="h-[calc(90vh-16rem)] overflow-auto" style={{ width: '100%', display: 'block' }}>
                  <table className="divide-y divide-border" style={{ width: 'max-content', minWidth: '100%' }}>
                    <thead className="bg-muted/50 sticky top-0 z-10">
                      {table.getHeaderGroups().map(headerGroup => (
                        <tr key={headerGroup.id}>
                          {headerGroup.headers.map(header => (
                            <th
                              key={header.id}
                              className="px-4 py-3 text-left text-sm font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:bg-muted transition-colors duration-200 whitespace-nowrap"
                              onClick={header.column.getToggleSortingHandler()}
                            >
                              <div className="flex items-center gap-1">
                                {flexRender(
                                  header.column.columnDef.header,
                                  header.getContext()
                                )}
                                {header.column.getIsSorted() === 'asc' && <ChevronUp className="h-3 w-3" />}
                                {header.column.getIsSorted() === 'desc' && <ChevronDown className="h-3 w-3" />}
                              </div>
                            </th>
                          ))}
                        </tr>
                      ))}
                    </thead>
                    <tbody className="bg-background divide-y divide-border">
                      {table.getRowModel().rows.map(row => (
                        <tr key={row.id} className="hover:bg-muted/50 transition-colors duration-200">
                          {row.getVisibleCells().map(cell => (
                            <td key={cell.id} className="px-4 py-3 whitespace-nowrap text-sm text-foreground">
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
                <div className="flex items-center justify-between p-4 border-t border-border bg-muted/50">
                  <div className="text-sm text-muted-foreground">
                    Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => table.previousPage()}
                      disabled={!table.getCanPreviousPage()}
                      className="transition-colors duration-200"
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => table.nextPage()}
                      disabled={!table.getCanNextPage()}
                      className="transition-colors duration-200"
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
