import type { Rank } from '@/lib/game/ranks';
import {
  disciplines,
  standardMetrics,
  type Discipline,
  type StandardMetric,
} from '@/lib/game/engine/types';
import { getSupabase } from '@/lib/supabase';
import type { RankTier } from '@/theme';

import { isObj, num, oneOf, parseList, rank, str, tier } from './json';

/**
 * One lift in detail (`get_lift_detail`) and where the lifter stands among people like them
 * (`get_lift_percentile`: a percentage only, and only with 20+ lifters in the cohort).
 */

export interface LiftSet {
  setId: string;
  workoutId: string;
  workoutName: string;
  at: string;
  exerciseName: string;
  /** '' for the lift itself; a progression slug for skills. */
  variant: string;
  weightKg: number | null;
  reps: number | null;
  durationSec: number | null;
  e1rm: number | null;
  score: number | null;
  isBest: boolean;
}

export interface LiftSession {
  at: string;
  workoutId: string;
  e1rm: number | null;
  reps: number | null;
  seconds: number | null;
  addedKg: number | null;
}

export interface LiftStandard {
  metric: StandardMetric;
  /** What each anchor needs, in kg (e1RM), reps or seconds, at today's bodyweight and age. */
  anchors: { score: number; tier: RankTier; value: number }[];
}

export interface LiftDetail {
  rankKey: string;
  name: string;
  discipline: Discipline;
  bodyweightKg: number | null;
  rank: { score: number; rank: Rank; bestSetId: string | null; lastSetAt: string | null } | null;
  standards: LiftStandard[];
  sets: LiftSet[];
  sessions: LiftSession[];
}

export interface LiftPercentile {
  percentile: number | null;
  cohort: number;
  minCohort: number;
  sex: 'male' | 'female' | 'unspecified' | null;
  bwMin: number | null;
  bwMax: number | null;
}

function parseSet(v: unknown): LiftSet | null {
  if (!isObj(v)) return null;
  const setId = str(v.set_id);
  const workoutId = str(v.workout_id);
  const at = str(v.at);
  if (!setId || !workoutId || !at) return null;
  return {
    setId,
    workoutId,
    workoutName: str(v.workout_name) ?? 'Workout',
    at,
    exerciseName: str(v.exercise_name) ?? '',
    variant: str(v.variant) ?? '',
    weightKg: num(v.weight_kg),
    reps: num(v.reps),
    durationSec: num(v.duration_sec),
    e1rm: num(v.e1rm),
    score: num(v.score),
    isBest: v.is_best === true,
  };
}

function parseSession(v: unknown): LiftSession | null {
  if (!isObj(v)) return null;
  const at = str(v.at);
  const workoutId = str(v.workout_id);
  if (!at || !workoutId) return null;
  return {
    at,
    workoutId,
    e1rm: num(v.e1rm),
    reps: num(v.reps),
    seconds: num(v.seconds),
    addedKg: num(v.added_kg),
  };
}

function parseStandard(v: unknown): LiftStandard | null {
  if (!isObj(v)) return null;
  const metric = oneOf(standardMetrics, v.metric);
  if (!metric) return null;
  const anchors = parseList(v.anchors, (a) => {
    if (!isObj(a)) return null;
    const score = num(a.score);
    const t = tier(a.tier);
    const value = num(a.value);
    return score === null || !t || value === null ? null : { score, tier: t, value };
  });
  return anchors.length ? { metric, anchors } : null;
}

export function parseLiftDetail(v: unknown): LiftDetail | null {
  if (!isObj(v)) return null;
  const rankKey = str(v.rank_key);
  const discipline = oneOf(disciplines, v.discipline);
  if (!rankKey || !discipline) return null;
  const r = isObj(v.rank) ? v.rank : null;
  const score = r ? num(r.score) : null;
  const current = r ? rank(r.tier, r.division) : null;
  return {
    rankKey,
    name: str(v.name) ?? rankKey,
    discipline,
    bodyweightKg: num(v.bodyweight_kg),
    rank:
      r && score !== null && current
        ? { score, rank: current, bestSetId: str(r.best_set_id), lastSetAt: str(r.last_set_at) }
        : null,
    standards: parseList(v.standards, parseStandard),
    sets: parseList(v.sets, parseSet),
    sessions: parseList(v.sessions, parseSession),
  };
}

export function parseLiftPercentile(v: unknown): LiftPercentile | null {
  if (!isObj(v)) return null;
  return {
    percentile: num(v.percentile),
    cohort: num(v.cohort) ?? 0,
    minCohort: num(v.min_cohort) ?? 20,
    sex: oneOf(['male', 'female', 'unspecified'] as const, v.sex),
    bwMin: num(v.bw_min),
    bwMax: num(v.bw_max),
  };
}

export async function fetchLiftDetail(rankKey: string): Promise<LiftDetail | null> {
  const { data, error } = await getSupabase().rpc('get_lift_detail', { p_rank_key: rankKey });
  if (error) throw error;
  return parseLiftDetail(data);
}

export async function fetchLiftPercentile(rankKey: string): Promise<LiftPercentile | null> {
  const { data, error } = await getSupabase().rpc('get_lift_percentile', { p_rank_key: rankKey });
  if (error) throw error;
  return parseLiftPercentile(data);
}
