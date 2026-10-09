import { AppState, Vibration } from 'react-native';

import { haptics } from '@/lib/haptics';
import { isSupabaseConfigured } from '@/lib/supabase';
import { runSync } from '@/lib/sync';
import {
  afterSet,
  describeSet,
  saveActiveWorkout,
  saveRuntime,
  type SetRef,
  type Suggestion,
} from '@/lib/workouts';
import { registerWorkoutSync } from '@/lib/workouts/sync';

import { toggleSet } from './actions';
import { cancelRestDone, scheduleRestDone } from './restNotifications';
import { activeSession, type SessionStore } from './store';

/**
 * What the live session does besides editing the document: persisting it, the rest timer, and the
 * tick flow (haptic, superset focus, rest). The UI updates from memory first; SQLite writes follow
 * a moment later (and immediately when the app goes to the background), so ticking a set never
 * waits on the database.
 */

const SAVE_DEBOUNCE_MS = 250;
let saveTimer: ReturnType<typeof setTimeout> | undefined;
let chain: Promise<unknown> = Promise.resolve();

function persistNow(): Promise<unknown> {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = undefined;
  const { doc, runtime, mode } = activeSession.getState();
  if (mode !== 'active' || !doc || doc.status !== 'in_progress') return chain;
  // Writes run one after another so an older state never lands after a newer one.
  chain = chain
    .then(() => saveActiveWorkout(doc, runtime))
    .then(() => {
      if (!isSupabaseConfigured()) return;
      registerWorkoutSync();
      void runSync();
    })
    .catch(() => undefined);
  return chain;
}

/** Writes any pending change now (backgrounding, finishing). */
export function flushActiveSession(): Promise<unknown> {
  return persistNow();
}

/** Drops a pending write (the workout was finished or discarded meanwhile). */
export function cancelPendingSave(): Promise<unknown> {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = undefined;
  return chain;
}

activeSession.subscribe((state, prev) => {
  if (!state.doc || state.doc.status !== 'in_progress') return;
  if (state.doc !== prev.doc) {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => void persistNow(), SAVE_DEBOUNCE_MS);
  } else if (state.runtime !== prev.runtime) {
    void saveRuntime(state.doc.id, state.runtime).catch(() => undefined);
  }
});

AppState.addEventListener('change', (state) => {
  if (state !== 'active') void flushActiveSession();
});

// ─── Rest timer ─────────────────────────────────────────────────────────────────────────────────

export function startRest(
  store: SessionStore,
  seconds: number,
  exerciseId: string,
  nextLabel: string | null,
): void {
  const { runtime, setRest } = store.getState();
  cancelRestDone(runtime.rest?.notificationId ?? null);
  const endsAt = Date.now() + seconds * 1000;
  setRest({ endsAt, totalSec: seconds, exerciseId, nextLabel, notificationId: null });
  void scheduleRestDone(endsAt, nextLabel).then((id) => {
    const rest = store.getState().runtime.rest;
    if (id && rest?.endsAt === endsAt) setRest({ ...rest, notificationId: id });
    else cancelRestDone(id);
  });
}

/** +15 s / −15 s. Going to zero or below ends the rest. */
export function adjustRest(store: SessionStore, deltaSec: number): void {
  const rest = store.getState().runtime.rest;
  if (!rest) return;
  const endsAt = rest.endsAt + deltaSec * 1000;
  if (endsAt <= Date.now()) return skipRest(store);
  cancelRestDone(rest.notificationId);
  const next = {
    ...rest,
    endsAt,
    totalSec: Math.max(1, rest.totalSec + deltaSec),
    notificationId: null,
  };
  store.getState().setRest(next);
  void scheduleRestDone(endsAt, rest.nextLabel).then((id) => {
    const current = store.getState().runtime.rest;
    if (id && current?.endsAt === endsAt)
      store.getState().setRest({ ...current, notificationId: id });
    else cancelRestDone(id);
  });
}

export function skipRest(store: SessionStore): void {
  const { runtime, setRest, sheet, openSheet } = store.getState();
  cancelRestDone(runtime.rest?.notificationId ?? null);
  setRest(null);
  if (sheet?.kind === 'rest') openSheet(null);
}

/** The rest ran out with the app open: buzz and clear it (the notification covers background). */
export function finishRest(store: SessionStore): void {
  const { setRest, sheet, openSheet } = store.getState();
  setRest(null);
  if (sheet?.kind === 'rest') openSheet(null);
  Vibration.vibrate([0, 400, 200, 400]);
}

// ─── Ticking a set ──────────────────────────────────────────────────────────────────────────────

/** Dev-only: time from the press to the next frame after the re-render (target under 100 ms). */
function measure(label: string, startedAt: number): void {
  if (!__DEV__) return;
  requestAnimationFrame(() => {
    const ms = performance.now() - startedAt;
    console.log(`[perf] ${label}: ${ms.toFixed(1)} ms to next frame`);
  });
}

export function tickSet(
  store: SessionStore,
  ref: SetRef,
  suggestion: Suggestion,
  nameOf: (exerciseId: string) => string,
): void {
  const t0 = performance.now();
  const state = store.getState();
  const before = state.doc?.exercises
    .find((e) => e.id === ref.exerciseId)
    ?.sets.find((s) => s.id === ref.setId);
  if (!before) return;
  const completing = !before.completed;
  state.apply((d) => toggleSet(d, ref.exerciseId, ref.setId, suggestion, new Date().toISOString()));
  if (state.keypad?.setId === ref.setId) state.openKeypad(null);
  measure(completing ? 'tick' : 'untick', t0);
  if (!completing || state.mode !== 'active') return;

  haptics.light();
  const doc = store.getState().doc!;
  const { restSec, next } = afterSet(doc.exercises, ref);
  store.getState().setFocus(next);
  if (restSec > 0) {
    startRest(store, restSec, ref.exerciseId, describeSet(doc.exercises, next, nameOf));
    store.getState().openSheet({ kind: 'rest' });
  }
}

/** Focus a set the lifter tapped into (keeps the superset flow honest). */
export function focusSet(store: SessionStore, ref: SetRef | null): void {
  store.getState().setFocus(ref);
}
