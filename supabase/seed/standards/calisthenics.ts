/**
 * Calisthenics standards: bodyweight lifts and static skills.
 *
 * - **Reps** (`reps`): clean reps in one set at bodyweight. Most people's first goal is reps, and
 *   reps don't need a weigh-in. Values below 1 rep (0.5) only shape the curve, so one rep lands on
 *   the right tier (a woman's first pull-up is Silver, as it was in v1).
 * - **Weighted** (`e1rm_ratio`): (bodyweight + added) e1RM ÷ bodyweight, so +40 kg × 3 counts. The
 *   ratios carry over the v1 pull-up and dip tables. Up to 10 reps, the reps and ratio tables agree
 *   (10 bodyweight pull-ups score about the same either way); a set scores the better of the two.
 * - **Holds** (`hold_seconds`): the longest hold. Skill progressions (tuck, advanced tuck, straddle)
 *   rank into the full skill through `rank_variants`, each capped below the next progression, so a
 *   long tuck lever never outranks a short full one. Holds are the same for men and women: they
 *   depend on leverage and bodyweight ratio more than on absolute strength.
 *
 * Calisthenics standards don't change with bodyweight bands (one band covers everyone): reps and
 * holds already scale with the lifter's own weight. Sources: common skill progressions
 * (Overcoming Gravity, r/bodyweightfitness standards) and the v1 tables, as v1 estimates.
 */
import type { RankKey } from '../../../src/lib/game/rankKeys.ts';
import type { StandardRow, StandardsSex } from '../../../src/lib/game/engine/types.ts';

type BySex = Record<StandardsSex, readonly number[]>;

interface Curve {
  scores: readonly number[];
  values: readonly number[];
}

export interface Progression extends Curve {
  /** Exercise slug of the progression in the official library. */
  slug: string;
  maxScore: number;
}

export interface CalisthenicsLift {
  rankKey: RankKey;
  name: string;
  maxRatio: number | null;
  maxReps: number | null;
  maxHoldSec?: number | null;
  reps?: BySex;
  ratio?: BySex;
  hold?: Curve;
  progressions?: readonly Progression[];
}

const both = (values: readonly number[]): BySex => ({ male: values, female: values });

