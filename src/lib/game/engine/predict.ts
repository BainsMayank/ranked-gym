import type { RankKey } from '../rankKeys.ts';
import { loadForE1rm } from './e1rm.ts';
import { resolveStandard, valueForScore } from './score.ts';
import { tierFor } from './tiers.ts';
import type { Division, ProfileSex, RankConfig, Tier } from './types.ts';

/**
 * "What do I need for the next division?" (docs/RANK_SYSTEM.md §12). Mirrors
 * `public.get_rank_predictions`.
 */

export const PREDICTION_REPS = [1, 3, 5, 8] as const;
export const TREND_DAYS = 56;
export const MIN_TREND_POINTS = 4;

export interface TrendPoint {
  /** ms since epoch */
  at: number;
  /** Best e1RM (kg) that session for weightlifting, best Rank Score for calisthenics. */
  value: number;
}

export type Eta =
  { status: 'ok'; days: number } | { status: 'need_more_sessions' | 'not_trending' | 'at_top' };

export interface Prediction {
  rankKey: RankKey;
  next: { tier: Tier; division: Division | null } | null;
  targetScore: number | null;
  /** Weightlifting: e1RM needed and the load for 1, 3, 5 and 8 reps. */
  e1rmKg: number | null;
  loads: { reps: number; kg: number }[];
  /** Calisthenics: clean reps, added kg for 1/3/5/8 reps, or hold seconds needed. */
  reps: number | null;
  addedLoads: { reps: number; kg: number }[];
  seconds: number | null;
  eta: Eta;
}

const ceilHalf = (kg: number) => Math.ceil(kg * 2 - 1e-9) / 2;

/** Least-squares slope and value now; null with too few points. */
export function linearTrend(
  points: readonly TrendPoint[],
  now: number,
): { slopePerDay: number; valueNow: number } | null {
  const recent = points.filter((p) => p.at >= now - TREND_DAYS * 86_400_000 && p.at <= now);
  if (recent.length < MIN_TREND_POINTS) return null;
  const xs = recent.map((p) => (p.at - now) / 86_400_000);
  const ys = recent.map((p) => p.value);
  const n = recent.length;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let sxy = 0;
  let sxx = 0;
  for (let i = 0; i < n; i += 1) {
    sxy += ((xs[i] ?? 0) - mx) * ((ys[i] ?? 0) - my);
    sxx += ((xs[i] ?? 0) - mx) ** 2;
  }
  if (sxx === 0) return { slopePerDay: 0, valueNow: my };
  const slope = sxy / sxx;
  return { slopePerDay: slope, valueNow: my - slope * mx };
}

function etaFor(points: readonly TrendPoint[], target: number, now: number): Eta {
  const trend = linearTrend(points, now);
  if (!trend) return { status: 'need_more_sessions' };
  if (trend.slopePerDay <= 0) return { status: 'not_trending' };
  return {
    status: 'ok',
    days: Math.max(0, Math.ceil((target - trend.valueNow) / trend.slopePerDay)),
  };
}

export interface PredictInput {
  config: RankConfig;
  rankKey: RankKey;
  score: number;
  sex: ProfileSex;
  ageFactor: number;
  bodyweightKg: number;
  history: readonly TrendPoint[];
  now: number;
}

export function predictLift(input: PredictInput): Prediction {
  const { config, rankKey, sex, bodyweightKg: bw, ageFactor } = input;
  const pos = tierFor(input.score, config.thresholds, config.settings.maxScore);
  const lift = config.lifts.find((l) => l.rankKey === rankKey);
  const empty: Prediction = {
    rankKey,
    next: pos.next,
    targetScore: pos.nextScore,
    e1rmKg: null,
    loads: [],
    reps: null,
    addedLoads: [],
    seconds: null,
    eta: { status: 'at_top' },
  };
  if (pos.nextScore === null || !lift) return empty;
  const target = pos.nextScore;
  const std = (metric: 'e1rm_ratio' | 'reps' | 'hold_seconds') =>
    resolveStandard(config.standards, rankKey, '', metric, sex, bw);

  const ratio = std('e1rm_ratio');
  const repsStd = std('reps');
  const hold = std('hold_seconds');
  const out: Prediction = { ...empty };

  if (lift.discipline === 'weightlifting' && ratio) {
    const e1rm = (valueForScore(ratio, target) * bw) / ageFactor;
    out.e1rmKg = Math.round(e1rm * 10) / 10;
    out.loads = PREDICTION_REPS.map((reps) => ({ reps, kg: ceilHalf(loadForE1rm(e1rm, reps)) }));
    out.eta = etaFor(input.history, e1rm, input.now);
    return out;
  }

  if (repsStd) out.reps = Math.ceil(valueForScore(repsStd, target) / ageFactor - 1e-9);
  if (ratio) {
    const system = (valueForScore(ratio, target) * bw) / ageFactor;
    out.addedLoads = PREDICTION_REPS.map((reps) => ({
      reps,
      kg: Math.max(0, ceilHalf(loadForE1rm(system, reps) - bw)),
    }));
  }
  if (hold) out.seconds = Math.ceil(valueForScore(hold, target) / ageFactor - 1e-9);
  out.eta = etaFor(input.history, target, input.now);
  return out;
}
