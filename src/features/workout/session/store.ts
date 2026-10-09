import { createContext, useContext } from 'react';
import { createStore, useStore, type StoreApi } from 'zustand';

import {
  firstOpenSet,
  type RestTimer,
  type SetRef,
  type WorkoutDoc,
  type WorkoutRuntime,
} from '@/lib/workouts';

/**
 * The live session's working copy. One store per session: the active workout (persisted to SQLite
 * as it changes) and, separately, a finished workout being edited from History (saved on Save), so
 * editing history never touches a workout in progress. Lives outside React so a card subscribes to
 * its own exercise only: ticking a set re-renders that card, not the screen.
 */

export type KeypadField = 'weight' | 'reps' | 'time' | 'distance' | 'rir' | 'rpe';

export interface KeypadTarget extends SetRef {
  field: KeypadField;
}

export type SessionSheet =
  | { kind: 'rest' }
  | { kind: 'plates'; targetKg: number | null }
  | { kind: 'exercise'; exerciseId: string }
  | { kind: 'set'; exerciseId: string; setId: string }
  | { kind: 'notes'; exerciseId: string }
  | { kind: 'rename' }
  | { kind: 'restTime'; exerciseId: string }
  | { kind: 'notifyPrompt' }
  | null;

export interface SessionState {
  mode: 'active' | 'edit';
  doc: WorkoutDoc | null;
  /** The doc as last saved (edit mode: unsaved-changes check). */
  baseline: WorkoutDoc | null;
  runtime: WorkoutRuntime;
  /** The set "up next" (highlighted; superset flow moves it). */
  focus: SetRef | null;
  keypad: KeypadTarget | null;
  sheet: SessionSheet;
  reordering: boolean;

  load: (doc: WorkoutDoc, runtime?: WorkoutRuntime) => void;
  /** One edit of the document. */
  apply: (edit: (doc: WorkoutDoc) => WorkoutDoc) => void;
  setRest: (rest: RestTimer | null) => void;
  setFocus: (focus: SetRef | null) => void;
  openKeypad: (target: KeypadTarget | null) => void;
  openSheet: (sheet: SessionSheet) => void;
  setReordering: (on: boolean) => void;
  markSaved: () => void;
  reset: () => void;
}

const initial = {
  doc: null,
  baseline: null,
  runtime: { rest: null } as WorkoutRuntime,
  focus: null,
  keypad: null,
  sheet: null,
  reordering: false,
};

export type SessionStore = StoreApi<SessionState>;

export function createSessionStore(mode: SessionState['mode']): SessionStore {
  return createStore<SessionState>()((set, get) => ({
    mode,
    ...initial,
    // Up next starts at the first set not done (also after a kill and restore).
    load: (doc, runtime = { rest: null }) =>
      set({ ...initial, doc, baseline: doc, runtime, focus: firstOpenSet(doc.exercises) }),
    apply: (edit) => {
      const { doc } = get();
      if (!doc) return;
      const next = edit(doc);
      if (next !== doc) set({ doc: next });
    },
    setRest: (rest) => set({ runtime: { ...get().runtime, rest } }),
    setFocus: (focus) => set({ focus }),
    openKeypad: (keypad) => set({ keypad }),
    openSheet: (sheet) => set({ sheet }),
    setReordering: (reordering) => set({ reordering, keypad: null }),
    markSaved: () => set({ baseline: get().doc }),
    reset: () => set(initial),
  }));
}

/** The workout in progress on this device (one per app). */
export const activeSession = createSessionStore('active');

const SessionContext = createContext<SessionStore>(activeSession);
export const SessionStoreProvider = SessionContext.Provider;

export function useSessionStore(): SessionStore {
  return useContext(SessionContext);
}

/** Selects from the session in context (the active one unless a provider says otherwise). */
export function useSession<T>(selector: (s: SessionState) => T): T {
  return useStore(useContext(SessionContext), selector);
}

export const selectDirty = (s: SessionState) => s.doc !== null && s.doc !== s.baseline;
