import type { Exercise } from '@/lib/exercises/types';
import type { Muscle } from '@/lib/exercises/taxonomy';

import { estimateDurationMin } from './duration';
import { countWorkingSets } from './setRules';
import type { RoutineExercise } from './types';

export type ExerciseLookup = (exerciseId: string) => Pick<Exercise, 'muscles'> | undefined;

export interface MuscleSets {
  muscle: Muscle;
  /** Working sets weighted by the muscle's share (primary 1, secondary 0.5 or 0.25). */
  sets: number;
}

/**
 * Weighted working sets per muscle, most first. Warm-ups never count; stabilisers are left out
 * (they barely add training volume).
 */
export function muscleSets(
  exercises: readonly { exerciseId: string; workingSets: number }[],
  lookup: ExerciseLookup,
): MuscleSets[] {
  const totals = new Map<Muscle, number>();
  for (const { exerciseId, workingSets } of exercises) {
    if (workingSets === 0) continue;
    for (const m of lookup(exerciseId)?.muscles ?? []) {
      if (m.role === 'stabiliser') continue;
      totals.set(m.muscle, (totals.get(m.muscle) ?? 0) + workingSets * m.weight);
    }
  }
  return [...totals]
    .map(([muscle, sets]) => ({ muscle, sets: Math.round(sets * 100) / 100 }))
    .sort((a, b) => b.sets - a.sets || a.muscle.localeCompare(b.muscle));
}

export interface RoutineSummary {
  exerciseCount: number;
  totalSets: number;
  workingSets: number;
  durationMin: number;
  muscles: MuscleSets[];
}

export function summariseRoutine(
  exercises: readonly RoutineExercise[],
  lookup: ExerciseLookup,
): RoutineSummary {
  const perExercise = exercises.map((e) => ({
    exerciseId: e.exerciseId,
    workingSets: countWorkingSets(e.sets),
  }));
  return {
    exerciseCount: exercises.length,
    totalSets: exercises.reduce((n, e) => n + e.sets.length, 0),
    workingSets: perExercise.reduce((n, e) => n + e.workingSets, 0),
    durationMin: estimateDurationMin(exercises),
    muscles: muscleSets(perExercise, lookup),
  };
}

/** "1 set" / "4 sets", "2.5 sets" for weighted counts. */
export function formatSetCount(n: number): string {
  const value = Number.isInteger(n) ? String(n) : String(Math.round(n * 10) / 10);
  return `${value} ${n === 1 ? 'set' : 'sets'}`;
}
