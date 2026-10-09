import { testId } from '@/lib/routines/__fixtures__/routine';

import { emptySet } from '../session';
import type { WorkoutDoc, WorkoutExercise, WorkoutSet } from '../types';

export { testId };

export function wset(patch: Partial<WorkoutSet> = {}): WorkoutSet {
  return emptySet(testId(), patch);
}

export function wexercise(patch: Partial<WorkoutExercise> = {}): WorkoutExercise {
  return {
    id: testId(),
    exerciseId: testId(),
    supersetGroup: null,
    restSeconds: 90,
    restAfterSupersetSeconds: null,
    notes: null,
    sets: [wset(), wset(), wset()],
    ...patch,
  };
}

export function workout(patch: Partial<WorkoutDoc> = {}): WorkoutDoc {
  return {
    id: testId(),
    routineId: null,
    planDayId: null,
    name: 'Leg day',
    startedAt: '2026-10-07T06:00:00.000Z',
    endedAt: null,
    durationSec: null,
    notes: null,
    perceivedEffort: null,
    bodyweightKg: 72,
    caloriesEst: null,
    totalVolumeKg: 0,
    visibility: 'friends',
    status: 'in_progress',
    clientUpdatedAt: '2026-10-07T06:00:00.000Z',
    revision: 0,
    photoPath: null,
    exercises: [],
    ...patch,
  };
}
