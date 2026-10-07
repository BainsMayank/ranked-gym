import { rankTiers, type RankTier } from '@/theme';

import type { RankKey } from './rankKeys';
import { DIVISIONS, hasDivisions, type Rank } from './ranks';

/**
 * Strength rank maths, as specified in docs/RANK_SYSTEM.md.
 *
 * This is the REFERENCE implementation: the Phase 6 rank engine (Postgres) mirrors these constants and
 * formulas and is the source of truth. The client uses this file only to preview ("lift 85 kg × 5 for
 * Gold III") and the tests pin the calibration so the two can't drift silently.
 *
 * One idea runs through it: every ranked lift converts to a Strength Score (SS) on the DOTS scale, so a
 * 60 kg lifter and a 100 kg lifter, a squat and a pull-up, all share one ladder.
 */

/** Which DOTS curve and lift ratios to use. Chosen at onboarding. */
export const standardsSexes = ['male', 'female'] as const;
export type StandardsSex = (typeof standardsSexes)[number];

/** DOTS polynomial coefficients (a + b·bw + c·bw² + d·bw³ + e·bw⁴) and the bodyweight range they're fitted for. */
const DOTS: Record<StandardsSex, { poly: readonly number[]; min: number; max: number }> = {
  male: {
    poly: [-307.75076, 24.0900756, -0.1918759221, 0.0007391293, -0.000001093],
    min: 40,
    max: 210,
  },
  female: {
    poly: [-57.96288, 13.6175032, -0.1126655495, 0.0005158568, -0.0000010706],
    min: 40,
    max: 150,
  },
};

/** DOTS coefficient: multiply a lifted load by this to compare lifters of any bodyweight. */
export function dotsCoefficient(bodyweightKg: number, sex: StandardsSex): number {
  const { poly, min, max } = DOTS[sex];
  const bw = Math.min(Math.max(bodyweightKg, min), max);
  const denominator = poly.reduce((sum, coef, power) => sum + coef * bw ** power, 0);
  return 500 / denominator;
}

/** Sets above this many reps still count, but only as if they were this many (keeps e1RM honest). */
export const MAX_COUNTED_REPS = 12;

/** Epley estimate. A single is taken as-is; reps above MAX_COUNTED_REPS are capped. */
export function estimateOneRepMax(loadKg: number, reps: number): number {
  if (reps < 1 || loadKg <= 0) return 0;
  if (reps === 1) return loadKg;
  return loadKg * (1 + Math.min(reps, MAX_COUNTED_REPS) / 30);
}

/** Movement patterns that make up the overall rank. */
export const movementPatterns = [
  'squat',
  'hinge',
  'horizontalPush',
  'verticalPush',
  'pull',
] as const;
export type MovementPattern = (typeof movementPatterns)[number];

/** Patterns needed before an overall rank is shown. */
export const MIN_PATTERNS_FOR_OVERALL = 3;

/**
 * Bodyweight-loaded lifts are judged on system load ÷ bodyweight (1.0 = one clean bodyweight rep), with
 * the ratio where each tier starts. Below Bronze, Iron runs from `iron` (heavily assisted) upward.
 */
type BodyweightRatios = Record<RankTier, number>;

type RankedLiftSpec = {
  name: string;
  /** Null when the lift feeds muscle ranks only (not the overall rank). */
  pattern: MovementPattern | null;
} & (
  | {
      /** Share of a powerlifting-total equivalent that this lift's 1RM represents. SS = e1RM × DOTS ÷ share. */
      share: Record<StandardsSex, number>;
    }
  | {
      /** Load is bodyweight plus added weight. Assistance is logged as negative added weight. */
      bodyweightRatios: Record<StandardsSex, BodyweightRatios>;
    }
);

const PULL_UP_RATIOS: Record<StandardsSex, BodyweightRatios> = {
  male: {
    iron: 0.4,
    bronze: 1,
    silver: 1.15,
    gold: 1.35,
    platinum: 1.55,
    diamond: 1.75,
    master: 2,
    champion: 2.3,
  },
  female: {
    iron: 0.3,
    bronze: 0.85,
    silver: 1,
    gold: 1.15,
    platinum: 1.3,
    diamond: 1.5,
    master: 1.7,
    champion: 1.95,
  },
};

const DIP_RATIOS: Record<StandardsSex, BodyweightRatios> = {
  male: {
    iron: 0.4,
    bronze: 1,
    silver: 1.2,
    gold: 1.4,
    platinum: 1.6,
    diamond: 1.85,
    master: 2.15,
    champion: 2.5,
  },
  female: {
    iron: 0.3,
    bronze: 0.8,
    silver: 1,
    gold: 1.15,
    platinum: 1.3,
    diamond: 1.5,
    master: 1.75,
    champion: 2,
  },
};

/**
 * Free-weight and bodyweight lifts with stable standards. Machines and cables don't rank (every machine
 * is different) but still earn XP, volume and records. Keyed by `RankKey` (rankKeys.ts); the other
 * rank keys get standards in Phase 6.
 */
