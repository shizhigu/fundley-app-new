'use client';

import React, { useState, useMemo } from 'react';
import { Search, Loader2, Download } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
  ColumnDef,
} from '@tanstack/react-table';
import * as XLSX from 'xlsx';

interface EpsYear {
  year: number;
  label: string;
  eps: number | null;
  epsLow?: number;
  epsHigh?: number;
  is_estimate: boolean;
  growth?: number;
  growthLow?: number;
  growthHigh?: number;
  numAnalysts?: number;
}

interface PriceStats {
  price: number;
  high1y: number;
  fromHigh1y: number;
  volatility6m: number;
  performance6m: number;
  peTTM: number;
  evEbitda: number;
  evOcf: number;
}

interface StockPerformance {
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

interface MetricsResponse {
  symbol: string;
  quarters: Record<string, any>[];
  epsAnnual?: {
    years: EpsYear[];
    base_year: string | null;
  };
  priceStats?: PriceStats;
  stockPerformance?: StockPerformance;
  rows?: { key: string; label: string; format?: string }[];
}

// 默认行定义（如果后端没返回）
const DEFAULT_ROWS = [
  { key: 'revenue', label: 'Revenue', format: 'currency' },
  { key: 'revenueYoY', label: 'YoY', format: 'percent' },
  { key: 'netIncome', label: 'Net Income', format: 'currency' },
  { key: 'netIncomeYoY', label: 'YoY', format: 'percent' },
  { key: 'grossMargin', label: 'Gross Margin', format: 'percent' },
  { key: 'operatingMargin', label: 'Operating Margin', format: 'percent' },
  { key: 'roce', label: 'ROCE', format: 'percent' },
  { key: 'operatingCashFlow', label: 'Operating Cash Flow', format: 'currency' },
  { key: 'ocfToNetIncome', label: 'OCF / Net Income', format: 'number' },
  { key: 'netDebtToEquity', label: 'Net Debt / Equity', format: 'percent' },
];

// 格式化函数
const formatValue = (val: any, format?: string): string => {
  if (val === null || val === undefined) return '-';

  switch (format) {
    case 'currency':
      const num = Number(val);
      const abs = Math.abs(num);
      if (abs >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
      if (abs >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
      return `$${num.toLocaleString()}`;
    case 'percent':
      return `${Number(val).toFixed(2)}%`;
    case 'number':
      return Number(val).toFixed(2);
    default:
      return String(val);
  }
};

// 格式化大额金额 (用于Market Cap等)
const formatLargeCurrency = (val: number | null | undefined): string => {
  if (val === null || val === undefined) return '-';
  const abs = Math.abs(val);
  if (abs >= 1e12) return `$${(val / 1e12).toFixed(2)}T`;
  if (abs >= 1e9) return `$${(val / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `$${(val / 1e6).toFixed(2)}M`;
  return `$${val.toLocaleString()}`;
};

// Excel 导出函数
const exportToExcel = (
  symbol: string,
  tableData: Record<string, any>[],
  quarters: string[],
  epsData?: { years: EpsYear[]; base_year: string | null },
  priceStats?: PriceStats,
  stockPerformance?: StockPerformance
) => {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Quarterly Metrics - 使用和前端一致的格式
  const metricsRows = tableData.map((row) => {
    const exportRow: Record<string, any> = { Metric: row.metric };
    quarters.forEach((q) => {
      // 使用 formatValue 函数格式化，和前端显示一致
      exportRow[q] = formatValue(row[q], row._format);
    });
    return exportRow;
  });
  const ws1 = XLSX.utils.json_to_sheet(metricsRows);
  XLSX.utils.book_append_sheet(wb, ws1, 'Quarterly Metrics');

  // Sheet 2: EPS Annual - format: FY24 | FY25 | FY26E | g(26E to 25) | FY27E | g(27E to 25)
  if (epsData?.years) {
    const baseYear = epsData.base_year?.replace('FY', '') || '';
    const epsRow: Record<string, string> = { '': 'EPS' };

    epsData.years.forEach((y) => {
      // EPS value column
      epsRow[y.label] =
        y.epsLow && y.epsHigh
          ? `$${y.epsLow} - $${y.epsHigh}`
          : y.eps !== null
            ? `$${y.eps}`
            : '-';

      // Growth column for estimates
      if (y.is_estimate) {
        const gLabel = `g (${y.label.replace('E', '')} to ${baseYear})`;
        epsRow[gLabel] =
          y.growthLow !== undefined && y.growthHigh !== undefined
            ? `${y.growthLow}%-${y.growthHigh}%`
            : y.growth !== undefined
              ? `${y.growth}%`
              : '-';
      }
    });

    const ws2 = XLSX.utils.json_to_sheet([epsRow]);
    XLSX.utils.book_append_sheet(wb, ws2, 'EPS Annual');
  }

  // Sheet 3: Stock Performance (TTM)
  if (stockPerformance) {
    const perfRows = [
      { Metric: 'TTM Revenue', Value: formatLargeCurrency(stockPerformance.ttmRevenue) },
      { Metric: 'Revenue YoY', Value: stockPerformance.revenueYoY !== null ? `${stockPerformance.revenueYoY}%` : '-' },
      { Metric: 'Net Income (TTM)', Value: formatLargeCurrency(stockPerformance.ttmNetIncome) },
      { Metric: 'Gross Margin', Value: stockPerformance.grossMargin !== null ? `${stockPerformance.grossMargin}%` : '-' },
      { Metric: 'ROCE (TTM)', Value: stockPerformance.roce !== null ? `${stockPerformance.roce}%` : '-' },
      { Metric: 'Market Cap', Value: formatLargeCurrency(stockPerformance.marketCap) },
      { Metric: 'P/E (TTM)', Value: stockPerformance.peTTM?.toFixed(1) ?? '-' },
      { Metric: 'EV / EBITDA', Value: stockPerformance.evEbitda?.toFixed(1) ?? '-' },
      { Metric: '6M Performance', Value: stockPerformance.performance6m !== null ? `${stockPerformance.performance6m}%` : '-' },
      { Metric: 'Drawdown from 1Y High', Value: stockPerformance.drawdownFrom1yHigh !== null ? `${stockPerformance.drawdownFrom1yHigh}%` : '-' },
    ];
    const ws3 = XLSX.utils.json_to_sheet(perfRows);
    XLSX.utils.book_append_sheet(wb, ws3, 'Stock Performance');
  }

  // Sheet 4: Price Stats
  if (priceStats) {
    const priceRows = [
      { Metric: 'Price', Value: `$${priceStats.price?.toFixed(3)}` },
      { Metric: '1y High', Value: `$${priceStats.high1y?.toFixed(3)}` },
      { Metric: 'From 1y High', Value: `${priceStats.fromHigh1y}%` },
      { Metric: '6M Volatility', Value: `${priceStats.volatility6m?.toFixed(2)}%` },
      { Metric: '6M Performance', Value: `${priceStats.performance6m}%` },
      { Metric: 'P/E (TTM)', Value: priceStats.peTTM?.toFixed(1) },
      { Metric: 'EV / EBITDA', Value: priceStats.evEbitda?.toFixed(1) },
      { Metric: 'EV / OCF', Value: priceStats.evOcf?.toFixed(1) },
    ];
    const ws3 = XLSX.utils.json_to_sheet(priceRows);
    XLSX.utils.book_append_sheet(wb, ws3, 'Price Stats');
  }

  XLSX.writeFile(wb, `${symbol}_metrics.xlsx`);
};

export function StockLookupPanel() {
  const [symbol, setSymbol] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<MetricsResponse | null>(null);
  const [error, setError] = useState('');

  const handleSearch = async () => {
    const s = symbol.trim().toUpperCase();
    if (!s) return;

    setLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/stock/metrics?symbol=${s}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError('Failed to fetch data');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  // 转置数据：从 quarters 数组变成 rows 数组
  const { tableData, columns } = useMemo(() => {
    if (!data?.quarters?.length) return { tableData: [], columns: [] };

    const rows = data.rows || DEFAULT_ROWS;
    // 按时间顺序排列（从旧到新）
    const quarters = [...data.quarters].reverse();

    // 每行是一个指标
    const tableData = rows.map((row) => {
      const rowData: Record<string, any> = { metric: row.label, _format: row.format };
      quarters.forEach((q) => {
        rowData[q.quarter] = q[row.key];
      });
      return rowData;
    });

    // 列：第一列是指标名，后面是各季度
    const columnHelper = createColumnHelper<Record<string, any>>();
    const columns: ColumnDef<Record<string, any>, any>[] = [
      columnHelper.accessor('metric', {
        header: '',
        cell: (info) => <span className="font-medium">{info.getValue()}</span>,
      }),
      ...quarters.map((q) =>
        columnHelper.accessor(q.quarter, {
          header: q.quarter,
          cell: (info) => {
            const format = info.row.original._format;
            return (
              <span className="font-mono">
                {formatValue(info.getValue(), format)}
              </span>
            );
          },
        })
      ),
    ];

    return { tableData, columns };
  }, [data]);

  const table = useReactTable({
    data: tableData,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="p-4 space-y-4">
      {/* Search */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="输入股票代码 (e.g., NVDA)"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="pl-9"
          />
        </div>
        <Button onClick={handleSearch} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : '查询'}
        </Button>
      </div>

      {error && <div className="text-sm text-red-500">{error}</div>}

      {/* Export Button */}
      {tableData.length > 0 && (
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              exportToExcel(
                data?.symbol || '',
                tableData,
                [...(data?.quarters || [])].reverse().map((q) => q.quarter),
                data?.epsAnnual,
                data?.priceStats,
                data?.stockPerformance
              )
            }
          >
            <Download className="h-4 w-4 mr-1" />
            Export Excel
          </Button>
        </div>
      )}

      {/* Quarterly Metrics Table */}
      {tableData.length > 0 && (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id} className="border-b bg-muted/50">
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className={`p-3 font-medium ${header.index === 0 ? 'text-left min-w-[160px]' : 'text-right min-w-[100px]'}`}
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="border-b last:border-b-0 hover:bg-muted/30">
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className={`p-3 ${cell.column.getIndex() === 0 ? 'text-left' : 'text-right'}`}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* EPS Annual Table */}
      {data?.epsAnnual?.years && data.epsAnnual.years.length > 0 && (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="p-3 font-medium text-left min-w-[80px]"></th>
                {data.epsAnnual.years.map((y) => (
                  <React.Fragment key={y.label}>
                    <th className="p-3 font-medium text-right min-w-[90px]">
                      {y.label}
                    </th>
                    {y.is_estimate && (
                      <th className="p-3 font-medium text-right min-w-[100px] text-muted-foreground italic">
                        g ({y.label.replace('E', '')} to {data.epsAnnual?.base_year?.replace('FY', '')})
                      </th>
                    )}
                  </React.Fragment>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="hover:bg-muted/30">
                <td className="p-3 font-medium">EPS</td>
                {data.epsAnnual.years.map((y) => (
                  <React.Fragment key={y.label}>
                    <td className="p-3 text-right font-mono">
                      {y.epsLow && y.epsHigh ? (
                        <span>${y.epsLow.toFixed(2)} - ${y.epsHigh.toFixed(2)}</span>
                      ) : y.eps !== null ? (
                        `$${y.eps.toFixed(2)}`
                      ) : (
                        '-'
                      )}
                    </td>
                    {y.is_estimate && (
                      <td className="p-3 text-right font-mono italic">
                        {y.growthLow !== undefined && y.growthHigh !== undefined ? (
                          <span className={y.growthLow >= 0 ? 'text-green-600' : 'text-red-600'}>
                            {y.growthLow}%-{y.growthHigh}%
                          </span>
                        ) : y.growth !== undefined ? (
                          <span className={y.growth >= 0 ? 'text-green-600' : 'text-red-600'}>
                            {y.growth}%
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                    )}
                  </React.Fragment>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Stock Performance Table - 股价表现 */}
      {data?.stockPerformance && (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="p-3 font-medium text-left" colSpan={2}>股价表现 (TTM)</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b hover:bg-muted/30">
                <td className="p-3 font-medium">TTM Revenue</td>
                <td className="p-3 text-right font-mono">{formatLargeCurrency(data.stockPerformance.ttmRevenue)}</td>
              </tr>
              <tr className="border-b hover:bg-muted/30">
                <td className="p-3 font-medium">Revenue YoY</td>
                <td className="p-3 text-right font-mono">
                  {data.stockPerformance.revenueYoY !== null ? (
                    <span className={data.stockPerformance.revenueYoY >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {data.stockPerformance.revenueYoY}%
                    </span>
                  ) : '-'}
                </td>
              </tr>
              <tr className="border-b hover:bg-muted/30">
                <td className="p-3 font-medium">Net Income (TTM)</td>
                <td className="p-3 text-right font-mono">{formatLargeCurrency(data.stockPerformance.ttmNetIncome)}</td>
              </tr>
              <tr className="border-b hover:bg-muted/30">
                <td className="p-3 font-medium">Gross Margin</td>
                <td className="p-3 text-right font-mono">
                  {data.stockPerformance.grossMargin !== null ? `${data.stockPerformance.grossMargin}%` : '-'}
                </td>
              </tr>
              <tr className="border-b hover:bg-muted/30">
                <td className="p-3 font-medium">ROCE (TTM)</td>
                <td className="p-3 text-right font-mono">
                  {data.stockPerformance.roce !== null ? `${data.stockPerformance.roce}%` : '-'}
                </td>
              </tr>
              <tr className="border-b hover:bg-muted/30">
                <td className="p-3 font-medium">Market Cap</td>
                <td className="p-3 text-right font-mono">{formatLargeCurrency(data.stockPerformance.marketCap)}</td>
              </tr>
              <tr className="border-b hover:bg-muted/30">
                <td className="p-3 font-medium">P/E (TTM)</td>
                <td className="p-3 text-right font-mono">
                  {data.stockPerformance.peTTM !== null ? data.stockPerformance.peTTM.toFixed(1) : '-'}
                </td>
              </tr>
              <tr className="border-b hover:bg-muted/30">
                <td className="p-3 font-medium">EV / EBITDA</td>
                <td className="p-3 text-right font-mono">
                  {data.stockPerformance.evEbitda !== null ? data.stockPerformance.evEbitda.toFixed(1) : '-'}
                </td>
              </tr>
              <tr className="border-b hover:bg-muted/30">
                <td className="p-3 font-medium">6M Performance</td>
                <td className="p-3 text-right font-mono">
                  {data.stockPerformance.performance6m !== null ? (
                    <span className={data.stockPerformance.performance6m >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {data.stockPerformance.performance6m}%
                    </span>
                  ) : '-'}
                </td>
              </tr>
              <tr className="border-b-0 hover:bg-muted/30">
                <td className="p-3 font-medium">Drawdown from 1Y High</td>
                <td className="p-3 text-right font-mono">
                  {data.stockPerformance.drawdownFrom1yHigh !== null ? (
                    <span className={data.stockPerformance.drawdownFrom1yHigh >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {data.stockPerformance.drawdownFrom1yHigh}%
                    </span>
                  ) : '-'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Price Stats Table - using same style as quarterly metrics */}
      {data?.priceStats && (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="p-3 font-medium text-left min-w-[140px]"></th>
                <th className="p-3 font-medium text-right min-w-[100px]">Value</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b hover:bg-muted/30">
                <td className="p-3 font-medium">Price</td>
                <td className="p-3 text-right font-mono">${data.priceStats.price?.toFixed(3)}</td>
              </tr>
              <tr className="border-b hover:bg-muted/30">
                <td className="p-3 font-medium">1y High</td>
                <td className="p-3 text-right font-mono">${data.priceStats.high1y?.toFixed(3)}</td>
              </tr>
              <tr className="border-b hover:bg-muted/30">
                <td className="p-3 font-medium">From 1y High</td>
                <td className="p-3 text-right font-mono">
                  <span className={data.priceStats.fromHigh1y >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {data.priceStats.fromHigh1y}%
                  </span>
                </td>
              </tr>
              <tr className="border-b hover:bg-muted/30">
                <td className="p-3 font-medium">6M Volatility</td>
                <td className="p-3 text-right font-mono">{data.priceStats.volatility6m?.toFixed(2)}%</td>
              </tr>
              <tr className="border-b hover:bg-muted/30">
                <td className="p-3 font-medium">6M Performance</td>
                <td className="p-3 text-right font-mono">
                  <span className={data.priceStats.performance6m >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {data.priceStats.performance6m}%
                  </span>
                </td>
              </tr>
              <tr className="border-b hover:bg-muted/30">
                <td className="p-3 font-medium">P/E (TTM)</td>
                <td className="p-3 text-right font-mono">{data.priceStats.peTTM?.toFixed(1)}</td>
              </tr>
              <tr className="border-b hover:bg-muted/30">
                <td className="p-3 font-medium">EV / EBITDA</td>
                <td className="p-3 text-right font-mono">{data.priceStats.evEbitda?.toFixed(1)}</td>
              </tr>
              <tr className="border-b-0 hover:bg-muted/30">
                <td className="p-3 font-medium">EV / OCF</td>
                <td className="p-3 text-right font-mono">{data.priceStats.evOcf?.toFixed(1)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Empty State */}
      {!data && !loading && !error && (
        <div className="text-center py-12 text-muted-foreground text-sm">
          输入股票代码查询最近8个季度的财务指标
        </div>
      )}
    </div>
  );
}
