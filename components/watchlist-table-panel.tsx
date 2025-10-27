'use client';

import { useState, useEffect } from 'react';
import {
  Star,
  Loader2,
  RefreshCw,
  Save,
  Trash2,
  Send,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Settings,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { EnhancedDataTable } from './enhanced-data-table';

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
  const [watchlistSymbols, setWatchlistSymbols] = useState<string[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'watchlist'>('watchlist');
  const [savedTemplates, setSavedTemplates] = useState<
    Array<{ id?: string; name: string; sql: string; description?: string }>
  >([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [aiQuery, setAiQuery] = useState('');
  const [isGeneratingSQL, setIsGeneratingSQL] = useState(false);
  const [useWatchlist, setUseWatchlist] = useState(false);
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

  // Export to Excel function (used by EnhancedDataTable)
  const handleExportExcel = (data: any[]) => {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Watchlist');

    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `watchlist_${timestamp}.xlsx`;

    XLSX.writeFile(wb, filename);

    toast.success(`Exported ${data.length} rows to ${filename}`);
  };

  // Generate SQL using AI and immediately run it
  const handleGenerateAndRun = async () => {
    if (!aiQuery.trim() || isGeneratingSQL || isLoading) return;

    setIsGeneratingSQL(true);
    setIsLoading(true);

    try {
      let finalQuery = aiQuery.trim();

      // If watchlist mode is enabled, enforce watchlist placeholder
      if (useWatchlist) {
        if (watchlistSymbols.length === 0) {
          toast.error('Your watchlist is empty. Please add symbols first.');
          setIsGeneratingSQL(false);
          setIsLoading(false);
          return;
        }
        finalQuery = `IMPORTANT: The user wants to analyze their watchlist (${watchlistSymbols.length} stocks). You MUST use the {{WATCHLIST_SYMBOLS}} placeholder pattern in your SQL query. User query: ${aiQuery.trim()}`;
        console.log(
          `🌟 Watchlist mode enabled: ${watchlistSymbols.length} symbols`,
        );
      } else {
        console.log('🔍 Flexible mode: AI will determine stock scope');
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
      // Clear result and show loading immediately
      setResult(null);
      setIsLoading(true);

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
          setIsLoading(false);
          toast.error('No template available to refresh');
        }
      } else {
        setIsLoading(false);
        toast.error('No symbols in watchlist. Please add symbols first.');
      }
    } catch (error) {
      console.error('Failed to refresh watchlist:', error);
      setIsLoading(false);
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
                className="h-7 px-2 gap-1"
              >
                <Settings className="w-3 h-3" />
                <span className="text-xs">Manage Watchlist</span>
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
                className="border-brand-primary/30 hover:bg-brand-primary/10 hover:border-brand-primary gap-2"
              >
                <Settings className="w-4 h-4" />
                <span className="font-medium">Manage Watchlist</span>
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
                  placeholder={
                    useWatchlist
                      ? "e.g., 'P/E and dividend yield' or 'revenue growth and margins'"
                      : "e.g., 'NVDA TSLA revenue growth' or 'tech stocks with ROCE > 20%'"
                  }
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

            {/* Watchlist Toggle */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="use-watchlist"
                checked={useWatchlist}
                onCheckedChange={(checked) => setUseWatchlist(checked as boolean)}
                disabled={isGeneratingSQL || isLoading}
              />
              <label
                htmlFor="use-watchlist"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex items-center gap-2"
              >
                <Star className="w-4 h-4 text-brand-primary" />
                Use my watchlist
                {watchlistSymbols.length > 0 && (
                  <span className="text-xs text-muted-foreground">
                    ({watchlistSymbols.length} stocks)
                  </span>
                )}
              </label>
            </div>
          </form>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border"></div>
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-background px-2 text-muted-foreground">
                Or use preset
              </span>
            </div>
          </div>

          {/* 分析方案选择器 */}
          <div className="flex items-center gap-2">
            <Select
              value={selectedTemplate}
              onValueChange={(value) => loadTemplate(value)}
              disabled={isLoading}
            >
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Load preset..." />
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
                title="Delete this preset"
                disabled={isLoading}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>

          {/* 刷新按钮 - 仅在选择方案时显示 */}
          {selectedTemplate && (
            <Button
              variant="secondary"
              onClick={handleRefreshTemplate}
              disabled={isLoading}
              title="Refresh watchlist and update analysis"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
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
                  Save as Preset
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
              <EnhancedDataTable
                data={result.data}
                maxHeight="calc(100vh - 400px)"
                onExport={handleExportExcel}
              />
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
            <p className="text-sm mb-3 font-medium">
              Build any stock analysis table with AI
            </p>
            <div className="text-xs space-y-2 max-w-md mx-auto">
              <div>
                <p className="text-muted-foreground/80 mb-1">With watchlist:</p>
                <p>• "P/E and dividend yield"</p>
                <p>• "revenue growth and margins"</p>
              </div>
              <div>
                <p className="text-muted-foreground/80 mb-1">Without watchlist:</p>
                <p>• "NVDA TSLA AAPL revenue growth"</p>
                <p>• "tech stocks with ROCE &gt; 20%"</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Settings Dialog */}
      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        initialTab={settingsTab}
      />

      {/* Save Preset Dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save as Preset</DialogTitle>
            <DialogDescription>
              Save this AI-generated analysis as a reusable preset. You can load it later from the preset selector.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="template-name">Preset Name</Label>
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
              Save Preset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
