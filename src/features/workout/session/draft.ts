import { create } from 'zustand';

/**
 * The keypad's typed text, kept apart from the session so a keystroke re-renders only the active
 * cell and the keypad, never the cards.
 */
export const useKeypadDraft = create<{ draft: string; set: (draft: string) => void }>()((set) => ({
  draft: '',
  set: (draft) => set({ draft }),
}));
