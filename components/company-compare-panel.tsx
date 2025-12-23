'use client';

import { useState } from 'react';
import { Loader2, GitCompareArrows, ArrowUp, ArrowDown, X, Download } from 'lucide-react';
import ExcelJS from 'exceljs';

interface CompanyMetrics {
  symbol: string;
  roce?: number;
  revenueGrowthYoY?: number;
  grossMargin?: number;
  grossMarginQoQ?: number;
  grossMarginYoY?: number;
  operatingMargin?: number;
  operatingMarginQoQ?: number;
  operatingMarginYoY?: number;
  cashConversionRate?: number;
  netIncomePositive?: boolean;
  fcfPositive?: boolean;
  fcfGrowthYoY?: number;
  fcfTurnedPositive?: boolean;
  fcfYield?: number;
  priceToHigh?: number;
}

// 格式化百分比
const formatPercent = (v: number | undefined | null): string => {
  if (v === undefined || v === null) return '-';
  return `${v.toFixed(0)}%`;
};

// 格式化现金转换率
const formatCashConversion = (m: CompanyMetrics): string => {
  if (m.cashConversionRate === undefined || m.cashConversionRate === null) return '-';

  // 利润为负但现金流为正
  if (m.netIncomePositive === false && m.fcfPositive === true) {
    return '利润负现金流正';
  }
  // 现金流为负
  if (m.fcfPositive === false) {
    return '负';
  }
  return m.cashConversionRate.toFixed(2);
};

// 格式化自由现金流增长
const formatFcfGrowth = (m: CompanyMetrics): string => {
  if (m.fcfTurnedPositive) {
    return '转正';
  }
  if (m.fcfGrowthYoY === undefined || m.fcfGrowthYoY === null) return '-';
  return `${m.fcfGrowthYoY.toFixed(0)}%`;
};

// 格式化自由现金流收益率
const formatFcfYield = (v: number | undefined | null): string => {
  if (v === undefined || v === null) return '-';
  if (v < 0) return '负';
  return `${v.toFixed(0)}%`;
};

// 格式化趋势为文字
const formatTrend = (v: number | undefined | null): string => {
  if (v === undefined || v === null || v === 0) return '-';
  return v > 0 ? '↑' : '↓';
};