export const rankedLifts = {
  backSquat: { name: 'Back squat', pattern: 'squat', share: { male: 0.35, female: 0.37 } },
  frontSquat: { name: 'Front squat', pattern: 'squat', share: { male: 0.285, female: 0.3 } },
  deadlift: { name: 'Deadlift', pattern: 'hinge', share: { male: 0.395, female: 0.415 } },
  sumoDeadlift: { name: 'Sumo deadlift', pattern: 'hinge', share: { male: 0.395, female: 0.415 } },
  trapBarDeadlift: {
    name: 'Trap bar deadlift',
    pattern: 'hinge',
    share: { male: 0.42, female: 0.44 },
  },
  romanianDeadlift: {
    name: 'Romanian deadlift',
    pattern: 'hinge',
    share: { male: 0.33, female: 0.35 },
  },
  hipThrust: { name: 'Hip thrust', pattern: null, share: { male: 0.5, female: 0.55 } },
  benchPress: {
    name: 'Bench press',
    pattern: 'horizontalPush',
    share: { male: 0.255, female: 0.215 },
  },
  inclineBench: {
    name: 'Incline bench press',
    pattern: 'horizontalPush',
    share: { male: 0.215, female: 0.18 },
  },
  closeGripBench: {
    name: 'Close-grip bench press',
    pattern: 'horizontalPush',
    share: { male: 0.23, female: 0.195 },
  },
  dumbbellBench: {
    name: 'Dumbbell bench press (per dumbbell)',
    pattern: 'horizontalPush',
    share: { male: 0.1, female: 0.085 },
  },
  dip: { name: 'Dip', pattern: 'horizontalPush', bodyweightRatios: DIP_RATIOS },
  overheadPress: {
    name: 'Overhead press',
    pattern: 'verticalPush',
    share: { male: 0.165, female: 0.135 },
  },
  pullUp: { name: 'Pull-up', pattern: 'pull', bodyweightRatios: PULL_UP_RATIOS },
  /** Chin-ups are a little easier, so each tier needs about 5% more. */
  chinUp: {
    name: 'Chin-up',
    pattern: 'pull',
    bodyweightRatios: {
      male: scaleRatios(PULL_UP_RATIOS.male, 1.05),
      female: scaleRatios(PULL_UP_RATIOS.female, 1.05),
    },
  },
  barbellRow: { name: 'Barbell row', pattern: 'pull', share: { male: 0.23, female: 0.2 } },
  barbellCurl: { name: 'Barbell curl', pattern: null, share: { male: 0.125, female: 0.1 } },
} as const satisfies Partial<Record<RankKey, RankedLiftSpec>>;

export type RankedLiftId = keyof typeof rankedLifts;

export interface LiftEntry {
  lift: RankedLiftId;
  /** Added load in kg. For bodyweight-loaded lifts: 0 for bodyweight, negative for assisted. */
  loadKg: number;
  reps: number;
  /** Bodyweight on the day of the set (latest weigh-in within WEIGH_IN_MAX_AGE_DAYS). */
  bodyweightKg: number;
  sex: StandardsSex;
}

/** A set can't rank without a weigh-in at most this old; the set is still logged and ranks once one exists. */
export const WEIGH_IN_MAX_AGE_DAYS = 30;

/**
 * Score where each tier starts. Calibrated so that, roughly: Bronze = novice (first months),
 * Silver = 6 months, Gold = intermediate (about a year), Platinum = 2 years of solid training,
 * Diamond = advanced, Master = elite / national level, Champion = international level and world records.
 */
export const TIER_FLOORS: Record<RankTier, number> = {
  iron: 0,
  bronze: 140,
  silver: 190,
  gold: 240,
  platinum: 290,
  diamond: 350,
  master: 430,
  champion: 520,
};

export interface LadderStep {
  rank: Rank;
  floor: number;
}

/**
 * Division floors that don't split their tier evenly, lowest division first. Iron IV catches the very
 * first sessions; Iron III to I sit close together so a beginner ranks up every few weeks.
 */
const CUSTOM_DIVISION_FLOORS: Partial<Record<RankTier, readonly number[]>> = {
  iron: [0, 80, 100, 120],
};

/** Every rank from Iron IV up, with the score it starts at. Divisions split their tier evenly unless overridden. */
export const LADDER: readonly LadderStep[] = rankTiers.flatMap((tier, i) => {
  const floor = TIER_FLOORS[tier];
  if (!hasDivisions(tier)) return [{ rank: { tier }, floor }];
  const next = rankTiers[i + 1];
  const width = (next ? TIER_FLOORS[next] : floor) - floor;
  const custom = CUSTOM_DIVISION_FLOORS[tier];
  return DIVISIONS.map((division, step) => ({
    rank: { tier, division },
    floor: custom?.[step] ?? floor + (width * step) / DIVISIONS.length,
  }));
});

export interface RankPosition {
  rank: Rank;
  /** 0–1 through the current division. 1 at Champion. */
  progress: number;
  /** Next rank up, or null at Champion. */
  next: Rank | null;
  /** Score still needed for the next rank, or null at Champion. */
  scoreToNext: number | null;
}

