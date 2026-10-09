import { rankE1rm } from '@/lib/game/engine/e1rm';

import type { WorkoutSet } from './types';

/**
 * Live estimated 1RM for a logged set (display only; ranks are computed on the server). The same
 * formula the rank engine uses (docs/RANK_SYSTEM.md §4), so what the logger shows is what ranks:
 *
 * - 1 rep: the weight itself.
 * - 2–10 reps: the average of Epley and Brzycki.
 * - Above 10 reps: no estimate (high-rep estimates drift too far from a real max).
 */
export function estimateE1rm(loadKg: number, reps: number): number | null {
  if (!Number.isFinite(loadKg)) return null;
  return rankE1rm(loadKg, Math.floor(reps));
}

/**
 * The estimate for a set as logged, or null when it doesn't apply: warm-ups, sets without a bar or
 * stack weight (bodyweight and assisted work), and sets missing a weight or reps.
 */
export function setE1rm(
  set: Pick<WorkoutSet, 'setType' | 'weightMode' | 'weightKg' | 'reps'>,
): number | null {
  if (set.setType === 'warmup' || set.weightMode !== 'absolute') return null;
  if (set.weightKg === null || set.reps === null) return null;
  return estimateE1rm(set.weightKg, set.reps);
}
