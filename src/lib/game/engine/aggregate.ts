import { muscleRegion, type Muscle, type MuscleRegion } from '../../exercises/taxonomy.ts';
import type { RankKey } from '../rankKeys.ts';
import { round2 } from './interpolate.ts';
import type { LiftMuscles, RankConfig } from './types.ts';

/**
 * Lift scores → muscle, region, overall and discipline scores (docs/RANK_SYSTEM.md §7–8). Mirrors
 * the aggregate steps of `public.rank_recompute_user`. Every level is rounded to 2 decimals before
 * the next one uses it, exactly as Postgres stores them.
 */

export interface Aggregate {
  muscles: Map<Muscle, number>;
  regions: Map<MuscleRegion, number>;
  /** Lifts with a score that went in. */
  liftCount: number;
  /** Regions trained as a primary mover by a scored lift (placement). */
  regionsCovered: Set<MuscleRegion>;
  /** Region-weighted score, or null when no region is ranked. */
  weighted: number | null;
}

/** Roles that count towards muscle ranks (stabilisers don't). */
const COUNTED_ROLES = new Set(['primary', 'secondary']);

export function aggregate(
  liftScores: ReadonlyMap<RankKey, number>,
  liftMuscles: LiftMuscles,
  config: RankConfig,
): Aggregate {
  const sums = new Map<Muscle, { weighted: number; weight: number }>();
  const regionsCovered = new Set<MuscleRegion>();
  for (const [key, score] of liftScores) {
    for (const m of liftMuscles[key] ?? []) {
      if (!COUNTED_ROLES.has(m.role)) continue;
      const entry = sums.get(m.muscle) ?? { weighted: 0, weight: 0 };
      entry.weighted += m.weight * score;
      entry.weight += m.weight;
      sums.set(m.muscle, entry);
      const region = muscleRegion(m.muscle);
      if (m.role === 'primary' && region) regionsCovered.add(region);
    }
  }

  const muscles = new Map<Muscle, number>();
  for (const [muscle, { weighted, weight }] of sums) {
    if (weight > 0) muscles.set(muscle, round2(weighted / weight));
  }

  const byRegion = new Map<MuscleRegion, number[]>();
  for (const [muscle, score] of muscles) {
    const region = muscleRegion(muscle);
    if (!region) continue;
    byRegion.set(region, [...(byRegion.get(region) ?? []), score]);
  }
  const regions = new Map<MuscleRegion, number>();
  for (const [region, scores] of byRegion) {
    regions.set(region, round2(scores.reduce((a, b) => a + b, 0) / scores.length));
  }

  let total = 0;
  let weight = 0;
  for (const [region, score] of regions) {
    const w = config.regionWeights[region];
    total += w * score;
    weight += w;
  }

  return {
    muscles,
    regions,
    liftCount: liftScores.size,
    regionsCovered,
    weighted: weight > 0 ? round2(total / weight) : null,
  };
}

export interface Placement {
  lifts: number;
  regions: number;
  needLifts: number;
  needRegions: number;
  placed: boolean;
}

/** Overall rank needs enough lifts across enough of the body ("Placement: 3/5 lifts"). */
export function placement(agg: Aggregate, config: RankConfig): Placement {
  const { placementLifts, placementRegions } = config.settings;
  return {
    lifts: agg.liftCount,
    regions: agg.regionsCovered.size,
    needLifts: placementLifts,
    needRegions: placementRegions,
    placed: agg.liftCount >= placementLifts && agg.regionsCovered.size >= placementRegions,
  };
}
