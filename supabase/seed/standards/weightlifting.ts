/**
 * Weightlifting standards: barbell and dumbbell lifts, judged on e1RM ÷ bodyweight.
 *
 * How the numbers are made. Each lift has a **share**: the part of a powerlifting-style DOTS total its
 * 1RM typically represents (back squat ≈ 35% for men). Each Rank Score anchor sits at a fixed DOTS
 * "Strength Score" (SS_AT_ANCHORS in dots.ts); for each bodyweight band we convert that score into
 * the e1RM a lifter of that bodyweight needs, divide by bodyweight, and store the ratio. DOTS already bends the curve so heavier lifters need more kg but a
 * lower multiple of bodyweight, which is what real strength tables show.
 *
 * Shares are v1 estimates from published standards (ExRx, Strength Level, Symmetric Strength) and
 * typical ratios between lifts (front squat ≈ 80–85% of back squat, close-grip ≈ 90% of bench…).
 * Check them against OpenPowerlifting and beta data before launch, then publish version 2.
 *
 * Dumbbell lifts are logged per dumbbell (the library tells users so), so their shares are per hand.
 * `maxRatio` is the guardrail: a set whose e1RM is more than this many times bodyweight is flagged
 * for review instead of ranking. It sits well above every world record at any bodyweight.
 */
import type { RankKey } from '../../../src/lib/game/rankKeys.ts';
import type { StandardRow, StandardsSex } from '../../../src/lib/game/engine/types.ts';
import { e1rmForStrengthScore, SS_AT_ANCHORS } from './dots.ts';

export interface ShareLift {
  rankKey: RankKey;
  name: string;
  share: Record<StandardsSex, number>;
  maxRatio: number;
}

