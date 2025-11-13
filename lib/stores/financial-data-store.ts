import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  FinancialDataPoint,
  AvailableMetric,
  FinancialAnalysisForm,
  ViewMode,
  FinancialDataError,
} from '@/lib/types/financial-data';

interface FinancialDataStore {
  // 核心数据
  data: FinancialDataPoint[];
  availableMetrics: AvailableMetric[];

  // 表单状态
  analysisForm: FinancialAnalysisForm;

  // UI状态
  viewMode: ViewMode;
  isPanelCollapsed: boolean;

  // 加载状态
  isLoading: boolean;
  error: FinancialDataError | null;

  // 元数据
  lastUpdated: string | null;
  isActive: boolean;

  // 数据更新方法
  updateFinancialData: (data: FinancialDataPoint[]) => void;
  clearFinancialData: () => void;
  setActive: (active: boolean) => void;
  updateAvailableMetrics: (metrics: AvailableMetric[]) => void;

  // 表单状态更新方法
  updateAnalysisForm: (form: Partial<FinancialAnalysisForm>) => void;
  resetAnalysisForm: () => void;

  // UI状态更新方法
  setViewMode: (mode: ViewMode) => void;
  setPanelCollapsed: (collapsed: boolean) => void;

  // 加载状态方法
  setLoading: (loading: boolean) => void;
  setError: (error: FinancialDataError | null) => void;
}

export const useFinancialDataStore = create<FinancialDataStore>()(
  persist(
    (set, get) => ({
      // 初始状态
      data: [],
      availableMetrics: [],

      analysisForm: {
        symbols: 'NVDA,AAPL,MSFT', // 默认值
        selectedMetrics: [], // 空数组，不预设默认选择
        periods: 5, // 默认5个季度
      },

      viewMode: 'cards', // 默认卡片视图
      isPanelCollapsed: false,

      // 加载状态
      isLoading: false,
      error: null,

      // 元数据
      lastUpdated: null,
      isActive: false,

      // 数据更新方法
      updateFinancialData: (data: FinancialDataPoint[]) => {
        const timestamp = new Date().toISOString();
        console.log(
          '🔄 Zustand Store: updateFinancialData called with',
          data.length,
          'rows at',
          timestamp,
        );
        console.log('📝 Sample data:', data.slice(0, 2));

        set({
          data,
          lastUpdated: timestamp,
          isActive: data.length > 0,
        });

        console.log('✅ Zustand Store: Financial data updated successfully');
      },

      clearFinancialData: () => {
        set({
          data: [],
          lastUpdated: null,
          isActive: false,
        });
      },

      setActive: (active: boolean) => {
        set({ isActive: active });
      },

      updateAvailableMetrics: (metrics: AvailableMetric[]) => {
        set({ availableMetrics: metrics });
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

      // UI状态更新方法
      setViewMode: (mode: ViewMode) => {
        set({ viewMode: mode });
        console.log('👁️ View mode changed to:', mode);
      },

      setPanelCollapsed: (collapsed: boolean) => {
        set({ isPanelCollapsed: collapsed });
        console.log('📂 Panel collapsed:', collapsed);
      },

      // 加载状态方法
      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },

      setError: (error: FinancialDataError | null) => {
        set({ error });
      },
    }),
    {
      name: 'financial-data-storage', // localStorage key
      version: 2,
      migrate: (persistedState: any, version) => {
        if (version < 2) {
          // Drop heavy persisted datasets from older versions
          const { data, availableMetrics, lastUpdated, isActive, ...rest } =
            persistedState || {};
          return rest;
        }
        return persistedState;
      },
      // Only persist lightweight UI preferences
      partialize: (state) => ({
        analysisForm: state.analysisForm,
        viewMode: state.viewMode,
        isPanelCollapsed: state.isPanelCollapsed,
      }),
    },
  ),
);
