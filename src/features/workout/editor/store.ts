import { create } from 'zustand';

import type { RoutineDoc } from '@/lib/routines';

/** How many edits Undo can step back through. */
export const UNDO_LIMIT = 10;

/** The one sheet open in the editor, with what it's about. */
export type EditorSheet =
  | { kind: 'set'; exerciseId: string; setId: string }
  | { kind: 'rest'; exerciseId: string }
  | { kind: 'menu'; exerciseId: string }
  | { kind: 'muscles' }
  | { kind: 'folder' }
  | { kind: 'routineMenu' }
  | null;

interface EditorState {
  /** The document being edited (null until the editor has loaded). */
  doc: RoutineDoc | null;
  /** What "no unsaved changes" means: the saved routine, or the blank one for a new routine. */
  baseline: RoutineDoc | null;
  past: RoutineDoc[];
  /** Exercises picked in selection mode (long-press). */
  selected: string[];
  mode: 'edit' | 'select' | 'reorder';
  sheet: EditorSheet;

  load: (doc: RoutineDoc, baseline: RoutineDoc) => void;
  /** Applies one edit as one undo step. */
  apply: (edit: (doc: RoutineDoc) => RoutineDoc) => void;
  undo: () => void;
  markSaved: (doc: RoutineDoc) => void;
  setMode: (mode: EditorState['mode']) => void;
  toggleSelected: (id: string) => void;
  openSheet: (sheet: EditorSheet) => void;
  reset: () => void;
}

const initial = {
  doc: null,
  baseline: null,
  past: [],
  selected: [],
  mode: 'edit' as const,
  sheet: null,
};

/**
 * The routine editor's working copy. Lives outside React so one card can subscribe to its own
 * exercise only (typing in one set never re-renders the other cards).
 */
export const useRoutineEditor = create<EditorState>()((set, get) => ({
  ...initial,
  load: (doc, baseline) => set({ ...initial, doc, baseline }),
  apply: (edit) => {
    const { doc, past } = get();
    if (!doc) return;
    const next = edit(doc);
    if (next === doc) return;
    set({ doc: next, past: [...past, doc].slice(-UNDO_LIMIT) });
  },
  undo: () => {
    const { past } = get();
    const prev = past[past.length - 1];
    if (!prev) return;
    set({ doc: prev, past: past.slice(0, -1) });
  },
  markSaved: (doc) => set({ doc, baseline: doc, past: [] }),
  setMode: (mode) => set({ mode, selected: [] }),
  toggleSelected: (id) =>
    set((s) => ({
      selected: s.selected.includes(id) ? s.selected.filter((x) => x !== id) : [...s.selected, id],
    })),
  openSheet: (sheet) => set({ sheet }),
  reset: () => set(initial),
}));

/** True when the working copy differs from the saved routine. */
export const selectDirty = (s: EditorState) => s.doc !== null && s.doc !== s.baseline;
export const selectCanUndo = (s: EditorState) => s.past.length > 0;

export function editRoutine(edit: (doc: RoutineDoc) => RoutineDoc): void {
  useRoutineEditor.getState().apply(edit);
}
