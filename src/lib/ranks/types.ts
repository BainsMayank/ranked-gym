import type { Rank } from '@/lib/game/ranks';
import type { PrKind } from '@/lib/game/engine/records';
import type { RankScope } from '@/lib/game/engine/types';
import type { RankTier } from '@/theme';

/**
 * What the server sends back about ranks and records (docs/RANK_SYSTEM.md). The app only displays
 * these; every value is computed in Postgres.
 */

export type { PrKind, RankScope };

export interface PersonalRecord {
  exerciseId: string;
  exerciseName: string;
  kind: PrKind;
  /** The load for reps-at-weight records (0 = bodyweight). */
  weightKg: number | null;
  value: number;
  previousValue: number;
  workoutSetId: string | null;
}

export type RankChangeKind = 'placed' | 'rank_up' | 'rank_down';

export interface RankChange {
  scope: RankScope;
  /** Rank key, muscle, region, or the scope name. */
  key: string;
  /** Lift name for lifts; the key otherwise (the app labels muscles and regions). */
  name: string;
  kind: RankChangeKind;
  from: Rank | null;
  to: Rank;
  score: number;
}

export interface Placement {
  lifts: number;
  regions: number;
  needLifts: number;
  needRegions: number;
  placed: boolean;
}

/** What a finished workout earned (save_workout's `rewards`). */
export interface WorkoutRewards {
  workoutId: string;
  prs: PersonalRecord[];
  /** Exercises done for the first time: their numbers are the baseline for future records. */
  baselines: number;
  rankChanges: RankChange[];
  placement: Placement | null;
  /** Weighted sets didn't rank because there's no weigh-in within 30 days. */
  needsBodyweight: boolean;
  /** Sets held back for review (they looked impossible). */
  flagged: number;
  /** XP lands in Phase 11. */
  xpPlaceholder: null;
}

export interface CurrentRank {
  scope: RankScope;
  key: string;
  score: number | null;
  rank: Rank | null;
  status: 'ranked' | 'placement';
  lastSetAt: string | null;
  inactive: boolean;
}

export type PredictionEta =
  { status: 'ok'; days: number } | { status: 'need_more_sessions' | 'not_trending' | 'at_top' };

export interface RankPrediction {
  rankKey: string;
  score: number;
  next: Rank | null;
  targetScore: number | null;
  e1rmKg: number | null;
  loads: { reps: number; kg: number }[];
  reps: number | null;
  addedLoads: { reps: number; kg: number }[];
  seconds: number | null;
  eta: PredictionEta;
  needsBodyweight: boolean;
  bodyweightStale: boolean;
}

export type { RankTier };