// 导出 Excel (带样式 - 专业美观设计)
const exportToExcel = async (metricsData: CompanyMetrics[], compareDate: string) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Fundley';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet('公司对比', {
    views: [{ showGridLines: false }],
  });

  const colCount = metricsData.length + 1;

  // 颜色定义
  const colors = {
    headerBg: 'FF1E3A5F',      // 深蓝色表头背景
    headerText: 'FFFFFFFF',    // 白色表头文字
    symbolText: 'FFFFD700',    // 金色股票代码
    labelText: 'FF1E3A5F',     // 深蓝色指标标签
    subLabelText: 'FF6B7280',  // 灰色子标签
    arrowUp: 'FF16A34A',       // 绿色向上
    arrowDown: 'FFDC2626',     // 红色向下
    borderColor: 'FFD1D5DB',   // 浅灰色边框
    alternateBg: 'FFF8FAFC',   // 交替行背景色
  };

  // 边框样式
  const thinBorder: Partial<ExcelJS.Borders> = {
    top: { style: 'thin', color: { argb: colors.borderColor } },
    left: { style: 'thin', color: { argb: colors.borderColor } },
    bottom: { style: 'thin', color: { argb: colors.borderColor } },
    right: { style: 'thin', color: { argb: colors.borderColor } },
  };

  // 表头行 (日期 + 股票代码) - 深蓝色背景
  const headerRow = worksheet.addRow([compareDate, ...metricsData.map((m) => m.symbol)]);
  headerRow.height = 28;
  headerRow.eachCell((cell, colNumber) => {
    cell.border = thinBorder;
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.headerBg } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    if (colNumber === 1) {
      cell.font = { size: 11, bold: true, color: { argb: colors.headerText } };
    } else {
      // 股票代码 - 金色加粗
      cell.font = { size: 12, bold: true, color: { argb: colors.symbolText } };
    }
  });

  let rowIndex = 1; // 用于交替背景色

  // 添加主指标行
  const addMetricRow = (label: string, values: string[], isSubRow = false) => {
    const row = worksheet.addRow([label, ...values]);
    row.height = isSubRow ? 20 : 24;
    const useAltBg = !isSubRow && rowIndex % 2 === 0;

    row.eachCell((cell, colNumber) => {
      cell.border = thinBorder;
      cell.alignment = { horizontal: colNumber === 1 ? 'left' : 'center', vertical: 'middle' };

      // 交替背景色
      if (useAltBg) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.alternateBg } };
      }

      if (colNumber === 1) {
        if (isSubRow) {
          // 子行 - 右对齐灰色小字
          cell.font = { size: 9, italic: true, color: { argb: colors.subLabelText } };
          cell.alignment = { horizontal: 'right', vertical: 'middle', indent: 2 };
        } else {
          // 主指标 - 深蓝色
          cell.font = { size: 10, bold: true, color: { argb: colors.labelText } };
        }
      } else {
        const val = cell.value as string;
        // 箭头颜色
        if (val === '↑') {
          cell.font = { size: 12, bold: true, color: { argb: colors.arrowUp } };
        } else if (val === '↓') {
          cell.font = { size: 12, bold: true, color: { argb: colors.arrowDown } };
        } else {
          cell.font = { size: 10, color: { argb: 'FF374151' } };
        }
      }
    });

    if (!isSubRow) rowIndex++;
  };

  // 数据行
  addMetricRow('已动用资本回报率 ROCE（TTM）', metricsData.map((m) => formatPercent(m.roce)));
  addMetricRow('营收增长（同比）', metricsData.map((m) => formatPercent(m.revenueGrowthYoY)));
  addMetricRow('毛利率（Q）', metricsData.map((m) => formatPercent(m.grossMargin)));
  addMetricRow('环比', metricsData.map((m) => formatTrend(m.grossMarginQoQ)), true);
  addMetricRow('同比', metricsData.map((m) => formatTrend(m.grossMarginYoY)), true);
  addMetricRow('营业利润率（Q）', metricsData.map((m) =>
    m.operatingMargin !== undefined && m.operatingMargin < 0 ? '负' : formatPercent(m.operatingMargin)
  ));
  addMetricRow('环比', metricsData.map((m) => formatTrend(m.operatingMarginQoQ)), true);
  addMetricRow('同比', metricsData.map((m) => formatTrend(m.operatingMarginYoY)), true);
  addMetricRow('现金转换率（Q）', metricsData.map((m) => formatCashConversion(m)));
  addMetricRow('自由现金流增长率（同比）', metricsData.map((m) => formatFcfGrowth(m)));
  addMetricRow('自由现金流 / 市值', metricsData.map((m) => formatFcfYield(m.fcfYield)));

  // 设置列宽
  worksheet.getColumn(1).width = 30;
  for (let i = 2; i <= colCount; i++) {
    worksheet.getColumn(i).width = 14;
  }

  // 冻结表头行
  worksheet.views = [{ state: 'frozen', ySplit: 1, showGridLines: false }];

  // 导出文件
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const symbols = metricsData.map((m) => m.symbol).join('_');
  link.download = `公司对比_${symbols}.xlsx`;
  link.click();
  URL.revokeObjectURL(url);
};

// 趋势箭头组件 - 红色向上，蓝色向下
const TrendArrow = ({ value }: { value: number | undefined | null }) => {
  if (value === undefined || value === null || value === 0) {
    return <span className="text-gray-400">-</span>;
  }
  if (value > 0) {
    return <ArrowUp className="w-4 h-4 text-red-600 inline" strokeWidth={3} />;
  }
  return <ArrowDown className="w-4 h-4 text-blue-600 inline" strokeWidth={3} />;
};