export const weightliftingLifts: readonly ShareLift[] = [
  // ─── Squats ───
  /**
   * Back squat: the reference lower-body lift. 35% of a men's total and 37% of a women's (women's
   * totals lean more on the lower body). A 75 kg man needs about 100 kg for Gold, 190 kg for Master.
   */
  { rankKey: 'backSquat', name: 'Back squat', share: { male: 0.35, female: 0.37 }, maxRatio: 5 },
  /**
   * Front squat: about 81% of a back squat for trained lifters (the bar in front limits it), so the
   * share is 0.81 × the back squat's.
   */
  {
    rankKey: 'frontSquat',
    name: 'Front squat',
    share: { male: 0.285, female: 0.3 },
    maxRatio: 4.2,
  },
  /**
   * Bulgarian split squat, per dumbbell: one leg at a time with two dumbbells. Intermediate lifters
   * who squat ~120 kg use about 2 × 30–35 kg for a hard set of 6–8, so one dumbbell's e1RM is ~30% of
   * the back squat.
   */
  {
    rankKey: 'bulgarianSplitSquat',
    name: 'Bulgarian split squat (per dumbbell)',
    share: { male: 0.105, female: 0.11 },
    maxRatio: 2,
  },

  // ─── Hinges ───
  /** Deadlift: the heaviest of the three powerlifts, ~39.5% of a men's total and 41.5% of a women's. */
  { rankKey: 'deadlift', name: 'Deadlift', share: { male: 0.395, female: 0.415 }, maxRatio: 5.5 },
  /** Sumo deadlift: judged exactly like conventional; lifters pick the stance that suits them. */
  {
    rankKey: 'sumoDeadlift',
    name: 'Sumo deadlift',
    share: { male: 0.395, female: 0.415 },
    maxRatio: 5.5,
  },
  /** Trap bar deadlift: handles at the sides and a more upright back let most people lift ~6% more. */
  {
    rankKey: 'trapBarDeadlift',
    name: 'Trap bar deadlift',
    share: { male: 0.42, female: 0.44 },
    maxRatio: 5.8,
  },
  /** Romanian deadlift: no floor start and soft knees; usually ~80–85% of the conventional deadlift. */
  {
    rankKey: 'romanianDeadlift',
    name: 'Romanian deadlift',
    share: { male: 0.33, female: 0.35 },
    maxRatio: 4.5,
  },
  /**
   * Hip thrust: short range and a glute-only lockout, so loads run well above the squat (often
   * 1.3–1.5×). Women tend to hip thrust relatively more, hence the higher share.
   */
  { rankKey: 'hipThrust', name: 'Hip thrust', share: { male: 0.5, female: 0.55 }, maxRatio: 7 },
  /**
   * Power clean: speed-limited. Trained lifters clean ~70% of their back squat, so the share is
   * 0.7 × the squat's.
   */
  {
    rankKey: 'powerClean',
    name: 'Power clean',
    share: { male: 0.245, female: 0.26 },
    maxRatio: 3.5,
  },

  // ─── Horizontal presses ───
  /**
   * Bench press: the reference upper-body lift, ~25.5% of a men's total. Women bench relatively less
   * (21.5%) because upper-body strength differs more between the sexes than lower-body strength.
   */
  {
    rankKey: 'benchPress',
    name: 'Bench press',
    share: { male: 0.255, female: 0.215 },
    maxRatio: 4,
  },
  /** Incline bench: about 84% of the flat bench at a 30–45° bench. */
  {
    rankKey: 'inclineBench',
    name: 'Incline bench press',
    share: { male: 0.215, female: 0.18 },
    maxRatio: 3.6,
  },
  /** Close-grip bench: more triceps, shorter leverage; about 90% of the flat bench. */
  {
    rankKey: 'closeGripBench',
    name: 'Close-grip bench press',
    share: { male: 0.23, female: 0.195 },
    maxRatio: 3.8,
  },
  /**
   * Dumbbell bench, per dumbbell: two dumbbells together come to ~80% of a barbell bench (stability
   * costs strength), so one dumbbell is ~40%.
   */
  {
    rankKey: 'dumbbellBench',
    name: 'Dumbbell bench press (per dumbbell)',
    share: { male: 0.1, female: 0.085 },
    maxRatio: 1.8,
  },
  /** Incline dumbbell press, per dumbbell: ~85% of the flat dumbbell press. */
  {
    rankKey: 'inclineDumbbellBench',
    name: 'Incline dumbbell press (per dumbbell)',
    share: { male: 0.085, female: 0.072 },
    maxRatio: 1.6,
  },

  // ─── Vertical presses ───
  /** Overhead press: strict standing press, ~65% of the bench for men and a bit less for women. */
  {
    rankKey: 'overheadPress',
    name: 'Overhead press',
    share: { male: 0.165, female: 0.135 },
    maxRatio: 2.6,
  },
  /** Push press: the leg drive adds ~30% over a strict press. */
  {
    rankKey: 'pushPress',
    name: 'Push press',
    share: { male: 0.215, female: 0.175 },
    maxRatio: 3.2,
  },
  /**
   * Dumbbell shoulder press, per dumbbell: a pair comes to ~80% of the barbell press, so one dumbbell
   * is ~40% of it.
   */
  {
    rankKey: 'dumbbellShoulderPress',
    name: 'Dumbbell shoulder press (per dumbbell)',
    share: { male: 0.068, female: 0.055 },
    maxRatio: 1.2,
  },

  // ─── Rows and curls ───
  /** Barbell row: strict bent-over row, roughly 90% of the bench for most trained lifters. */
  { rankKey: 'barbellRow', name: 'Barbell row', share: { male: 0.23, female: 0.2 }, maxRatio: 3.5 },
  /** One-arm dumbbell row: braced on a bench, one dumbbell handles about half the barbell row. */
  {
    rankKey: 'dumbbellRow',
    name: 'Dumbbell row (per dumbbell)',
    share: { male: 0.115, female: 0.1 },
    maxRatio: 1.8,
  },
  /** Barbell curl: strict curl, about half the bench. */
  {
    rankKey: 'barbellCurl',
    name: 'Barbell curl',
    share: { male: 0.125, female: 0.1 },
    maxRatio: 2,
  },
  /** Dumbbell curl, per dumbbell: ~45% of the barbell curl (each arm works alone). */
  {
    rankKey: 'dumbbellCurl',
    name: 'Dumbbell curl (per dumbbell)',
    share: { male: 0.056, female: 0.045 },
    maxRatio: 1,
  },
];

/** Bodyweight bands. Values are computed at each band's centre and blended between centres. */
export const BODYWEIGHT_BANDS: Record<StandardsSex, readonly (readonly [number, number])[]> = {
  male: [
    [45, 55],
    [55, 65],
    [65, 75],
    [75, 85],
    [85, 95],
    [95, 105],
    [105, 120],
    [120, 140],
  ],
  female: [
    [40, 50],
    [50, 60],
    [60, 70],
    [70, 80],
    [80, 90],
    [90, 105],
    [105, 120],
  ],
};

const round3 = (n: number) => Math.round(n * 1000) / 1000;

/** strength_standards rows for a share-based lift: one per sex and bodyweight band. */
export function shareLiftStandards(
  lift: ShareLift,
  anchorScores: readonly number[],
): StandardRow[] {
  return (['male', 'female'] as const).flatMap((sex) =>
    BODYWEIGHT_BANDS[sex].map(([bwMin, bwMax]): StandardRow => {
      const centre = (bwMin + bwMax) / 2;
      return {
        rankKey: lift.rankKey,
        variant: '',
        sex,
        bwMin,
        bwMax,
        metric: 'e1rm_ratio',
        anchorScores,
        anchorValues: SS_AT_ANCHORS.map((ss) =>
          round3(e1rmForStrengthScore(ss, lift.share[sex], centre, sex) / centre),
        ),
        maxScore: 1000,
      };
    }),
  );
}
