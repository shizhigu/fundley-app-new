'use client';

import { useState, useEffect, useCallback } from 'react';
import { Send, Loader2, Table as TableIcon, Download } from 'lucide-react';
import { useTranslations } from 'next-intl';
import * as XLSX from 'xlsx';
import { useFinancialDataStore } from '@/lib/stores/financial-data-store';
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
} from '@tanstack/react-table';

interface AgentResult {
  success: boolean;
  sql: string;
  explanation: string;
  suggestions?: string[];
  error?: string;
}

interface QueryResult {
  success: boolean;
  data: Record<string, any>[];
  columns: string[];
  row_count: number;
  error?: string;
}

interface ScreenerResult {
  explanation: string;
  suggestions?: string[];
  data: Record<string, any>[];
  columns: string[];
  row_count: number;
  error?: string;
}

export function ScreenerPanel() {
  const t = useTranslations('screener');
  const availableMetrics = useFinancialDataStore(
    (state) => state.availableMetrics,
  );
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<ScreenerResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentSql, setCurrentSql] = useState<string | null>(null);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [watchlistSymbols, setWatchlistSymbols] = useState<string[]>([]);

  // Fetch watchlist symbols (memoized to use in multiple effects)
  const fetchWatchlistSymbols = useCallback(async () => {
    try {
      const response = await fetch('/api/watchlist');
      const data = await response.json();
      if (data.watchlist) {
        const symbols = data.watchlist.map((item: any) => item.symbol);
        setWatchlistSymbols(symbols);
      }
    } catch (error) {
      console.error('Failed to fetch watchlist:', error);
    }
  }, []);

  // Fetch watchlist symbols on mount
  useEffect(() => {
    fetchWatchlistSymbols();
  }, [fetchWatchlistSymbols]);

  // Auto-refresh watchlist when page becomes visible or periodically
  useEffect(() => {
    // Refresh when page becomes visible (user switches back from settings)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchWatchlistSymbols();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Also refresh every 30 seconds
    const interval = setInterval(() => {
      fetchWatchlistSymbols();
    }, 30000);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(interval);
    };
  }, [fetchWatchlistSymbols]);

  // Load saved query, result, and SQL from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedQuery = localStorage.getItem('screener_last_query');
      const savedResult = localStorage.getItem('screener_last_result');
      const savedSql = localStorage.getItem('screener_current_sql');

      if (savedQuery) {
        setQuery(savedQuery);
      }

      if (savedResult) {
        try {
          const parsed = JSON.parse(savedResult);
          setResult(parsed);
        } catch (e) {
          console.warn('Failed to parse saved screener result:', e);
        }
      }

      if (savedSql) {
        setCurrentSql(savedSql);
      }
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isLoading) return;

    setIsLoading(true);
    setResult(null);

    try {
      // Build session state - only include custom formulas (not financial data)
      const sessionState: any = {};

      if (availableMetrics && availableMetrics.length > 0) {
        sessionState['available_metrics'] = availableMetrics;
      }

      // Include current SQL for iterative modifications
      if (currentSql) {
        sessionState['current_sql'] = currentSql;
      }

      // Stage 1: Call screener agent to generate SQL
      const finalQuery = query.trim();
      const agentResponse = await fetch('/api/screener', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: finalQuery,
          sessionState:
            Object.keys(sessionState).length > 0 ? sessionState : undefined,
        }),
      });

      if (!agentResponse.ok) {
        throw new Error('Failed to generate SQL query');
      }

      const agentResult: AgentResult = await agentResponse.json();

      if (!agentResult.success || !agentResult.sql) {
        setResult({
          explanation: agentResult.explanation || '',
          data: [],
          columns: [],
          row_count: 0,
          error: agentResult.error || 'Failed to generate SQL query',
        });
        return;
      }

      // Save SQL for iterative modifications
      setCurrentSql(agentResult.sql);

      // Check if SQL contains {{WATCHLIST_SYMBOLS}} placeholder
      let finalSQL = agentResult.sql;
      if (finalSQL.includes('{{WATCHLIST_SYMBOLS}}')) {
        console.log('🔍 Detected {{WATCHLIST_SYMBOLS}} placeholder, replacing with actual symbols...');

        if (watchlistSymbols.length === 0) {
          setResult({
            explanation: agentResult.explanation || '',
            data: [],
            columns: [],
            row_count: 0,
            error: 'Your watchlist is empty. Please add symbols to your watchlist first.',
          });
          return;
        }

        // Replace placeholder with actual symbols (use replaceAll for multiple occurrences)
        const symbolsString = watchlistSymbols.map((s: string) => `('${s}')`).join(',\n        ');
        finalSQL = finalSQL.replaceAll('{{WATCHLIST_SYMBOLS}}', symbolsString);
        console.log(`✅ Replaced ALL placeholders with ${watchlistSymbols.length} symbols:`, watchlistSymbols);
      }

      // Stage 2: Execute SQL via Next.js API route (not directly to backend)
      const queryResponse = await fetch('/api/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sql: finalSQL }),
      });

      if (!queryResponse.ok) {
        const errorText = await queryResponse.text();
        console.error('❌ Query API failed:', errorText);
        throw new Error(`Failed to execute SQL query: ${errorText}`);
      }

      const queryResult: QueryResult = await queryResponse.json();

      // Combine agent explanation with query results
      const finalResult = {
        explanation: agentResult.explanation,
        suggestions: agentResult.suggestions || [],
        data: queryResult.data || [],
        columns: queryResult.columns || [],
        row_count: queryResult.row_count || 0,
        error: queryResult.error,
      };

      setResult(finalResult);

      // Save to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('screener_last_query', query.trim());
        localStorage.setItem(
          'screener_last_result',
          JSON.stringify(finalResult),
        );
        localStorage.setItem('screener_current_sql', agentResult.sql);
      }
    } catch (error) {
      console.error('Screener error:', error);
      setResult({
        explanation: '',
        data: [],
        columns: [],
        row_count: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Dynamic columns from result
  const columns: ColumnDef<Record<string, any>>[] =
    result?.columns?.map((col) => ({
      accessorKey: col,
      header: col.charAt(0).toUpperCase() + col.slice(1),
      cell: ({ getValue }) => {
        const value = getValue();
        // Format numbers
        if (typeof value === 'number') {
          return value.toLocaleString();
        }
        return value ?? '-';
      },
    })) || [];

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
  });

  // Export to Excel function
  const handleExportExcel = () => {
    if (!result?.data || result.data.length === 0) return;

    // Create worksheet from data
    const ws = XLSX.utils.json_to_sheet(result.data);

    // Create workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Results');

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `screener_results_${timestamp}.xlsx`;

    // Download file
    XLSX.writeFile(wb, filename);
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2 mb-2">
          <TableIcon className="w-5 h-5 text-brand-primary" />
          <h2 className="text-lg font-semibold text-foreground">
            {t('title') || 'Financial Screener'}
          </h2>
        </div>
        <p className="text-sm text-muted-foreground">
          {t('description') ||
            'Ask questions about financial data in natural language'}
        </p>
      </div>

      {/* Query Input */}
      <div className="p-4 border-b border-border">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <div className="flex-1 relative">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              placeholder='e.g., "Top 10 profitable companies" or "Tech stocks with revenue over $1B"'
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
              disabled={isLoading}
            />

            {/* Suggestions Dropdown */}
            {showSuggestions &&
              result?.suggestions &&
              result.suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                  {result.suggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => {
                        setQuery(suggestion);
                        setShowSuggestions(false);
                      }}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors border-b border-border last:border-b-0"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
          </div>
          <button
            type="submit"
            disabled={isLoading || !query.trim()}
            className="px-4 py-2 bg-brand-primary text-white rounded-lg text-sm font-medium hover:bg-brand-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {t('loading') || 'Loading...'}
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                {t('search') || 'Search'}
              </>
            )}
          </button>
        </form>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-auto p-4">
        {result && (
          <div className="space-y-4">
            {/* Explanation */}
            {result.explanation && (
              <div className="p-3 bg-brand-primary/5 border border-brand-primary/20 rounded-lg">
                <p className="text-sm text-foreground">{result.explanation}</p>
                {result.row_count > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {result.row_count}{' '}
                    {result.row_count === 1 ? 'result' : 'results'} found
                  </p>
                )}
              </div>
            )}

            {/* Error */}
            {result.error && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <p className="text-sm text-destructive">{result.error}</p>
              </div>
            )}

            {/* Table */}
            {result.data.length > 0 && !result.error && (
              <div className="space-y-3">
                {/* Table Controls */}
                <div className="flex items-center justify-between gap-3">
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

                {/* Table */}
                <div className="border border-border rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted">
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
                <div className="flex items-center justify-between px-2">
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
                <TableIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No results found</p>
              </div>
            )}
          </div>
        )}

        {/* Empty state */}
        {!result && !isLoading && (
          <div className="text-center py-12 text-muted-foreground">
            <TableIcon className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p className="text-sm mb-2">
              Enter a query to screen financial data
            </p>
            <p className="text-xs">
              Examples: &quot;Companies with revenue over $1B&quot;, &quot;Top
              10 by net income&quot;
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
