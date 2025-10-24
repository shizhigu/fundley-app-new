import { create } from 'zustand';

export type ViewMode = 'contextual' | 'library';

export interface BlockFilter {
  search?: string;
  symbols?: string[];
  tags?: string[];
  isTemplate?: boolean;
}

interface BlockViewState {
  // View mode
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;

  // Active block tracking
  activeBlockId: string | null;
  activeBlockContent: any | null; // Full block content for agent context
  setActiveBlock: (id: string | null, content?: any | null) => void;

  // Backward compatibility
  setActiveBlockId: (id: string | null) => void;

  // Filters and search (for library view)
  filters: BlockFilter;
  setFilters: (filters: BlockFilter) => void;
  updateFilter: (key: keyof BlockFilter, value: any) => void;
  clearFilters: () => void;

  // Sort preferences
  sortBy: 'created_at' | 'updated_at' | 'last_accessed_at' | 'title';
  sortOrder: 'asc' | 'desc';
  setSorting: (
    sortBy: BlockViewState['sortBy'],
    sortOrder: BlockViewState['sortOrder'],
  ) => void;
}

export const useBlockViewStore = create<BlockViewState>((set) => ({
  // Initial state
  viewMode: 'contextual',
  activeBlockId: null,
  activeBlockContent: null,
  filters: {},
  sortBy: 'updated_at',
  sortOrder: 'desc',

  // Actions
  setViewMode: (mode) => set({ viewMode: mode }),

  setActiveBlock: (id, content = null) => {
    set({
      activeBlockId: id,
      activeBlockContent: content,
    });
  },

  // Backward compatibility
  setActiveBlockId: (id) => set({ activeBlockId: id }),

  setFilters: (filters) => set({ filters }),

  updateFilter: (key, value) =>
    set((state) => ({
      filters: { ...state.filters, [key]: value },
    })),

  clearFilters: () => set({ filters: {} }),

  setSorting: (sortBy, sortOrder) => set({ sortBy, sortOrder }),
}));
