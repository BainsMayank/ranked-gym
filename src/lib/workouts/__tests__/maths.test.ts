import { Constants } from '@/types/database';

import { averageMet, estimateCalories } from '../calories';
import { estimateE1rm, setE1rm } from '../oneRepMax';
import {
  barFor,
  DEFAULT_LB_PLATES,
  loadPlates,
  platesFor,
  platesToStock,
  type Plate,
} from '../plates';
import { summariseWorkout, workoutVolumeKg } from '../summary';
import { workoutStatuses, workoutVisibilities } from '../taxonomy';
import { wexercise, workout, wset } from '../__fixtures__/workout';

describe('enums', () => {
  it('match the database', () => {
    expect([...workoutStatuses]).toEqual(Constants.public.Enums.workout_status);
    expect([...workoutVisibilities]).toEqual(Constants.public.Enums.profile_visibility);
  });
});

describe('estimated 1RM (same formula as ranks)', () => {
  it('takes a single as it is', () => {
    expect(estimateE1rm(140, 1)).toBe(140);
  });

  it('averages Epley and Brzycki for 2 to 10 reps', () => {
    expect(estimateE1rm(100, 5)).toBeCloseTo(114.58, 2);
    expect(estimateE1rm(100, 10)).toBeCloseTo(133.33, 2);
  });

  it('gives no estimate above 10 reps', () => {
    expect(estimateE1rm(100, 12)).toBeNull();
  });

  it('has no estimate without a load or reps', () => {
    expect(estimateE1rm(0, 5)).toBeNull();
    expect(estimateE1rm(100, 0)).toBeNull();
    expect(estimateE1rm(Number.NaN, 5)).toBeNull();
  });

  it('skips warm-ups and bodyweight work', () => {
    expect(setE1rm(wset({ setType: 'warmup', weightKg: 60, reps: 8 }))).toBeNull();
    expect(setE1rm(wset({ weightMode: 'bodyweight', weightKg: 10, reps: 8 }))).toBeNull();
    expect(setE1rm(wset({ weightKg: 100, reps: null }))).toBeNull();
    expect(setE1rm(wset({ weightKg: 100, reps: 3 }))).toBeCloseTo(107.94, 2);
  });
});

describe('plate calculator', () => {
  const kg: Plate[] = platesFor([], 'kg');

  it('loads 100 kg on a 20 kg bar as 25 + 15 per side', () => {
    expect(loadPlates(100, 20, kg)).toEqual({
      perSide: [25, 15],
      total: 100,
      shortBy: 0,
      belowBar: false,
    });
  });

  it('uses change plates exactly (62.5 kg)', () => {
    expect(loadPlates(62.5, 20, kg).perSide).toEqual([20, 1.25]);
  });

  it('never uses more pairs than owned', () => {
    const few: Plate[] = [
      { weight: 20, pairs: 1 },
      { weight: 10, pairs: 1 },
      { weight: 5, pairs: 1 },
    ];
    // 60 per side would need three 20s; best possible is 35 per side.
    const load = loadPlates(140, 20, few);
    expect(load.perSide).toEqual([20, 10, 5]);
    expect(load.total).toBe(90);
    expect(load.shortBy).toBe(50);
  });

  it('gets as close as it can below the target', () => {
    const load = loadPlates(101, 20, kg);
    expect(load.total).toBe(100);
    expect(load.shortBy).toBe(1);
  });

  it('prefers fewer plates when two loads tie', () => {
    expect(loadPlates(60, 20, kg).perSide).toEqual([20]);
  });

  it('flags a target lighter than the bar', () => {
    expect(loadPlates(15, 20, kg)).toMatchObject({ belowBar: true, perSide: [] });
  });

  it('gives lb users standard lb plates and a 45 lb bar by default', () => {
    expect(platesFor([], 'lb')).toBe(DEFAULT_LB_PLATES);
    expect(barFor(20, 'lb')).toBe(45);
    expect(loadPlates(225, 45, DEFAULT_LB_PLATES).perSide).toEqual([45, 45]);
  });

  it('round-trips an edited inventory through kg storage', () => {
    const stock = platesToStock([{ weight: 20, pairs: 3 }], 'kg');
    expect(platesFor(stock, 'kg')).toEqual([{ weight: 20, pairs: 3 }]);
  });
});

describe('calories and totals', () => {
  it('is MET x bodyweight x hours, weighted by sets', () => {
    expect(
      averageMet([
        { metValue: 6, sets: 3 },
        { metValue: 3, sets: 1 },
      ]),
    ).toBe(5.25);
    expect(
      estimateCalories({
        durationSec: 3600,
        bodyweightKg: 72,
        exercises: [{ metValue: 6, sets: 4 }],
      }),
    ).toBe(432);
  });

  it('has no estimate without a bodyweight or any sets', () => {
    expect(
      estimateCalories({
        durationSec: 3600,
        bodyweightKg: null,
        exercises: [{ metValue: 6, sets: 4 }],
      }),
    ).toBeNull();
    expect(
      estimateCalories({
        durationSec: 3600,
        bodyweightKg: 72,
        exercises: [{ metValue: 6, sets: 0 }],
      }),
    ).toBeNull();
  });

  it('counts only completed working sets toward volume (mirrors the server)', () => {
    const exercises = [
      wexercise({
        sets: [
          wset({ setType: 'warmup', weightKg: 60, reps: 8, completed: true }),
          wset({ weightKg: 100, reps: 5, completed: true }),
          wset({ weightKg: 100, reps: 5, completed: false }),
        ],
      }),
      wexercise({
        sets: [
          wset({ weightMode: 'bodyweight', weightKg: 10, reps: 8, completed: true }),
          wset({ weightMode: 'assisted', weightKg: 20, reps: 8, completed: true }),
        ],
      }),
    ];
    expect(workoutVolumeKg(exercises)).toBe(580);
  });

  it('summarises a finished hour (same numbers the server test expects)', () => {
    const squat = wexercise({
      sets: [
        wset({ setType: 'warmup', weightKg: 60, reps: 8, completed: true }),
        wset({ weightKg: 100, reps: 5, completed: true }),
      ],
    });
    const bench = wexercise({ sets: [wset({ weightKg: 80, reps: 8, completed: true })] });
    const doc = workout({
      exercises: [squat, bench],
      startedAt: '2026-10-01T06:00:00Z',
      endedAt: '2026-10-01T07:00:00Z',
    });
    const s = summariseWorkout(doc, () => ({ metValue: 6, muscles: [] }));
    expect(s).toMatchObject({
      durationSec: 3600,
      volumeKg: 1140,
      sets: 2,
      exercises: 2,
      calories: 432,
    });
  });
});
