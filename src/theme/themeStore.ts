import { create } from 'zustand';

export type ThemeMode = 'dark' | 'light' | 'system';

interface ThemeState {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
}

/** Dark-first: the app defaults to dark regardless of the OS setting. Persistence arrives in Phase 11. */
export const useThemeStore = create<ThemeState>((set) => ({
  mode: 'dark',
  setMode: (mode) => set({ mode }),
}));