export function CompanyComparePanel() {
  const [inputValue, setInputValue] = useState('');
  const [symbols, setSymbols] = useState<string[]>([]);
  const [metricsData, setMetricsData] = useState<CompanyMetrics[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [compareDate, setCompareDate] = useState<string>('');

  const handleAddSymbol = () => {
    const newSymbols = inputValue
      .toUpperCase()
      .split(/[,\s]+/)
      .filter((s) => s && !symbols.includes(s));

    if (newSymbols.length > 0) {
      setSymbols([...symbols, ...newSymbols]);
      setInputValue('');
    }
  };

  const handleRemoveSymbol = (symbol: string) => {
    setSymbols(symbols.filter((s) => s !== symbol));
    setMetricsData(metricsData.filter((m) => m.symbol !== symbol));
  };

  const handleCompare = async () => {
    if (symbols.length < 2) {
      setError('请至少输入两个股票代码进行对比');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/company-compare', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ symbols }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch comparison data');
      }

      const data = await response.json();
      setMetricsData(data.metrics || []);
      // 格式化日期为 YYYY/M/D
      const now = new Date();
      setCompareDate(`${now.getFullYear()}/${now.getMonth() + 1}/${now.getDate()}`);
    } catch (err) {
      console.error('Compare error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddSymbol();
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2 mb-2">
          <GitCompareArrows className="w-5 h-5 text-brand-primary" />
          <h2 className="text-lg font-semibold text-foreground">公司对比</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          对比多家公司的关键财务指标
        </p>
      </div>

      {/* Input Area */}
      <div className="p-4 border-b border-border space-y-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value.toUpperCase())}
            onKeyPress={handleKeyPress}
            placeholder="输入股票代码，如 AAPL, MSFT"
            className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
            disabled={isLoading}
          />
          <button
            onClick={handleAddSymbol}
            disabled={!inputValue.trim() || isLoading}
            className="px-4 py-2 bg-muted text-foreground rounded-lg text-sm font-medium hover:bg-muted/80 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            添加
          </button>
        </div>

        {/* Selected Symbols */}
        {symbols.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {symbols.map((symbol) => (
              <span
                key={symbol}
                className="inline-flex items-center gap-1 px-2 py-1 bg-brand-primary/10 text-brand-primary rounded-lg text-sm"
              >
                {symbol}
                <button
                  onClick={() => handleRemoveSymbol(symbol)}
                  className="hover:text-destructive"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Compare Button */}
        <button
          onClick={handleCompare}
          disabled={symbols.length < 2 || isLoading}
          className="w-full px-4 py-2 bg-brand-primary text-white rounded-lg text-sm font-medium hover:bg-brand-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              加载中...
            </>
          ) : (
            <>
              <GitCompareArrows className="w-4 h-4" />
              开始对比
            </>
          )}
        </button>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-auto">
        {/* Error */}
        {error && (
          <div className="p-4">
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          </div>
        )}

        {/* Comparison Table - Excel Style */}
        {metricsData.length > 0 && (
          <div className="p-2">
            <div className="bg-white rounded border border-gray-500">
              <table className="w-full text-xs border-collapse">
                {/* Header */}
                <thead>
                  <tr className="border-b border-gray-500">
                    <th className="text-left py-1 px-2 font-normal text-gray-600 border-r border-gray-400 bg-gray-50">
                      {compareDate}
                    </th>
                    {metricsData.map((m) => (
                      <th
                        key={m.symbol}
                        className="text-center py-1 px-2 font-bold text-[#800000] border-r border-gray-400 bg-gray-50"
                      >
                        {m.symbol}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="text-gray-800">
                  {/* ROCE */}
                  <tr className="border-b border-gray-400">
                    <td className="py-1 px-2 text-red-600 font-medium border-r border-gray-400 whitespace-nowrap">已动用资本回报率ROCE（TTM）</td>
                    {metricsData.map((m) => (
                      <td key={`${m.symbol}-roce`} className="text-center py-1 px-2 border-r border-gray-400">
                        {formatPercent(m.roce)}
                      </td>
                    ))}
                  </tr>

                  {/* 营收增长 */}
                  <tr className="border-b border-gray-400">
                    <td className="py-1 px-2 text-red-600 font-medium border-r border-gray-400 whitespace-nowrap">营收增长（同比）</td>
                    {metricsData.map((m) => (
                      <td key={`${m.symbol}-revenue`} className="text-center py-1 px-2 border-r border-gray-400">
                        {formatPercent(m.revenueGrowthYoY)}
                      </td>
                    ))}
                  </tr>

                  {/* 毛利率 */}
                  <tr className="border-b border-gray-400">
                    <td className="py-1 px-2 text-red-600 font-medium border-r border-gray-400 whitespace-nowrap">毛利率（Q）</td>
                    {metricsData.map((m) => (
                      <td key={`${m.symbol}-gm`} className="text-center py-1 px-2 border-r border-gray-400">
                        {formatPercent(m.grossMargin)}
                      </td>
                    ))}
                  </tr>
                  {/* 毛利率 环比 */}
                  <tr className="border-b border-gray-400">
                    <td className="py-0.5 px-2 text-gray-500 text-right pr-4 border-r border-gray-400">环比</td>
                    {metricsData.map((m) => (
                      <td key={`${m.symbol}-gm-qoq`} className="text-center py-0.5 px-2 border-r border-gray-400">
                        <TrendArrow value={m.grossMarginQoQ} />
                      </td>
                    ))}
                  </tr>
                  {/* 毛利率 同比 */}
                  <tr className="border-b border-gray-400">
                    <td className="py-0.5 px-2 text-gray-500 text-right pr-4 border-r border-gray-400">同比</td>
                    {metricsData.map((m) => (
                      <td key={`${m.symbol}-gm-yoy`} className="text-center py-0.5 px-2 border-r border-gray-400">
                        <TrendArrow value={m.grossMarginYoY} />
                      </td>
                    ))}
                  </tr>

                  {/* 营业利润率 */}
                  <tr className="border-b border-gray-400">
                    <td className="py-1 px-2 text-red-600 font-medium border-r border-gray-400 whitespace-nowrap">营业利润率（Q）</td>
                    {metricsData.map((m) => (
                      <td key={`${m.symbol}-om`} className="text-center py-1 px-2 border-r border-gray-400">
                        {m.operatingMargin !== undefined && m.operatingMargin < 0
                          ? '负'
                          : formatPercent(m.operatingMargin)}
                      </td>
                    ))}
                  </tr>
                  {/* 营业利润率 环比 */}
                  <tr className="border-b border-gray-400">
                    <td className="py-0.5 px-2 text-gray-500 text-right pr-4 border-r border-gray-400">环比</td>
                    {metricsData.map((m) => (
                      <td key={`${m.symbol}-om-qoq`} className="text-center py-0.5 px-2 border-r border-gray-400">
                        <TrendArrow value={m.operatingMarginQoQ} />
                      </td>
                    ))}
                  </tr>
                  {/* 营业利润率 同比 */}
                  <tr className="border-b border-gray-400">
                    <td className="py-0.5 px-2 text-gray-500 text-right pr-4 border-r border-gray-400">同比</td>
                    {metricsData.map((m) => (
                      <td key={`${m.symbol}-om-yoy`} className="text-center py-0.5 px-2 border-r border-gray-400">
                        <TrendArrow value={m.operatingMarginYoY} />
                      </td>
                    ))}
                  </tr>

                  {/* 现金转换率 */}
                  <tr className="border-b border-gray-400">
                    <td className="py-1 px-2 text-red-600 font-medium border-r border-gray-400 whitespace-nowrap">现金转换率（Q）</td>
                    {metricsData.map((m) => (
                      <td key={`${m.symbol}-cc`} className="text-center py-1 px-2 border-r border-gray-400">
                        {formatCashConversion(m)}
                      </td>
                    ))}
                  </tr>

                  {/* 自由现金流增长率 */}
                  <tr className="border-b border-gray-400">
                    <td className="py-1 px-2 text-red-600 font-medium border-r border-gray-400 whitespace-nowrap">自由现金流增长率（同比）</td>
                    {metricsData.map((m) => (
                      <td key={`${m.symbol}-fcfg`} className="text-center py-1 px-2 border-r border-gray-400">
                        {formatFcfGrowth(m)}
                      </td>
                    ))}
                  </tr>

                  {/* 自由现金流/市值 */}
                  <tr>
                    <td className="py-1 px-2 text-red-600 font-medium border-r border-gray-400 whitespace-nowrap">自由现金流/市值</td>
                    {metricsData.map((m) => (
                      <td key={`${m.symbol}-fcfy`} className="text-center py-1 px-2 border-r border-gray-400">
                        {formatFcfYield(m.fcfYield)}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="flex justify-between items-center mt-2">
              <p className="text-[10px] text-muted-foreground">
                数据来源：MotherDuck，仅供参考
              </p>
              <button
                onClick={() => void exportToExcel(metricsData, compareDate)}
                className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded border border-gray-300"
              >
                <Download className="w-3 h-3" />
                导出Excel
              </button>
            </div>
          </div>
        )}

        {/* Empty State */}
        {metricsData.length === 0 && !isLoading && !error && (
          <div className="text-center py-12 text-muted-foreground">
            <GitCompareArrows className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p className="text-sm mb-2">对比公司财务指标</p>
            <p className="text-xs">添加至少两个股票代码开始对比</p>
          </div>
        )}
      </div>
    </div>
  );
}
