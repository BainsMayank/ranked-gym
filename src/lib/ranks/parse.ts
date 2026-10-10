import { prKinds } from '@/lib/game/engine/records';
import { rankScopes } from '@/lib/game/engine/types';

import { arr, isObj, num, oneOf, rank, str } from './json';

import type {
  CurrentRank,
  PersonalRecord,
  Placement,
  PlacementProgress,
  PredictionEta,
  RankChange,
  RankChangeKind,
  RankPrediction,
  WorkoutRewards,
} from './types';

/**
 * Narrowing parsers for the JSON the rank engine returns. Anything malformed is dropped rather than
 * shown, so an older or newer server can never crash the summary screen.
 */

const CHANGE_KINDS = ['placed', 'rank_up', 'rank_down'] as const satisfies RankChangeKind[];

function parsePr(v: unknown): PersonalRecord | null {
  if (!isObj(v)) return null;
  const kind = oneOf(prKinds, v.kind);
  const value = num(v.value);
  const previousValue = num(v.previous_value);
  const exerciseId = str(v.exercise_id);
  if (!kind || value === null || previousValue === null || !exerciseId) return null;
  return {
    exerciseId,
    exerciseName: str(v.exercise_name) ?? 'Exercise',
    kind,
    weightKg: num(v.weight_kg),
    value,
    previousValue,
    workoutSetId: str(v.workout_set_id),
  };
}

function parseChange(v: unknown): RankChange | null {
  if (!isObj(v)) return null;
  const scope = oneOf(rankScopes, v.scope);
  const kind = oneOf(CHANGE_KINDS, v.kind);
  const to = rank(v.to_tier, v.to_division);
  const key = str(v.key);
  const score = num(v.score);
  if (!scope || !kind || !to || !key || score === null) return null;
  return {
    scope,
    key,
    name: str(v.name) ?? key,
    kind,
    from: rank(v.from_tier, v.from_division),
    to,
    score,
  };
}

function parsePlacement(v: unknown): Placement | null {
  if (!isObj(v)) return null;
  return {
    lifts: num(v.lifts) ?? 0,
    regions: num(v.regions) ?? 0,
    needLifts: num(v.need_lifts) ?? 5,
    needRegions: num(v.need_regions) ?? 4,
    placed: v.placed === true,
  };
}

export function parseRewards(v: unknown): WorkoutRewards | null {
  if (!isObj(v)) return null;
  const workoutId = str(v.workout_id);
  if (!workoutId) return null;
  return {
    workoutId,
    prs: arr(v.prs)
      .map(parsePr)
      .filter((p): p is PersonalRecord => p !== null),
    baselines: num(v.baselines) ?? 0,
    rankChanges: arr(v.rank_changes)
      .map(parseChange)
      .filter((c): c is RankChange => c !== null),
    placement: parsePlacement(v.placement),
    needsBodyweight: v.needs_bodyweight === true,
    flagged: num(v.flagged) ?? 0,
    xpPlaceholder: null,
  };
}

function parsePlacementProgress(v: unknown): PlacementProgress | null {
  if (!isObj(v)) return null;
  const lifts = num(v.lifts);
  const needLifts = num(v.need_lifts);
  if (lifts === null || needLifts === null) return null;
  return { lifts, needLifts, regions: num(v.regions), needRegions: num(v.need_regions) };
}

export function parseCurrentRank(v: unknown): CurrentRank | null {
  if (!isObj(v)) return null;
  const scope = oneOf(rankScopes, v.scope);
  const key = str(v.key);
  const status = oneOf(['ranked', 'placement'] as const, v.status);
  if (!scope || !key || !status) return null;
  return {
    scope,
    key,
    score: num(v.score),
    rank: rank(v.tier, v.division),
    status,
    lastSetAt: str(v.last_set_at),
    inactive: v.inactive === true,
    details: parsePlacementProgress(v.details),
  };
}

const loads = (v: unknown) =>
  arr(v).flatMap((l) => {
    if (!isObj(l)) return [];
    const reps = num(l.reps);
    const kg = num(l.kg);
    return reps === null || kg === null ? [] : [{ reps, kg }];
  });

function parseEta(v: unknown): PredictionEta {
  if (isObj(v) && v.status === 'ok') {
    const days = num(v.days);
    if (days !== null) return { status: 'ok', days };
  }
  const status = isObj(v)
    ? oneOf(['need_more_sessions', 'not_trending', 'at_top'] as const, v.status)
    : null;
  return { status: status ?? 'need_more_sessions' };
}

export function parsePrediction(v: unknown): RankPrediction | null {
  if (!isObj(v)) return null;
  const rankKey = str(v.rank_key);
  const score = num(v.score);
  if (!rankKey || score === null) return null;
  return {
    rankKey,
    score,
    next: rank(v.next_tier, v.next_division),
    targetScore: num(v.target_score),
    e1rmKg: num(v.e1rm_kg),
    loads: loads(v.loads),
    reps: num(v.reps),
    addedLoads: loads(v.added_loads),
    seconds: num(v.seconds),
    eta: parseEta(v.eta),
    needsBodyweight: v.needs_bodyweight === true,
    bodyweightStale: v.bodyweight_stale === true,
  };
}
