'use client';

import React, { useState, useCallback, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  createColumnHelper,
  flexRender,
  getSortedRowModel,
  getPaginationRowModel,
  getFilteredRowModel,
  SortingState,
  ColumnFiltersState,
  ColumnPinningState,
  VisibilityState,
  RowSelectionState,
} from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Search,
  Columns3,
  CheckSquare,
  Square,
  Download,
  FileSpreadsheet,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import * as XLSX from 'xlsx';
import { toast } from '@/components/toast';

interface EnhancedDataTableProps {
  data: any[];
  className?: string;
  maxHeight?: string;
  onExport?: (data: any[]) => void;
}

export function EnhancedDataTable({
  data,
  className,
  maxHeight = '500px',
  onExport,
}: EnhancedDataTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [columnPinning, setColumnPinning] = useState<ColumnPinningState>({});
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [selectionMode, setSelectionMode] = useState(false);

  // Helper: Get color based on numeric value (for conditional formatting)
  const getNumericColor = useCallback((value: number, min: number, max: number) => {
    if (min === max) return 'transparent';
    const normalized = (value - min) / (max - min);
    const red = Math.round(255 * (1 - normalized));
    const green = Math.round(255 * normalized);
    return `rgba(${red}, ${green}, 100, 0.15)`;
  }, []);

  // Helper: Detect if column contains change/percentage values
  const isChangeColumn = useCallback((key: string) => {
    const lowerKey = key.toLowerCase();
    return (
      lowerKey.includes('change') ||
      lowerKey.includes('pct') ||
      lowerKey.includes('percent') ||
      lowerKey.includes('growth') ||
      lowerKey.includes('return') ||
      lowerKey.includes('roce')
    );
  }, []);

  // Dynamic table columns with conditional formatting
  const columns = useMemo(() => {
    if (data.length === 0) return [];

    const firstRow = data[0];
    const columnHelper = createColumnHelper<any>();

    // Calculate min/max for numeric columns (for heatmap)
    const numericRanges: Record<string, { min: number; max: number }> = {};
    Object.keys(firstRow).forEach((key) => {
      const values = data.map((row) => row[key]).filter((v) => typeof v === 'number');
      if (values.length > 0) {
        numericRanges[key] = {
          min: Math.min(...values),
          max: Math.max(...values),
        };
      }
    });

    // Add selection column
    const selectionColumn = columnHelper.display({
      id: 'select',
      header: ({ table }) => {
        return (
          <Checkbox
            checked={
              table.getIsAllRowsSelected() ||
              (table.getIsSomeRowsSelected() && 'indeterminate')
            }
            onCheckedChange={(value) => table.toggleAllRowsSelected(!!value)}
            aria-label="Select all"
          />
        );
      },
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      ),
      size: 40,
      enablePinning: true,
    });

    // Data columns with conditional formatting
    const dataColumns = Object.keys(firstRow).map((key) =>
      columnHelper.accessor((row) => row[key], {
        id: key,
        header: key,
        cell: (info) => {
          const value = info.getValue();

          if (typeof value === 'number') {
            const isChange = isChangeColumn(key);
            const range = numericRanges[key];

            // Conditional formatting
            let textColor = 'text-foreground';
            let bgColor = 'transparent';

            if (isChange) {
              // Change columns: green/red for positive/negative
              textColor =
                value > 0
                  ? 'text-green-600 dark:text-green-400'
                  : value < 0
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-muted-foreground';
            } else if (range) {
              // Other numeric columns: heatmap background
              bgColor = getNumericColor(value, range.min, range.max);
            }

            return (
              <span
                className={`font-mono text-xs ${textColor}`}
                style={{
                  backgroundColor: bgColor,
                  padding: '2px 4px',
                  borderRadius: '2px',
                }}
              >
                {isChange && value > 0 ? '+' : ''}
                {value.toLocaleString()}
                {isChange && !String(value).includes('%') ? '%' : ''}
              </span>
            );
          }
          return <span className="text-xs">{String(value)}</span>;
        },
      })
    );

    // Return columns with or without selection column based on selectionMode
    return selectionMode ? [selectionColumn, ...dataColumns] : dataColumns;
  }, [data, selectionMode, getNumericColor, isChangeColumn]);

  // Auto-pin first column when table data loads or selection mode changes
  React.useEffect(() => {
    if (data.length > 0 && columns.length > 0) {
      if (selectionMode) {
        const firstDataColumn = columns[1]?.id;
        if (firstDataColumn) {
          setColumnPinning({ left: ['select', firstDataColumn] });
        }
      } else {
        const firstDataColumn = columns[0]?.id;
        if (firstDataColumn) {
          setColumnPinning({ left: [firstDataColumn] });
        }
      }
    }
  }, [data, columns, selectionMode]);

  // Clear row selection when exiting selection mode
  React.useEffect(() => {
    if (!selectionMode) {
      setRowSelection({});
    }
  }, [selectionMode]);

  // Create table instance
  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnFilters,
      globalFilter,
      columnPinning,
      columnVisibility,
      rowSelection,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onColumnPinningChange: setColumnPinning,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    enableRowSelection: true,
    enableColumnPinning: true,
    initialState: {
      pagination: { pageSize: 10 },
    },
  });

  // Excel export handler
  const handleExportExcel = useCallback(
    (selectedOnly = false, selectedRowsData: any[] = []) => {
      if (data.length === 0) return;

      let dataToExport = data;

      if (selectedOnly) {
        if (selectedRowsData.length === 0) {
          toast({
            type: 'error',
            description: 'No rows selected. Please select rows to export.',
          });
          return;
        }
        dataToExport = selectedRowsData;
      }

      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');

      const fileName = selectedOnly
        ? 'selected_rows.xlsx'
        : 'table_export.xlsx';

      XLSX.writeFile(workbook, fileName);

      toast({
        type: 'success',
        description: `Exported ${dataToExport.length} row${dataToExport.length > 1 ? 's' : ''} to ${fileName}`,
      });

      // Call custom export handler if provided
      if (onExport) {
        onExport(dataToExport);
      }
    },
    [data, onExport]
  );

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
        No data available
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Toolbar: Search + Actions */}
      <div className="px-3 py-2 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          {/* Search input */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search all columns..."
              value={globalFilter ?? ''}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="pl-9 h-8 text-xs"
            />
          </div>

          {/* Selection mode toggle */}
          <Button
            variant={selectionMode ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectionMode(!selectionMode)}
            className="h-8 gap-1 text-xs"
            title={selectionMode ? 'Exit selection mode' : 'Enter selection mode'}
          >
            {selectionMode ? (
              <CheckSquare className="h-3 w-3" />
            ) : (
              <Square className="h-3 w-3" />
            )}
            Select
          </Button>

          {/* Column visibility toggle */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-1 text-xs">
                <Columns3 className="h-3 w-3" />
                Columns
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel className="text-xs">Toggle columns</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="max-h-64 overflow-auto">
                {table
                  .getAllLeafColumns()
                  .filter((column) => column.id !== 'select')
                  .map((column) => (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="text-xs capitalize"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) => column.toggleVisibility(!!value)}
                    >
                      {column.id.replace(/_/g, ' ')}
                    </DropdownMenuCheckboxItem>
                  ))}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Export selected rows */}
          {Object.keys(rowSelection).length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const selectedRows = table
                  .getSelectedRowModel()
                  .rows.map((row) => row.original);
                handleExportExcel(true, selectedRows);
              }}
              className="h-8 gap-1 text-xs"
            >
              <Download className="h-3 w-3" />
              Export {Object.keys(rowSelection).length} selected
            </Button>
          )}

          {/* Export all */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExportExcel(false)}
            className="h-8 gap-1 text-xs"
          >
            <FileSpreadsheet className="h-3 w-3" />
            Export All
          </Button>
        </div>

        {/* Selection info */}
        {Object.keys(rowSelection).length > 0 && (
          <div className="mt-2 text-xs text-muted-foreground">
            {Object.keys(rowSelection).length} of{' '}
            {table.getFilteredRowModel().rows.length} row(s) selected
          </div>
        )}
      </div>

      {/* TanStack Table with horizontal scroll */}
      <div
        className="border-t overflow-auto"
        style={{ maxHeight, width: '100%', display: 'block' }}
      >
        <table
          className="divide-y divide-border"
          style={{ width: 'max-content', minWidth: '100%' }}
        >
          <thead className="bg-muted sticky top-0 z-10">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const isPinned = header.column.getIsPinned();
                  return (
                    <th
                      key={header.id}
                      className={cn(
                        'px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:bg-muted/80 whitespace-nowrap',
                        isPinned && 'sticky bg-muted z-20'
                      )}
                      style={{
                        left:
                          isPinned === 'left'
                            ? `${header.column.getStart('left')}px`
                            : undefined,
                        right:
                          isPinned === 'right'
                            ? `${header.column.getAfter('right')}px`
                            : undefined,
                      }}
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getIsSorted() === 'asc' && ' ↑'}
                      {header.column.getIsSorted() === 'desc' && ' ↓'}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody className="bg-background divide-y divide-border">
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="hover:bg-muted/50">
                {row.getVisibleCells().map((cell) => {
                  const isPinned = cell.column.getIsPinned();
                  return (
                    <td
                      key={cell.id}
                      className={cn(
                        'px-3 py-2 whitespace-nowrap text-sm text-foreground',
                        isPinned && 'sticky bg-background z-10'
                      )}
                      style={{
                        left:
                          isPinned === 'left'
                            ? `${cell.column.getStart('left')}px`
                            : undefined,
                        right:
                          isPinned === 'right'
                            ? `${cell.column.getAfter('right')}px`
                            : undefined,
                      }}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      <div className="flex items-center justify-between p-4 border-t bg-muted/30">
        <div className="text-sm text-muted-foreground">
          Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
