'use client';

import React, { useState } from 'react';
import { Search, Loader2, Download, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import ExcelJS from 'exceljs';

interface StockPerformanceMetrics {
  symbol: string;
  ttmRevenue: number | null;
  revenueYoY: number | null;
  ttmNetIncome: number | null;
  grossMargin: number | null;
  roce: number | null;
  marketCap: number | null;
  peTTM: number | null;
  evEbitda: number | null;
  performance6m: number | null;
  drawdownFrom1yHigh: number | null;
}

interface PerformanceResponse {
  metrics: StockPerformanceMetrics[];
}

// Format large currency values (billions)
const formatBillions = (val: number | null | undefined): string => {
  if (val === null || val === undefined) return '-';
  return (val / 1e9).toFixed(2);
};

// Format percentage
const formatPercent = (val: number | null | undefined): string => {
  if (val === null || val === undefined) return '-';
  const prefix = val > 0 ? '+' : '';
  return `${prefix}${val.toFixed(1)}%`;
};

// Format number
const formatNumber = (val: number | null | undefined): string => {
  if (val === null || val === undefined) return '-';
  return val.toFixed(1);
};

// Metric row definitions
const METRIC_ROWS = [
  { key: 'ttmRevenue', label: 'Revenue($B)', format: 'billions' },
  { key: 'revenueYoY', label: 'YoY', format: 'percent' },
  { key: 'ttmNetIncome', label: 'Net Income($B)', format: 'billions' },
  { key: 'grossMargin', label: 'Gross Margin', format: 'percent' },
  { key: 'roce', label: 'ROCE', format: 'percent' },
  { key: 'marketCap', label: 'Market Cap($B)', format: 'billions' },
  { key: 'peTTM', label: 'PE(TTM)', format: 'number' },
  { key: 'evEbitda', label: 'EV/EBITDA', format: 'number' },
  { key: 'performance6m', label: '6M Performance', format: 'percent' },
  { key: 'drawdownFrom1yHigh', label: 'Drawdown from 1Y High', format: 'percent' },
];

// Get formatted value
const getFormattedValue = (metrics: StockPerformanceMetrics, key: string, format: string): string => {
  const val = metrics[key as keyof StockPerformanceMetrics] as number | null;
  switch (format) {
    case 'billions':
      return formatBillions(val);
    case 'percent':
      return formatPercent(val);
    case 'number':
      return formatNumber(val);
    default:
      return val?.toString() ?? '-';
  }
};

// Excel export function
const exportToExcel = async (data: StockPerformanceMetrics[]) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Stock Performance');

  // Header row
  const headerRow = worksheet.addRow(['', ...data.map(d => d.symbol)]);
  headerRow.eachCell((cell, colNumber) => {
    cell.font = { bold: true, color: { argb: '800000' } };
    cell.alignment = { horizontal: 'center' };
    cell.border = {
      top: { style: 'thin' },
      bottom: { style: 'thin' },
      left: { style: 'thin' },
      right: { style: 'thin' },
    };
    if (colNumber > 1) {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF' } };
    }
  });

  // Data rows
  METRIC_ROWS.forEach((metric) => {
    const rowData = [metric.label, ...data.map(d => getFormattedValue(d, metric.key, metric.format))];
    const row = worksheet.addRow(rowData);
    row.eachCell((cell, colNumber) => {
      cell.border = {
        top: { style: 'thin' },
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' },
      };
      if (colNumber === 1) {
        cell.font = { color: { argb: 'FF0000' } };
        cell.alignment = { horizontal: 'left' };
      } else {
        cell.alignment = { horizontal: 'center' };
      }
    });
  });

  // Column widths
  worksheet.getColumn(1).width = 22;
  for (let i = 2; i <= data.length + 1; i++) {
    worksheet.getColumn(i).width = 14;
  }

  // Export
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `stock_performance_${data.map(d => d.symbol).join('_')}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
};

export function StockPerformanceComparePanel() {
  const [inputValue, setInputValue] = useState('');
  const [symbols, setSymbols] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<StockPerformanceMetrics[]>([]);
  const [error, setError] = useState('');

  const addSymbol = () => {
    const s = inputValue.trim().toUpperCase();
    if (s && !symbols.includes(s)) {
      setSymbols([...symbols, s]);
      setInputValue('');
    }
  };

  const removeSymbol = (s: string) => {
    setSymbols(symbols.filter(sym => sym !== s));
  };

  const handleSearch = async () => {
    if (symbols.length === 0) return;

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/stock-performance-compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbols }),
      });
      if (!res.ok) throw new Error('Failed to fetch');
      const json: PerformanceResponse = await res.json();
      setData(json.metrics);
    } catch (err) {
      setError('Failed to fetch data');
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 space-y-4">
      {/* Input area */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="输入股票代码 (e.g., PM)"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value.toUpperCase())}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addSymbol();
              }
            }}
            className="pl-9"
          />
        </div>
        <Button variant="outline" onClick={addSymbol}>
          添加
        </Button>
        <Button onClick={handleSearch} disabled={loading || symbols.length === 0}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : '查询'}
        </Button>
      </div>

      {/* Symbol tags */}
      {symbols.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {symbols.map((s) => (
            <span
              key={s}
              className="inline-flex items-center gap-1 px-2 py-1 bg-muted rounded text-sm"
            >
              {s}
              <X
                className="h-3 w-3 cursor-pointer hover:text-red-500"
                onClick={() => removeSymbol(s)}
              />
            </span>
          ))}
        </div>
      )}

      {error && <div className="text-sm text-red-500">{error}</div>}

      {/* Export Button */}
      {data.length > 0 && (
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={() => exportToExcel(data)}>
            <Download className="h-4 w-4 mr-1" />
            Export Excel
          </Button>
        </div>
      )}

      {/* Performance Table - Excel Style */}
      {data.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse bg-white" style={{ borderSpacing: 0 }}>
            <thead>
              <tr>
                <th className="border border-gray-500 px-2 py-1 text-left font-normal bg-white"></th>
                {data.map((d) => (
                  <th
                    key={d.symbol}
                    className="border border-gray-500 px-2 py-1 text-center font-bold bg-white"
                    style={{ color: '#800000' }}
                  >
                    {d.symbol}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {METRIC_ROWS.map((metric) => (
                <tr key={metric.key}>
                  <td
                    className="border border-gray-500 px-2 py-1 text-left bg-white"
                    style={{ color: '#FF0000' }}
                  >
                    {metric.label}
                  </td>
                  {data.map((d) => {
                    const val = d[metric.key as keyof StockPerformanceMetrics] as number | null;
                    const formatted = getFormattedValue(d, metric.key, metric.format);
                    const isPositive = val !== null && val > 0;
                    const isNegative = val !== null && val < 0;

                    return (
                      <td
                        key={d.symbol}
                        className="border border-gray-500 px-2 py-1 text-center bg-white"
                      >
                        {formatted}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Empty State */}
      {data.length === 0 && !loading && !error && (
        <div className="text-center py-12 text-muted-foreground text-sm">
          添加股票代码，点击查询对比多只股票的表现指标
        </div>
      )}
    </div>
  );
}
