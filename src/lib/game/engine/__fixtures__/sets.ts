import type { EngineSet } from '../types';

let counter = 0;

/** A completed working set (bench 100 × 5 by default) with overridable fields. */
export function makeSet(patch: Partial<EngineSet> = {}): EngineSet {
  counter += 1;
  return {
    id: `set-${counter}`,
    workoutId: 'w1',
    exerciseId: 'bench',
    rankKey: 'benchPress',
    variant: '',
    logType: 'weight_reps',
    weightMode: 'absolute',
    setType: 'working',
    completed: true,
    failed: false,
    weightKg: 100,
    reps: 5,
    durationSec: null,
    at: 0,
    order: 0,
    ...patch,
  };
}

export const DAY = 86_400_000;
