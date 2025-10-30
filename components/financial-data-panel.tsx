'use client';

import { useState, useEffect, useMemo, useCallback, memo } from 'react';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useSQLQuery } from '@/lib/hooks/use-sql-query';
import { useFinancialDataStore } from '@/lib/stores/financial-data-store';
import {
  Download,
  GripVertical,
  ChevronDown,
  ChevronUp,
  Search,
  LayoutGrid,
  Table2,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertCircle,
} from 'lucide-react';
import { toast } from './toast';
import type {
  FinancialDataPoint,
  FinancialAnalysisRequest,
  ExcelDataRow,
} from '@/lib/types/financial-data';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTranslations } from 'next-intl';

function FinancialDataPanelComponent() {
  const tFinancial = useTranslations('financialData');
  // Local state
  const [tableData, setTableData] = useState<FinancialDataPoint[]>([]);
  const [tableAlignMode, setTableAlignMode] = useState<'original' | 'relative'>(
    'relative',
  );
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [orderedMetrics, setOrderedMetrics] = useState<any[]>([]);

  // Zustand store
  const {
    data: storedData,
    analysisForm,
    viewMode,
    isPanelCollapsed,
    isLoading,
    error,
    updateFinancialData,
    clearFinancialData,
    updateAnalysisForm,
    updateAvailableMetrics,
    setViewMode,
    setPanelCollapsed,
    setLoading,
    setError,
  } = useFinancialDataStore();

  const { symbols: symbolInput, selectedMetrics, periods } = analysisForm;
  const selectedQuarters = periods.toString();

  const setSymbolInput = (symbols: string) => {
    updateAnalysisForm({ symbols });
  };

  const setSelectedMetrics = (metrics: string[]) => {
    updateAnalysisForm({ selectedMetrics: metrics });
  };

  const setSelectedQuarters = (periods: string) => {
    updateAnalysisForm({ periods: Number(periods) });
  };

  // Restore data from store on mount
  useEffect(() => {
    if (storedData.length > 0) {
      setTableData(storedData);
    }
  }, [storedData.length]);

  // Fetch LaTeX metrics
  const { data: latexMetricsData } = useSQLQuery<{ metrics: any[] }>(
    '/api/latex-metrics?limit=100',
  );
  const latexMetrics = latexMetricsData?.metrics;

  const availableMetrics = useMemo(() => {
    return latexMetrics?.filter((metric) => metric.sqlFormula) || [];
  }, [latexMetrics]);

  // Migrate selectedMetrics if IDs are invalid (due to metric ID changes)
  useEffect(() => {
    if (availableMetrics.length > 0 && selectedMetrics.length > 0) {
      const currentIds = new Set(availableMetrics.map((m) => m._id));
      const hasInvalidIds = selectedMetrics.some((id) => !currentIds.has(id));

      if (hasInvalidIds) {
        console.log('⚠️ Found invalid metric IDs, clearing selection');
        setSelectedMetrics([]);
      }
    }
  }, [availableMetrics, selectedMetrics, setSelectedMetrics]);

  // Initialize metric order
  useEffect(() => {
    if (availableMetrics.length > 0 && orderedMetrics.length === 0) {
      const savedOrder = localStorage.getItem('metric-selection-order');
      if (savedOrder) {
        try {
          const savedNames = JSON.parse(savedOrder);
          const ordered: any[] = [];
          const metricMap = new Map(availableMetrics.map((m) => [m.name, m]));

          savedNames.forEach((name: string) => {
            const metric = metricMap.get(name);
            if (metric) {
              ordered.push(metric);
              metricMap.delete(name);
            }
          });

          metricMap.forEach((metric) => ordered.push(metric));
          setOrderedMetrics(ordered);
        } catch {
          setOrderedMetrics(availableMetrics);
        }
      } else {
        setOrderedMetrics(availableMetrics);
      }
    }
  }, [availableMetrics]);

  // Update store metrics
  const metricsForStore = useMemo(() => {
    return availableMetrics.map((metric) => ({
      name: metric.name,
      latex: metric.latexFormula,
      sql: metric.sqlFormula,
    }));
  }, [availableMetrics]);

  useEffect(() => {
    if (metricsForStore.length > 0) {
      updateAvailableMetrics(metricsForStore);
    }
  }, [metricsForStore, updateAvailableMetrics]);

  const handleMetricToggle = useCallback(
    (metricId: string) => {
      const newMetrics = selectedMetrics.includes(metricId)
        ? selectedMetrics.filter((id) => id !== metricId)
        : [...selectedMetrics, metricId];
      setSelectedMetrics(newMetrics);
    },
    [selectedMetrics, setSelectedMetrics],
  );

  // Drag and drop handlers
  const handleDragStart = useCallback((index: number) => {
    setDraggedIndex(index);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  }, []);

  const handleDragEnd = useCallback(() => {
    if (
      draggedIndex !== null &&
      dragOverIndex !== null &&
      draggedIndex !== dragOverIndex
    ) {
      const newOrder = [...orderedMetrics];
      const [draggedItem] = newOrder.splice(draggedIndex, 1);
      newOrder.splice(dragOverIndex, 0, draggedItem);

      setOrderedMetrics(newOrder);
      const orderNames = newOrder.map((m) => m.name);
      localStorage.setItem(
        'metric-selection-order',
        JSON.stringify(orderNames),
      );
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  }, [draggedIndex, dragOverIndex, orderedMetrics]);

  const extractFieldName = (sqlFormula: string): string => {
    if (sqlFormula.includes(' AS ')) {
      return sqlFormula.split(' AS ')[1].trim();
    }
    return sqlFormula;
  };

  const getMetricToFieldMapping = () => {
    const mapping: { [metricId: string]: string } = {};
    selectedMetrics.forEach((metricId) => {
      const metric = availableMetrics.find((m) => m._id === metricId);
      if (metric?.sqlFormula) {
        mapping[metricId] = extractFieldName(metric.sqlFormula);
      }
    });
    return mapping;
  };

  const handleAnalyze = async () => {
    setLoading(true);
    setError(null);

    try {
      const symbols = symbolInput
        .split(',')
        .map((s) => s.trim().toUpperCase())
        .filter((s) => s);

      const requestBody: FinancialAnalysisRequest = {
        symbols,
        metricIds: selectedMetrics,
        quarters: parseInt(selectedQuarters),
      };

      const response = await fetch('/api/financial-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || `HTTP ${response.status}: ${response.statusText}`,
        );
      }

      const data: FinancialDataPoint[] = await response.json();

      setTableData(data);
      updateFinancialData(data);

      if (data.length > 0) {
        setPanelCollapsed(true);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      setError({ message: `获取财务数据失败: ${errorMessage}` });
    } finally {
      setLoading(false);
    }
  };

  const getMetricDisplayName = (metricId: string) => {
    return availableMetrics.find((m) => m._id === metricId)?.name || metricId;
  };

  const exportToExcel = () => {
    if (tableData.length === 0) {
      toast({
        type: 'error',
        description: '没有数据可以导出',
      });
      return;
    }

    const metricToFieldMapping = getMetricToFieldMapping();

    const excelData: ExcelDataRow[] = tableData.map((row) => {
      const excelRow: ExcelDataRow = {
        股票代码: row.symbol,
        季度: `${row.period} ${row.fiscalYear}`,
        日期: formatDate((row as any).filingdate) || '',
      };

      selectedMetrics.forEach((metricId) => {
        const fieldName = metricToFieldMapping[metricId];
        const metricData = row.metrics[fieldName];
        const metricName = getMetricDisplayName(metricId);

        if (metricData) {
          excelRow[metricName] = formatValue(metricData.value, metricId);

          if (
            metricData.qoq?.value !== null &&
            metricData.qoq?.value !== undefined
          ) {
            excelRow[`${metricName} - QoQ`] =
              `${metricData.qoq.value.toFixed(1)}%`;
          }

          if (
            metricData.yoy?.value !== null &&
            metricData.yoy?.value !== undefined
          ) {
            excelRow[`${metricName} - YoY`] =
              `${metricData.yoy.value.toFixed(1)}%`;
          }
        }
      });

      return excelRow;
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);

    const colWidths = [{ wch: 12 }, { wch: 15 }, { wch: 12 }];

    selectedMetrics.forEach(() => {
      colWidths.push({ wch: 18 });
      colWidths.push({ wch: 12 });
      colWidths.push({ wch: 12 });
    });

    ws['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(wb, ws, '财务数据');

    const symbols = [...new Set(tableData.map((row) => row.symbol))].join('_');
    const fileName = `财务数据_${symbols}_${new Date().toISOString().slice(0, 10)}.xlsx`;

    XLSX.writeFile(wb, fileName);

    toast({
      type: 'success',
      description: `Excel文件已成功导出: ${fileName}`,
    });
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '';
    // Convert "2025-06-30T00:00:00" to "2025-06-30"
    return dateString.split('T')[0];
  };

  const formatValue = (value: number | null, metricId: string) => {
    if (value === null || value === undefined) return '-';

    const numValue = parseFloat(String(value));

    const addCommas = (num: number, decimals: number = 0) => {
      return num.toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });
    };

    if (
      metricId.includes('margin') ||
      metricId.includes('rate') ||
      metricId.includes('conversion')
    ) {
      return `${addCommas(numValue, 1)}%`;
    } else if (
      metricId.includes('Flow') ||
      metricId === 'revenue' ||
      metricId === 'netincomeaccounting' ||
      metricId === 'grossprofit'
    ) {
      return `$${addCommas(numValue, 0)}`;
    } else {
      return addCommas(numValue, 2);
    }
  };

  // Trend Indicator Component
  function TrendIndicator({
    trend,
    label,
  }: {
    trend:
      | { value: number | null; direction: 'up' | 'down' | 'neutral' }
      | undefined;
    label: string;
  }) {
    if (!trend || trend.value === null)
      return <span className="text-xs text-muted-foreground">-</span>;

    const Icon =
      trend.direction === 'up'
        ? TrendingUp
        : trend.direction === 'down'
          ? TrendingDown
          : Minus;

    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-all duration-200 ${
          trend.direction === 'up'
            ? 'bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400'
            : trend.direction === 'down'
              ? 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400'
              : 'bg-muted text-muted-foreground'
        }`}
      >
        <Icon size={12} />
        {label}: {Math.abs(trend.value).toFixed(1)}%
      </span>
    );
  }

  // Card View Component
  function MetricCard({
    metricId,
    data,
  }: { metricId: string; data: FinancialDataPoint[] }) {
    const metricToFieldMapping = getMetricToFieldMapping();
    const fieldName = metricToFieldMapping[metricId];
    const metricName = getMetricDisplayName(metricId);

    const hasValidData = data.some((row) => {
      const metricData = row.metrics[fieldName];
      return (
        metricData &&
        metricData.value !== null &&
        metricData.value !== undefined
      );
    });

    if (!hasValidData) {
      return null;
    }

    const groupedData = data.reduce(
      (acc, row) => {
        if (!acc[row.symbol]) acc[row.symbol] = [];
        acc[row.symbol].push(row);
        return acc;
      },
      {} as Record<string, FinancialDataPoint[]>,
    );

    return (
      <div className="bg-card border border-border rounded-lg p-4 space-y-4 transition-all duration-200 hover:shadow-sm">
        <h3 className="text-lg font-semibold text-foreground">{metricName}</h3>

        {Object.entries(groupedData).map(([symbol, symbolData]) => (
          <div key={symbol} className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">
              {symbol}
            </h4>
            <div className="grid grid-cols-1 gap-2">
              {symbolData.slice(0, 4).map((row, index) => {
                const metricData = row.metrics[fieldName];
                return (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-muted/50 border border-gray-200 dark:border-border/50 rounded-lg hover:bg-gray-100 dark:hover:bg-muted transition-colors duration-200"
                  >
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs text-muted-foreground font-medium">
                        {row.period} {row.fiscalYear}
                      </span>
                      {(row as any).filingdate && (
                        <span className="text-xs text-muted-foreground opacity-60">
                          {formatDate((row as any).filingdate)}
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-sm text-foreground">
                        {formatValue(metricData?.value, metricId)}
                      </div>
                      <div className="flex gap-1 text-xs mt-1">
                        <TrendIndicator trend={metricData?.qoq} label="QoQ" />
                        <TrendIndicator trend={metricData?.yoy} label="YoY" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Cards View
  function CardsView() {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {selectedMetrics.map((metricId) => (
          <MetricCard key={metricId} metricId={metricId} data={tableData} />
        ))}
      </div>
    );
  }

  // Table View
  function TableView() {
    const metricToFieldMapping = getMetricToFieldMapping();

    const symbols = useMemo(() => {
      return Array.from(new Set(tableData.map((row) => row.symbol)));
    }, []);

    const relativeView = useMemo(() => {
      const symbolData: Record<
        string,
        Array<{ period: string; data: FinancialDataPoint }>
      > = {};

      tableData.forEach((row) => {
        if (!symbolData[row.symbol]) symbolData[row.symbol] = [];
        symbolData[row.symbol].push({
          period: `${row.period} ${row.fiscalYear}`,
          data: row,
        });
      });

      Object.keys(symbolData).forEach((symbol) => {
        symbolData[symbol].sort((a, b) => {
          const [periodA, yearA] = a.period.split(' ');
          const [periodB, yearB] = b.period.split(' ');

          const yearNumA = parseInt(yearA);
          const yearNumB = parseInt(yearB);

          const quarterA = parseInt(periodA.replace('Q', ''));
          const quarterB = parseInt(periodB.replace('Q', ''));

          if (yearNumB !== yearNumA) {
            return yearNumB - yearNumA;
          }

          return quarterB - quarterA;
        });
      });

      const maxQuarters = Math.max(
        ...Object.values(symbolData).map((arr) => arr.length),
      );

      const dataMap: Record<string, Record<string, Record<number, any>>> = {};
      // Extract quarter dates by taking the date from the first symbol's data
      const quarterDates: Array<string | null> = [];

      Object.entries(symbolData).forEach(([symbol, periods]) => {
        if (!dataMap[symbol]) dataMap[symbol] = {};

        periods.forEach((periodData, index) => {
          // Store date for this quarter index (use first symbol's dates)
          if (quarterDates.length === index) {
            quarterDates.push(formatDate((periodData.data as any).filingdate));
          }

          selectedMetrics.forEach((metricId) => {
            const fieldName = metricToFieldMapping[metricId];
            if (!dataMap[symbol][metricId]) dataMap[symbol][metricId] = {};
            dataMap[symbol][metricId][index] =
              periodData.data.metrics[fieldName];
          });
        });
      });

      return { maxQuarters, dataMap, symbolData, quarterDates };
    }, [tableData, selectedMetrics, metricToFieldMapping]);

    if (tableAlignMode === 'original') {
      return (
        <div className="rounded-lg border border-border h-full overflow-auto bg-card shadow-sm">
          <table className="w-full min-w-max border-collapse">
            <thead className="sticky top-0 z-10 bg-muted shadow-sm">
              <tr className="border-b border-border">
                <th className="sticky left-0 bg-muted text-foreground font-medium min-w-[100px] z-20 border-r border-border p-3 text-left">
                  {tFinancial('stockSymbol')}
                </th>
                <th className="sticky left-[100px] bg-muted text-foreground font-medium min-w-[120px] z-20 border-r border-border p-3 text-left">
                  {tFinancial('quarter')}
                </th>
                {selectedMetrics.map((metricId) => (
                  <th
                    key={metricId}
                    className="text-foreground font-medium min-w-[200px] bg-muted p-3 text-right"
                  >
                    {getMetricDisplayName(metricId)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableData.map((row, index) => {
                const isNewSymbolGroup =
                  index === 0 || tableData[index - 1].symbol !== row.symbol;

                return (
                  <tr
                    key={index}
                    className={`border-b border-border hover:bg-muted/50 transition-colors duration-200 ${
                      isNewSymbolGroup
                        ? 'border-t-2 border-t-brand-primary/20'
                        : ''
                    }`}
                  >
                    <td className="sticky left-0 bg-card font-medium text-foreground border-r border-border p-3">
                      {row.symbol}
                    </td>
                    <td className="sticky left-[100px] bg-card text-muted-foreground border-r border-border p-3">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium">
                          {row.period} {row.fiscalYear}
                        </span>
                        {(row as any).filingdate && (
                          <span className="text-xs opacity-75">
                            {formatDate((row as any).filingdate)}
                          </span>
                        )}
                      </div>
                    </td>
                    {selectedMetrics.map((metricId) => {
                      const fieldName = metricToFieldMapping[metricId];
                      const metricData = row.metrics[fieldName];
                      return (
                        <td key={metricId} className="p-3 text-right">
                          <div className="space-y-1">
                            <div className="font-medium text-foreground">
                              {formatValue(metricData?.value, metricId)}
                            </div>
                            <div className="flex justify-end gap-1">
                              <TrendIndicator
                                trend={metricData?.qoq}
                                label="QoQ"
                              />
                              <TrendIndicator
                                trend={metricData?.yoy}
                                label="YoY"
                              />
                            </div>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      );
    } else {
      const { maxQuarters, dataMap, quarterDates } = relativeView;

      return (
        <div className="rounded-lg border border-border h-full overflow-auto bg-card shadow-sm">
          <table className="w-full min-w-max border-collapse">
            <thead className="sticky top-0 z-10 bg-muted shadow-sm">
              <tr className="border-b border-border">
                <th className="sticky left-0 bg-muted text-foreground font-medium min-w-[100px] z-20 border-r border-border p-3 text-left">
                  {tFinancial('stockSymbol')}
                </th>
                <th className="sticky left-[100px] bg-muted text-foreground font-medium min-w-[180px] z-20 border-r border-border p-3 text-left">
                  {tFinancial('metric')}
                </th>
                {Array.from({ length: maxQuarters }, (_, i) => {
                  const date = quarterDates[i];
                  return (
                    <th
                      key={i}
                      className="text-foreground font-medium min-w-[200px] bg-muted p-3 text-center border-r border-border"
                    >
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-semibold">Q-{i}</span>
                        {date && (
                          <span className="text-xs text-muted-foreground font-normal">
                            {date}
                          </span>
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {symbols.map((symbol) => {
                return selectedMetrics.map((metricId, metricIndex) => {
                  const isFirstMetric = metricIndex === 0;
                  return (
                    <tr
                      key={`${symbol}-${metricId}`}
                      className={`border-b border-border hover:bg-muted/50 transition-colors duration-200 ${
                        isFirstMetric
                          ? 'border-t-2 border-t-brand-primary/20'
                          : ''
                      }`}
                    >
                      <td className="sticky left-0 bg-card font-medium text-foreground border-r border-border p-3">
                        {symbol}
                      </td>
                      <td className="sticky left-[100px] bg-card text-muted-foreground border-r border-border p-3">
                        {getMetricDisplayName(metricId)}
                      </td>
                      {Array.from({ length: maxQuarters }, (_, i) => {
                        const metricData = dataMap[symbol]?.[metricId]?.[i];
                        return (
                          <td
                            key={i}
                            className="p-3 text-center border-r border-border"
                          >
                            <div className="space-y-1">
                              <div className="font-medium text-foreground">
                                {formatValue(metricData?.value, metricId)}
                              </div>
                              <div className="flex justify-center gap-1">
                                <TrendIndicator
                                  trend={metricData?.qoq}
                                  label="QoQ"
                                />
                                <TrendIndicator
                                  trend={metricData?.yoy}
                                  label="YoY"
                                />
                              </div>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                });
              })}
            </tbody>
          </table>
        </div>
      );
    }
  }

  return (
    <div className="w-full h-full flex flex-col bg-background">
      {/* Control Panel */}
      <div className="border-b border-border">
        {/* Header - Always Visible */}
        <div className="flex items-center justify-between p-4">
          <h2 className="text-xl font-semibold text-foreground">
            {tFinancial('title')}
          </h2>
          <div className="flex items-center gap-2">
            {/* View Toggle - Only show when data exists */}
            {tableData.length > 0 && (
              <>
                <div className="flex gap-1 bg-muted rounded-lg p-1">
                  <button
                    onClick={() => setViewMode('cards')}
                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200 flex items-center gap-1.5 ${
                      viewMode === 'cards'
                        ? 'bg-brand-primary/10 border border-brand-primary/20 text-brand-primary'
                        : 'text-muted-foreground hover:bg-background hover:text-foreground'
                    }`}
                  >
                    <LayoutGrid size={16} />
                    {tFinancial('cards')}
                  </button>
                  <button
                    onClick={() => setViewMode('table')}
                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200 flex items-center gap-1.5 ${
                      viewMode === 'table'
                        ? 'bg-brand-primary/10 border border-brand-primary/20 text-brand-primary'
                        : 'text-muted-foreground hover:bg-background hover:text-foreground'
                    }`}
                  >
                    <Table2 size={16} />
                    {tFinancial('table')}
                  </button>
                </div>

                {/* Table Layout Toggle - Only in table view */}
                {viewMode === 'table' && (
                  <div className="flex gap-1 bg-muted rounded-lg p-1">
                    <button
                      onClick={() => setTableAlignMode('original')}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 whitespace-nowrap ${
                        tableAlignMode === 'original'
                          ? 'bg-brand-primary/10 border border-brand-primary/20 text-brand-primary'
                          : 'text-muted-foreground hover:bg-background hover:text-foreground'
                      }`}
                    >
                      {tFinancial('timeline')}
                    </button>
                    <button
                      onClick={() => setTableAlignMode('relative')}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 whitespace-nowrap ${
                        tableAlignMode === 'relative'
                          ? 'bg-brand-primary/10 border border-brand-primary/20 text-brand-primary'
                          : 'text-muted-foreground hover:bg-background hover:text-foreground'
                      }`}
                    >
                      {tFinancial('comparison')}
                    </button>
                  </div>
                )}
              </>
            )}

            {/* Export Button - Only when data exists */}
            {tableData.length > 0 && (
              <Button
                onClick={exportToExcel}
                size="sm"
                variant="outline"
                className="flex items-center gap-2 text-sm font-medium"
              >
                <Download size={16} />
                {tFinancial('exportExcel')}
              </Button>
            )}

            {/* Collapse/Expand Button */}
            <button
              onClick={() => setPanelCollapsed(!isPanelCollapsed)}
              className="p-2 hover:bg-muted rounded-md transition-colors duration-200"
              title={isPanelCollapsed ? '展开控制面板' : '收起控制面板'}
            >
              {isPanelCollapsed ? (
                <ChevronDown size={20} />
              ) : (
                <ChevronUp size={20} />
              )}
            </button>
          </div>
        </div>

        {/* Collapsible Control Area */}
        {!isPanelCollapsed && (
          <div className="px-4 pb-4 space-y-4">
            {/* Stock Symbol Input */}
            <div className="space-y-2">
              <Label
                htmlFor="symbols"
                className="text-sm font-medium text-foreground"
              >
                {tFinancial('stockSymbolLabel')}
              </Label>
              <Input
                id="symbols"
                value={symbolInput}
                onChange={(e) => setSymbolInput(e.target.value)}
                placeholder={tFinancial('stockSymbolPlaceholder')}
                className="bg-background border-input"
              />
            </div>

            {/* Metric Selection */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">
                {tFinancial('selectMetrics')}
              </Label>
              {latexMetrics === undefined ? (
                <div className="text-sm text-muted-foreground">
                  {tFinancial('loadingMetrics')}
                </div>
              ) : availableMetrics.length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  {tFinancial('noMetricsAvailable')}
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-2 max-h-40 overflow-y-auto">
                  {orderedMetrics.map((metric, index) => (
                    <div
                      key={metric._id}
                      className={`flex items-center gap-2 p-2 rounded-lg border transition-all duration-200 cursor-move ${
                        dragOverIndex === index
                          ? 'bg-brand-primary/5 border-brand-primary/30'
                          : 'border-border hover:bg-muted'
                      } ${draggedIndex === index ? 'opacity-50 scale-95' : ''}`}
                      draggable
                      onDragStart={() => handleDragStart(index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDragEnd={handleDragEnd}
                      title={tFinancial('dragToReorder')}
                    >
                      <GripVertical className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <Checkbox
                        id={metric._id}
                        checked={selectedMetrics.includes(metric._id)}
                        onCheckedChange={() => handleMetricToggle(metric._id)}
                        className="flex-shrink-0"
                      />
                      <Label
                        htmlFor={metric._id}
                        className="text-xs text-muted-foreground cursor-pointer flex-1 truncate"
                        title={metric.description}
                      >
                        {metric.name}
                      </Label>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quarter Selection */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">
                {tFinancial('historicalQuarters')}
              </Label>
              <Select
                value={selectedQuarters}
                onValueChange={setSelectedQuarters}
              >
                <SelectTrigger className="w-full bg-background border-input">
                  <SelectValue placeholder="Select number of quarters" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">{tFinancial('quarters_5')}</SelectItem>
                  <SelectItem value="10">
                    {tFinancial('quarters_10')}
                  </SelectItem>
                  <SelectItem value="20">
                    {tFinancial('quarters_20')}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Analyze Button */}
            <Button
              onClick={handleAnalyze}
              disabled={isLoading || selectedMetrics.length === 0}
              className="w-full bg-brand-primary text-white hover:opacity-90 transition-all duration-200"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                  <span>{tFinancial('analyzing')}</span>
                </div>
              ) : (
                <>
                  <Search size={16} className="mr-2" />
                  {tFinancial('analyze')}
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Data Display Area */}
      <div className="flex-1 p-4 overflow-auto">
        {error ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center max-w-md bg-card border border-border rounded-lg p-6">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <p className="font-medium mb-2 text-foreground">
                {tFinancial('errorFetchingData')}
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                {error.message}
              </p>
              <Button
                onClick={() => setError(null)}
                variant="outline"
                size="sm"
              >
                {tFinancial('retry')}
              </Button>
            </div>
          </div>
        ) : tableData.length > 0 ? (
          viewMode === 'cards' ? (
            <CardsView />
          ) : (
            <TableView />
          )
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <Table2 size={32} className="text-muted-foreground" />
              </div>
              <p className="text-lg font-medium text-foreground mb-2">
                {tFinancial('startAnalyzing')}
              </p>
              <p className="text-sm text-muted-foreground">
                {tFinancial('startAnalyzingDescription')}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export { FinancialDataPanelComponent as FinancialDataPanel };