export const calisthenicsLifts: readonly CalisthenicsLift[] = [
  // ─── Pulls ───
  /**
   * Pull-up: a man's first strict rep is Bronze, 5 is Silver, ~11 is Gold, 22 is Diamond. Weighted:
   * at 75 kg, +75 kg for a single is Master (ratio 2.0). Women: first rep Silver, 8 Platinum.
   */
  {
    rankKey: 'pullUp',
    name: 'Pull-up',
    maxRatio: 3.2,
    maxReps: 80,
    reps: { male: [1, 5, 11, 16, 22, 30, 40], female: [0.5, 1, 4, 8, 12, 17, 24] },
    ratio: {
      male: [1, 1.15, 1.35, 1.55, 1.75, 2, 2.3],
      female: [0.85, 1, 1.15, 1.3, 1.5, 1.7, 1.95],
    },
  },
  /** Chin-up: the biceps help, so every tier needs ~5% more than the pull-up. */
  {
    rankKey: 'chinUp',
    name: 'Chin-up',
    maxRatio: 3.4,
    maxReps: 80,
    reps: { male: [1, 6, 12, 18, 24, 32, 43], female: [0.5, 1, 5, 9, 13, 19, 26] },
    ratio: {
      male: [1.05, 1.21, 1.42, 1.63, 1.84, 2.1, 2.42],
      female: [0.89, 1.05, 1.21, 1.37, 1.58, 1.79, 2.05],
    },
  },
  /**
   * Muscle-up: a skill gate more than a strength test. A man's first clean muscle-up is Platinum,
   * 10 in a row Master; for women the first one is Diamond. Values under 1 rep shape the lower tiers
   * (they're reached through pull-ups and dips instead).
   */
  {
    rankKey: 'muscleUp',
    name: 'Muscle-up',
    maxRatio: null,
    maxReps: 50,
    reps: { male: [0.2, 0.4, 0.7, 1, 5, 10, 20], female: [0.2, 0.35, 0.6, 0.85, 1, 4, 10] },
  },

  // ─── Pushes ───
  /**
   * Push-up: 5 clean reps (chest to fist height) is Bronze for men, 30 Gold, 60 Diamond. Women: 1 is
   * Bronze, 5 Silver, 15 Gold. Weighted push-ups (plate or vest) use the ratio table.
   */
  {
    rankKey: 'pushUp',
    name: 'Push-up',
    maxRatio: 4.5,
    maxReps: 200,
    reps: { male: [5, 15, 30, 45, 60, 80, 100], female: [1, 5, 15, 25, 35, 50, 70] },
    ratio: {
      male: [1.15, 1.5, 1.85, 2.1, 2.35, 2.7, 3],
      female: [1, 1.15, 1.5, 1.75, 2, 2.3, 2.6],
    },
  },
  /** Dip: first rep Bronze, 12 Gold, 28 Diamond for men. Weighted dips use the v1 dip ratios. */
  {
    rankKey: 'dip',
    name: 'Dip',
    maxRatio: 3.8,
    maxReps: 120,
    reps: { male: [1, 7, 12, 20, 28, 38, 50], female: [0.5, 1, 5, 10, 16, 22, 30] },
    ratio: {
      male: [1, 1.2, 1.4, 1.6, 1.85, 2.15, 2.5],
      female: [0.8, 1, 1.15, 1.3, 1.5, 1.75, 2],
    },
  },
  /**
   * Handstand push-up (wall, full range): the first rep is Gold for men and Platinum for women;
   * 15 strict reps is Master.
   */
  {
    rankKey: 'handstandPushUp',
    name: 'Handstand push-up',
    maxRatio: null,
    maxReps: 60,
    reps: { male: [0.3, 0.6, 1, 3, 8, 15, 25], female: [0.2, 0.4, 0.7, 1, 4, 10, 18] },
  },

  // ─── Legs ───
  /**
   * Pistol squat (reps per leg): one controlled rep is Bronze, 6 Gold, 15 Diamond for men. Holding a
   * kettlebell or plate uses the ratio table, which agrees with the reps table up to 10 reps.
   */
  {
    rankKey: 'pistolSquat',
    name: 'Pistol squat',
    maxRatio: 3,
    maxReps: 80,
    reps: { male: [1, 3, 6, 10, 15, 20, 30], female: [1, 2, 5, 8, 12, 18, 25] },
    ratio: {
      male: [1, 1.08, 1.18, 1.33, 1.6, 1.85, 2.1],
      female: [1, 1.05, 1.15, 1.25, 1.5, 1.75, 2],
    },
  },

  // ─── Skills (holds) ───
  /** L-sit: 10 s is Gold, 30 s Diamond, a minute Champion. Tuck L-sit tops out at Gold. */
  {
    rankKey: 'lSit',
    name: 'L-sit',
    maxRatio: null,
    maxReps: null,
    maxHoldSec: 180,
    hold: { scores: [100, 250, 400, 550, 700, 850, 950], values: [2, 5, 10, 20, 30, 45, 60] },
    progressions: [
      { slug: 'tuck-l-sit', scores: [100, 250, 400], values: [10, 30, 60], maxScore: 450 },
    ],
  },
  /**
   * Front lever: tuck (Bronze–Gold), advanced tuck (Silver–Platinum), straddle (Gold–Diamond), then
   * the full lever: 1 s is Diamond, 3 s Master, 15 s Champion.
   */
  {
    rankKey: 'frontLever',
    name: 'Front lever',
    maxRatio: null,
    maxReps: null,
    maxHoldSec: 120,
    hold: { scores: [700, 850, 950], values: [1, 3, 15] },
    progressions: [
      { slug: 'tuck-front-lever', scores: [100, 250, 400], values: [5, 15, 30], maxScore: 450 },
      {
        slug: 'advanced-tuck-front-lever',
        scores: [250, 400, 550],
        values: [5, 12, 25],
        maxScore: 600,
      },
      { slug: 'straddle-front-lever', scores: [400, 550, 700], values: [2, 6, 12], maxScore: 760 },
    ],
  },
  /** Back lever: easier than the front lever. Tuck up to Gold; full back lever 3 s is Platinum. */
  {
    rankKey: 'backLever',
    name: 'Back lever',
    maxRatio: null,
    maxReps: null,
    maxHoldSec: 180,
    hold: { scores: [550, 700, 850, 950], values: [3, 10, 20, 40] },
    progressions: [
      { slug: 'tuck-back-lever', scores: [100, 250, 400], values: [5, 15, 30], maxScore: 450 },
    ],
  },
  /**
   * Planche: the hardest skill here. Lean (Bronze–Silver), tuck (Silver–Platinum), advanced tuck
   * (Gold–Diamond), straddle (Diamond–Master), full planche Master and up.
   */
  {
    rankKey: 'planche',
    name: 'Planche',
    maxRatio: null,
    maxReps: null,
    maxHoldSec: 90,
    hold: { scores: [700, 850, 950], values: [0.5, 2, 10] },
    progressions: [
      { slug: 'planche-lean', scores: [100, 250], values: [10, 30], maxScore: 300 },
      { slug: 'tuck-planche', scores: [250, 400, 550], values: [3, 10, 20], maxScore: 600 },
      {
        slug: 'advanced-tuck-planche',
        scores: [400, 550, 700],
        values: [3, 8, 15],
        maxScore: 750,
      },
      { slug: 'straddle-planche', scores: [700, 850], values: [2, 8], maxScore: 900 },
    ],
  },
  /**
   * Handstand (freestanding): 10 s is Gold, 30 s Platinum, a minute Diamond. Against a wall it tops
   * out at Gold.
   */
  {
    rankKey: 'handstand',
    name: 'Handstand',
    maxRatio: null,
    maxReps: null,
    maxHoldSec: 600,
    hold: { scores: [250, 400, 550, 700, 850, 950], values: [3, 10, 30, 60, 90, 180] },
    progressions: [
      { slug: 'wall-handstand', scores: [100, 250, 400], values: [15, 45, 90], maxScore: 450 },
    ],
  },
];

