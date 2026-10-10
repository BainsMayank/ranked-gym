import {
  muscleLabels,
  regionLabels,
  type Muscle,
  type MuscleRegion,
} from '@/lib/exercises/taxonomy';
import { rankLabel } from '@/lib/game/ranks';
import type { RankScope } from '@/lib/game/engine/types';
import type { LiftBest, PredictionEta, RankLift, RankPrediction } from '@/lib/ranks';
import { formatWeight, fromKg, type WeightUnit } from '@/lib/units';

/** Copy for the Rank tab (Indian English, the user's weight unit). Display only. */

export const formatScore = (score: number) => Math.round(score).toLocaleString('en-IN');

const signed = (kg: number, unit: WeightUnit) => `+${fromKg(kg, unit, 0.5)} ${unit}`;

/** "e1RM 101 kg · 1.35× bodyweight", "+15 kg × 5", "12 reps", "20 s hold". */
export function liftBestLine(best: LiftBest | undefined, unit: WeightUnit): string | null {
  if (!best) return null;
  if (best.logType === 'duration') return best.durationSec ? `${best.durationSec} s hold` : null;
  if (best.logType === 'weight_reps') {
    if (best.e1rm === null) return null;
    const ratio = best.bodyweightKg
      ? ` · ${(best.e1rm / best.bodyweightKg).toFixed(2)}× bodyweight`
      : '';
    return `e1RM ${formatWeight(best.e1rm, unit, 0.5)}${ratio}`;
  }
  if (best.weightKg && best.weightKg > 0 && best.reps)
    return `${signed(best.weightKg, unit)} × ${best.reps}`;
  return best.reps ? `${best.reps} reps` : null;
}

const atFive = (loads: { reps: number; kg: number }[]) =>
  loads.find((l) => l.reps === 5) ?? loads[0] ?? null;

/** What the next division takes: "82.5 kg × 5", "14 reps", "+10 kg × 5", "a 30 s hold". */
export function targetPhrase(prediction: RankPrediction, unit: WeightUnit): string | null {
  const load = atFive(prediction.loads);
  if (load) return `${formatWeight(load.kg, unit, 0.5)} × ${load.reps}`;
  if (prediction.reps !== null) return `${prediction.reps} reps`;
  const added = atFive(prediction.addedLoads);
  if (added) return `${signed(added.kg, unit)} × ${added.reps}`;
  if (prediction.seconds !== null) return `a ${prediction.seconds} s hold`;
  return null;
}

/** "Next: Gold I at 82.5 kg × 5" (or reps, added load, a hold). */
export function nextTargetLine(
  prediction: RankPrediction | undefined,
  unit: WeightUnit,
): string | null {
  if (!prediction) return null;
  if (!prediction.next) return 'Top of the ladder';
  const next = rankLabel(prediction.next.tier, prediction.next.division);
  if (prediction.needsBodyweight) return `Next: ${next} · add a weigh-in to see the weight`;
  const phrase = targetPhrase(prediction, unit);
  return phrase ? `Next: ${next} at ${phrase}` : `Next: ${next}`;
}

/** "~3 wk", "~4 d", or why there's no estimate. */
export function etaText(eta: PredictionEta): string {
  switch (eta.status) {
    case 'ok':
      if (eta.days <= 1) return 'Next session';
      return eta.days < 14 ? `~${eta.days} d` : `~${Math.round(eta.days / 7)} wk`;
    case 'need_more_sessions':
      return 'Need more sessions';
    case 'not_trending':
      return 'Trend flat';
    case 'at_top':
      return 'At the top';
  }
}

/** Name of a rank scope for pickers and captions. */
export function scopeName(scope: RankScope, key: string, lifts: readonly RankLift[]): string {
  switch (scope) {
    case 'overall':
      return 'Overall';
    case 'weightlifting':
      return 'Weightlifting';
    case 'calisthenics':
      return 'Calisthenics';
    case 'region':
      return regionLabels[key as MuscleRegion] ?? key;
    case 'muscle':
      return muscleLabels[key as Muscle] ?? key;
    case 'lift':
      return lifts.find((l) => l.rankKey === key)?.name ?? key;
  }
}

/** Lift name from rank_lifts, falling back to the key. */
export const liftName = (key: string, lifts: readonly RankLift[]) =>
  lifts.find((l) => l.rankKey === key)?.name ?? key;
