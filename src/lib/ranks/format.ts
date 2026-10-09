import {
  muscleLabels,
  regionLabels,
  type Muscle,
  type MuscleRegion,
} from '@/lib/exercises/taxonomy';
import { compareRanks } from '@/lib/game/ranks';
import { formatWeight, type WeightUnit } from '@/lib/units';

import type { PersonalRecord, RankChange } from './types';

/** Short copy for the summary screen (Indian English, units as the user prefers). */

const PR_LABELS: Record<PersonalRecord['kind'], string> = {
  e1rm: 'Estimated 1RM',
  weight: 'Heaviest weight',
  reps_at_weight: 'Most reps',
  set_volume: 'Best set volume',
  session_volume: 'Best session volume',
  hold: 'Longest hold',
};

export function prLabel(pr: PersonalRecord, unit: WeightUnit): string {
  if (pr.kind === 'reps_at_weight') {
    return pr.weightKg ? `Most reps at ${formatWeight(pr.weightKg, unit)}` : 'Most reps';
  }
  return PR_LABELS[pr.kind];
}

export function prValue(pr: PersonalRecord, unit: WeightUnit): { now: string; before: string } {
  switch (pr.kind) {
    case 'reps_at_weight':
      return { now: `${pr.value} reps`, before: `${pr.previousValue}` };
    case 'hold':
      return { now: `${pr.value} s`, before: `${pr.previousValue} s` };
    default:
      return { now: formatWeight(pr.value, unit), before: formatWeight(pr.previousValue, unit) };
  }
}

const SCOPE_ORDER: Record<RankChange['scope'], number> = {
  overall: 0,
  weightlifting: 1,
  calisthenics: 2,
  lift: 3,
  region: 4,
  muscle: 5,
};

export function changeName(change: RankChange): string {
  switch (change.scope) {
    case 'overall':
      return 'Overall';
    case 'weightlifting':
      return 'Weightlifting';
    case 'calisthenics':
      return 'Calisthenics';
    case 'muscle':
      return muscleLabels[change.key as Muscle] ?? change.key;
    case 'region':
      return regionLabels[change.key as MuscleRegion] ?? change.key;
    default:
      return change.name;
  }
}

/** Biggest news first: overall and disciplines, then lifts, regions and muscles; ups before downs. */
export function sortChanges(changes: readonly RankChange[]): RankChange[] {
  const weight = (c: RankChange) => (c.kind === 'rank_down' ? 1 : 0);
  return [...changes].sort(
    (a, b) =>
      weight(a) - weight(b) ||
      SCOPE_ORDER[a.scope] - SCOPE_ORDER[b.scope] ||
      compareRanks(b.to, a.to),
  );
}

/** The one change worth a full-screen reveal: the highest rank-up or first rank. */
export function headlineChange(changes: readonly RankChange[]): RankChange | null {
  return sortChanges(changes).find((c) => c.kind !== 'rank_down') ?? null;
}
