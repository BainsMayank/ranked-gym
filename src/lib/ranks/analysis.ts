import { muscleRegions, muscles, type Muscle, type MuscleRegion } from '@/lib/exercises/taxonomy';
import { isOptionalMuscle } from '@/lib/exercises/taxonomy';
import { rankTiers, type RankTier } from '@/theme';

import type { RankEvent } from './history';
import type { CurrentRank, RankPrediction } from './types';

/** Pure summaries of server rank data for the Analysis tab. Display only. */

export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
export const DAY_PARTS = ['Morning', 'Afternoon', 'Evening', 'Night'] as const;
export type DayPart = (typeof DAY_PARTS)[number];

/** Lift rank-ups (other scopes follow from them, so counting them too would double up). */
const isLiftRankUp = (e: RankEvent) => e.scope === 'lift' && e.kind === 'rank_up';

/** Monday-first weekday index in the device's time zone. */
const weekdayIndex = (iso: string) => (new Date(iso).getDay() + 6) % 7;

export function dayPart(hour: number): DayPart {
  if (hour >= 5 && hour < 12) return 'Morning';
  if (hour >= 12 && hour < 17) return 'Afternoon';
  if (hour >= 17 && hour < 21) return 'Evening';
  return 'Night';
}

export function rankUpsByWeekday(events: readonly RankEvent[]): number[] {
  const counts = WEEKDAYS.map(() => 0);
  for (const e of events) {
    if (isLiftRankUp(e)) counts[weekdayIndex(e.at)] = (counts[weekdayIndex(e.at)] ?? 0) + 1;
  }
  return counts;
}

export function rankUpsByDayPart(events: readonly RankEvent[]): number[] {
  const counts = DAY_PARTS.map(() => 0);
  for (const e of events) {
    if (!isLiftRankUp(e)) continue;
    const i = DAY_PARTS.indexOf(dayPart(new Date(e.at).getHours()));
    counts[i] = (counts[i] ?? 0) + 1;
  }
  return counts;
}

/** Index of the largest count, or null when every count is zero (ties go to the first). */
export function peakIndex(counts: readonly number[]): number | null {
  let best: number | null = null;
  counts.forEach((c, i) => {
    if (c > 0 && (best === null || c > (counts[best] ?? 0))) best = i;
  });
  return best;
}

export interface RegionShare {
  region: MuscleRegion;
  score: number;
  /** Share of the summed region scores (0–1). */
  share: number;
}

export function regionShares(ranks: readonly CurrentRank[]): RegionShare[] {
  const rows = muscleRegions.flatMap((region) => {
    const r = ranks.find((x) => x.scope === 'region' && x.key === region);
    return r?.score ? [{ region, score: r.score }] : [];
  });
  const total = rows.reduce((sum, r) => sum + r.score, 0);
  return rows
    .map((r) => ({ ...r, share: total > 0 ? r.score / total : 0 }))
    .sort((a, b) => b.share - a.share);
}

export interface TierCount {
  tier: RankTier | 'unranked';
  count: number;
}

/** How many of the 20 body-map muscles sit in each tier (unranked last). */
export function musclesByTier(ranks: readonly CurrentRank[]): TierCount[] {
  const shown = muscles.filter((m) => !isOptionalMuscle(m));
  const tiers = new Map<RankTier, number>();
  let unranked = 0;
  for (const m of shown) {
    const r = ranks.find((x) => x.scope === 'muscle' && x.key === m)?.rank;
    if (r) tiers.set(r.tier, (tiers.get(r.tier) ?? 0) + 1);
    else unranked += 1;
  }
  const out: TierCount[] = rankTiers.flatMap((t) => {
    const count = tiers.get(t) ?? 0;
    return count ? [{ tier: t, count }] : [];
  });
  return unranked ? [...out, { tier: 'unranked', count: unranked }] : out;
}

/** The lifts closest to their next division (smallest point gap first). */
export function closestPredictions(
  predictions: readonly RankPrediction[],
  limit = 5,
): RankPrediction[] {
  return predictions
    .filter((p) => p.next !== null && p.targetScore !== null)
    .sort((a, b) => (a.targetScore ?? 0) - a.score - ((b.targetScore ?? 0) - b.score))
    .slice(0, limit);
}

/** Rank by muscle key, for colouring the body map. */
export function muscleRanks(ranks: readonly CurrentRank[]): Partial<Record<Muscle, CurrentRank>> {
  const out: Partial<Record<Muscle, CurrentRank>> = {};
  for (const r of ranks) {
    if (r.scope === 'muscle' && (muscles as readonly string[]).includes(r.key)) {
      out[r.key as Muscle] = r;
    }
  }
  return out;
}

/** Lift scores by rank key. */
export function liftScores(ranks: readonly CurrentRank[]): Map<string, number> {
  return new Map(
    ranks.flatMap((r) => (r.scope === 'lift' && r.score !== null ? [[r.key, r.score]] : [])),
  );
}

/** Region scores by region. */
export function regionScores(ranks: readonly CurrentRank[]): Map<MuscleRegion, number> {
  return new Map(
    ranks.flatMap((r) =>
      r.scope === 'region' &&
      r.score !== null &&
      (muscleRegions as readonly string[]).includes(r.key)
        ? [[r.key as MuscleRegion, r.score]]
        : [],
    ),
  );
}

/** The current row for a scope (overall, weightlifting, calisthenics). */
export function scopeRank(ranks: readonly CurrentRank[] | undefined, scope: CurrentRank['scope']) {
  return ranks?.find((r) => r.scope === scope && r.key === scope) ?? null;
}
