import { muscleShortLabels, musclesWithRole, type Exercise, type LogType } from '@/lib/exercises';

import type { PlannedSet, RoutineExercise } from './mocks';

const loadLabels: Partial<Record<LogType, string>> = {
  bodyweight_reps: 'BW',
  weighted_bodyweight: 'Added kg',
  assisted_bodyweight: 'Assist kg',
  duration: 'Added kg',
  distance_duration: 'km',
};

/**
 * A library exercise as a routine entry with three empty working sets. Phase 3 replaces the mock
 * shape with the stored routine model.
 */
export function routineExerciseFromLibrary(exercise: Exercise): RoutineExercise {
  const timed = exercise.logType === 'duration' || exercise.logType === 'distance_duration';
  const set: PlannedSet = { type: 'working', kg: '–', reps: timed ? '0:30' : '8–12', effort: '2' };
  return {
    id: exercise.id,
    name: exercise.name,
    muscles: musclesWithRole(exercise, 'primary')
      .map((m) => muscleShortLabels[m])
      .join(' · '),
    mode: timed ? 'time' : 'range',
    effort: 'RIR',
    rest: exercise.mechanic === 'compound' ? '2:30' : '1:30',
    loadLabel: loadLabels[exercise.logType],
    repsLabel: timed ? 'Time' : undefined,
    sets: [set, set, set],
  };
}
