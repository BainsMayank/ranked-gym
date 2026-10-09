import { estimateDurationMin } from '@/lib/routines/duration';
import { fixLeadingDrop, normaliseSupersets } from '@/lib/routines/setRules';
import type { RoutineDoc, RoutineExercise, RoutineSet } from '@/lib/routines/types';

import type { WorkoutDoc, WorkoutExercise, WorkoutSet } from './types';

/**
 * "Update routine with these changes". The routine takes the session's shape (exercises added,
 * removed, swapped or reordered, sets added or removed, set types, supersets, rest and notes) and
 * the weights actually lifted. Rep targets stay as planned (progressing them is the plan's job,
 * Phase 5), and a percentage load stays a percentage when the lifter used the weight it resolved
 * to. Routine ids are kept where an exercise or set lines up, so sync updates rows in place.
 */

type NewId = () => string;

function target(
  ws: WorkoutSet,
  base: RoutineSet | undefined,
): Pick<RoutineSet, 'targetType' | 'reps' | 'repsMin' | 'repsMax' | 'durationSec' | 'distanceM'> {
  if (base) {
    const { targetType, reps, repsMin, repsMax, durationSec, distanceM } = base;
    return { targetType, reps, repsMin, repsMax, durationSec, distanceM };
  }
  const none = { reps: null, repsMin: null, repsMax: null, durationSec: null, distanceM: null };
  if (ws.targetType === 'rep_range' && ws.targetRepsMin !== null && ws.targetRepsMax !== null) {
    return {
      ...none,
      targetType: 'rep_range',
      repsMin: ws.targetRepsMin,
      repsMax: ws.targetRepsMax,
    };
  }
  const reps = ws.targetReps ?? ws.reps;
  if (reps !== null && reps > 0) return { ...none, targetType: 'reps', reps: Math.min(100, reps) };
  const distance = ws.targetDistanceM ?? ws.distanceM;
  if (distance) return { ...none, targetType: 'distance', distanceM: distance };
  const duration = ws.targetDurationSec ?? ws.durationSec;
  if (duration) return { ...none, targetType: 'duration', durationSec: duration };
  return { ...none, targetType: 'rep_range', repsMin: 8, repsMax: 12 };
}

function load(
  ws: WorkoutSet,
  base: RoutineSet | undefined,
): Pick<RoutineSet, 'weightMode' | 'weightKg' | 'weightPercent'> {
  const lifted = ws.completed && ws.weightKg !== null;
  const asPlanned = !lifted || ws.weightKg === ws.targetWeightKg;
  if (base && asPlanned) {
    return {
      weightMode: base.weightMode,
      weightKg: base.weightKg,
      weightPercent: base.weightPercent,
    };
  }
  return {
    weightMode: ws.weightMode,
    weightKg: lifted ? ws.weightKg : ws.targetWeightKg,
    weightPercent: null,
  };
}

function routineSet(ws: WorkoutSet, base: RoutineSet | undefined, newId: NewId): RoutineSet {
  return {
    id: base?.id ?? newId(),
    setType: ws.setType,
    ...target(ws, base),
    ...load(ws, base),
    rir: base ? base.rir : ws.targetRir,
    rpe: base ? base.rpe : ws.targetRpe,
    tempo: base?.tempo ?? ws.tempo,
  };
}

function routineExercise(
  we: WorkoutExercise,
  match: RoutineExercise | undefined,
  newId: NewId,
): RoutineExercise {
  return {
    id: match?.id ?? newId(),
    exerciseId: we.exerciseId,
    supersetGroup: we.supersetGroup,
    restSeconds: we.restSeconds,
    restAfterSupersetSeconds: we.restAfterSupersetSeconds,
    notes: we.notes,
    progressionRule: match?.progressionRule ?? null,
    sets: fixLeadingDrop(we.sets.map((s, i) => routineSet(s, match?.sets[i], newId))),
  };
}

export function routineFromWorkout(
  routine: RoutineDoc,
  workout: Pick<WorkoutDoc, 'exercises'>,
  newId: NewId,
  now: string,
): RoutineDoc {
  // Each routine exercise can match one workout exercise of the same library exercise, in order.
  const pool = new Map<string, RoutineExercise[]>();
  for (const e of routine.exercises) pool.set(e.exerciseId, [...(pool.get(e.exerciseId) ?? []), e]);
  const exercises = normaliseSupersets(
    workout.exercises
      .filter((we) => we.sets.length > 0)
      .map((we) => routineExercise(we, pool.get(we.exerciseId)?.shift(), newId)),
  );
  return {
    ...routine,
    exercises,
    estimatedDurationMin: estimateDurationMin(exercises),
    updatedAt: now,
  };
}

/** What a routine is made of, without ids or bookkeeping (for comparing). */
function signature(doc: Pick<RoutineDoc, 'exercises'>): string {
  return JSON.stringify(
    doc.exercises.map((e) => [
      e.exerciseId,
      e.supersetGroup,
      e.restSeconds,
      e.restAfterSupersetSeconds,
      e.notes ?? null,
      e.sets.map((s) => [
        s.setType,
        s.targetType,
        s.reps,
        s.repsMin,
        s.repsMax,
        s.durationSec,
        s.distanceM,
        s.weightMode,
        s.weightKg,
        s.weightPercent,
        s.rir,
        s.rpe,
      ]),
    ]),
  );
}

/** True when saving the session back would change the routine. */
export function hasDeviated(routine: RoutineDoc, workout: Pick<WorkoutDoc, 'exercises'>): boolean {
  const updated = routineFromWorkout(routine, workout, () => 'x', routine.updatedAt);
  return signature(updated) !== signature(routine);
}
