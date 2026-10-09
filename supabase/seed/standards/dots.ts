/**
 * DOTS, the bodyweight coefficient powerlifting federations use for "best lifter" (IPF/USAPL).
 * Only the standards seed uses it now: it turns the v1 calibration (lift shares of a DOTS total) into
 * plain e1RM ÷ bodyweight anchors per bodyweight band. The rank engine never computes DOTS.
 */
import type { StandardsSex } from '../../../src/lib/game/engine/types.ts';

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

/** Multiply a lifted load by this to compare lifters of any bodyweight. */
export function dotsCoefficient(bodyweightKg: number, sex: StandardsSex): number {
  const { poly, min, max } = DOTS[sex];
  const bw = Math.min(Math.max(bodyweightKg, min), max);
  const denominator = poly.reduce((sum, coef, power) => sum + coef * bw ** power, 0);
  return 500 / denominator;
}

/**
 * The DOTS "Strength Score" (SS) each Rank Score anchor sits at, Bronze → Champion.
 *
 * The 2026-10-06 ladder used 140, 190, 240, 290, 350, 430, 520. The Phase 6 fake-user check
 * (supabase/seed/fakeUsers.ts, strength by years trained from ExRx-style tables) put most 1–2 year
 * lifters in Silver with those, against the goal of Gold–Platinum, so v1 of the standards eases the
 * middle of the ladder. For a 75 kg man's bench that's 43 → 59 → 73 → 89 → 110 → 139 → 178 kg.
 * World-record lifts at every bodyweight are still Champion (the tests check it).
 */
export const SS_AT_ANCHORS = [120, 165, 205, 250, 310, 390, 500] as const;

/** e1RM (kg) a lifter needs for a Strength Score on a lift with this share of a DOTS total. */
export function e1rmForStrengthScore(
  ss: number,
  share: number,
  bodyweightKg: number,
  sex: StandardsSex,
): number {
  return (ss * share) / dotsCoefficient(bodyweightKg, sex);
}
