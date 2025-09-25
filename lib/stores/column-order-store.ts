import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ColumnOrderState {
  // 财务数据表格的列顺序（存储 metric IDs）
  financialTableColumns: string[];

  // 指标选择区域的顺序（存储 metric IDs）
  metricSelectionOrder: string[];

  // 设置列顺序
  setFinancialTableColumns: (columns: string[]) => void;

  // 重新排序列
  reorderFinancialTableColumns: (startIndex: number, endIndex: number) => void;

  // 重置为默认顺序
  resetFinancialTableColumns: () => void;

  // 设置指标选择顺序
  setMetricSelectionOrder: (metrics: string[]) => void;

  // 重新排序指标选择
  reorderMetricSelection: (startIndex: number, endIndex: number) => void;
}

export const useColumnOrderStore = create<ColumnOrderState>()(
  persist(
    (set, get) => ({
      financialTableColumns: [],
      metricSelectionOrder: [],

      setFinancialTableColumns: (columns: string[]) => {
        set({ financialTableColumns: columns });
      },

      reorderFinancialTableColumns: (startIndex: number, endIndex: number) => {
        const { financialTableColumns } = get();
        const result = Array.from(financialTableColumns);
        const [removed] = result.splice(startIndex, 1);
        result.splice(endIndex, 0, removed);

        set({ financialTableColumns: result });
      },

      resetFinancialTableColumns: () => {
        set({ financialTableColumns: [] });
      },

      setMetricSelectionOrder: (metrics: string[]) => {
        set({ metricSelectionOrder: metrics });
      },

      reorderMetricSelection: (startIndex: number, endIndex: number) => {
        const { metricSelectionOrder } = get();
        const result = Array.from(metricSelectionOrder);
        const [removed] = result.splice(startIndex, 1);
        result.splice(endIndex, 0, removed);

        set({ metricSelectionOrder: result });
      },
    }),
    {
      name: 'column-order-storage',
      partialize: (state) => ({
        financialTableColumns: state.financialTableColumns,
        metricSelectionOrder: state.metricSelectionOrder,
      }),
    }
  )
);