import { rankE1rm } from './e1rm.ts';
import { round2 } from './interpolate.ts';
import type { EngineSet } from './types.ts';

/**
 * Personal records (docs/RANK_SYSTEM.md §10). Mirrors the record rebuild in
 * `public.rank_recompute_user`.
 *
 * Every exercise keeps records, ranked or not (machines and custom exercises too). A value is a record
 * when it beats every earlier value of the same kind for that exercise. The first value is a
 * baseline (`previous` null): stored, but not celebrated as a PR.
 */

export const prKinds = [
  'e1rm',
  'weight',
  'reps_at_weight',
  'set_volume',
  'session_volume',
  'hold',
] as const;
export type PrKind = (typeof prKinds)[number];

export interface RecordRow {
  exerciseId: string;
  kind: PrKind;
  /** The load for reps_at_weight (0 = bodyweight); null otherwise. */
  weightKg: number | null;
  value: number;
  /** The record it beat; null for a baseline. */
  previous: number | null;
  workoutId: string;
  /** Null for session volume. */
  setId: string | null;
  at: number;
}

interface Candidate {
  exerciseId: string;
  kind: PrKind;
  weightKg: number | null;
  value: number;
  workoutId: string;
  setId: string | null;
  at: number;
  order: number;
}

/** Sets that can hold records: completed, not warm-ups, not failed, not assisted. */
export function isRecordEligible(set: EngineSet): boolean {
  return (
    set.completed &&
    !set.failed &&
    set.setType !== 'warmup' &&
    set.weightMode !== 'assisted' &&
    set.logType !== 'assisted_bodyweight'
  );
}

const LOADED_MODES = new Set(['absolute', 'bodyweight']);

function setCandidates(set: EngineSet): Candidate[] {
  const base = {
    exerciseId: set.exerciseId,
    workoutId: set.workoutId,
    setId: set.id,
    at: set.at,
    order: set.order,
  };
  const out: Candidate[] = [];
  const reps = set.reps ?? 0;
  const load = set.weightKg ?? 0;
  if (set.logType === 'duration') {
    if ((set.durationSec ?? 0) > 0) {
      out.push({ ...base, kind: 'hold', weightKg: null, value: set.durationSec ?? 0 });
    }
    return out;
  }
  if (set.logType === 'distance_duration' || !LOADED_MODES.has(set.weightMode) || reps < 1) {
    return out;
  }
  if (set.logType === 'weight_reps' && set.weightMode === 'absolute') {
    const e1rm = rankE1rm(load, reps);
    if (e1rm !== null) out.push({ ...base, kind: 'e1rm', weightKg: null, value: round2(e1rm) });
  }
  if (load > 0) {
    out.push({ ...base, kind: 'weight', weightKg: null, value: round2(load) });
    out.push({ ...base, kind: 'set_volume', weightKg: null, value: round2(load * reps) });
  }
  out.push({ ...base, kind: 'reps_at_weight', weightKg: round2(Math.max(0, load)), value: reps });
  return out;
}

function sessionCandidates(sets: readonly EngineSet[]): Candidate[] {
  const groups = new Map<string, EngineSet[]>();
  for (const s of sets) {
    if (s.logType === 'duration' || !LOADED_MODES.has(s.weightMode)) continue;
    if ((s.weightKg ?? 0) <= 0 || (s.reps ?? 0) < 1) continue;
    const key = `${s.workoutId}|${s.exerciseId}`;
    groups.set(key, [...(groups.get(key) ?? []), s]);
  }
  return [...groups.values()].map((group) => {
    const last = group.reduce((a, b) =>
      b.at > a.at || (b.at === a.at && b.order > a.order) ? b : a,
    );
    return {
      exerciseId: last.exerciseId,
      kind: 'session_volume',
      weightKg: null,
      value: round2(group.reduce((sum, s) => sum + (s.weightKg ?? 0) * (s.reps ?? 0), 0)),
      workoutId: last.workoutId,
      setId: null,
      at: last.at,
      order: last.order,
    };
  });
}

/** Rebuilds every record from scratch (sets already filtered for flags). */
export function detectRecords(sets: readonly EngineSet[]): RecordRow[] {
  const eligible = sets.filter(isRecordEligible);
  const candidates = [...eligible.flatMap(setCandidates), ...sessionCandidates(eligible)].sort(
    (a, b) => a.at - b.at || a.order - b.order,
  );
  const best = new Map<string, number>();
  const rows: RecordRow[] = [];
  for (const c of candidates) {
    const key = `${c.exerciseId}|${c.kind}|${c.weightKg ?? ''}`;
    const previous = best.get(key);
    if (previous !== undefined && c.value <= previous) continue;
    best.set(key, c.value);
    rows.push({
      exerciseId: c.exerciseId,
      kind: c.kind,
      weightKg: c.weightKg,
      value: c.value,
      previous: previous ?? null,
      workoutId: c.workoutId,
      setId: c.setId,
      at: c.at,
    });
  }
  return rows;
}
