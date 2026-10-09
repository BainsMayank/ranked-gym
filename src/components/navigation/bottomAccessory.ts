import { create } from 'zustand';

/**
 * Height of anything docked above the tab bar (the workout mini bar). Screens add it to the tab
 * bar's height when padding their content, so nothing hides behind it.
 */
export const useBottomAccessory = create<{ height: number; setHeight: (height: number) => void }>()(
  (set) => ({ height: 0, setHeight: (height) => set({ height }) }),
);
