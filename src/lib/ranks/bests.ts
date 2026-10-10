import { logTypes, type LogType } from '@/lib/exercises/taxonomy';
import { getSupabase } from '@/lib/supabase';

import { isObj, num, oneOf, parseList, str } from './json';

/** The set behind each ranked lift (`get_lift_bests`), for "e1RM 101 kg · 1.35× bodyweight". */
export interface LiftBest {
  rankKey: string;
  exerciseName: string;
  logType: LogType;
  weightKg: number | null;
  reps: number | null;
  durationSec: number | null;
  e1rm: number | null;
  /** The weigh-in the set was scored at (null when none was in range). */
  bodyweightKg: number | null;
  achievedAt: string;
}

export function parseLiftBest(v: unknown): LiftBest | null {
  if (!isObj(v)) return null;
  const rankKey = str(v.rank_key);
  const logType = oneOf(logTypes, v.log_type);
  const achievedAt = str(v.achieved_at);
  if (!rankKey || !logType || !achievedAt) return null;
  return {
    rankKey,
    exerciseName: str(v.exercise_name) ?? rankKey,
    logType,
    weightKg: num(v.weight_kg),
    reps: num(v.reps),
    durationSec: num(v.duration_sec),
    e1rm: num(v.e1rm),
    bodyweightKg: num(v.bodyweight_kg),
    achievedAt,
  };
}

export async function fetchLiftBests(): Promise<LiftBest[]> {
  const { data, error } = await getSupabase().rpc('get_lift_bests');
  if (error) throw error;
  return parseList(data, parseLiftBest);
}
