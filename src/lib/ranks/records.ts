import { logTypes, type LogType } from '@/lib/exercises/taxonomy';
import { prKinds, type PrKind } from '@/lib/game/engine/records';
import { getSupabase } from '@/lib/supabase';

import { isObj, num, oneOf, parseList, str } from './json';

/**
 * Record history (`get_personal_records`): every record and baseline for every exercise, with the
 * set and workout behind it. Records are rebuilt by the engine, so rows have no stable id.
 */

export interface RecordEntry {
  exerciseId: string;
  exerciseName: string;
  rankKey: string | null;
  logType: LogType;
  kind: PrKind;
  /** The load for reps-at-weight records (0 = bodyweight). */
  weightKg: number | null;
  value: number;
  /** Null for a baseline (the first value, not celebrated). */
  previousValue: number | null;
  achievedAt: string;
  workoutId: string;
  workoutName: string;
  set: { reps: number | null; weightKg: number | null; durationSec: number | null } | null;
}

export function parseRecordEntry(v: unknown): RecordEntry | null {
  if (!isObj(v)) return null;
  const exerciseId = str(v.exercise_id);
  const kind = oneOf(prKinds, v.kind);
  const logType = oneOf(logTypes, v.log_type);
  const value = num(v.value);
  const achievedAt = str(v.achieved_at);
  const workoutId = str(v.workout_id);
  if (!exerciseId || !kind || !logType || value === null || !achievedAt || !workoutId) return null;
  const reps = num(v.set_reps);
  const weightKg = num(v.set_weight_kg);
  const durationSec = num(v.set_duration_sec);
  return {
    exerciseId,
    exerciseName: str(v.exercise_name) ?? 'Exercise',
    rankKey: str(v.rank_key),
    logType,
    kind,
    weightKg: num(v.weight_kg),
    value,
    previousValue: num(v.previous_value),
    achievedAt,
    workoutId,
    workoutName: str(v.workout_name) ?? 'Workout',
    set:
      reps === null && weightKg === null && durationSec === null
        ? null
        : { reps, weightKg, durationSec },
  };
}

export async function fetchPersonalRecords(): Promise<RecordEntry[]> {
  const { data, error } = await getSupabase().rpc('get_personal_records');
  if (error) throw error;
  return parseList(data, parseRecordEntry);
}
