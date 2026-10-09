import type { RankKey } from '../rankKeys.ts';
import { rankE1rm } from './e1rm.ts';
import { clamp, interpolate, lerp } from './interpolate.ts';
import type {
  AgeBracket,
  BodyweightLog,
  EngineSet,
  ProfileSex,
  RankConfig,
  StandardMetric,
  StandardRow,
  StandardsSex,
} from './types.ts';

/**
 * Scoring one set against the strength standards (docs/RANK_SYSTEM.md §4–5). Mirrors
 * `public.rank_standard_at`, `public.rank_metric_score` and `public.rank_set_score`.
 */

/** A standard resolved for one lifter: anchor values at their bodyweight and sex. */
export interface ResolvedStandard {
  scores: readonly number[];
  values: readonly number[];
  maxScore: number;
}

/** Age in whole years from a birth year (the app only stores the year). */
export function ageFromBirthYear(birthYear: number | null, now: Date): number | null {
  return birthYear === null ? null : now.getUTCFullYear() - birthYear;
}

/** The age multiplier on the measured value; 1 when the age is unknown. */
export function ageFactor(age: number | null, brackets: readonly AgeBracket[]): number {
  if (age === null) return 1;
  const bracket = brackets.find((b) => age >= b.minAge && (b.maxAge === null || age <= b.maxAge));
  return bracket?.factor ?? 1;
}

/** Anchor values for one sex at a bodyweight, blended between bodyweight-band centres. */
function valuesForSex(rows: readonly StandardRow[], bw: number): number[] | null {
  const sorted = [...rows].sort((a, b) => a.bwMin - b.bwMin);
  const first = sorted[0];
  if (!first) return null;
  const centre = (r: StandardRow) => (r.bwMin + r.bwMax) / 2;
  if (sorted.length === 1 || bw <= centre(first)) return [...first.anchorValues];
  for (let i = 0; i < sorted.length - 1; i += 1) {
    const lo = sorted[i];
    const hi = sorted[i + 1];
    if (!lo || !hi) break;
    if (bw <= centre(hi)) {
      const t = (bw - centre(lo)) / (centre(hi) - centre(lo));
      return lo.anchorValues.map((v, k) => lerp(v, hi.anchorValues[k] ?? v, t));
    }
  }
  return [...(sorted[sorted.length - 1]?.anchorValues ?? [])];
}

/**
 * The standard a lifter is judged on. "Rather not say" uses the average of the men's and women's
 * values at the same bodyweight. Null when the lift has no standard for this metric.
 */
export function resolveStandard(
  standards: readonly StandardRow[],
  rankKey: RankKey,
  variant: string,
  metric: StandardMetric,
  sex: ProfileSex,
  bodyweightKg: number,
): ResolvedStandard | null {
  const rows = standards.filter(
    (r) => r.rankKey === rankKey && r.variant === variant && r.metric === metric,
  );
  const forSex = (s: StandardsSex) => rows.filter((r) => r.sex === s);
  const template = rows[0];
  if (!template) return null;
  const sexes: StandardsSex[] = sex === 'unspecified' ? ['male', 'female'] : [sex];
  const curves = sexes.map((s) => valuesForSex(forSex(s), bodyweightKg));
  if (curves.some((c) => c === null)) return null;
  const values = template.anchorValues.map(
    (_, k) => curves.reduce((sum, c) => sum + (c?.[k] ?? 0), 0) / curves.length,
  );
  return { scores: template.anchorScores, values, maxScore: template.maxScore };
}

/** Rank Score for a measured value (already age-adjusted). */
export function scoreForValue(std: ResolvedStandard, value: number, cap = 1000): number {
  return clamp(interpolate(value, std.values, std.scores), 0, Math.min(std.maxScore, cap));
}

/** The value needed for a Rank Score (inverse of scoreForValue). */
export function valueForScore(std: ResolvedStandard, score: number): number {
  return interpolate(score, std.scores, std.values);
}

