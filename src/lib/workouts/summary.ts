import type { Exercise } from '@/lib/exercises/types';
import { isWorkingSet } from '@/lib/routines/setRules';
import { muscleSets, type MuscleSets } from '@/lib/routines/summary';
import { fromKg, roundTo, type WeightUnit } from '@/lib/units';

import { estimateCalories } from './calories';
import type { WorkoutDoc, WorkoutExercise, WorkoutSet } from './types';

/**
 * Workout totals. The server computes the stored duration, volume and calories
 * (refresh_workout_totals in the workouts migration); these mirror it for the live preview and the
 * finish screen. Keep the two in step.
 */

/** A completed set that counts: done and not a warm-up. */
export function isCountedSet(set: Pick<WorkoutSet, 'completed' | 'setType'>): boolean {
  return set.completed && isWorkingSet(set);
}

/** Weight × reps over counted sets. Assisted sets add nothing (no added load). */
export function setVolumeKg(
  set: Pick<WorkoutSet, 'completed' | 'setType' | 'weightMode' | 'weightKg' | 'reps'>,
): number {
  if (!isCountedSet(set) || set.weightMode === 'assisted' || set.weightMode.startsWith('percent')) {
    return 0;
  }
  return (set.weightKg ?? 0) * (set.reps ?? 0);
}

export function workoutVolumeKg(exercises: readonly WorkoutExercise[]): number {
  const total = exercises.reduce(
    (sum, e) => sum + e.sets.reduce((s, set) => s + setVolumeKg(set), 0),
    0,
  );
  return roundTo(total, 0.01);
}

export function countedSets(exercises: readonly WorkoutExercise[]): number {
  return exercises.reduce((n, e) => n + e.sets.filter(isCountedSet).length, 0);
}

/** Elapsed seconds from start to end (or now while in progress), capped at a day like the server. */
export function elapsedSec(startedAt: string, endedAt: string | null, now = Date.now()): number {
  const end = endedAt ? Date.parse(endedAt) : now;
  return Math.min(86400, Math.max(0, Math.floor((end - Date.parse(startedAt)) / 1000)));
}

export type LibraryLookup = (
  exerciseId: string,
) => Pick<Exercise, 'muscles' | 'metValue'> | undefined;

export interface WorkoutSummary {
  durationSec: number;
  volumeKg: number;
  /** Completed working sets. */
  sets: number;
  /** Exercises with at least one completed set. */
  exercises: number;
  /** Estimated kcal, or null without a bodyweight or any counted sets. */
  calories: number | null;
  muscles: MuscleSets[];
}

export function summariseWorkout(
  doc: Pick<WorkoutDoc, 'exercises' | 'startedAt' | 'endedAt' | 'bodyweightKg'>,
  lookup: LibraryLookup,
  now = Date.now(),
): WorkoutSummary {
  const durationSec = elapsedSec(doc.startedAt, doc.endedAt, now);
  const perExercise = doc.exercises.map((e) => ({
    exerciseId: e.exerciseId,
    workingSets: e.sets.filter(isCountedSet).length,
  }));
  return {
    durationSec,
    volumeKg: workoutVolumeKg(doc.exercises),
    sets: perExercise.reduce((n, e) => n + e.workingSets, 0),
    exercises: doc.exercises.filter((e) => e.sets.some((s) => s.completed)).length,
    calories: estimateCalories({
      durationSec,
      bodyweightKg: doc.bodyweightKg,
      exercises: perExercise.map((e) => ({
        metValue: lookup(e.exerciseId)?.metValue ?? null,
        sets: e.workingSets,
      })),
    }),
    muscles: muscleSets(perExercise, lookup),
  };
}

/** Volume for display, with Indian digit grouping: "1,200 kg", "1,25,000 kg". */
export function formatVolume(kg: number, unit: WeightUnit): string {
  return `${fromKg(kg, unit, 1).toLocaleString('en-IN')} ${unit}`;
}
