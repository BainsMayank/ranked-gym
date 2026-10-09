import { startWorkout } from '@/lib/workouts/session';
import type { PreviousSet } from '@/lib/workouts/lastTime';
import { testId } from '@/lib/routines/__fixtures__/routine';

import { planDaySource } from '../start';
import { savedPlan } from '../__fixtures__/plan';

jest.mock('@/lib/workouts/queries', () => ({}));
jest.mock('../repository', () => ({}));
jest.mock('@/lib/routines/repository', () => ({}));

const { plan, routines } = savedPlan();
const firstDay = plan.days[0]!;
const routine = routines.get(firstDay.routineId!)!;
const bench = routine.exercises[0]!;
const ctx = {
  id: testId(),
  now: '2026-10-05T06:00:00.000Z',
  newId: testId,
  bodyweightKg: 70,
  visibility: 'friends' as const,
};

const done = (reps: number, weightKg: number): PreviousSet => ({
  setType: 'working',
  weightMode: 'absolute',
  reps,
  weightKg,
  durationSec: null,
  distanceM: null,
  rir: null,
  rpe: null,
});

describe('starting a planned session', () => {
  it('links the workout to its plan day and keeps week-1 weights blank with a hint', () => {
    const source = planDaySource(plan, firstDay, routine, new Map());
    const doc = startWorkout(source, ctx);
    expect(doc.planDayId).toBe(firstDay.id);
    expect(doc.routineId).toBe(routine.id);
    expect(doc.name).toBe(firstDay.label);
    expect(doc.exercises[0]!.notes).toMatch(/Find your working weight/);
    expect(doc.exercises.flatMap((e) => e.sets).every((s) => s.targetWeightKg === null)).toBe(true);
  });

  it('suggests the next weight from what was logged in later weeks', () => {
    const week2 = plan.days.find((d) => d.week === 2 && d.templateKey === firstDay.templateKey)!;
    const repsMax = bench.sets.find((s) => s.setType !== 'warmup')!.repsMax!;
    const previous = new Map([
      [bench.exerciseId, [done(repsMax, 60), done(repsMax, 60), done(repsMax, 60)]],
    ]);
    const doc = startWorkout(planDaySource(plan, week2, routine, previous), ctx);
    const working = doc.exercises[0]!.sets.filter((s) => s.setType !== 'warmup');
    expect(working.every((s) => s.targetWeightKg === 62.5)).toBe(true);
    expect(doc.exercises[0]!.notes).toMatch(/\+2.5 kg/);
  });

  it('lightens the deload week', () => {
    const deloadDay = plan.days.find((d) => d.week === 6)!;
    const deloadRoutine = routines.get(deloadDay.routineId!)!;
    const first = deloadRoutine.exercises[0]!;
    const previous = new Map([[first.exerciseId, [done(10, 100)]]]);
    const doc = startWorkout(planDaySource(plan, deloadDay, deloadRoutine, previous), ctx);
    expect(doc.exercises[0]!.sets.find((s) => s.setType !== 'warmup')!.targetWeightKg).toBe(90);
  });
});