const ALL_BODYWEIGHTS = { bwMin: 0, bwMax: 400 } as const;

/** strength_standards rows for one calisthenics lift (and its progressions). */
export function calisthenicsStandards(
  lift: CalisthenicsLift,
  anchorScores: readonly number[],
): StandardRow[] {
  const rows: StandardRow[] = [];
  const base = { rankKey: lift.rankKey, ...ALL_BODYWEIGHTS };
  for (const sex of ['male', 'female'] as const) {
    if (lift.reps) {
      rows.push({
        ...base,
        variant: '',
        sex,
        metric: 'reps',
        anchorScores,
        anchorValues: lift.reps[sex],
        maxScore: 1000,
      });
    }
    if (lift.ratio) {
      rows.push({
        ...base,
        variant: '',
        sex,
        metric: 'e1rm_ratio',
        anchorScores,
        anchorValues: lift.ratio[sex],
        maxScore: 1000,
      });
    }
    const holds: (Curve & { variant: string; maxScore: number })[] = [
      ...(lift.hold ? [{ ...lift.hold, variant: '', maxScore: 1000 }] : []),
      ...(lift.progressions ?? []).map((p) => ({ ...p, variant: p.slug })),
    ];
    for (const h of holds) {
      rows.push({
        ...base,
        variant: h.variant,
        sex,
        metric: 'hold_seconds',
        anchorScores: h.scores,
        anchorValues: both(h.values)[sex],
        maxScore: h.maxScore,
      });
    }
  }
  return rows;
}
