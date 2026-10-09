import type { Division, Threshold, Tier } from './types.ts';
import { TIERS } from './types.ts';

/**
 * Tier and division for a Rank Score (docs/RANK_SYSTEM.md §2). Thresholds come from
 * `rank_thresholds`, so they can be rebalanced without an app update. Mirrors `public.rank_tier_for`.
 */

export interface TierPosition {
  tier: Tier;
  division: Division | null;
  /** 0–1 through the current division (1 at the very top). */
  progress: number;
  next: { tier: Tier; division: Division | null } | null;
  /** Score where the next division starts, or null at the top. */
  nextScore: number | null;
}

/** Thresholds lowest first. */
export function sortThresholds(thresholds: readonly Threshold[]): Threshold[] {
  return [...thresholds].sort((a, b) => a.minScore - b.minScore);
}

export function tierFor(
  score: number,
  thresholds: readonly Threshold[],
  maxScore = 1000,
): TierPosition {
  const sorted = sortThresholds(thresholds);
  let index = 0;
  for (let i = 0; i < sorted.length; i += 1) {
    if (score >= (sorted[i]?.minScore ?? Infinity)) index = i;
  }
  const current = sorted[index] ?? { tier: 'iron', division: 3, minScore: 0 };
  const next = sorted[index + 1] ?? null;
  const top = next?.minScore ?? maxScore;
  const width = top - current.minScore;
  return {
    tier: current.tier,
    division: current.division,
    progress: width > 0 ? Math.min(1, Math.max(0, (score - current.minScore) / width)) : 1,
    next: next ? { tier: next.tier, division: next.division } : null,
    nextScore: next?.minScore ?? null,
  };
}

/** Position on the whole ladder: Iron III = 0, rising by one per division. Mirrors `rank_ordinal`. */
export function ordinal(tier: Tier, division: Division | null): number {
  const base = TIERS.indexOf(tier) * 3;
  if (tier === 'champion' || division === null) return base;
  return base + (3 - division);
}

/** Default ladder: each tier starts at its anchor and splits into thirds (Champion undivided). */
export function evenThresholds(floors: Readonly<Record<Tier, number>>): Threshold[] {
  return TIERS.flatMap((tier, i): Threshold[] => {
    const floor = floors[tier];
    if (tier === 'champion') return [{ tier, division: null, minScore: floor }];
    const nextTier = TIERS[i + 1] ?? tier;
    const width = floors[nextTier] - floor;
    return ([3, 2, 1] as const).map((division, step) => ({
      tier,
      division,
      minScore: Math.round((floor + (width * step) / 3) * 100) / 100,
    }));
  });
}
