import { testId } from '@/lib/routines/__fixtures__/routine';

import { deloadRoutineId, editRoutineForDay, swapInRoutine } from '../edits';
import { byId, idOf } from '../engine/__fixtures__/library';
import { savedPlan } from '../__fixtures__/plan';

const { plan, routines } = savedPlan();
const day = plan.days[0]!; // Upper A, week 1
const routine = routines.get(day.routineId!)!;
const from = byId.get(routine.exercises[0]!.exerciseId)!;
const to = byId.get(idOf('dumbbell-bench-press'))!;
const swap = (r: typeof routine) => swapInRoutine(r, from, to, 'intermediate', 'rir');
const ctx = { newId: testId, now: '2026-10-05T06:00:00.000Z' };

describe('plan edits', () => {
  it('swaps an exercise keeping its sets', () => {
    const out = swap(routine);
    expect(out.exercises[0]!.exerciseId).toBe(to.id);
    expect(out.exercises[0]!.sets).toHaveLength(routine.exercises[0]!.sets.length);
  });

  it('"just this session" gives the day its own copy', () => {
    const edit = editRoutineForDay(plan, day.id, 'day', routines, swap, ctx)!;
    const copy = edit.routines[0]!;
    expect(edit.routines).toHaveLength(1);
    expect(copy.id).not.toBe(routine.id);
    expect(edit.plan.days.find((d) => d.id === day.id)!.routineId).toBe(copy.id);
    // Next week's Upper A still uses the shared routine.
    const nextWeek = edit.plan.days.find((d) => d.week === 2 && d.templateKey === day.templateKey)!;
    expect(nextWeek.routineId).toBe(routine.id);
  });

  it('"every week" changes the shared routine and its deload copy', () => {
    const edit = editRoutineForDay(plan, day.id, 'every', routines, swap, ctx)!;
    expect(edit.plan).toBe(plan);
    expect(edit.routines.map((r) => r.id)).toEqual([
      routine.id,
      deloadRoutineId(plan, day.templateKey),
    ]);
    expect(edit.routines.every((r) => r.exercises.some((e) => e.exerciseId === to.id))).toBe(true);
  });
});