/** The weigh-in closest to a moment, within ± windowDays (a later one wins a tie). */
export function closestBodyweight(
  logs: readonly BodyweightLog[],
  at: number,
  windowDays: number,
): number | null {
  const windowMs = windowDays * 86_400_000;
  let best: BodyweightLog | null = null;
  for (const log of logs) {
    const diff = Math.abs(log.at - at);
    if (diff > windowMs) continue;
    const bestDiff = best ? Math.abs(best.at - at) : Infinity;
    if (diff < bestDiff || (diff === bestDiff && best && log.at > best.at)) best = log;
  }
  return best?.weightKg ?? null;
}

const BODYWEIGHT_LOG_TYPES = new Set(['bodyweight_reps', 'weighted_bodyweight']);

/** Can this set ever rank? (Warm-ups, failed, assisted and unranked exercises can't.) */
export function isRankEligible(set: EngineSet): boolean {
  return (
    set.rankKey !== null &&
    set.completed &&
    !set.failed &&
    set.setType !== 'warmup' &&
    set.weightMode !== 'assisted' &&
    set.logType !== 'assisted_bodyweight'
  );
}

export interface SetScore {
  score: number | null;
  /** A weighted set that could rank but has no weigh-in within the window. */
  needsBodyweight: boolean;
}

export interface Lifter {
  sex: ProfileSex;
  /** Age multiplier (ageFactor). */
  ageFactor: number;
}

/** Rank Score of one set, at the lifter's bodyweight on the day (null bw = no weigh-in near it). */
export function scoreSet(
  config: RankConfig,
  set: EngineSet,
  lifter: Lifter,
  bodyweightKg: number | null,
): SetScore {
  const none: SetScore = { score: null, needsBodyweight: false };
  if (!isRankEligible(set) || set.rankKey === null) return none;
  const key = set.rankKey;
  const cap = config.settings.maxScore;
  const std = (metric: StandardMetric, bw: number) =>
    resolveStandard(config.standards, key, set.variant, metric, lifter.sex, bw);

  if (set.logType === 'weight_reps') {
    if (set.weightMode !== 'absolute') return none;
    const e1rm = rankE1rm(set.weightKg, set.reps);
    if (e1rm === null) return none;
    if (bodyweightKg === null) return { score: null, needsBodyweight: true };
    const s = std('e1rm_ratio', bodyweightKg);
    if (!s) return none;
    return {
      score: scoreForValue(s, (e1rm * lifter.ageFactor) / bodyweightKg, cap),
      needsBodyweight: false,
    };
  }

  if (BODYWEIGHT_LOG_TYPES.has(set.logType)) {
    const added = Math.max(0, set.weightKg ?? 0);
    const reps = set.reps ?? 0;
    if (reps < 1) return none;
    const candidates: number[] = [];
    const repsStd = std('reps', bodyweightKg ?? 0);
    if (repsStd) candidates.push(scoreForValue(repsStd, reps * lifter.ageFactor, cap));
    const hasRatio = config.standards.some(
      (r) => r.rankKey === key && r.variant === set.variant && r.metric === 'e1rm_ratio',
    );
    let needsBodyweight = false;
    if (hasRatio) {
      if (bodyweightKg === null) {
        needsBodyweight = added > 0;
      } else {
        const e1rm = rankE1rm(bodyweightKg + added, reps);
        const ratioStd = std('e1rm_ratio', bodyweightKg);
        if (e1rm !== null && ratioStd) {
          candidates.push(scoreForValue(ratioStd, (e1rm * lifter.ageFactor) / bodyweightKg, cap));
        }
      }
    }
    if (candidates.length === 0) return { score: null, needsBodyweight };
    return { score: Math.max(...candidates), needsBodyweight: false };
  }

  if (set.logType === 'duration') {
    const seconds = set.durationSec ?? 0;
    if (seconds <= 0) return none;
    const s = std('hold_seconds', 0);
    if (!s) return none;
    return { score: scoreForValue(s, seconds * lifter.ageFactor, cap), needsBodyweight: false };
  }

  return none;
}
