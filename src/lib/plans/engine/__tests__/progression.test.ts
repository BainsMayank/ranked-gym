import { set, testId } from '@/lib/routines/__fixtures__/routine';
import type { RoutineExercise } from '@/lib/routines/types';
import type { PreviousSet } from '@/lib/workouts/lastTime';

import { deloadExercises, deloadSetCount } from '../deload';
import { suggestTargets } from '../progression';
import type { ProgressionRule } from '../types';

const exercise = (
  rule: ProgressionRule,
  sets = [set({ weightMode: 'absolute' }), set({ weightMode: 'absolute' })],
): RoutineExercise => ({
  id: testId(),
  exerciseId: testId(),
  supersetGroup: null,
  restSeconds: 90,
  restAfterSupersetSeconds: null,
  notes: null,
  progressionRule: rule,
  sets,
});
const prev = (
  reps: number,
  weightKg: number | null = 60,
  durationSec: number | null = null,
): PreviousSet => ({
  setType: 'working',
  weightMode: 'absolute',
  reps,
  weightKg,
  durationSec,
  distanceM: null,
  rir: null,
  rpe: null,
});

const linear: ProgressionRule = { v: 1, kind: 'linear', reps: 5, incrementKg: 2.5, stepKg: 2.5 };
const double: ProgressionRule = {
  v: 1,
  kind: 'double',
  repsMin: 8,
  repsMax: 12,
  incrementKg: 2.5,
  stepKg: 2.5,
};

describe('suggestTargets', () => {
  it('leaves weights blank in week 1 with a hint', () => {
    const out = suggestTargets(exercise(linear), [prev(5)], { week: 1, deload: false });
    expect(out.exercise.sets.every((s) => s.weightKg === null)).toBe(true);
    expect(out.note).toMatch(/Find your working weight/);
  });

  it('adds weight linearly after a session with every rep', () => {
    const out = suggestTargets(exercise(linear), [prev(5), prev(5)], { week: 2, deload: false });
    expect(out.exercise.sets.map((s) => s.weightKg)).toEqual([62.5, 62.5]);
  });

  it('keeps the weight after missed reps', () => {
    const out = suggestTargets(exercise(linear), [prev(5), prev(4)], { week: 2, deload: false });
    expect(out.exercise.sets.map((s) => s.weightKg)).toEqual([60, 60]);
  });

  it('double progression adds weight only at the top of the range', () => {
    expect(
      suggestTargets(exercise(double), [prev(12), prev(11)], { week: 3, deload: false }).exercise
        .sets[0]!.weightKg,
    ).toBe(60);
    const up = suggestTargets(exercise(double), [prev(12), prev(12)], { week: 3, deload: false });
    expect(up.exercise.sets[0]!.weightKg).toBe(62.5);
    expect(up.note).toMatch(/Start back at 8/);
  });

  it('drops to about 90% in the deload week', () => {
    const out = suggestTargets(exercise(double), [prev(10, 100)], { week: 6, deload: true });
    expect(out.exercise.sets[0]!.weightKg).toBe(90);
  });

  it('adds 5 seconds to holds that hit their target', () => {
    const hold: ProgressionRule = {
      v: 1,
      kind: 'hold',
      targetSec: 20,
      addSec: 5,
      maxSec: 60,
      nextSlug: null,
    };
    const ex = exercise(hold, [set({ targetType: 'duration', durationSec: 20, reps: null })]);
    const out = suggestTargets(ex, [prev(0, null, 22)], { week: 2, deload: false });
    expect(out.exercise.sets[0]!.durationSec).toBe(27);
  });
});

describe('deload', () => {
  it('cuts sets by about 40% and eases effort', () => {
    expect([1, 2, 3, 4, 5].map(deloadSetCount)).toEqual([1, 1, 2, 2, 3]);
    const ex = exercise(double, [
      set({ setType: 'top', rir: 1 }),
      set({ setType: 'backoff', weightMode: 'percent_of_top_set', weightPercent: 90, rir: 2 }),
      set({ rir: 2 }),
    ]);
    const [out] = deloadExercises([ex], () => 'weight_reps', testId);
    expect(out!.sets).toHaveLength(2);
    expect(out!.sets.map((s) => s.setType)).toEqual(['working', 'working']);
    expect(out!.sets[1]!.weightMode).toBe('absolute');
    expect(out!.sets.map((s) => s.rir)).toEqual([3, 4]);
  });
});
