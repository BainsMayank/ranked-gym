import { defaultWeightMode, newRoutineExercise } from '@/lib/routines/defaults';
import type { EffortMetric } from '@/lib/routines/taxonomy';
import type { RoutineDoc, RoutineExercise, RoutineSet } from '@/lib/routines/types';
import type { Exercise } from '@/lib/exercises/types';

import type { PreviousSet } from './lastTime';
import type { WorkoutVisibility } from './taxonomy';
import type { WorkoutDoc, WorkoutExercise, WorkoutSet } from './types';

/**
 * Building a session: from a routine (targets copied, percentages resolved to kg), from a generated
 * plan (same shape), or empty. Logged values start empty; the row shows a suggestion (the target,
 * else last time) in grey, and ticking an empty set adopts it.
 */

type NewId = () => string;

/** What a session can start from: a saved routine or a generated workout. */
export interface PlanSource {
  name: string;
  routineId: string | null;
  /** A planned session (Phase 5): finishing marks the plan day done. */
  planDayId?: string | null;
  exercises: readonly RoutineExercise[];
}

export function planFromRoutine(
  routine: Pick<RoutineDoc, 'id' | 'name' | 'exercises'>,
): PlanSource {
  return { name: routine.name, routineId: routine.id, exercises: routine.exercises };
}

export interface StartContext {
  id: string;
  /** ISO. */
  now: string;
  newId: NewId;
  bodyweightKg: number | null;
  visibility: WorkoutVisibility;
  /** Best estimated 1RM (kg) for % of 1RM loads; null when unknown. */
  oneRepMax?: (exerciseId: string) => number | null;
}

/** Loads round to 2.5 kg (what a bar with change plates can make). */
const LOAD_STEP_KG = 2.5;
const roundLoad = (kg: number) => Number((Math.round(kg / LOAD_STEP_KG) * LOAD_STEP_KG).toFixed(2));

/** "Morning workout", "Evening workout"… from the local hour. */
export function defaultWorkoutName(at: Date): string {
  const h = at.getHours();
  if (h < 5) return 'Late-night workout';
  if (h < 12) return 'Morning workout';
  if (h < 17) return 'Afternoon workout';
  return 'Evening workout';
}

export function emptySet(id: string, base?: Partial<WorkoutSet>): WorkoutSet {
  return {
    id,
    setType: 'working',
    weightMode: 'absolute',
    targetType: null,
    targetReps: null,
    targetRepsMin: null,
    targetRepsMax: null,
    targetDurationSec: null,
    targetDistanceM: null,
    targetWeightKg: null,
    targetRir: null,
    targetRpe: null,
    tempo: null,
    reps: null,
    weightKg: null,
    durationSec: null,
    distanceM: null,
    rir: null,
    rpe: null,
    completed: false,
    completedAt: null,
    failed: false,
    isPr: false,
    ...base,
  };
}

/** A planned set as a logged set, with any percentage resolved to kg. */
export function setFromPlan(set: RoutineSet, id: string, resolvedKg: number | null): WorkoutSet {
  const percent = set.weightMode === 'percent_of_1rm' || set.weightMode === 'percent_of_top_set';
  return emptySet(id, {
    setType: set.setType,
    weightMode: percent ? 'absolute' : set.weightMode,
    targetType: set.targetType,
    targetReps: set.reps,
    targetRepsMin: set.repsMin,
    targetRepsMax: set.repsMax,
    targetDurationSec: set.durationSec,
    targetDistanceM: set.distanceM,
    targetWeightKg: resolvedKg,
    targetRir: set.rir,
    targetRpe: set.rpe,
    tempo: set.tempo,
  });
}

/** Planned sets to logged sets: % of 1RM uses the known 1RM, % of top set the resolved top set. */
export function setsFromPlan(
  sets: readonly RoutineSet[],
  newId: NewId,
  oneRepMax: number | null,
): WorkoutSet[] {
  let topKg: number | null = null;
  return sets.map((s) => {
    let kg: number | null = s.weightKg;
    if (s.weightMode === 'percent_of_1rm') {
      kg = oneRepMax && s.weightPercent ? roundLoad((oneRepMax * s.weightPercent) / 100) : null;
    } else if (s.weightMode === 'percent_of_top_set') {
      kg = topKg !== null && s.weightPercent ? roundLoad((topKg * s.weightPercent) / 100) : null;
    }
    if (s.setType === 'top') topKg = kg;
    return setFromPlan(s, newId(), kg);
  });
}

export function exerciseFromPlan(
  e: RoutineExercise,
  newId: NewId,
  oneRepMax: number | null,
): WorkoutExercise {
  return {
    id: newId(),
    exerciseId: e.exerciseId,
    supersetGroup: e.supersetGroup,
    restSeconds: e.restSeconds,
    restAfterSupersetSeconds: e.restAfterSupersetSeconds,
    notes: e.notes,
    sets: setsFromPlan(e.sets, newId, oneRepMax),
  };
}

