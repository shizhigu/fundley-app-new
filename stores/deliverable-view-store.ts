import { create } from 'zustand';

export type ViewMode = 'contextual' | 'library';

export interface DeliverableFilter {
  search?: string;
  symbols?: string[];
  tags?: string[];
  isTemplate?: boolean;
}

interface DeliverableViewState {
  // View mode
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;

  // Active deliverable tracking
  activeDeliverableId: string | null;
  setActiveDeliverable: (id: string | null, content?: any | null) => void;

  // Backward compatibility
  setActiveDeliverableId: (id: string | null) => void;

  // Filters and search (for library view)
  filters: DeliverableFilter;
  setFilters: (filters: DeliverableFilter) => void;
  updateFilter: (key: keyof DeliverableFilter, value: any) => void;
  clearFilters: () => void;

  // Sort preferences
  sortBy: 'created_at' | 'updated_at' | 'last_accessed_at' | 'title';
  sortOrder: 'asc' | 'desc';
  setSorting: (
    sortBy: DeliverableViewState['sortBy'],
    sortOrder: DeliverableViewState['sortOrder'],
  ) => void;
}

export const useDeliverableViewStore = create<DeliverableViewState>((set) => ({
  // Initial state
  viewMode: 'contextual',
  activeDeliverableId: null,
  filters: {},
  sortBy: 'updated_at',
  sortOrder: 'desc',

  // Actions
  setViewMode: (mode) => set({ viewMode: mode }),

  setActiveDeliverable: (id) => {
    set({
      activeDeliverableId: id,
    });
  },

  // Backward compatibility
  setActiveDeliverableId: (id) => set({ activeDeliverableId: id }),

  setFilters: (filters) => set({ filters }),

  updateFilter: (key, value) =>
    set((state) => ({
      filters: { ...state.filters, [key]: value },
    })),

  clearFilters: () => set({ filters: {} }),

  setSorting: (sortBy, sortOrder) => set({ sortBy, sortOrder }),
}));
