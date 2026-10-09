import type { Exercise } from '@/lib/exercises/types';
import type { LogType } from '@/lib/exercises/taxonomy';

import type { EffortMetric, WeightMode } from './taxonomy';
import type { RoutineDoc, RoutineExercise, RoutineSet } from './types';

/** How a log type carries load: plates on a bar, extra on bodyweight, or assistance. */
export function defaultWeightMode(logType: LogType): WeightMode {
  if (logType === 'weight_reps') return 'absolute';
  if (logType === 'assisted_bodyweight') return 'assisted';
  return 'bodyweight';
}

export function isTimedLogType(logType: LogType): boolean {
  return logType === 'duration' || logType === 'distance_duration';
}

/** A fresh working set for an exercise of this log type. */
export function newSet(logType: LogType, id: string, effort: EffortMetric = 'rir'): RoutineSet {
  const timed = isTimedLogType(logType);
  const distance = logType === 'distance_duration';
  return {
    id,
    setType: 'working',
    targetType: distance ? 'distance' : timed ? 'duration' : 'rep_range',
    reps: null,
    repsMin: timed ? null : 8,
    repsMax: timed ? null : 12,
    durationSec: timed && !distance ? 30 : null,
    distanceM: distance ? 1000 : null,
    weightKg: null,
    weightMode: defaultWeightMode(logType),
    weightPercent: null,
    rir: timed || effort === 'rpe' ? null : 2,
    rpe: !timed && effort === 'rpe' ? 8 : null,
    tempo: null,
  };
}

/**
 * Default rest for a new exercise. With the user's default rest (Settings → Training), compound
 * lifts get it and isolation work three quarters of it (to the nearest 15 s); without one,
 * compound 2:30 and isolation 1:30. Timed work always rests 1:00.
 */
export function defaultRestSec(
  exercise: Pick<Exercise, 'mechanic' | 'logType'>,
  userDefaultSec?: number,
): number {
  if (isTimedLogType(exercise.logType)) return 60;
  if (userDefaultSec === undefined) return exercise.mechanic === 'compound' ? 150 : 90;
  return exercise.mechanic === 'compound'
    ? userDefaultSec
    : Math.round((userDefaultSec * 0.75) / 15) * 15;
}

/** A library exercise as a routine entry with three working sets. */
export function newRoutineExercise(
  exercise: Pick<Exercise, 'id' | 'mechanic' | 'logType'>,
  newId: () => string,
  effort: EffortMetric = 'rir',
  userDefaultRestSec?: number,
): RoutineExercise {
  return {
    id: newId(),
    exerciseId: exercise.id,
    supersetGroup: null,
    restSeconds: defaultRestSec(exercise, userDefaultRestSec),
    restAfterSupersetSeconds: null,
    notes: null,
    progressionRule: null,
    sets: [0, 1, 2].map(() => newSet(exercise.logType, newId(), effort)),
  };
}

/**
 * Remaps sets to another exercise (Replace exercise): set types, effort and rep targets stay;
 * load and target type follow the new log type when it differs.
 */
export function remapSets(
  sets: RoutineSet[],
  from: LogType,
  to: LogType,
  effort: EffortMetric = 'rir',
): RoutineSet[] {
  if (from === to) return sets;
  const sameKind = isTimedLogType(from) === isTimedLogType(to) && !isTimedLogType(to);
  return sets.map((s) => {
    const fresh = newSet(to, s.id, effort);
    if (!sameKind) return { ...fresh, setType: s.setType };
    if (defaultWeightMode(to) === defaultWeightMode(from)) return s;
    return { ...s, weightMode: fresh.weightMode, weightKg: null, weightPercent: null };
  });
}

export function blankRoutine(id: string, now: string): RoutineDoc {
  return {
    id,
    folderId: null,
    name: '',
    description: null,
    colour: null,
    estimatedDurationMin: 0,
    source: 'manual',
    sourceRef: null,
    sortOrder: 0,
    archived: false,
    updatedAt: now,
    exercises: [],
  };
}

/** A copy of a routine with fresh ids (Duplicate). Supersets keep their grouping. */
export function copyRoutine(
  doc: RoutineDoc,
  newId: () => string,
  now: string,
  name = `${doc.name} (copy)`,
): RoutineDoc {
  return {
    ...doc,
    id: newId(),
    name: name.slice(0, 60),
    archived: false,
    updatedAt: now,
    exercises: doc.exercises.map((e) => ({
      ...e,
      id: newId(),
      sets: e.sets.map((s) => ({ ...s, id: newId() })),
    })),
  };
}
