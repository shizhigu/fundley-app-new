'use client';

import React, { useState, useMemo } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
  ColumnDef,
} from '@tanstack/react-table';

interface MetricsResponse {
  symbol: string;
  quarters: Record<string, any>[];
  // 后端可以返回 rows 定义，指定行顺序和格式
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
    const quarters = data.quarters;

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

      {/* TanStack Table */}
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

      {/* Empty State */}
      {!data && !loading && !error && (
        <div className="text-center py-12 text-muted-foreground text-sm">
          输入股票代码查询最近8个季度的财务指标
        </div>
      )}
    </div>
  );
}
