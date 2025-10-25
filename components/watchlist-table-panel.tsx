'use client';

import { useState, useEffect } from 'react';
import {
  Star,
  Loader2,
  Download,
  RefreshCw,
  Save,
  Trash2,
  Send,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { LoaderOne } from '@/components/ui/loader';
import { useTranslations } from 'next-intl';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { SettingsDialog } from './settings-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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

interface QueryResult {
  success: boolean;
  data: Record<string, any>[];
  columns: string[];
  row_count: number;
  error?: string;
}

export function WatchlistTablePanel() {
  const t = useTranslations('watchlist');
  const [sql, setSql] = useState('');
  const [result, setResult] = useState<QueryResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [watchlistSymbols, setWatchlistSymbols] = useState<string[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'watchlist'>('watchlist');
  const [savedTemplates, setSavedTemplates] = useState<
    Array<{ id?: string; name: string; sql: string; description?: string }>
  >([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [aiQuery, setAiQuery] = useState('');
  const [isGeneratingSQL, setIsGeneratingSQL] = useState(false);
  const [useWatchlistPlaceholder, setUseWatchlistPlaceholder] = useState(true);
  const [aiExplanation, setAiExplanation] = useState<string>('');
  const [defaultTemplateId, setDefaultTemplateId] = useState<string>('');
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(false);

  // Fetch watchlist symbols on mount and load saved templates
  useEffect(() => {
    fetchWatchlistSymbols();
    loadSavedTemplates();
  }, []);

  const loadSavedTemplates = async () => {
    try {
      const response = await fetch('/api/sql-templates');
      const data = await response.json();
      if (data.templates) {
        const templates = data.templates.map((t: any) => ({
          id: t.id,
          name: t.name,
          sql: t.sql_query,
          description: t.description,
        }));
        setSavedTemplates(templates);

        // Find and set default template
        const defaultTemplate = templates.find(
          (t: any) => t.name === 'Default Analysis (ROCE + Options)',
        );
        if (defaultTemplate?.id) {
          setDefaultTemplateId(defaultTemplate.id);
          setSelectedTemplate(defaultTemplate.id);
        }
      }
    } catch (error) {
      console.error('Failed to load saved templates:', error);
    }
  };

  const saveCurrentTemplate = async () => {
    if (!newTemplateName.trim()) {
      toast.error('Template name cannot be empty');
      return;
    }

    try {
      const response = await fetch('/api/sql-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newTemplateName.trim(),
          sql_query: sql,
          description: aiExplanation || undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        toast.error(error.error || 'Failed to save template');
        return;
      }

      const { template } = await response.json();

      // Add to local state
      const newTemplate = {
        id: template.id,
        name: template.name,
        sql: template.sql_query,
        description: template.description,
      };
      setSavedTemplates([...savedTemplates, newTemplate]);
      setSelectedTemplate(template.id);

      toast.success(`Template "${newTemplateName.trim()}" saved successfully`);

      // Reset and close dialog
      setSaveDialogOpen(false);
      setNewTemplateName('');
      setAiExplanation(''); // Clear AI explanation after saving
    } catch (error) {
      console.error('Failed to save template:', error);
      toast.error('Failed to save template');
    }
  };

  const loadTemplate = async (id: string) => {
    const template = savedTemplates.find((t) => t.id === id);
    if (template) {
      // Replace {{WATCHLIST_SYMBOLS}} with actual symbols
      let finalSQL = template.sql;
      if (template.sql.includes('{{WATCHLIST_SYMBOLS}}')) {
        if (watchlistSymbols.length === 0) {
          toast.error('Your watchlist is empty. Please add symbols first.');
          return;
        }
        const symbolsString = watchlistSymbols
          .map((s: string) => `('${s}')`)
          .join(',\n        ');
        finalSQL = template.sql.replace(
          '{{WATCHLIST_SYMBOLS}}',
          symbolsString,
        );
      }

      setSql(finalSQL);
      setSelectedTemplate(id);
      setAiExplanation(''); // Clear AI explanation when loading template

      // Immediately execute the template
      await executeSQL(finalSQL);
      toast.success(`Template "${template.name}" loaded and executed`);
    }
  };

  const deleteTemplate = async (id: string) => {
    const template = savedTemplates.find((t) => t.id === id);
    if (!template) return;

    try {
      const response = await fetch(`/api/sql-templates?id=${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        toast.error('Failed to delete template');
        return;
      }

      // Remove from local state
      setSavedTemplates(savedTemplates.filter((t) => t.id !== id));

      if (selectedTemplate === id) {
        setSelectedTemplate('default');
      }

      toast.success(`Template "${template.name}" deleted`);
    } catch (error) {
      console.error('Failed to delete template:', error);
      toast.error('Failed to delete template');
    }
  };

  const fetchWatchlistSymbols = async () => {
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
  };

  // Auto-load template from localStorage or default template
  useEffect(() => {
    if (watchlistSymbols.length === 0 || !defaultTemplateId) return;

    // Try to restore from localStorage
    if (typeof window !== 'undefined') {
      const cachedTemplateId = localStorage.getItem('watchlist_selected_template');
      const cachedResult = localStorage.getItem('watchlist_cached_result');
      const cachedSQL = localStorage.getItem('watchlist_cached_sql');

      if (cachedTemplateId && cachedResult && cachedSQL) {
        // Restore cached state
        try {
          setSelectedTemplate(cachedTemplateId);
          setSql(cachedSQL);
          setResult(JSON.parse(cachedResult));
          console.log('✅ Restored watchlist analysis from cache');
          return;
        } catch (error) {
          console.warn('Failed to restore from cache:', error);
          // Clear invalid cache
          localStorage.removeItem('watchlist_selected_template');
          localStorage.removeItem('watchlist_cached_result');
          localStorage.removeItem('watchlist_cached_sql');
        }
      }
    }

    // No valid cache, load default template
    if (!sql) {
      loadTemplate(defaultTemplateId);
    }
  }, [watchlistSymbols, defaultTemplateId]);

  // Helper function to execute SQL query
  const executeSQL = async (sqlQuery: string) => {
    if (!sqlQuery.trim() || isLoading) return;

    setIsLoading(true);
    setResult(null);

    try {
      const queryResponse = await fetch('/api/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sql: sqlQuery.trim() }),
      });

      if (!queryResponse.ok) {
        const errorText = await queryResponse.text();
        throw new Error(`Failed to execute SQL query: ${errorText}`);
      }

      const queryResult: QueryResult = await queryResponse.json();

      setResult(queryResult);

      // Save to localStorage (for cache restoration)
      if (typeof window !== 'undefined') {
        localStorage.setItem('watchlist_cached_sql', sqlQuery.trim());
        localStorage.setItem(
          'watchlist_cached_result',
          JSON.stringify(queryResult),
        );
        localStorage.setItem('watchlist_selected_template', selectedTemplate);
      }
    } catch (error) {
      console.error('Watchlist query error:', error);
      setResult({
        success: false,
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
      header: col.charAt(0).toUpperCase() + col.slice(1).replace(/_/g, ' '),
      cell: ({ getValue }) => {
        const value = getValue();
        // Format numbers
        if (typeof value === 'number') {
          return value.toLocaleString();
        }
        // Format dates
        if (
          col.includes('_at') &&
          value &&
          (typeof value === 'string' || typeof value === 'number')
        ) {
          return new Date(value).toLocaleDateString();
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

    const ws = XLSX.utils.json_to_sheet(result.data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Watchlist');

    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `watchlist_${timestamp}.xlsx`;

    XLSX.writeFile(wb, filename);
  };

  // Generate SQL using AI and immediately run it
  const handleGenerateAndRun = async () => {
    if (!aiQuery.trim() || isGeneratingSQL || isLoading) return;

    setIsGeneratingSQL(true);
    setIsLoading(true);

    try {
      // Modify query based on toggle
      let finalQuery = aiQuery.trim();
      if (useWatchlistPlaceholder) {
        if (watchlistSymbols.length === 0) {
          toast.error('Your watchlist is empty. Please add symbols first.');
          setIsGeneratingSQL(false);
          return;
        }
        finalQuery = `IMPORTANT: The user wants to analyze their watchlist. You MUST use the {{WATCHLIST_SYMBOLS}} placeholder pattern in your SQL query. User query: ${aiQuery.trim()}`;
        console.log(
          '🌟 Watchlist mode: Requesting SQL with {{WATCHLIST_SYMBOLS}} placeholder',
        );
      } else {
        console.log('🔍 Market mode: Generating general SQL query');
      }

      // Call screener agent with current SQL context
      const agentResponse = await fetch('/api/screener', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: finalQuery,
          sessionState: {
            current_sql: sql || '', // Pass current SQL template if available
          },
        }),
      });

      if (!agentResponse.ok) {
        throw new Error('Failed to generate SQL from AI');
      }

      const agentResult = await agentResponse.json();

      if (!agentResult.success || !agentResult.sql) {
        toast.error(agentResult.error || 'Failed to generate SQL');
        return;
      }

      // Handle placeholder replacement if needed
      let finalSQL = agentResult.sql;
      if (finalSQL.includes('{{WATCHLIST_SYMBOLS}}')) {
        if (watchlistSymbols.length > 0) {
          const symbolsString = watchlistSymbols
            .map((s: string) => `('${s}')`)
            .join(',\n        ');
          finalSQL = finalSQL.replace('{{WATCHLIST_SYMBOLS}}', symbolsString);
          console.log(
            `✅ Replaced placeholder with ${watchlistSymbols.length} symbols`,
          );
        } else {
          toast.warning(
            'SQL contains watchlist placeholder but your watchlist is empty',
          );
        }
      }

      setSql(finalSQL);
      setSelectedTemplate('custom');

      // Immediately execute the generated SQL
      const queryResponse = await fetch('/api/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sql: finalSQL }),
      });

      if (!queryResponse.ok) {
        throw new Error('Failed to execute generated SQL');
      }

      const queryResult: QueryResult = await queryResponse.json();
      setResult(queryResult);

      if (typeof window !== 'undefined') {
        localStorage.setItem('watchlist_last_sql', finalSQL);
        localStorage.setItem(
          'watchlist_last_result',
          JSON.stringify(queryResult),
        );
      }

      toast.success(
        `Analysis complete! Found ${queryResult.row_count} results.`,
      );

      // Store explanation for display
      if (agentResult.explanation) {
        setAiExplanation(agentResult.explanation);
        console.log('💡 AI Explanation:', agentResult.explanation);
      }
    } catch (error) {
      console.error('Failed to generate and run SQL:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to run analysis',
      );
      setResult({
        success: false,
        data: [],
        columns: [],
        row_count: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsGeneratingSQL(false);
      setIsLoading(false);
    }
  };

  // Refresh template with latest watchlist symbols
  const handleRefreshTemplate = async () => {
    try {
      const response = await fetch('/api/watchlist');
      const data = await response.json();

      console.log('📥 Fetched watchlist data:', data);

      if (data.watchlist && data.watchlist.length > 0) {
        const symbols: string[] = data.watchlist.map(
          (item: any) => item.symbol,
        );
        setWatchlistSymbols(symbols);

        // Reload the currently selected template with new symbols
        if (selectedTemplate) {
          await loadTemplate(selectedTemplate);
          toast.success(`Template refreshed with ${symbols.length} symbols`);
        } else if (defaultTemplateId) {
          // If no template selected, load default template
          await loadTemplate(defaultTemplateId);
          toast.success(`Default template loaded with ${symbols.length} symbols`);
        } else {
          toast.error('No template available to refresh');
        }
      } else {
        toast.error('No symbols in watchlist. Please add symbols first.');
      }
    } catch (error) {
      console.error('Failed to refresh watchlist:', error);
      toast.error('Failed to refresh watchlist. Please try again.');
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Collapsible Header Section */}
      {isHeaderCollapsed ? (
        // Collapsed state - minimal header bar
        <div className="p-3 border-b border-border bg-muted/30">
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-brand-primary" />
            <h3 className="text-sm font-semibold text-foreground">
              {t('title')}
            </h3>
            {result && (
              <span className="text-xs text-muted-foreground">
                ({result.row_count} {result.row_count === 1 ? 'item' : 'items'})
              </span>
            )}
            <div className="ml-auto flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSettingsOpen(true)}
                title="Manage watchlist symbols"
                className="h-7 px-2"
              >
                <Star className="w-3 h-3 mr-1 text-brand-primary" />
                <span className="text-xs">Watchlist</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsHeaderCollapsed(false)}
                title="Expand controls"
                className="h-7 px-2"
              >
                <ChevronDown className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      ) : (
        // Expanded state - full header and controls
        <>
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
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSettingsOpen(true)}
                title="Manage watchlist symbols"
                className="border-brand-primary/30 hover:bg-brand-primary/10 hover:border-brand-primary"
              >
                <Star className="w-4 h-4 mr-2 text-brand-primary" />
                <span className="font-medium">Watchlist</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsHeaderCollapsed(true)}
                title="Collapse to maximize table view"
                className="ml-2"
              >
                <ChevronUp className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Analyze your watchlist with AI-powered insights
            </p>
          </div>

          {/* Query Controls */}
          <div className="p-4 border-b border-border">
        <div className="space-y-4">
          {/* AI Query Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleGenerateAndRun();
            }}
            className="space-y-2"
          >
            <div className="flex items-center gap-2">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={aiQuery}
                  onChange={(e) => setAiQuery(e.target.value)}
                  placeholder="Ask AI to analyze your watchlist... (e.g., 'Show ROCE and dividend yield')"
                  className="w-full pl-10 pr-3 py-2 bg-background border border-brand-primary/30 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  disabled={isGeneratingSQL || isLoading}
                />
                <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-primary" />
              </div>
              <button
                type="submit"
                disabled={isGeneratingSQL || isLoading || !aiQuery.trim()}
                className="px-4 py-2 bg-brand-primary text-white rounded-lg text-sm font-medium hover:bg-brand-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isGeneratingSQL ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Generate
                  </>
                )}
              </button>
            </div>

            {/* Analysis Mode Selector */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Star className="w-3 h-3 mr-2" />
                  {useWatchlistPlaceholder
                    ? `Watchlist Mode (${watchlistSymbols.length} symbols)`
                    : 'Market Screener Mode'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem
                  onClick={() => setUseWatchlistPlaceholder(true)}
                  className="cursor-pointer"
                >
                  <Star className="w-4 h-4 mr-2" />
                  <div className="flex flex-col">
                    <span className="font-medium">Watchlist Mode</span>
                    <span className="text-xs text-muted-foreground">
                      Analyze your {watchlistSymbols.length} watchlist stocks
                    </span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setUseWatchlistPlaceholder(false)}
                  className="cursor-pointer"
                >
                  <Download className="w-4 h-4 mr-2" />
                  <div className="flex flex-col">
                    <span className="font-medium">Market Screener</span>
                    <span className="text-xs text-muted-foreground">
                      Scan the entire market for opportunities
                    </span>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </form>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border"></div>
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-background px-2 text-muted-foreground">
                Or use template
              </span>
            </div>
          </div>

          {/* Template Selector */}
          <div className="flex items-center gap-2">
            <Select
              value={selectedTemplate}
              onValueChange={(value) => loadTemplate(value)}
              disabled={isLoading}
            >
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Loading templates..." />
              </SelectTrigger>
              <SelectContent>
                {savedTemplates.map((template) => (
                  <SelectItem key={template.id} value={template.id || ''}>
                    <div className="flex flex-col items-start gap-1 w-full">
                      <span className="font-medium text-left">
                        {template.name}
                      </span>
                      {template.description && (
                        <span className="text-xs text-muted-foreground text-left line-clamp-2">
                          {template.description}
                        </span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedTemplate && selectedTemplate !== defaultTemplateId && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => deleteTemplate(selectedTemplate)}
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                title="Delete this template"
                disabled={isLoading}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>

          {/* Refresh button - Only shown when a template is selected */}
          {selectedTemplate && (
            <Button
              variant="secondary"
              onClick={handleRefreshTemplate}
              disabled={isLoading}
              title="Refresh watchlist symbols and update analysis"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh Analysis
            </Button>
          )}
        </div>
      </div>
        </>
      )}

      {/* Results */}
      <div className="flex-1 overflow-hidden p-4 flex flex-col">
        {/* Loading State */}
        {isLoading && !result && (
          <div className="flex-1 flex items-center justify-center">
            <LoaderOne />
          </div>
        )}

        {/* Results Display */}
        {result && (
          <div className="flex-1 flex flex-col min-h-0">
            {/* AI Explanation Card - Only show for AI-generated queries */}
            {selectedTemplate === 'custom' && aiExplanation && (
              <div className="mb-4 p-4 bg-brand-primary/5 border border-brand-primary/20 rounded-lg space-y-3">
                <div className="flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-brand-primary flex-shrink-0 mt-0.5" />
                  <div className="flex-1 space-y-2">
                    <h4 className="text-sm font-semibold text-foreground">
                      AI Generated Analysis
                    </h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {aiExplanation}
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => setSaveDialogOpen(true)}
                  className="flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Save as Template
                </Button>
              </div>
            )}

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
              Select a template or ask AI to analyze your watchlist
            </p>
            <p className="text-xs">
              Example: "Show me high-growth stocks with strong fundamentals"
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

      {/* Save Template Dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save as Template</DialogTitle>
            <DialogDescription>
              Save this AI-generated analysis as a reusable template. You can
              load it later from the template selector.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="template-name">Template Name</Label>
              <Input
                id="template-name"
                placeholder="e.g., High ROCE Stocks"
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    saveCurrentTemplate();
                  }
                }}
              />
            </div>
            {aiExplanation && (
              <div className="space-y-2">
                <Label>Analysis Description</Label>
                <p className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
                  {aiExplanation}
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setSaveDialogOpen(false);
                setNewTemplateName('');
              }}
            >
              Cancel
            </Button>
            <Button onClick={saveCurrentTemplate} disabled={!newTemplateName.trim()}>
              <Save className="w-4 h-4 mr-2" />
              Save Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
