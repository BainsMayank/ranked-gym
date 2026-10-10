import type { SetType } from '@/lib/routines/taxonomy';
import { formatDistanceKm, formatDuration } from '@/lib/routines/parse';
import { fromKg, type WeightUnit } from '@/lib/units';

import type { WorkoutSet } from './types';

/**
 * "Last time" values: what you did for each set the previous time you did this exercise. Sets are
 * matched by kind and position: the first warm-up to the first warm-up, the second working set to
 * the second working set (drop sets to drop sets), so adding a warm-up doesn't shift everything.
 */

export type PreviousSet = Pick<
  WorkoutSet,
  'setType' | 'weightMode' | 'reps' | 'weightKg' | 'durationSec' | 'distanceM' | 'rir' | 'rpe'
>;

type Kind = 'warmup' | 'drop' | 'work';

function kindOf(type: SetType): Kind {
  if (type === 'warmup') return 'warmup';
  if (type === 'drop') return 'drop';
  return 'work';
}

export function matchPrevious<T extends { setType: SetType }>(
  current: readonly T[],
  previous: readonly PreviousSet[],
): (PreviousSet | null)[] {
  const pools: Record<Kind, PreviousSet[]> = { warmup: [], drop: [], work: [] };
  for (const p of previous) pools[kindOf(p.setType)].push(p);
  const used: Record<Kind, number> = { warmup: 0, drop: 0, work: 0 };
  return current.map((s) => {
    const kind = kindOf(s.setType);
    return pools[kind][used[kind]++] ?? null;
  });
}

/** Short text for a previous set: "60 × 8", "+10 × 6", "0:45", "1.2 km". */
export function formatPrevious(p: PreviousSet, unit: WeightUnit): string {
  if (p.distanceM !== null && p.distanceM > 0) return `${formatDistanceKm(p.distanceM)} km`;
  if (p.durationSec !== null && p.reps === null) return formatDuration(p.durationSec);
  if (p.reps === null) return '';
  if (p.weightKg === null || (p.weightKg === 0 && p.weightMode !== 'absolute')) {
    return `${p.reps} ${p.reps === 1 ? 'rep' : 'reps'}`;
  }
  const w = fromKg(p.weightKg, unit, 0.25);
  const sign = p.weightMode === 'bodyweight' ? '+' : p.weightMode === 'assisted' ? '−' : '';
  return `${sign}${w} × ${p.reps}`;
}
