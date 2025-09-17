import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface FinancialDataRow {
  symbol: string;
  fiscalYear: number;
  period: string;
  date: string | null;
  [key: string]: any; // 允许动态的财务指标字段
}

export interface FinancialDataState {
  currentData: FinancialDataRow[];
  lastUpdated: string | null;
  isActive: boolean; // 是否有有效的财务数据
}

// 财务分析表单状态
export interface FinancialAnalysisForm {
  symbols: string; // 股票代码，逗号分隔
  selectedMetrics: string[]; // 选中的财务指标
  periods: number; // 历史季度数
}

// 完整的财务数据状态
export interface FullFinancialState {
  // 当前显示的数据
  financialData: FinancialDataState;

  // 表单状态（持久化）
  analysisForm: FinancialAnalysisForm;

  // UI 状态（持久化）
  viewMode: 'cards' | 'table';
  isPanelCollapsed: boolean;
}

interface FinancialDataStore extends FullFinancialState {
  // 数据更新方法
  updateFinancialData: (data: FinancialDataRow[]) => void;
  clearFinancialData: () => void;
  setActive: (active: boolean) => void;

  // 表单状态更新方法
  updateAnalysisForm: (form: Partial<FinancialAnalysisForm>) => void;
  resetAnalysisForm: () => void;

  // UI 状态更新方法
  setViewMode: (mode: 'cards' | 'table') => void;
  setPanelCollapsed: (collapsed: boolean) => void;
}

export const useFinancialDataStore = create<FinancialDataStore>()(
  persist(
    (set, get) => ({
      // 初始状态
      financialData: {
        currentData: [],
        lastUpdated: null,
        isActive: false,
      },

      analysisForm: {
        symbols: 'NVDA,AAPL,MSFT', // 默认值
        selectedMetrics: [], // 空数组，不预设默认选择
        periods: 5, // 默认5个季度
      },

      viewMode: 'cards', // 默认卡片视图
      isPanelCollapsed: false,

      // 数据更新方法
      updateFinancialData: (data: FinancialDataRow[]) => {
        const timestamp = new Date().toISOString();
        console.log('🔄 Zustand Store: updateFinancialData called with', data.length, 'rows at', timestamp);
        console.log('📝 Sample data:', data.slice(0, 2));

        set((state) => ({
          financialData: {
            currentData: data,
            lastUpdated: timestamp,
            isActive: data.length > 0,
          },
        }));

        console.log('✅ Zustand Store: Financial data updated successfully');
      },

      clearFinancialData: () => {
        set((state) => ({
          financialData: {
            currentData: [],
            lastUpdated: null,
            isActive: false,
          },
        }));
      },

      setActive: (active: boolean) => {
        set((state) => ({
          financialData: {
            ...state.financialData,
            isActive: active,
          },
        }));
      },

      // 表单状态更新方法
      updateAnalysisForm: (formUpdate: Partial<FinancialAnalysisForm>) => {
        set((state) => ({
          analysisForm: {
            ...state.analysisForm,
            ...formUpdate,
          },
        }));
        console.log('📋 Analysis form updated:', get().analysisForm);
      },

      resetAnalysisForm: () => {
        set({
          analysisForm: {
            symbols: 'NVDA,AAPL,MSFT',
            selectedMetrics: [],
            periods: 5,
          },
        });
      },

      // UI 状态更新方法
      setViewMode: (mode: 'cards' | 'table') => {
        set({ viewMode: mode });
        console.log('👁️ View mode changed to:', mode);
      },

      setPanelCollapsed: (collapsed: boolean) => {
        set({ isPanelCollapsed: collapsed });
        console.log('📂 Panel collapsed:', collapsed);
      },
    }),
    {
      name: 'financial-data-storage', // localStorage key
      // 持久化表单、UI状态和财务数据
      partialize: (state) => ({
        analysisForm: state.analysisForm,
        viewMode: state.viewMode,
        isPanelCollapsed: state.isPanelCollapsed,
        financialData: state.financialData, // 也保存财务数据
      }),
    }
  )
);