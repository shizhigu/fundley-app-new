'use client'

import { useState, useEffect } from 'react'
import { Star, Loader2, Download, Play, RefreshCw, Settings } from 'lucide-react'
import { useTranslations } from 'next-intl'
import * as XLSX from 'xlsx'
import { SettingsDialog } from './settings-dialog'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
} from '@tanstack/react-table'

interface QueryResult {
  success: boolean
  data: Record<string, any>[]
  columns: string[]
  row_count: number
  error?: string
}

export function WatchlistTablePanel() {
  const t = useTranslations('watchlist')
  const [sql, setSql] = useState('')
  const [result, setResult] = useState<QueryResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [watchlistSymbols, setWatchlistSymbols] = useState<string[]>([])
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settingsTab, setSettingsTab] = useState<'watchlist'>('watchlist')

  // Template version - increment this when template changes
  const TEMPLATE_VERSION = '4'

  // Template SQL with placeholder for watchlist symbols
  const templateSQL = `WITH watchlist_symbols AS (
    SELECT * FROM (VALUES
        {{WATCHLIST_SYMBOLS}}
    ) AS t(symbol)
),
latest_dates AS (
    SELECT
        e.symbol,
        MAX(e.date) AS latest_date
    FROM eod_data e
    JOIN watchlist_symbols w ON e.symbol = w.symbol
    GROUP BY e.symbol
),
latest_prices AS (
    SELECT
        e.symbol,
        e.close AS close_price,
        e.date AS price_date
    FROM eod_data e
    JOIN latest_dates ld ON e.symbol = ld.symbol AND e.date = ld.latest_date
),
price_26w AS (
    SELECT
        e.symbol,
        MAX(e.high) AS high_26w
    FROM eod_data e
    JOIN latest_dates ld ON e.symbol = ld.symbol
    WHERE e.date >= ld.latest_date - INTERVAL '182 days'
    GROUP BY e.symbol
),
normalized AS (
    SELECT
        TRIM(fs.symbol) AS symbol,
        fs.fiscalyear,
        fs.period,
        CASE fs.period
            WHEN 'Q1' THEN 1
            WHEN 'Q2' THEN 2
            WHEN 'Q3' THEN 3
            WHEN 'Q4' THEN 4
            ELSE NULL
        END AS quarter_order,
        fs.ebit,
        fs.totalassets,
        fs.totalcurrentliabilities
    FROM financial_statements fs
    JOIN watchlist_symbols w ON TRIM(fs.symbol) = w.symbol
    WHERE fs.period IN ('Q1', 'Q2', 'Q3', 'Q4')
      AND fs.ebit IS NOT NULL
      AND fs.totalassets IS NOT NULL
      AND fs.totalcurrentliabilities IS NOT NULL
),
fs_roce AS (
    SELECT
        symbol,
        fiscalyear,
        period,
        quarter_order,
        (ebit * 100 / NULLIF(
            ((totalassets + LAG(totalassets, 1) OVER (PARTITION BY symbol ORDER BY fiscalyear, quarter_order)) / 2.0)
            - ((totalcurrentliabilities + LAG(totalcurrentliabilities, 1) OVER (PARTITION BY symbol ORDER BY fiscalyear, quarter_order)) / 2.0)
        , 0))::NUMERIC AS roce_value
    FROM normalized
    WHERE quarter_order IS NOT NULL
),
recent AS (
    SELECT
        symbol,
        fiscalyear,
        period,
        quarter_order,
        roce_value,
        ROW_NUMBER() OVER (PARTITION BY symbol ORDER BY fiscalyear DESC, quarter_order DESC) AS quarter_rank
    FROM fs_roce
),
latest_roce AS (
    SELECT
        symbol,
        CONCAT(fiscalyear, '年', period) AS latest_quarter,
        roce_value
    FROM recent
    WHERE quarter_rank = 1
),
ttm_roce AS (
    SELECT
        symbol,
        SUM(roce_value) AS sum_roce,
        COUNT(*) AS quarter_count
    FROM recent
    WHERE quarter_rank <= 4
    GROUP BY symbol
),
company_data AS (
    SELECT
        TRIM(cp.symbol) AS symbol,
        cp.companyname,
        cp.marketcap,
        cp.industry
    FROM company_profiles cp
    JOIN watchlist_symbols w ON TRIM(cp.symbol) = w.symbol
),
atm_put_options AS (
    SELECT
        oe.underlying_symbol AS symbol,
        oe.expiration_date,
        oe.strike_price,
        oe.close AS option_premium,
        lp.close_price AS stock_price,
        ABS(DATE_DIFF('day', CURRENT_DATE, CAST(oe.expiration_date AS DATE)) - 30) AS days_diff_from_30,
        ABS(oe.strike_price - lp.close_price) AS strike_diff,
        ROW_NUMBER() OVER (
            PARTITION BY oe.underlying_symbol
            ORDER BY
                ABS(DATE_DIFF('day', CURRENT_DATE, CAST(oe.expiration_date AS DATE)) - 30),
                ABS(oe.strike_price - lp.close_price)
        ) AS option_rank
    FROM options_eod_data oe
    JOIN latest_prices lp ON oe.underlying_symbol = lp.symbol
    JOIN watchlist_symbols w ON oe.underlying_symbol = w.symbol
    WHERE oe.option_type = 'put'
      AND CAST(oe.expiration_date AS DATE) > CURRENT_DATE
      AND CAST(oe.expiration_date AS DATE) <= CURRENT_DATE + INTERVAL 60 DAY
),
selected_options AS (
    SELECT
        symbol,
        expiration_date,
        strike_price,
        option_premium,
        stock_price,
        ROUND((option_premium / NULLIF(strike_price, 0)) * 100, 2) AS premium_pct
    FROM atm_put_options
    WHERE option_rank = 1
)
SELECT
    w.symbol AS "股票代码",
    cd.companyname AS "公司名称",
    ROUND(cd.marketcap, 2) AS "市值(美元)",
    ROUND(lp.close_price, 2) AS "前一日收盘价(美元)",
    ROUND(p26.high_26w, 2) AS "26周内最高价(美元)",
    CASE
        WHEN p26.high_26w IS NULL OR p26.high_26w = 0 THEN NULL
        ELSE CONCAT(ROUND(lp.close_price * 100.0 / p26.high_26w, 1), '%')
    END AS "收盘价/26周高点",
    ROUND(lr.roce_value, 1) AS "最新季度ROCE(%)",
    CASE WHEN tr.quarter_count = 4 THEN ROUND(tr.sum_roce, 1) ELSE NULL END AS "ROCE TTM(%)",
    so.expiration_date AS "Put期权到期日",
    ROUND(so.strike_price, 2) AS "Put行权价(美元)",
    ROUND(so.option_premium, 2) AS "Put权利金(美元)",
    so.premium_pct AS "权利金/行权价(%)"
FROM watchlist_symbols w
LEFT JOIN company_data cd ON w.symbol = cd.symbol
LEFT JOIN latest_prices lp ON w.symbol = lp.symbol
LEFT JOIN price_26w p26 ON w.symbol = p26.symbol
LEFT JOIN latest_roce lr ON w.symbol = lr.symbol
LEFT JOIN ttm_roce tr ON w.symbol = tr.symbol
LEFT JOIN selected_options so ON w.symbol = so.symbol
ORDER BY w.symbol;`

  // Fetch watchlist symbols on mount
  useEffect(() => {
    fetchWatchlistSymbols()
  }, [])

  const fetchWatchlistSymbols = async () => {
    try {
      const response = await fetch('/api/watchlist')
      const data = await response.json()
      if (data.watchlist) {
        const symbols = data.watchlist.map((item: any) => item.symbol)
        setWatchlistSymbols(symbols)
      }
    } catch (error) {
      console.error('Failed to fetch watchlist:', error)
    }
  }

  // Load saved SQL or use template when watchlist symbols are loaded
  useEffect(() => {
    if (watchlistSymbols.length === 0) return

    if (typeof window !== 'undefined') {
      const savedVersion = localStorage.getItem('watchlist_template_version')
      const savedSQL = localStorage.getItem('watchlist_last_sql')
      const savedResult = localStorage.getItem('watchlist_last_result')

      // If template version changed, clear cache and use new template
      if (savedVersion !== TEMPLATE_VERSION) {
        console.log('Template version updated, clearing cache...')
        localStorage.removeItem('watchlist_last_sql')
        localStorage.removeItem('watchlist_last_result')
        localStorage.setItem('watchlist_template_version', TEMPLATE_VERSION)

        // Generate new SQL from template
        const symbolsString = watchlistSymbols.map((s: string) => `('${s}')`).join(',\n        ')
        const populatedSQL = templateSQL.replace('{{WATCHLIST_SYMBOLS}}', symbolsString)
        setSql(populatedSQL)
      } else if (savedSQL) {
        setSql(savedSQL)

        if (savedResult) {
          try {
            const parsed = JSON.parse(savedResult)
            setResult(parsed)
          } catch (e) {
            console.warn('Failed to parse saved watchlist result:', e)
          }
        }
      } else {
        // Use template SQL with symbols replaced
        const symbolsString = watchlistSymbols.map((s: string) => `('${s}')`).join(',\n        ')
        const populatedSQL = templateSQL.replace('{{WATCHLIST_SYMBOLS}}', symbolsString)
        setSql(populatedSQL)
      }
    }
  }, [watchlistSymbols])

  // Auto-execute query on mount if no saved result
  useEffect(() => {
    if (!result && sql && watchlistSymbols.length > 0) {
      handleExecute()
    }
  }, [sql])

  const handleExecute = async () => {
    if (!sql.trim() || isLoading) return

    setIsLoading(true)
    setResult(null)

    try {
      const queryResponse = await fetch('/api/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sql: sql.trim() }),
      })

      if (!queryResponse.ok) {
        const errorText = await queryResponse.text()
        throw new Error(`Failed to execute SQL query: ${errorText}`)
      }

      const queryResult: QueryResult = await queryResponse.json()

      setResult(queryResult)

      // Save to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('watchlist_last_sql', sql.trim())
        localStorage.setItem('watchlist_last_result', JSON.stringify(queryResult))
      }
    } catch (error) {
      console.error('Watchlist query error:', error)
      setResult({
        success: false,
        data: [],
        columns: [],
        row_count: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Dynamic columns from result
  const columns: ColumnDef<Record<string, any>>[] =
    result?.columns?.map((col) => ({
      accessorKey: col,
      header: col.charAt(0).toUpperCase() + col.slice(1).replace(/_/g, ' '),
      cell: ({ getValue }) => {
        const value = getValue()
        // Format numbers
        if (typeof value === 'number') {
          return value.toLocaleString()
        }
        // Format dates
        if (col.includes('_at') && value && (typeof value === 'string' || typeof value === 'number')) {
          return new Date(value).toLocaleDateString()
        }
        return value ?? '-'
      },
    })) || []

  const table = useReactTable({
    data: result?.data || [],
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
      pagination: {
        pageSize: 20,
      },
    },
  })

  // Export to Excel function
  const handleExportExcel = () => {
    if (!result?.data || result.data.length === 0) return

    const ws = XLSX.utils.json_to_sheet(result.data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Watchlist')

    const timestamp = new Date().toISOString().slice(0, 10)
    const filename = `watchlist_${timestamp}.xlsx`

    XLSX.writeFile(wb, filename)
  }

  // Refresh template with latest watchlist symbols
  const handleRefreshTemplate = async () => {
    try {
      const response = await fetch('/api/watchlist')
      const data = await response.json()
      if (data.watchlist && data.watchlist.length > 0) {
        const symbols: string[] = data.watchlist.map((item: any) => item.symbol)
        setWatchlistSymbols(symbols)

        // Generate SQL with fresh symbols
        const symbolsString = symbols.map((s: string) => `('${s}')`).join(',\n        ')
        const populatedSQL = templateSQL.replace('{{WATCHLIST_SYMBOLS}}', symbolsString)
        setSql(populatedSQL)
      } else {
        alert('No symbols in watchlist. Please add symbols first.')
      }
    } catch (error) {
      console.error('Failed to refresh watchlist:', error)
      alert('Failed to refresh watchlist. Please try again.')
    }
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2 mb-2">
          <Star className="w-5 h-5 text-brand-primary" />
          <h2 className="text-lg font-semibold text-foreground">
            {t('title')}
          </h2>
          {result && (
            <span className="ml-auto text-sm text-muted-foreground">
              {result.row_count} {result.row_count === 1 ? 'item' : 'items'}
            </span>
          )}
          <button
            onClick={() => setSettingsOpen(true)}
            className="ml-2 px-3 py-1.5 bg-muted hover:bg-muted/80 text-foreground rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
            title="Manage watchlist symbols"
          >
            <Settings className="w-4 h-4" />
            Manage
          </button>
        </div>
        <p className="text-sm text-muted-foreground">
          Query your watchlist with SQL
        </p>
      </div>

      {/* SQL Input */}
      <div className="p-4 border-b border-border">
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">
            SQL Query
          </label>
          <textarea
            value={sql}
            onChange={(e) => setSql(e.target.value)}
            placeholder="SELECT * FROM watchlist WHERE ..."
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-primary resize-none"
            rows={4}
            disabled={isLoading}
          />
          <div className="flex gap-2">
            <button
              onClick={handleExecute}
              disabled={isLoading || !sql.trim()}
              className="px-4 py-2 bg-brand-primary text-white rounded-lg text-sm font-medium hover:bg-brand-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Executing...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Execute
                </>
              )}
            </button>
            <button
              onClick={handleRefreshTemplate}
              disabled={isLoading}
              className="px-4 py-2 bg-muted text-foreground rounded-lg text-sm font-medium hover:bg-muted/80 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              title="Refresh watchlist symbols and regenerate template SQL"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh Template
            </button>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-hidden p-4 flex flex-col">
        {result && (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Error */}
            {result.error && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg mb-4">
                <p className="text-sm text-destructive">{result.error}</p>
              </div>
            )}

            {/* Table */}
            {result.data.length > 0 && !result.error && (
              <div className="flex-1 flex flex-col min-h-0 space-y-3">
                {/* Table Controls */}
                <div className="flex items-center justify-between gap-3 flex-shrink-0">
                  {/* Search */}
                  <input
                    type="text"
                    value={globalFilter ?? ''}
                    onChange={(e) => setGlobalFilter(e.target.value)}
                    placeholder="Search all columns..."
                    className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  />

                  {/* Export Button */}
                  <button
                    onClick={handleExportExcel}
                    className="px-4 py-2 bg-brand-primary text-white rounded-lg text-sm font-medium hover:bg-brand-primary/90 flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Export Excel
                  </button>
                </div>

                {/* Table with auto height and scroll */}
                <div className="flex-1 min-h-0 border border-border rounded-lg overflow-hidden">
                  <div className="h-full overflow-x-auto overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted sticky top-0 z-10">
                        {table.getHeaderGroups().map((headerGroup) => (
                          <tr key={headerGroup.id}>
                            {headerGroup.headers.map((header) => (
                              <th
                                key={header.id}
                                className="px-4 py-3 text-left font-medium text-foreground cursor-pointer hover:bg-muted/80"
                                onClick={header.column.getToggleSortingHandler()}
                              >
                                <div className="flex items-center gap-2">
                                  {flexRender(
                                    header.column.columnDef.header,
                                    header.getContext(),
                                  )}
                                  {{
                                    asc: ' 🔼',
                                    desc: ' 🔽',
                                  }[header.column.getIsSorted() as string] ??
                                    null}
                                </div>
                              </th>
                            ))}
                          </tr>
                        ))}
                      </thead>
                      <tbody>
                        {table.getRowModel().rows.map((row) => (
                          <tr
                            key={row.id}
                            className="border-t border-border hover:bg-muted/50"
                          >
                            {row.getVisibleCells().map((cell) => (
                              <td
                                key={cell.id}
                                className="px-4 py-3 text-foreground"
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
                </div>

                {/* Pagination Controls */}
                <div className="flex items-center justify-between px-2 flex-shrink-0">
                  <div className="text-sm text-muted-foreground">
                    Showing{' '}
                    {table.getState().pagination.pageIndex *
                      table.getState().pagination.pageSize +
                      1}{' '}
                    to{' '}
                    {Math.min(
                      (table.getState().pagination.pageIndex + 1) *
                        table.getState().pagination.pageSize,
                      table.getFilteredRowModel().rows.length,
                    )}{' '}
                    of {table.getFilteredRowModel().rows.length} results
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => table.setPageIndex(0)}
                      disabled={!table.getCanPreviousPage()}
                      className="px-3 py-1 border border-border rounded hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    >
                      {'<<'}
                    </button>
                    <button
                      onClick={() => table.previousPage()}
                      disabled={!table.getCanPreviousPage()}
                      className="px-3 py-1 border border-border rounded hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    >
                      {'<'}
                    </button>
                    <span className="text-sm text-foreground">
                      Page {table.getState().pagination.pageIndex + 1} of{' '}
                      {table.getPageCount()}
                    </span>
                    <button
                      onClick={() => table.nextPage()}
                      disabled={!table.getCanNextPage()}
                      className="px-3 py-1 border border-border rounded hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    >
                      {'>'}
                    </button>
                    <button
                      onClick={() =>
                        table.setPageIndex(table.getPageCount() - 1)
                      }
                      disabled={!table.getCanNextPage()}
                      className="px-3 py-1 border border-border rounded hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    >
                      {'>>'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* No results */}
            {result.data.length === 0 && !result.error && (
              <div className="text-center py-8 text-muted-foreground">
                <Star className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No results found</p>
              </div>
            )}
          </div>
        )}

        {/* Empty state */}
        {!result && !isLoading && (
          <div className="text-center py-12 text-muted-foreground">
            <Star className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p className="text-sm mb-2">
              Execute a SQL query to view your watchlist
            </p>
            <p className="text-xs">
              Example: SELECT * FROM watchlist WHERE asset_type = 'stock'
            </p>
          </div>
        )}
      </div>

      {/* Settings Dialog */}
      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        initialTab={settingsTab}
      />
    </div>
  )
}
