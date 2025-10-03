'use client'

import React, { useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FileText, BarChart, ChevronUp, ChevronDown, Loader2 } from 'lucide-react'
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
 */
export function AnalysisBlockRenderer({ block }: AnalysisBlockProps) {
  const { content } = block

  // Get session ID from URL or context (you need to pass this from parent)
  // For now, we'll extract from the block's metadata if available
  const sessionId = block.chat_id || window.location.pathname.split('/').pop()

  // Extract title (flexible field naming)
  const title = content.title || content.name || 'Analysis Block'

  // State for collapsible sections
  const [isChartExpanded, setIsChartExpanded] = useState(true)
  const [isDataExpanded, setIsDataExpanded] = useState(true)
  const [dataLoading, setDataLoading] = useState(false)
  const [tableData, setTableData] = useState<any[]>([])
  const [sorting, setSorting] = useState<SortingState>([])

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

  // Load data when component mounts if data file exists
  React.useEffect(() => {
    if (content.files?.data && tableData.length === 0) {
      loadTableData(content.files.data)
    }
  }, [content.files?.data, loadTableData, tableData.length])

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

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">{title}</CardTitle>
          <span className="text-xs text-muted-foreground">
            {new Date(block.created_at).toLocaleString()}
          </span>
        </div>
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
          <div className="border rounded-lg">
            <button
              onClick={() => setIsChartExpanded(!isChartExpanded)}
              className="w-full p-3 flex items-center justify-between hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              <div className="flex items-center gap-2">
                <BarChart className="h-4 w-4" />
                <span className="text-sm font-medium">Visualization</span>
              </div>
              {isChartExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>

            {isChartExpanded && (
              <div className="w-full h-[500px] bg-white">
                {/* 直接渲染 HTML 文件 */}
                <iframe
                  src={`/api/files/${content.files.chart}?session_id=${sessionId}`}
                  className="w-full h-full border-0"
                  title="Visualization"
                  sandbox="allow-scripts allow-same-origin"
                />
              </div>
            )}
          </div>
        )}

        {/* Data Table (JSON) */}
        {content.files?.data && (
          <div className="border rounded-lg">
            <button
              onClick={() => setIsDataExpanded(!isDataExpanded)}
              className="w-full p-3 flex items-center justify-between hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <span className="text-sm font-medium">Data Table</span>
                {tableData.length > 0 && (
                  <span className="text-xs text-muted-foreground">
                    ({tableData.length} rows)
                  </span>
                )}
              </div>
              {isDataExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>

            {isDataExpanded && (
              <div className="p-4">
                {dataLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : tableData.length > 0 ? (
                  <>
                    {/* TanStack Table */}
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          {table.getHeaderGroups().map(headerGroup => (
                            <tr key={headerGroup.id}>
                              {headerGroup.headers.map(header => (
                                <th
                                  key={header.id}
                                  className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
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
                    <div className="flex items-center justify-between mt-4">
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
    </Card>
  )
}