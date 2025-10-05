'use client';

import { useState, useEffect, useRef, useMemo, useCallback, memo } from 'react';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useSQLQuery } from '@/lib/hooks/use-sql-query';
import { useFinancialDataStore } from '@/lib/stores/financial-data-store';
import { Download, GripVertical } from 'lucide-react';
import { toast } from './toast';
import type {
  FinancialDataPoint,
  LaTeXMetric,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';

// 移除重复的类型定义，使用统一的类型

function FinancialDataPanelComponent() {
  // 本地状态（只保留非持久化的状态）
  const [tableData, setTableData] = useState<FinancialDataPoint[]>([]);

  // 拖拽状态
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [orderedMetrics, setOrderedMetrics] = useState<any[]>([]);

  // 从 Zustand store 获取状态和方法
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

  // 解构表单状态，转换 periods 为字符串以兼容现有UI
  const { symbols: symbolInput, selectedMetrics, periods } = analysisForm;
  const selectedQuarters = periods.toString();

  // 表单更新函数
  const setSymbolInput = (symbols: string) => {
    updateAnalysisForm({ symbols });
  };

  const setSelectedMetrics = (metrics: string[]) => {
    updateAnalysisForm({ selectedMetrics: metrics });
  };

  const setSelectedQuarters = (periods: string) => {
    updateAnalysisForm({ periods: Number(periods) });
  };

  // 页面加载时，从持久化数据中恢复tableData
  useEffect(() => {
    console.log(
      '🔄 Component mounted, checking stored data:',
      storedData.length,
      'records',
    );
    if (storedData.length > 0) {
      setTableData(storedData);
      console.log(
        '📊 Restored financial data from store:',
        storedData.length,
        'records',
      );
    }
  }, [storedData.length]); // 监听数据长度变化，避免无限循环

  // 使用localStorage store中的数据，而不是本地tableData状态
  // 移除这个useEffect以避免循环依赖

  // 从PostgreSQL获取用户组织的LaTeX指标
  const { data: latexMetricsData } = useSQLQuery<{ metrics: any[] }>(
    '/api/latex-metrics?limit=100',
  );
  const latexMetrics = latexMetricsData?.metrics;

  // 过滤出有sqlFormula的指标 (使用useMemo稳定引用)
  const availableMetrics = useMemo(() => {
    return latexMetrics?.filter((metric) => metric.sqlFormula) || [];
  }, [latexMetrics]);

  // 初始化指标顺序
  useEffect(() => {
    if (availableMetrics.length > 0 && orderedMetrics.length === 0) {
      const savedOrder = localStorage.getItem('metric-selection-order');
      if (savedOrder) {
        try {
          const savedIds = JSON.parse(savedOrder);
          const ordered: any[] = [];
          const metricMap = new Map(availableMetrics.map((m) => [m._id, m]));

          // 按保存顺序添加
          savedIds.forEach((id: string) => {
            const metric = metricMap.get(id);
            if (metric) {
              ordered.push(metric);
              metricMap.delete(id);
            }
          });

          // 添加新指标
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

  // 更新store中的可用指标
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

  // 拖拽处理函数
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

      // 保存到 localStorage
      const orderIds = newOrder.map((m) => m._id);
      localStorage.setItem('metric-selection-order', JSON.stringify(orderIds));
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  }, [draggedIndex, dragOverIndex, orderedMetrics]);

  // 从SQL公式中提取字段名（AS后面的部分）
  const extractFieldName = (sqlFormula: string): string => {
    if (sqlFormula.includes(' AS ')) {
      return sqlFormula.split(' AS ')[1].trim();
    }
    return sqlFormula;
  };

  // 创建metric ID到字段名的映射
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

      console.log('📊 Analyzing financial data:', {
        symbols,
        metricIds: selectedMetrics,
        quarters: parseInt(selectedQuarters),
      });

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
        console.error('❌ API Error:', errorData);
        throw new Error(
          errorData.error || `HTTP ${response.status}: ${response.statusText}`,
        );
      }

      const data: FinancialDataPoint[] = await response.json();
      console.log('✅ Received data:', data);

      // 同时更新本地状态和持久化store
      setTableData(data);
      updateFinancialData(data);

      // 自动折叠控制面板以展示更多数据空间
      if (data.length > 0) {
        setPanelCollapsed(true);
      }
    } catch (error) {
      console.error('❌ Error fetching financial data:', error);
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      setError({ message: `获取财务数据失败: ${errorMessage}` });
    } finally {
      setLoading(false);
    }
  };

  const getMetricDisplayName = (metricId: string) => {
    return availableMetrics.find((m) => m._id === metricId)?.name || metricId;
  };

  // 导出Excel功能
  const exportToExcel = () => {
    if (tableData.length === 0) {
      toast({
        type: 'error',
        description: '没有数据可以导出',
      });
      return;
    }

    const metricToFieldMapping = getMetricToFieldMapping();

    // 准备Excel数据
    const excelData: ExcelDataRow[] = tableData.map((row) => {
      const excelRow: ExcelDataRow = {
        股票代码: row.symbol,
        季度: `${row.period} ${row.fiscalYear}`,
        日期: row.date || '',
      };

      // 添加每个指标的数据
      selectedMetrics.forEach((metricId) => {
        const fieldName = metricToFieldMapping[metricId];
        const metricData = row.metrics[fieldName];
        const metricName = getMetricDisplayName(metricId);

        if (metricData) {
          // 主要数值
          excelRow[metricName] = formatValue(metricData.value, metricId);

          // QoQ趋势
          if (
            metricData.qoq?.value !== null &&
            metricData.qoq?.value !== undefined
          ) {
            excelRow[`${metricName} - QoQ`] =
              `${metricData.qoq.value.toFixed(1)}%`;
          }

          // YoY趋势
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

    // 创建工作簿
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);

    // 设置列宽
    const colWidths = [
      { wch: 12 }, // 股票代码
      { wch: 15 }, // 季度
      { wch: 12 }, // 日期
    ];

    // 为每个指标添加列宽
    selectedMetrics.forEach(() => {
      colWidths.push({ wch: 18 }); // 主要数值
      colWidths.push({ wch: 12 }); // QoQ
      colWidths.push({ wch: 12 }); // YoY
    });

    ws['!cols'] = colWidths;

    // 添加工作表到工作簿
    XLSX.utils.book_append_sheet(wb, ws, '财务数据');

    // 生成文件名
    const symbols = [...new Set(tableData.map((row) => row.symbol))].join('_');
    const fileName = `财务数据_${symbols}_${new Date().toISOString().slice(0, 10)}.xlsx`;

    // 下载文件
    XLSX.writeFile(wb, fileName);

    // 显示成功提示
    toast({
      type: 'success',
      description: `Excel文件已成功导出: ${fileName}`,
    });
  };

  const formatValue = (value: number | null, metricId: string) => {
    if (value === null || value === undefined) return '-';

    const numValue = parseFloat(String(value));

    // 添加千位分隔符的辅助函数
    const addCommas = (num: number, decimals: number = 0) => {
      return num.toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });
    };

    // 格式化不同类型的数据
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
      // 大数值显示完整数字，加逗号分隔符
      return `$${addCommas(numValue, 0)}`;
    } else {
      return addCommas(numValue, 2);
    }
  };

  // 趋势指示器组件
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

    return (
      <span
        className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${
          trend.direction === 'up'
            ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
            : trend.direction === 'down'
              ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
              : 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
        }`}
      >
        {trend.direction === 'up'
          ? '↗'
          : trend.direction === 'down'
            ? '↘'
            : '→'}{' '}
        {label}: {Math.abs(trend.value).toFixed(1)}%
      </span>
    );
  }

  // 卡片视图组件
  function MetricCard({
    metricId,
    data,
  }: { metricId: string; data: FinancialDataPoint[] }) {
    const metricToFieldMapping = getMetricToFieldMapping();
    const fieldName = metricToFieldMapping[metricId];
    const metricName = getMetricDisplayName(metricId);

    // 检查是否有任何有效数据
    const hasValidData = data.some((row) => {
      const metricData = row.metrics[fieldName];
      return (
        metricData &&
        metricData.value !== null &&
        metricData.value !== undefined
      );
    });

    // 如果没有任何有效数据，不渲染此卡片
    if (!hasValidData) {
      return null;
    }

    // 按symbol分组数据
    const groupedData = data.reduce(
      (acc, row) => {
        if (!acc[row.symbol]) acc[row.symbol] = [];
        acc[row.symbol].push(row);
        return acc;
      },
      {} as Record<string, FinancialDataPoint[]>,
    );

    return (
      <div className="bg-card border border-border rounded-lg p-4 space-y-4">
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
                    className="flex items-center justify-between p-2 bg-secondary/50 rounded"
                  >
                    <span className="text-xs text-muted-foreground">
                      {row.period} {row.fiscalYear}
                    </span>
                    <div className="text-right">
                      <div className="font-medium text-sm">
                        {formatValue(metricData?.value, metricId)}
                      </div>
                      <div className="flex space-x-1 text-xs">
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

  // 卡片布局视图
  function CardsView() {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {selectedMetrics.map((metricId) => (
          <MetricCard key={metricId} metricId={metricId} data={tableData} />
        ))}
      </div>
    );
  }

  // 表格视图（使用原生HTML table以确保sticky正常工作）
  function TableView() {
    const metricToFieldMapping = getMetricToFieldMapping();

    return (
      <div className="rounded-md border border-border h-full overflow-auto">
        <table className="w-full min-w-max border-collapse">
          <thead className="sticky top-0 z-10 bg-background shadow-sm">
            <tr className="border-b">
              <th className="sticky left-0 bg-background text-foreground font-medium min-w-[100px] z-20 border-r p-3 text-left">
                股票代码
              </th>
              <th className="sticky left-[100px] bg-background text-foreground font-medium min-w-[120px] z-20 border-r p-3 text-left">
                季度
              </th>
              {selectedMetrics.map((metricId) => (
                <th
                  key={metricId}
                  className="text-foreground font-medium min-w-[200px] bg-background p-3 text-right"
                >
                  {getMetricDisplayName(metricId)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tableData.map((row, index) => {
              // 检查是否是新的symbol组的开始
              const isNewSymbolGroup =
                index === 0 || tableData[index - 1].symbol !== row.symbol;

              return (
                <tr
                  key={index}
                  className={`border-b hover:bg-secondary/50 ${
                    isNewSymbolGroup
                      ? 'border-t-4 border-t-slate-400 dark:border-t-slate-600'
                      : ''
                  }`}
                >
                  <td className="sticky left-0 bg-background font-medium text-foreground border-r p-3">
                    {row.symbol}
                  </td>
                  <td className="sticky left-[100px] bg-background text-muted-foreground border-r p-3">
                    {row.period} {row.fiscalYear}
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
                          <div className="flex justify-end space-x-1">
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
  }

  return (
    <div className="w-full h-full flex flex-col bg-transparent">
      {/* 控制面板 */}
      <div className="border-b border-border/50">
        {/* 标题栏 - 始终可见 */}
        <div className="flex items-center justify-between p-4">
          <h2 className="text-xl font-bold text-foreground">财务数据分析</h2>
          <div className="flex items-center gap-2">
            {/* 视图切换 - 只在有数据时显示 */}
            {tableData.length > 0 && (
              <div className="flex gap-1 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-zinc-800 dark:to-zinc-900 rounded-xl p-1 shadow-[inset_2px_2px_4px_rgba(0,0,0,0.06),inset_-2px_-2px_4px_rgba(255,255,255,0.9)] dark:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.5),inset_-2px_-2px_4px_rgba(255,255,255,0.05)]">
                <button
                  onClick={() => setViewMode('cards')}
                  className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-all duration-300 ${
                    viewMode === 'cards'
                      ? 'neuro-pill-active text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  卡片
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-all duration-300 ${
                    viewMode === 'table'
                      ? 'neuro-pill-active text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  表格
                </button>
              </div>
            )}

            {/* 导出Excel按钮 - 只在有数据时显示 */}
            {tableData.length > 0 && (
              <Button
                onClick={exportToExcel}
                size="sm"
                className="neuro-raised-sm bg-gradient-to-br from-white to-gray-50 dark:from-zinc-800 dark:to-zinc-900 flex items-center gap-2 text-sm font-medium border-0"
              >
                <Download size={16} />
                导出Excel
              </Button>
            )}

            {/* 折叠/展开按钮 */}
            <button
              onClick={() => setPanelCollapsed(!isPanelCollapsed)}
              className="p-2 hover:bg-secondary rounded transition-colors"
              title={isPanelCollapsed ? '展开控制面板' : '收起控制面板'}
            >
              {isPanelCollapsed ? (
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              ) : (
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 15l7-7 7 7"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* 可折叠的控制区域 */}
        {!isPanelCollapsed && (
          <div className="px-4 pb-4 space-y-4">
            {/* 股票代码输入 */}
            <div className="space-y-2">
              <Label
                htmlFor="symbols"
                className="text-sm font-medium text-foreground"
              >
                股票代码 (用逗号分隔)
              </Label>
              <Input
                id="symbols"
                value={symbolInput}
                onChange={(e) => setSymbolInput(e.target.value)}
                placeholder="例如: AAPL,MSFT,GOOGL"
                className="professional-input"
              />
            </div>

            {/* 指标选择 */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">
                选择财务指标 (可拖拽调整顺序)
              </Label>
              {latexMetrics === undefined ? (
                <div className="text-sm text-muted-foreground">
                  加载指标中...
                </div>
              ) : availableMetrics.length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  暂无可用指标，请先在LaTeX metrics中创建包含SQL公式的指标
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-2 max-h-40 overflow-y-auto">
                  {orderedMetrics.map((metric, index) => (
                    <div
                      key={metric._id}
                      className={`flex items-center space-x-2 p-2 rounded-md border-2 transition-all cursor-move ${
                        dragOverIndex === index
                          ? 'bg-blue-50 dark:bg-blue-950 border-blue-300 dark:border-blue-600'
                          : 'border-transparent hover:bg-gray-50 dark:hover:bg-gray-800'
                      } ${draggedIndex === index ? 'opacity-50 scale-95' : ''}`}
                      draggable
                      onDragStart={() => handleDragStart(index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDragEnd={handleDragEnd}
                      title="拖拽调整指标顺序"
                    >
                      <GripVertical className="w-4 h-4 text-blue-500 opacity-60 hover:opacity-100 transition-opacity flex-shrink-0" />
                      <Checkbox
                        id={metric._id}
                        checked={selectedMetrics.includes(metric._id)}
                        onCheckedChange={() => handleMetricToggle(metric._id)}
                        className="flex-shrink-0"
                      />
                      <Label
                        htmlFor={metric._id}
                        className="text-xs text-muted-foreground cursor-pointer flex-1"
                        title={metric.description}
                      >
                        {metric.name}
                      </Label>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 季度选择 */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">
                历史季度数
              </Label>
              <Select
                value={selectedQuarters}
                onValueChange={setSelectedQuarters}
              >
                <SelectTrigger className="w-full bg-secondary">
                  <SelectValue placeholder="Select number of quarters" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5个季度</SelectItem>
                  <SelectItem value="10">10个季度</SelectItem>
                  <SelectItem value="20">20个季度</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 分析按钮 */}
            <Button
              onClick={handleAnalyze}
              disabled={isLoading || selectedMetrics.length === 0}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                  <span>Analyzing...</span>
                </div>
              ) : (
                'Analyze'
              )}
            </Button>
          </div>
        )}
      </div>

      {/* 数据显示区域 */}
      <div className="flex-1 p-4 overflow-auto">
        {error ? (
          <div className="flex items-center justify-center h-full text-red-500">
            <div className="text-center max-w-md">
              <p className="text-lg mb-2">❌</p>
              <p className="font-medium mb-2">Error getting data</p>
              <p className="text-sm text-muted-foreground">{error.message}</p>
              <Button
                onClick={() => setError(null)}
                variant="outline"
                size="sm"
                className="mt-4"
              >
                Retry
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
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center">
              <p className="text-lg mb-2">📊</p>
              <p>
                Select stock symbols and metrics, click "Analyze" to view data
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export { FinancialDataPanelComponent as FinancialDataPanel };
