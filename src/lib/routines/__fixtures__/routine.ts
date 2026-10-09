import type { RoutineExercise, RoutineSet } from '../types';

let n = 0;
/** Deterministic v4-shaped uuids for tests. */
export function testId(): string {
  n += 1;
  return `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
}

export function set(patch: Partial<RoutineSet> = {}): RoutineSet {
  return {
    id: testId(),
    setType: 'working',
    targetType: 'reps',
    reps: 10,
    repsMin: null,
    repsMax: null,
    durationSec: null,
    distanceM: null,
    weightKg: null,
    weightMode: 'absolute',
    weightPercent: null,
    rir: null,
    rpe: null,
    tempo: null,
    ...patch,
  };
}

export function exercise(patch: Partial<RoutineExercise> = {}): RoutineExercise {
  return {
    id: testId(),
    exerciseId: testId(),
    supersetGroup: null,
    restSeconds: 90,
    restAfterSupersetSeconds: null,
    notes: null,
    progressionRule: null,
    sets: [set(), set(), set()],
    ...patch,
  };
}
