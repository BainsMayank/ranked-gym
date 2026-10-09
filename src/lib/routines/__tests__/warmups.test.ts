import { exercise, set, testId } from '../__fixtures__/routine';
import { applyWarmups, planWarmups, warmupCount, warmupTarget } from '../warmups';

describe('warm-up generator', () => {
  it('picks 2, 3 or 4 sets by load', () => {
    expect(warmupCount(30, 20)).toBe(2);
    expect(warmupCount(80, 20)).toBe(3);
    expect(warmupCount(100, 20)).toBe(3);
    expect(warmupCount(140, 20)).toBe(4);
  });

  it('ramps a heavy squat in plate steps with falling reps', () => {
    expect(planWarmups(140, 'barbell', 20)).toEqual([
      { weightKg: 55, reps: 8 },
      { weightKg: 77.5, reps: 5 },
      { weightKg: 97.5, reps: 3 },
      { weightKg: 120, reps: 1 },
    ]);
  });

  it('never goes below the empty bar and drops repeats', () => {
    // 50% of 30 = 15 → bar (20); 75% = 22.5.
    expect(planWarmups(30, 'barbell', 20)).toEqual([
      { weightKg: 20, reps: 8 },
      { weightKg: 22.5, reps: 3 },
    ]);
    // Everything rounds to the bar or above the working weight: nothing useful left but the bar.
    expect(planWarmups(22.5, 'barbell', 20)).toEqual([{ weightKg: 20, reps: 8 }]);
    expect(planWarmups(20, 'barbell', 20)).toEqual([]);
  });

  it('rounds to what the equipment can load', () => {
    expect(planWarmups(80, 'machine', 20).map((s) => s.weightKg)).toEqual([35, 50, 70]);
    expect(planWarmups(30, 'dumbbell', 20).map((s) => s.weightKg)).toEqual([15, 22.5]);
  });

  it('needs an absolute working weight', () => {
    expect(planWarmups(0, 'barbell')).toEqual([]);
    expect(warmupTarget([set({ weightKg: null })])).toBeNull();
    expect(
      warmupTarget([set({ weightMode: 'percent_of_1rm', weightPercent: 80, weightKg: null })]),
    ).toBeNull();
    const target = set({ setType: 'top', weightKg: 100 });
    expect(warmupTarget([set({ setType: 'warmup', weightKg: 20 }), target])).toBe(target);
  });

  it('replaces old warm-ups and keeps the working sets', () => {
    const working = set({ weightKg: 100, reps: 5 });
    const e = exercise({ sets: [set({ setType: 'warmup', weightKg: 40 }), working] });
    const out = applyWarmups(e, 'barbell', 20, testId);
    expect(out.sets.map((s) => [s.setType, s.weightKg, s.reps])).toEqual([
      ['warmup', 45, 8],
      ['warmup', 65, 5],
      ['warmup', 85, 2],
      ['working', 100, 5],
    ]);
    expect(out.sets.slice(0, 3).every((s) => s.rir === null && s.rpe === null)).toBe(true);
  });

  it('leaves the exercise alone without a target', () => {
    const e = exercise();
    expect(applyWarmups(e, 'barbell', 20, testId)).toBe(e);
  });
});
