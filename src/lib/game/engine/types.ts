/**
 * Types shared by the rank engine mirror (docs/RANK_SYSTEM.md).
 *
 * The engine itself runs in Postgres (`rank_recompute_user`); this folder is its TypeScript mirror,
 * used by tests, the standards seed, the fake-user generator and client previews. It must stay free
 * of React Native and `@/` imports so Node can run it (like rankKeys.ts).
 */
import type { LogType, Muscle, MuscleRegion, MuscleRole } from '../../exercises/taxonomy.ts';
import type { RankKey } from '../rankKeys.ts';

/** Same order as `rankTiers` in the theme (a test keeps them equal). */
export const TIERS = [
  'iron',
  'bronze',
  'silver',
  'gold',
  'platinum',
  'diamond',
  'master',
  'champion',
] as const;
export type Tier = (typeof TIERS)[number];

/** III is the lowest division of a tier, I the highest. Champion has none. */
export type Division = 3 | 2 | 1;

export type StandardsSex = 'male' | 'female';
/** What a profile stores. 'unspecified' ranks on the average of both curves. */
export type ProfileSex = StandardsSex | 'unspecified';

/**
 * What a standard measures:
 * - `e1rm_ratio`: estimated 1RM ÷ bodyweight. For bodyweight lifts the load is bodyweight + added.
 * - `reps`: clean reps in one set (bodyweight, nothing added).
 * - `hold_seconds`: the longest hold of a static skill.
 */
export const standardMetrics = ['e1rm_ratio', 'reps', 'hold_seconds'] as const;
export type StandardMetric = (typeof standardMetrics)[number];

export const disciplines = ['weightlifting', 'calisthenics'] as const;
export type Discipline = (typeof disciplines)[number];

export const rankScopes = [
  'lift',
  'muscle',
  'region',
  'overall',
  'weightlifting',
  'calisthenics',
] as const;
export type RankScope = (typeof rankScopes)[number];

/** One row of `strength_standards`. */
export interface StandardRow {
  rankKey: RankKey;
  /** '' for the lift itself; the exercise slug for a skill progression (rank_variants). */
  variant: string;
  sex: StandardsSex;
  bwMin: number;
  bwMax: number;
  metric: StandardMetric;
  /** Rank Scores the values below sit at, rising. Usually the tier floors 100 … 950. */
  anchorScores: readonly number[];
  /** The metric value needed for each anchor score, rising. */
  anchorValues: readonly number[];
  /** Highest score this row can give (a progression can't outrank the full skill). */
  maxScore: number;
}

/** One row of `rank_lifts`: how a rank key is scored and when a set looks impossible. */
export interface RankLiftConfig {
  rankKey: RankKey;
  name: string;
  discipline: Discipline;
  /** Flag sets whose e1RM ÷ bodyweight is above this. */
  maxRatio: number | null;
  /** Flag bodyweight sets with more reps than this. */
  maxReps: number | null;
  /** Flag holds longer than this. */
  maxHoldSec: number | null;
}

/** `rank_variants`: a skill progression that ranks into its parent skill. */
export interface RankVariant {
  slug: string;
  rankKey: RankKey;
}

export interface Threshold {
  tier: Tier;
  division: Division | null;
  minScore: number;
}

export interface AgeBracket {
  minAge: number;
  /** Inclusive; null = no upper bound. */
  maxAge: number | null;
  factor: number;
}

export interface RankSettings {
  windowDays: number;
  inactiveDays: number;
  placementLifts: number;
  placementRegions: number;
  disciplineMinLifts: number;
  bwWindowDays: number;
  maxScore: number;
}

/** Everything the engine needs besides the user's data (one standards version). */
export interface RankConfig {
  version: number;
  settings: RankSettings;
  thresholds: readonly Threshold[];
  regionWeights: Readonly<Record<MuscleRegion, number>>;
  ageBrackets: readonly AgeBracket[];
  lifts: readonly RankLiftConfig[];
  variants: readonly RankVariant[];
  standards: readonly StandardRow[];
}

/** Muscles of the exercise that carries a rank key (exercise_muscles). */
export interface LiftMuscle {
  muscle: Muscle;
  role: MuscleRole;
  weight: number;
}

export type LiftMuscles = Partial<Record<RankKey, readonly LiftMuscle[]>>;

/** A completed set as the engine sees it. */
export interface EngineSet {
  id: string;
  workoutId: string;
  exerciseId: string;
  /** Null for exercises that never rank. */
  rankKey: RankKey | null;
  /** Skill progression slug, '' otherwise. */
  variant: string;
  logType: LogType;
  weightMode: 'absolute' | 'bodyweight' | 'assisted' | 'percent_of_1rm' | 'percent_of_top_set';
  setType: 'warmup' | 'working' | 'top' | 'backoff' | 'drop' | 'failure' | 'amrap';
  completed: boolean;
  failed: boolean;
  weightKg: number | null;
  reps: number | null;
  durationSec: number | null;
  /** When it was done (ms since epoch). */
  at: number;
  /** Order inside the workout, for ties. */
  order: number;
}

export interface BodyweightLog {
  weightKg: number;
  /** ms since epoch */
  at: number;
}
