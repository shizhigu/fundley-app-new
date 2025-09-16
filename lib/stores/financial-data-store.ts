import { create } from 'zustand';

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

interface FinancialDataStore {
  financialData: FinancialDataState;
  updateFinancialData: (data: FinancialDataRow[]) => void;
  clearFinancialData: () => void;
  setActive: (active: boolean) => void;
}

export const useFinancialDataStore = create<FinancialDataStore>((set) => ({
  financialData: {
    currentData: [],
    lastUpdated: null,
    isActive: false,
  },

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
}));