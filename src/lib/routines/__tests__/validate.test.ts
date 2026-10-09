import { exercise, set, testId } from '../__fixtures__/routine';
import { blankRoutine, defaultRestSec, newRoutineExercise, newSet, remapSets } from '../defaults';
import type { RoutineDoc } from '../types';
import { validateRoutineDoc } from '../validate';

function doc(patch: Partial<RoutineDoc> = {}): RoutineDoc {
  return { ...blankRoutine(testId(), 'now'), name: 'Leg day', exercises: [exercise()], ...patch };
}

describe('routine validation (mirrors the server)', () => {
  it('accepts a normal routine', () => {
    expect(validateRoutineDoc(doc())).toEqual({ ok: true });
  });

  it.each([
    ['no name', doc({ name: '  ' })],
    ['a leading drop set', doc({ exercises: [exercise({ sets: [set({ setType: 'drop' })] })] })],
    ['31 exercises', doc({ exercises: Array.from({ length: 31 }, () => exercise()) })],
    ['21 sets', doc({ exercises: [exercise({ sets: Array.from({ length: 21 }, () => set()) })] })],
    ['an RPE of 8.3', doc({ exercises: [exercise({ sets: [set({ rpe: 8.3 })] })] })],
    ['an RIR of 6', doc({ exercises: [exercise({ sets: [set({ rir: 6 })] })] })],
    [
      'a range with min ≥ max',
      doc({
        exercises: [
          exercise({
            sets: [set({ targetType: 'rep_range', reps: null, repsMin: 10, repsMax: 8 })],
          }),
        ],
      }),
    ],
    [
      'a percent load without a percentage',
      doc({ exercises: [exercise({ sets: [set({ weightMode: 'percent_of_1rm' })] })] }),
    ],
    ['a bad tempo', doc({ exercises: [exercise({ sets: [set({ tempo: '31' })] })] })],
    ['rest over 15 minutes', doc({ exercises: [exercise({ restSeconds: 901 })] })],
  ])('rejects %s', (_label, value) => {
    expect(validateRoutineDoc(value).ok).toBe(false);
  });
});

describe('defaults', () => {
  it('starts an exercise with three working sets suited to its log type', () => {
    const weighted = newRoutineExercise(
      { id: testId(), mechanic: 'compound', logType: 'weight_reps' },
      testId,
    );
    expect(weighted.restSeconds).toBe(150);
    // The user's default rest (Settings → Training) drives new exercises when known.
    expect(defaultRestSec({ mechanic: 'compound', logType: 'weight_reps' }, 120)).toBe(120);
    expect(defaultRestSec({ mechanic: 'isolation', logType: 'weight_reps' }, 120)).toBe(90);
    expect(defaultRestSec({ mechanic: 'isolation', logType: 'duration' }, 120)).toBe(60);
    expect(weighted.sets).toHaveLength(3);
    expect(weighted.sets[0]).toMatchObject({
      targetType: 'rep_range',
      repsMin: 8,
      repsMax: 12,
      weightMode: 'absolute',
      rir: 2,
    });
    const plank = newRoutineExercise(
      { id: testId(), mechanic: 'isolation', logType: 'duration' },
      testId,
    );
    expect(plank.sets[0]).toMatchObject({ targetType: 'duration', durationSec: 30, rir: null });
    expect(newSet('bodyweight_reps', testId(), 'rpe')).toMatchObject({
      weightMode: 'bodyweight',
      rir: null,
      rpe: 8,
    });
  });

  it('keeps set types and targets when replacing an exercise', () => {
    const sets = [
      set({ setType: 'top', weightKg: 100, reps: 5 }),
      set({ setType: 'backoff', weightMode: 'percent_of_top_set', weightPercent: 85 }),
    ];
    const toDumbbell = remapSets(sets, 'weight_reps', 'weight_reps');
    expect(toDumbbell).toBe(sets);
    const toPullUp = remapSets(sets, 'weight_reps', 'weighted_bodyweight');
    expect(toPullUp.map((s) => [s.setType, s.reps, s.weightMode, s.weightKg])).toEqual([
      ['top', 5, 'bodyweight', null],
      ['backoff', 10, 'bodyweight', null],
    ]);
    const toPlank = remapSets(sets, 'weight_reps', 'duration');
    expect(toPlank.map((s) => [s.setType, s.targetType])).toEqual([
      ['top', 'duration'],
      ['backoff', 'duration'],
    ]);
    expect(toPullUp.every((s) => s.weightPercent === null)).toBe(true);
  });
});
