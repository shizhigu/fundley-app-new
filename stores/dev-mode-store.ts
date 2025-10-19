import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface DevModeState {
  isEnabled: boolean;
  toggle: () => void;
  enable: () => void;
  disable: () => void;
}

export const useDevModeStore = create<DevModeState>()(
  persist(
    (set) => ({
      isEnabled: false,
      toggle: () => set((state) => ({ isEnabled: !state.isEnabled })),
      enable: () => set({ isEnabled: true }),
      disable: () => set({ isEnabled: false }),
    }),
    {
      name: 'dev-mode-storage', // localStorage key
    }
  )
);