export function blankWorkout(ctx: StartContext, name = defaultWorkoutName(new Date(ctx.now))) {
  return startWorkout({ name, routineId: null, exercises: [] }, ctx);
}

export function startWorkout(source: PlanSource, ctx: StartContext): WorkoutDoc {
  return {
    id: ctx.id,
    routineId: source.routineId,
    planDayId: source.planDayId ?? null,
    name: source.name.trim().slice(0, 60) || defaultWorkoutName(new Date(ctx.now)),
    startedAt: ctx.now,
    endedAt: null,
    durationSec: null,
    notes: null,
    perceivedEffort: null,
    bodyweightKg: ctx.bodyweightKg,
    caloriesEst: null,
    totalVolumeKg: 0,
    visibility: ctx.visibility,
    status: 'in_progress',
    clientUpdatedAt: ctx.now,
    revision: 0,
    photoPath: null,
    exercises: source.exercises.map((e) =>
      exerciseFromPlan(e, ctx.newId, ctx.oneRepMax?.(e.exerciseId) ?? null),
    ),
  };
}

/** A library exercise added mid-session: the routine builder's defaults (three working sets). */
export function exerciseFromLibrary(
  exercise: Pick<Exercise, 'id' | 'mechanic' | 'logType'>,
  newId: NewId,
  effort: EffortMetric,
  defaultRestSec?: number,
): WorkoutExercise {
  return exerciseFromPlan(newRoutineExercise(exercise, newId, effort, defaultRestSec), newId, null);
}

/** Add set: copies the last set's targets and type (a copied top set becomes a back-off set). */
export function nextSet(
  sets: readonly WorkoutSet[],
  id: string,
  logType: Exercise['logType'],
): WorkoutSet {
  const last = sets[sets.length - 1];
  if (!last) return emptySet(id, { weightMode: defaultWeightMode(logType) });
  return emptySet(id, {
    setType: last.setType === 'top' ? 'backoff' : last.setType,
    weightMode: last.weightMode,
    targetType: last.targetType,
    targetReps: last.targetReps,
    targetRepsMin: last.targetRepsMin,
    targetRepsMax: last.targetRepsMax,
    targetDurationSec: last.targetDurationSec,
    targetDistanceM: last.targetDistanceM,
    targetWeightKg: last.weightKg ?? last.targetWeightKg,
    targetRir: last.targetRir,
    targetRpe: last.targetRpe,
    tempo: last.tempo,
  });
}

/** What an empty cell suggests (shown in grey; ticking adopts it). */
export interface Suggestion {
  weightKg: number | null;
  reps: number | null;
  durationSec: number | null;
  distanceM: number | null;
}

/**
 * What an empty cell suggests: the target, else last time, else (when neither exists, as in an
 * empty or generated workout) the set before it in this session, so set 2 follows set 1's weight.
 */
export function suggestionFor(
  set: WorkoutSet,
  prev: PreviousSet | null,
  earlier: WorkoutSet | null = null,
): Suggestion {
  let reps = set.targetReps;
  if (reps === null && set.targetRepsMin !== null && set.targetRepsMax !== null) {
    const last = prev?.reps ?? earlier?.reps ?? null;
    reps =
      last !== null
        ? Math.min(set.targetRepsMax, Math.max(set.targetRepsMin, last))
        : set.targetRepsMin;
  }
  if (reps === null && set.targetType === null) reps = prev?.reps ?? earlier?.reps ?? null;
  return {
    weightKg: set.targetWeightKg ?? prev?.weightKg ?? earlier?.weightKg ?? null,
    reps,
    durationSec: set.targetDurationSec ?? prev?.durationSec ?? earlier?.durationSec ?? null,
    distanceM: set.targetDistanceM ?? prev?.distanceM ?? earlier?.distanceM ?? null,
  };
}

/** The nearest earlier set of the same kind (warm-up or not) in this exercise, for suggestions. */
export function earlierSet(sets: readonly WorkoutSet[], index: number): WorkoutSet | null {
  const warm = sets[index]?.setType === 'warmup';
  for (let i = index - 1; i >= 0; i--) {
    if ((sets[i]!.setType === 'warmup') === warm) return sets[i]!;
  }
  return null;
}

/** Ticks a set: empty values take the suggestion, and it's stamped done. */
export function completeSet(set: WorkoutSet, suggestion: Suggestion, now: string): WorkoutSet {
  return {
    ...set,
    weightKg: set.weightKg ?? suggestion.weightKg,
    reps: set.reps ?? suggestion.reps,
    durationSec: set.durationSec ?? suggestion.durationSec,
    distanceM: set.distanceM ?? suggestion.distanceM,
    completed: true,
    completedAt: now,
  };
}

export function uncompleteSet(set: WorkoutSet): WorkoutSet {
  return { ...set, completed: false, completedAt: null, failed: false };
}
