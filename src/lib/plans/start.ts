import { loadRoutineDoc } from '@/lib/routines/repository';
import type { RoutineDoc } from '@/lib/routines/types';
import type { PreviousSet } from '@/lib/workouts/lastTime';
import { loadPreviousSets } from '@/lib/workouts/queries';
import type { PlanSource } from '@/lib/workouts/session';

import { suggestTargets } from './engine/progression';
import type { PlanDay, PlanDoc } from './engine/types';
import { loadPlanDay } from './repository';

/**
 * Starting a planned session: the day's routine with progression applied (week 1: find your
 * working weight; later weeks: next weights from what was logged last time; deload week: lighter),
 * linked to the plan day so finishing marks it done.
 */
export function planDaySource(
  plan: Pick<PlanDoc, 'weeks'>,
  day: PlanDay,
  routine: Pick<RoutineDoc, 'id' | 'name' | 'exercises'>,
  previous: ReadonlyMap<string, readonly PreviousSet[]>,
): PlanSource {
  const deload = plan.weeks.find((w) => w.week === day.week)?.deload ?? false;
  const exercises = routine.exercises.map((e) => {
    const { exercise, note } = suggestTargets(e, previous.get(e.exerciseId) ?? [], {
      week: day.week,
      deload,
    });
    const notes = [e.notes, note].filter(Boolean).join('\n') || null;
    return { ...exercise, notes: notes && notes.slice(0, 500) };
  });
  return { name: day.label, routineId: routine.id, planDayId: day.id, exercises };
}

export async function loadPlanDaySource(dayId: string): Promise<PlanSource | null> {
  const found = await loadPlanDay(dayId);
  if (!found?.day.routineId) return null;
  const routine = await loadRoutineDoc(found.day.routineId);
  if (!routine) return null;
  const previous = await loadPreviousSets([...new Set(routine.exercises.map((e) => e.exerciseId))]);
  return planDaySource(found.plan, found.day, routine, previous);
}
