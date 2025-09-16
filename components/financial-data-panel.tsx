'use client';

import { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useFinancialDataStore } from '@/lib/stores/financial-data-store';
import { Download } from 'lucide-react';
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

// LaTeX指标接口类型
interface LaTeXMetric {
  _id: string;
  name: string;
  description: string;
  category: string;
  latexFormula: string;
  sqlFormula?: string;
}

// 财务数据接口类型定义
interface FinancialDataResponse {
  symbol: string;
  fiscalYear: number;
  period: string;
  date: string | null;
  metrics: Record<string, {
    value: number | null;
    qoq: {
      value: number | null;
      direction: 'up' | 'down';
    };
    yoy: {
      value: number | null;
      direction: 'up' | 'down';
    };
  }>;
}

export function FinancialDataPanel() {
  const [symbolInput, setSymbolInput] = useState('NVDA,AAPL,MSFT');
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([]);
  const [selectedQuarters, setSelectedQuarters] = useState('5');
  const [tableData, setTableData] = useState<FinancialDataResponse[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false);

  // 财务数据store
  const { updateFinancialData, clearFinancialData } = useFinancialDataStore();

  // 监听tableData变化，更新全局财务数据状态
  useEffect(() => {
    if (tableData.length > 0) {
      // 转换财务数据格式以适配store
      const financialDataRows = tableData.map(row => ({
        symbol: row.symbol,
        fiscalYear: row.fiscalYear,
        period: row.period,
        date: row.date,
        ...row.metrics, // 展开所有指标数据
      }));

      updateFinancialData(financialDataRows);
      console.log('📊 Updated financial data store with', financialDataRows.length, 'rows');
    } else {
      clearFinancialData();
      console.log('📊 Cleared financial data store');
    }
  }, [tableData, updateFinancialData, clearFinancialData]);

  // 从Convex获取用户组织的LaTeX指标
  const latexMetrics = useQuery(api.latexMetrics.getAccessibleLatexMetrics, {
    limit: 100
  });

  // 过滤出有sqlFormula的指标
  const availableMetrics = latexMetrics?.filter(metric => metric.sqlFormula) || [];

  const handleMetricToggle = (metricId: string) => {
    setSelectedMetrics(prev =>
      prev.includes(metricId)
        ? prev.filter(id => id !== metricId)
        : [...prev, metricId]
    );
  };

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
    selectedMetrics.forEach(metricId => {
      const metric = availableMetrics.find(m => m._id === metricId);
      if (metric?.sqlFormula) {
        mapping[metricId] = extractFieldName(metric.sqlFormula);
      }
    });
    return mapping;
  };

  const handleAnalyze = async () => {
    setIsLoading(true);

    try {
      const symbols = symbolInput.split(',').map(s => s.trim().toUpperCase()).filter(s => s);

      console.log('📊 Analyzing financial data:', {
        symbols,
        metricIds: selectedMetrics,
        quarters: parseInt(selectedQuarters)
      });

      const response = await fetch('/api/financial-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          symbols,
          metricIds: selectedMetrics, // 传递metric IDs而不是字段名
          quarters: parseInt(selectedQuarters)
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ API Error:', errorData);
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data: FinancialDataResponse[] = await response.json();
      console.log('✅ Received data:', data);

      setTableData(data);

      // 自动折叠控制面板以展示更多数据空间
      if (data.length > 0) {
        setIsPanelCollapsed(true);
      }

    } catch (error) {
      console.error('❌ Error fetching financial data:', error);
      // 显示错误提示，但保持界面可用
      alert(`获取财务数据失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const getMetricDisplayName = (metricId: string) => {
    return availableMetrics.find(m => m._id === metricId)?.name || metricId;
  };

  // 导出Excel功能
  const exportToExcel = () => {
    if (tableData.length === 0) {
      alert('没有数据可以导出');
      return;
    }

    const metricToFieldMapping = getMetricToFieldMapping();

    // 准备Excel数据
    const excelData = tableData.map(row => {
      const excelRow: any = {
        '股票代码': row.symbol,
        '季度': `${row.period} ${row.fiscalYear}`,
        '日期': row.date || ''
      };

      // 添加每个指标的数据
      selectedMetrics.forEach(metricId => {
        const fieldName = metricToFieldMapping[metricId];
        const metricData = row.metrics[fieldName];
        const metricName = getMetricDisplayName(metricId);

        if (metricData) {
          // 主要数值
          excelRow[metricName] = formatValue(metricData.value, metricId);

          // QoQ趋势
          if (metricData.qoq?.value !== null && metricData.qoq?.value !== undefined) {
            excelRow[`${metricName} - QoQ`] = `${metricData.qoq.value.toFixed(1)}%`;
          }

          // YoY趋势
          if (metricData.yoy?.value !== null && metricData.yoy?.value !== undefined) {
            excelRow[`${metricName} - YoY`] = `${metricData.yoy.value.toFixed(1)}%`;
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
    const symbols = [...new Set(tableData.map(row => row.symbol))].join('_');
    const fileName = `财务数据_${symbols}_${new Date().toISOString().slice(0, 10)}.xlsx`;

    // 下载文件
    XLSX.writeFile(wb, fileName);
  };

  const formatValue = (value: number | null, metricId: string) => {
    if (value === null || value === undefined) return '-';

    const numValue = parseFloat(String(value));

    // 添加千位分隔符的辅助函数
    const addCommas = (num: number, decimals: number = 0) => {
      return num.toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
      });
    };

    // 格式化不同类型的数据
    if (metricId.includes('margin') || metricId.includes('rate') || metricId.includes('conversion')) {
      return `${addCommas(numValue, 1)}%`;
    } else if (metricId.includes('Flow') || metricId === 'revenue' || metricId === 'netincomeaccounting' || metricId === 'grossprofit') {
      // 大数值显示完整数字，加逗号分隔符
      return `$${addCommas(numValue, 0)}`;
    } else {
      return addCommas(numValue, 2);
    }
  };

  // 趋势指示器组件
  function TrendIndicator({
    trend,
    label
  }: {
    trend: { value: number | null, direction: 'up' | 'down' } | undefined,
    label: string
  }) {
    if (!trend || trend.value === null) return <span className="text-xs text-muted-foreground">-</span>;

    return (
      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${
        trend.direction === 'up'
          ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
          : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
      }`}>
        {trend.direction === 'up' ? '↗' : '↘'} {label}: {Math.abs(trend.value).toFixed(1)}%
      </span>
    );
  }

  // 卡片视图组件
  function MetricCard({ metricId, data }: { metricId: string, data: FinancialDataResponse[] }) {
    const metricToFieldMapping = getMetricToFieldMapping();
    const fieldName = metricToFieldMapping[metricId];
    const metricName = getMetricDisplayName(metricId);

    // 按symbol分组数据
    const groupedData = data.reduce((acc, row) => {
      if (!acc[row.symbol]) acc[row.symbol] = [];
      acc[row.symbol].push(row);
      return acc;
    }, {} as Record<string, FinancialDataResponse[]>);

    return (
      <div className="bg-card border border-border rounded-lg p-4 space-y-4">
        <h3 className="text-lg font-semibold text-foreground">{metricName}</h3>

        {Object.entries(groupedData).map(([symbol, symbolData]) => (
          <div key={symbol} className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">{symbol}</h4>
            <div className="grid grid-cols-1 gap-2">
              {symbolData.slice(0, 3).map((row, index) => {
                const metricData = row.metrics[fieldName];
                return (
                  <div key={index} className="flex items-center justify-between p-2 bg-secondary/50 rounded">
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
        {selectedMetrics.map(metricId => (
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
              <th className="sticky left-0 bg-background text-foreground font-medium min-w-[100px] z-20 border-r p-3 text-left">股票代码</th>
              <th className="sticky left-[100px] bg-background text-foreground font-medium min-w-[120px] z-20 border-r p-3 text-left">季度</th>
              {selectedMetrics.map(metricId => (
                <th key={metricId} className="text-foreground font-medium min-w-[200px] bg-background p-3 text-right">
                  {getMetricDisplayName(metricId)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tableData.map((row, index) => {
              // 检查是否是新的symbol组的开始
              const isNewSymbolGroup = index === 0 || tableData[index - 1].symbol !== row.symbol;

              return (
                <tr
                  key={index}
                  className={`border-b hover:bg-secondary/50 ${
                    isNewSymbolGroup ? 'border-t-4 border-t-slate-400 dark:border-t-slate-600' : ''
                  }`}
                >
                  <td className="sticky left-0 bg-background font-medium text-foreground border-r p-3">{row.symbol}</td>
                  <td className="sticky left-[100px] bg-background text-muted-foreground border-r p-3">{row.period} {row.fiscalYear}</td>
                  {selectedMetrics.map(metricId => {
                    const fieldName = metricToFieldMapping[metricId];
                    const metricData = row.metrics[fieldName];
                    return (
                      <td key={metricId} className="p-3 text-right">
                        <div className="space-y-1">
                          <div className="font-medium text-foreground">
                            {formatValue(metricData?.value, metricId)}
                          </div>
                          <div className="flex justify-end space-x-1">
                            <TrendIndicator trend={metricData?.qoq} label="QoQ" />
                            <TrendIndicator trend={metricData?.yoy} label="YoY" />
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
      <div className="border-b border-border">
        {/* 标题栏 - 始终可见 */}
        <div className="flex items-center justify-between p-4">
          <h2 className="text-xl font-semibold text-foreground">财务数据分析</h2>
          <div className="flex items-center space-x-2">
            {/* 视图切换 - 只在有数据时显示 */}
            {tableData.length > 0 && (
              <div className="flex bg-secondary rounded-lg p-1">
                <button
                  onClick={() => setViewMode('cards')}
                  className={`px-3 py-1 text-xs rounded transition-colors ${
                    viewMode === 'cards'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  📊 卡片
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={`px-3 py-1 text-xs rounded transition-colors ${
                    viewMode === 'table'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  📋 表格
                </button>
              </div>
            )}

            {/* 导出Excel按钮 - 只在有数据时显示 */}
            {tableData.length > 0 && (
              <Button
                onClick={exportToExcel}
                variant="outline"
                size="sm"
                className="flex items-center gap-2 text-sm font-medium hover:bg-green-50 hover:text-green-700 hover:border-green-300 dark:hover:bg-green-950 dark:hover:text-green-400 transition-colors"
              >
                <Download size={16} />
                导出Excel
              </Button>
            )}

            {/* 折叠/展开按钮 */}
            <button
              onClick={() => setIsPanelCollapsed(!isPanelCollapsed)}
              className="p-2 hover:bg-secondary rounded transition-colors"
              title={isPanelCollapsed ? "展开控制面板" : "收起控制面板"}
            >
              {isPanelCollapsed ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
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
          <Label htmlFor="symbols" className="text-sm font-medium text-foreground">
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
          <Label className="text-sm font-medium text-foreground">选择财务指标</Label>
          {latexMetrics === undefined ? (
            <div className="text-sm text-muted-foreground">加载指标中...</div>
          ) : availableMetrics.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              暂无可用指标，请先在LaTeX metrics中创建包含SQL公式的指标
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto">
              {availableMetrics.map((metric) => (
                <div key={metric._id} className="flex items-center space-x-2">
                  <Checkbox
                    id={metric._id}
                    checked={selectedMetrics.includes(metric._id)}
                    onCheckedChange={() => handleMetricToggle(metric._id)}
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
          <Label className="text-sm font-medium text-foreground">历史季度数</Label>
          <Select value={selectedQuarters} onValueChange={setSelectedQuarters}>
            <SelectTrigger className="w-full bg-secondary">
              <SelectValue placeholder="选择季度数" />
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
          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
        >
          {isLoading ? (
            <div className="flex items-center space-x-2">
              <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
              <span>分析中...</span>
            </div>
          ) : (
            '开始分析'
          )}
        </Button>
          </div>
        )}
      </div>

      {/* 数据显示区域 */}
      <div className="flex-1 p-4 overflow-auto">
        {tableData.length > 0 ? (
          viewMode === 'cards' ? <CardsView /> : <TableView />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center">
              <p className="text-lg mb-2">📊</p>
              <p>选择股票代码和指标，点击"开始分析"查看数据</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}