/** Where a score sits on the ladder. */
export function rankForScore(score: number): RankPosition {
  let current: LadderStep = { rank: { tier: 'iron', division: 4 }, floor: 0 };
  let next: LadderStep | undefined;
  for (const step of LADDER) {
    if (score < step.floor) {
      next = step;
      break;
    }
    current = step;
  }
  if (!next) return { rank: current.rank, progress: 1, next: null, scoreToNext: null };
  return {
    rank: current.rank,
    progress: (score - current.floor) / (next.floor - current.floor),
    next: next.rank,
    scoreToNext: next.floor - score,
  };
}

/** Score where a rank starts. */
export function floorForRank({ tier, division }: Rank): number {
  const step = LADDER.find(
    (s) => s.rank.tier === tier && (!hasDivisions(tier) || s.rank.division === division),
  );
  return step?.floor ?? TIER_FLOORS[tier];
}

function specOf(lift: RankedLiftId): RankedLiftSpec {
  return rankedLifts[lift];
}

function scaleRatios(ratios: BodyweightRatios, factor: number): BodyweightRatios {
  const scaled = { ...ratios };
  for (const tier of rankTiers) scaled[tier] = Math.round(ratios[tier] * factor * 100) / 100;
  return scaled;
}

type TierStep = readonly [lower: RankTier, upper: RankTier];

/** Consecutive tiers, Iron→Bronze up to Master→Champion. The last step extends past Champion. */
const TIER_STEPS: readonly TierStep[] = rankTiers
  .slice(1)
  .map((upper, i) => [rankTiers[i] ?? upper, upper] as const);
const TOP_STEP: TierStep = ['master', 'champion'];

/** Piecewise-linear map between ratio points and tier floors; extends Champion's last slope upward. */
function scoreFromRatio(ratio: number, ratios: BodyweightRatios): number {
  if (ratio <= ratios.iron) return 0;
  const [lo, hi] = TIER_STEPS.find(([, upper]) => ratio < ratios[upper]) ?? TOP_STEP;
  const slope = (TIER_FLOORS[hi] - TIER_FLOORS[lo]) / (ratios[hi] - ratios[lo]);
  return TIER_FLOORS[lo] + (ratio - ratios[lo]) * slope;
}

function ratioFromScore(score: number, ratios: BodyweightRatios): number {
  const [lo, hi] = TIER_STEPS.find(([, upper]) => score < TIER_FLOORS[upper]) ?? TOP_STEP;
  const slope = (ratios[hi] - ratios[lo]) / (TIER_FLOORS[hi] - TIER_FLOORS[lo]);
  return ratios[lo] + (score - TIER_FLOORS[lo]) * slope;
}

/** Strength Score of one set. Bodyweight lifts count the whole system load (you + added weight). */
export function strengthScore({ lift, loadKg, reps, bodyweightKg, sex }: LiftEntry): number {
  const spec = specOf(lift);
  if ('bodyweightRatios' in spec) {
    const e1rm = estimateOneRepMax(bodyweightKg + loadKg, reps);
    return scoreFromRatio(e1rm / bodyweightKg, spec.bodyweightRatios[sex]);
  }
  return (estimateOneRepMax(loadKg, reps) * dotsCoefficient(bodyweightKg, sex)) / spec.share[sex];
}

/**
 * The e1RM needed for a score (inverse of strengthScore), in kg on the bar. For bodyweight-loaded lifts
 * this is the ADDED load (negative means assistance). Powers "lift X for Gold III" predictions.
 */
export function loadForScore(
  lift: RankedLiftId,
  score: number,
  bodyweightKg: number,
  sex: StandardsSex,
): number {
  const spec = specOf(lift);
  if ('bodyweightRatios' in spec) {
    return ratioFromScore(score, spec.bodyweightRatios[sex]) * bodyweightKg - bodyweightKg;
  }
  return (score * spec.share[sex]) / dotsCoefficient(bodyweightKg, sex);
}

/** Records count in full for this long, then fade. */
export const RECORD_FULL_DAYS = 365;
/** Monthly fade after RECORD_FULL_DAYS, down to RECORD_FLOOR. */
export const RECORD_FADE_PER_MONTH = 0.01;
export const RECORD_FLOOR = 0.75;

/** How much an old record still counts: 1 for a year, then −1% a month, never below 75%. */
export function recordWeight(ageDays: number): number {
  if (ageDays <= RECORD_FULL_DAYS) return 1;
  const months = (ageDays - RECORD_FULL_DAYS) / 30;
  return Math.max(RECORD_FLOOR, 1 - months * RECORD_FADE_PER_MONTH);
}

/**
 * Overall score: the mean of each pattern's best score. Null until MIN_PATTERNS_FOR_OVERALL patterns are
 * ranked; while some patterns are missing the overall rank is shown as provisional.
 */
export function overallScore(
  patternScores: Partial<Record<MovementPattern, number>>,
): number | null {
  const scores = movementPatterns
    .map((p) => patternScores[p])
    .filter((s): s is number => s !== undefined);
  if (scores.length < MIN_PATTERNS_FOR_OVERALL) return null;
  return scores.reduce((sum, s) => sum + s, 0) / scores.length;
}
