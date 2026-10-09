import { copyRoutine, remapSets } from '@/lib/routines/defaults';
import { estimateDurationMin } from '@/lib/routines/duration';
import type { EffortMetric } from '@/lib/routines/taxonomy';
import type { RoutineDoc, RoutineExercise } from '@/lib/routines/types';

import { deloadExercises } from './engine/deload';
import { progressionFor } from './engine/progression';
import type { PlanDay, PlanDoc, PlanExercise, PlanLevel } from './engine/types';

/**
 * Plan edits that touch routines: swapping an exercise and regenerating a session, for this
 * session only (the day gets its own copy of the routine) or every week (the shared routine and
 * its deload copy change). Pure: callers load and save.
 */

export type EditScope = 'day' | 'every';

/** The routine deload-week days of this session type use (if the plan has a deload). */
export function deloadRoutineId(plan: PlanDoc, templateKey: string): string | null {
  const deloadWeeks = new Set(plan.weeks.filter((w) => w.deload).map((w) => w.week));
  return (
    plan.days.find((d) => d.templateKey === templateKey && deloadWeeks.has(d.week))?.routineId ??
    null
  );
}

export function isDeloadDay(plan: PlanDoc, day: PlanDay): boolean {
  return plan.weeks.some((w) => w.week === day.week && w.deload);
}

/**
 * One exercise replaced by another, keeping its sets (remapped when the log type differs). Matched
 * by exercise: a session holds each exercise once, so this also finds it in the deload copy.
 */
export function swapInRoutine(
  routine: RoutineDoc,
  from: PlanExercise,
  to: PlanExercise,
  level: PlanLevel,
  effort: EffortMetric,
): RoutineDoc {
  const exercises = routine.exercises.map((e): RoutineExercise => {
    if (e.exerciseId !== from.id) return e;
    const sets = remapSets(e.sets, from.logType, to.logType, effort);
    const role = sets.some((s) => s.setType === 'top') ? 'main' : 'accessory';
    return {
      ...e,
      exerciseId: to.id,
      sets,
      progressionRule: progressionFor({ exercise: to, slot: { key: 'swap', role } }, level, sets),
    };
  });
  return { ...routine, exercises, estimatedDurationMin: estimateDurationMin(exercises) };
}

export interface RoutineEdit {
  plan: PlanDoc;
  /** Routines to save (new copies or changed shared ones). */
  routines: RoutineDoc[];
}

/**
 * Applies `change` to the day's routine. 'day': a fresh copy only this day uses. 'every': the
 * shared routine, plus the same change on the session's deload copy when the day isn't itself in
 * the deload week.
 */
export function editRoutineForDay(
  plan: PlanDoc,
  dayId: string,
  scope: EditScope,
  routines: ReadonlyMap<string, RoutineDoc>,
  change: (routine: RoutineDoc, deload: boolean) => RoutineDoc,
  ctx: { newId: () => string; now: string },
): RoutineEdit | null {
  const day = plan.days.find((d) => d.id === dayId);
  const current = day?.routineId ? routines.get(day.routineId) : undefined;
  if (!day || !current) return null;
  const deloadDay = isDeloadDay(plan, day);

  if (scope === 'day') {
    const copy = change(copyRoutine(current, ctx.newId, ctx.now, current.name), deloadDay);
    return {
      plan: {
        ...plan,
        days: plan.days.map((d) => (d.id === dayId ? { ...d, routineId: copy.id } : d)),
      },
      routines: [copy],
    };
  }

  const out = [change(current, deloadDay)];
  const deloadId = deloadDay ? null : deloadRoutineId(plan, day.templateKey);
  const deload = deloadId && deloadId !== current.id ? routines.get(deloadId) : undefined;
  if (deload) out.push(change(deload, true));
  return { plan, routines: out };
}

/** A regenerated session's exercises as a routine change (deload days get the lighter copy). */
export function replaceExercises(
  exercises: RoutineExercise[],
  logTypeOf: (exerciseId: string) => PlanExercise['logType'],
  newId: () => string,
) {
  return (routine: RoutineDoc, deload: boolean): RoutineDoc => {
    const next = deload
      ? deloadExercises(exercises, logTypeOf, newId)
      : exercises.map((e) => ({
          ...e,
          id: newId(),
          sets: e.sets.map((s) => ({ ...s, id: newId() })),
        }));
    return { ...routine, exercises: next, estimatedDurationMin: estimateDurationMin(next) };
  };
}
