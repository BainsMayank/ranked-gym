import type { Equipment } from '@/lib/exercises/taxonomy';
import type { RoutineExercise, RoutineSet } from './types';

/**
 * Warm-up generator: 2–4 sets ramping toward the first working set's weight.
 *
 * - Up to 1.5× the bar: 2 sets (50%, 75%). Up to 100 kg: 3 sets (45%, 65%, 85%). Heavier: 4 sets
 *   (40%, 55%, 70%, 85%). Reps fall as the weight rises.
 * - Weights round to what the equipment can load; barbells never go below the empty bar.
 * - Repeats and anything at or above the working weight are dropped.
 */

const RAMPS: Record<2 | 3 | 4, { pct: number; reps: number }[]> = {
  2: [
    { pct: 0.5, reps: 8 },
    { pct: 0.75, reps: 3 },
  ],
  3: [
    { pct: 0.45, reps: 8 },
    { pct: 0.65, reps: 5 },
    { pct: 0.85, reps: 2 },
  ],
  4: [
    { pct: 0.4, reps: 8 },
    { pct: 0.55, reps: 5 },
    { pct: 0.7, reps: 3 },
    { pct: 0.85, reps: 1 },
  ],
};

const STEP_KG: Record<Equipment, number> = {
  barbell: 2.5,
  dumbbell: 2.5,
  kettlebell: 4,
  machine: 5,
  cable: 5,
  smith: 5,
  bodyweight: 2.5,
  band: 2.5,
  other: 2.5,
};

export interface WarmupStep {
  weightKg: number;
  reps: number;
}

/** Nearest multiple of `step` (2.5 → 22.5, not 23), without float tails. */
function roundToStep(value: number, step: number): number {
  return Number((Math.round(value / step) * step).toFixed(2));
}

export function warmupCount(workingKg: number, barKg: number): 2 | 3 | 4 {
  if (workingKg <= barKg * 1.5) return 2;
  if (workingKg <= 100) return 3;
  return 4;
}

export function planWarmups(workingKg: number, equipment: Equipment, barKg = 20): WarmupStep[] {
  if (!(workingKg > 0)) return [];
  const step = STEP_KG[equipment];
  const floor = equipment === 'barbell' ? barKg : step;
  const out: WarmupStep[] = [];
  for (const { pct, reps } of RAMPS[warmupCount(workingKg, barKg)]) {
    const weightKg = Math.max(floor, roundToStep(workingKg * pct, step));
    if (weightKg >= workingKg) continue;
    if (out.some((s) => s.weightKg === weightKg)) continue;
    out.push({ weightKg, reps });
  }
  return out;
}

/** The set warm-ups ramp toward: the first non-warm-up set with an absolute weight. */
export function warmupTarget(sets: readonly RoutineSet[]): RoutineSet | null {
  const first = sets.find((s) => s.setType !== 'warmup');
  if (!first || first.weightMode !== 'absolute' || !(first.weightKg && first.weightKg > 0)) {
    return null;
  }
  return first;
}

/**
 * Replaces the exercise's warm-ups with freshly generated ones. Returns the exercise unchanged
 * when there is nothing to ramp toward. `newId` makes set ids (randomUUID in the app).
 */
export function applyWarmups(
  exercise: RoutineExercise,
  equipment: Equipment,
  barKg: number,
  newId: () => string,
): RoutineExercise {
  const target = warmupTarget(exercise.sets);
  if (!target) return exercise;
  const warmups: RoutineSet[] = planWarmups(target.weightKg!, equipment, barKg).map((w) => ({
    id: newId(),
    setType: 'warmup',
    targetType: 'reps',
    reps: w.reps,
    repsMin: null,
    repsMax: null,
    durationSec: null,
    distanceM: null,
    weightKg: w.weightKg,
    weightMode: 'absolute',
    weightPercent: null,
    rir: null,
    rpe: null,
    tempo: null,
  }));
  return {
    ...exercise,
    sets: [...warmups, ...exercise.sets.filter((s) => s.setType !== 'warmup')],
  };
}
