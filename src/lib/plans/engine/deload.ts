import { defaultWeightMode } from '@/lib/routines/defaults';
import type { LogType } from '@/lib/exercises/taxonomy';
import type { RoutineExercise, RoutineSet } from '@/lib/routines/types';

/**
 * Deload: the last week of 6- and 8-week plans. Working sets drop to 60% (rounded, at least one),
 * every set stops 2 more reps short of failure, and top, back-off, failure and AMRAP sets become
 * plain working sets. Warm-ups and the cardio finisher stay. Loads come down to about 90% when the
 * session starts (progression.ts).
 */

export const DELOAD_SET_FACTOR = 0.6;

export function deloadSetCount(working: number): number {
  return Math.max(1, Math.round(working * DELOAD_SET_FACTOR));
}

function easier(set: RoutineSet, logType: LogType, newId: () => string): RoutineSet {
  const plain = set.setType === 'warmup' ? set.setType : 'working';
  const percent = set.weightMode === 'percent_of_top_set' || set.weightMode === 'percent_of_1rm';
  return {
    ...set,
    id: newId(),
    setType: plain,
    weightMode: percent ? defaultWeightMode(logType) : set.weightMode,
    weightPercent: percent ? null : set.weightPercent,
    rir: set.rir === null ? null : Math.min(4, set.rir + 2),
    rpe: set.rpe === null ? null : Math.max(5, set.rpe - 2),
  };
}

export function deloadExercises(
  exercises: readonly RoutineExercise[],
  logTypeOf: (exerciseId: string) => LogType,
  newId: () => string,
): RoutineExercise[] {
  return exercises.map((e) => {
    const logType = logTypeOf(e.exerciseId);
    const warmups = e.sets.filter((s) => s.setType === 'warmup');
    const working = e.sets.filter((s) => s.setType !== 'warmup');
    const kept = working.slice(0, deloadSetCount(working.length));
    return {
      ...e,
      id: newId(),
      sets: [...warmups, ...kept].map((s) => easier(s, logType, newId)),
    };
  });
}
