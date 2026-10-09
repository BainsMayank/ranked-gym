/**
 * Strength standards and rank settings: the source of truth for the `strength_standards`,
 * `rank_lifts`, `rank_variants`, `rank_thresholds`, `rank_region_weights`, `strength_age_brackets`
 * and `rank_settings` rows. `pnpm standards:build` validates them and writes a migration that
 * upserts this version and makes it active (which queues every user for a recompute).
 *
 * To rebalance: edit the files in ./standards (or the settings below), bump STANDARDS_VERSION, run
 * `pnpm standards:build`, then `pnpm db:reset && pnpm db:test`. Rules in docs/RANK_SYSTEM.md.
 */
import type { MuscleRegion } from '../../src/lib/exercises/taxonomy.ts';
import { evenThresholds } from '../../src/lib/game/engine/tiers.ts';
import type {
  AgeBracket,
  LiftMuscles,
  RankConfig,
  RankLiftConfig,
  RankSettings,
  RankVariant,
  StandardRow,
  Tier,
} from '../../src/lib/game/engine/types.ts';
import type { ExerciseSeed } from './define.ts';
import { calisthenicsLifts, calisthenicsStandards } from './standards/calisthenics.ts';
import { shareLiftStandards, weightliftingLifts } from './standards/weightlifting.ts';

/** Version 1: the 2026-10 launch calibration. */
export const STANDARDS_VERSION = 1;

/**
 * Where each tier starts on the 0–1000 Rank Score. Standards put their anchors on these same
 * scores (Bronze … Champion), so "Gold" means the Gold anchor of every table.
 */
export const TIER_FLOORS: Record<Tier, number> = {
  iron: 0,
  bronze: 100,
  silver: 250,
  gold: 400,
  platinum: 550,
  diamond: 700,
  master: 850,
  champion: 950,
};

/** The anchor scores every full standard uses: Bronze to Champion. */
export const ANCHOR_SCORES = [100, 250, 400, 550, 700, 850, 950] as const;

export const RANK_SETTINGS: RankSettings = {
  windowDays: 180,
  inactiveDays: 60,
  placementLifts: 5,
  placementRegions: 4,
  disciplineMinLifts: 3,
  bwWindowDays: 30,
  maxScore: 1000,
};

/** How much each body region counts towards the overall rank (renormalised over ranked regions). */
export const REGION_WEIGHTS: Record<MuscleRegion, number> = {
  legs: 0.25,
  back: 0.2,
  chest: 0.2,
  shoulders: 0.15,
  arms: 0.1,
  core: 0.1,
};

/**
 * Age multipliers on the measured value (e1RM, reps or seconds), close to the McCulloch (masters)
 * and Foster (teen) coefficients. 18–34 is the reference.
 */
export const AGE_BRACKETS: AgeBracket[] = [
  { minAge: 0, maxAge: 15, factor: 1.15 },
  { minAge: 16, maxAge: 17, factor: 1.06 },
  { minAge: 18, maxAge: 34, factor: 1 },
  { minAge: 35, maxAge: 39, factor: 1.02 },
  { minAge: 40, maxAge: 49, factor: 1.08 },
  { minAge: 50, maxAge: 59, factor: 1.18 },
  { minAge: 60, maxAge: null, factor: 1.32 },
];

const liftConfigs: RankLiftConfig[] = [
  ...weightliftingLifts.map((l): RankLiftConfig => ({
    rankKey: l.rankKey,
    name: l.name,
    discipline: 'weightlifting',
    maxRatio: l.maxRatio,
    maxReps: null,
    maxHoldSec: null,
  })),
  ...calisthenicsLifts.map((l): RankLiftConfig => ({
    rankKey: l.rankKey,
    name: l.name,
    discipline: 'calisthenics',
    maxRatio: l.maxRatio,
    maxReps: l.maxReps,
    maxHoldSec: l.maxHoldSec ?? null,
  })),
];

const variants: RankVariant[] = calisthenicsLifts.flatMap((l) =>
  (l.progressions ?? []).map((p) => ({ slug: p.slug, rankKey: l.rankKey })),
);

const standards: StandardRow[] = [
  ...weightliftingLifts.flatMap((l) => shareLiftStandards(l, ANCHOR_SCORES)),
  ...calisthenicsLifts.flatMap((l) => calisthenicsStandards(l, ANCHOR_SCORES)),
];

export const rankConfig: RankConfig = {
  version: STANDARDS_VERSION,
  settings: RANK_SETTINGS,
  thresholds: evenThresholds(TIER_FLOORS),
  regionWeights: REGION_WEIGHTS,
  ageBrackets: AGE_BRACKETS,
  lifts: liftConfigs,
  variants,
  standards,
};

/** Muscles of each rank key's exercise, as the engine reads them from exercise_muscles. */
export function liftMusclesFromLibrary(library: readonly ExerciseSeed[]): LiftMuscles {
  const out: LiftMuscles = {};
  for (const e of library) {
    if (e.rankKey) out[e.rankKey] = e.muscles;
  }
  return out;
}
