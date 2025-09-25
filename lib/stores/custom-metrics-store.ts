import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CustomMetric {
  _id: string;
  name: string;
  description?: string;
  formula: any; // JSONB field from database
  latexFormula?: string;
  sqlFormula?: string;
  createdAt?: string;
  updatedAt?: string;
  organizationName?: string;
}

export interface CustomMetricsState {
  currentMetrics: CustomMetric[];
  lastUpdated: string | null;
  isActive: boolean; // 是否有有效的自定义指标
}

interface CustomMetricsStore extends CustomMetricsState {
  // 数据更新方法
  updateCustomMetrics: (metrics: CustomMetric[]) => void;
  clearCustomMetrics: () => void;
  setActive: (active: boolean) => void;

  // 格式化为字符串方法 (用于发送给Agent)
  formatForAgent: () => string;
}

export const useCustomMetricsStore = create<CustomMetricsStore>()(
  persist(
    (set, get) => ({
      // 初始状态
      currentMetrics: [],
      lastUpdated: null,
      isActive: false,

      // 数据更新方法
      updateCustomMetrics: (metrics: CustomMetric[]) => {
        const timestamp = new Date().toISOString();
        console.log('🔄 Custom Metrics Store: updateCustomMetrics called with', metrics.length, 'metrics at', timestamp);
        console.log('📝 Sample metrics:', metrics.slice(0, 2));

        set({
          currentMetrics: metrics,
          lastUpdated: timestamp,
          isActive: metrics.length > 0,
        });

        console.log('✅ Custom Metrics Store: Custom metrics updated successfully');
      },

      clearCustomMetrics: () => {
        set({
          currentMetrics: [],
          lastUpdated: null,
          isActive: false,
        });
      },

      setActive: (active: boolean) => {
        set((state) => ({
          isActive: active,
        }));
      },

      // 格式化为字符串方法 (按用户要求：metric id, metric name, formula)
      formatForAgent: () => {
        const state = get();
        if (!state.isActive || state.currentMetrics.length === 0) {
          return '';
        }

        const formattedMetrics = state.currentMetrics.map((metric) => {
          // 提取formula字段中的关键信息
          let formulaText = '';
          if (metric.formula) {
            // 如果有SQL公式，优先使用
            if (metric.formula.sqlFormula || metric.formula.sql) {
              formulaText = metric.formula.sqlFormula || metric.formula.sql;
            }
            // 否则如果有LaTeX公式，使用LaTeX
            else if (metric.latexFormula) {
              formulaText = metric.latexFormula;
            }
            // 最后尝试从formula对象中提取其他信息
            else if (typeof metric.formula === 'object') {
              formulaText = JSON.stringify(metric.formula);
            } else {
              formulaText = String(metric.formula);
            }
          }

          return `ID: ${metric._id} | Name: ${metric.name} | Formula: ${formulaText}`;
        }).join('\n');

        return `Custom Metrics Available:\n${formattedMetrics}`;
      },
    }),
    {
      name: 'custom-metrics-storage', // localStorage key
      // 持久化所有状态
      partialize: (state) => ({
        currentMetrics: state.currentMetrics,
        lastUpdated: state.lastUpdated,
        isActive: state.isActive,
      }),
    }
  )
);