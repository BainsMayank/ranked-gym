import type { RankTier } from '@/theme';

import { rankOrdinal } from '../ranks';
import {
  dotsCoefficient,
  estimateOneRepMax,
  floorForRank,
  LADDER,
  loadForScore,
  overallScore,
  rankForScore,
  recordWeight,
  strengthScore,
  type LiftEntry,
} from '../strength';

const tierOf = (entry: LiftEntry): RankTier => rankForScore(strengthScore(entry)).rank.tier;
const male75 = { bodyweightKg: 75, sex: 'male', reps: 1 } as const;

describe('DOTS and e1RM', () => {
  it('matches published DOTS coefficients', () => {
    expect(dotsCoefficient(83, 'male')).toBeCloseTo(0.6751, 4);
    expect(dotsCoefficient(60, 'female')).toBeCloseTo(1.1085, 4);
  });

  it('clamps bodyweight to the fitted range', () => {
    expect(dotsCoefficient(250, 'male')).toBe(dotsCoefficient(210, 'male'));
  });

  it('estimates 1RM with Epley and caps high-rep sets at 12', () => {
    expect(estimateOneRepMax(100, 1)).toBe(100);
    expect(estimateOneRepMax(100, 5)).toBeCloseTo(116.67, 2);
    expect(estimateOneRepMax(100, 20)).toBe(estimateOneRepMax(100, 12));
    expect(estimateOneRepMax(100, 0)).toBe(0);
  });
});

describe('ladder', () => {
  it('has 24 divisions plus Master and Champion, strictly rising', () => {
    expect(LADDER).toHaveLength(26);
    const floors = LADDER.map((step) => step.floor);
    expect([...floors].sort((a, b) => a - b)).toEqual(floors);
    expect(new Set(floors).size).toBe(floors.length);
    expect(LADDER.map((step) => rankOrdinal(step.rank))).toEqual(floors.map((_, i) => i));
  });

  it('places scores and reports progress to the next rank', () => {
    expect(rankForScore(0).rank).toEqual({ tier: 'iron', division: 4 });
    expect(rankForScore(85).rank).toEqual({ tier: 'iron', division: 3 });
    const pos = rankForScore(246.25);
    expect(pos.rank).toEqual({ tier: 'gold', division: 4 });
    expect(pos.next).toEqual({ tier: 'gold', division: 3 });
    expect(pos.progress).toBeCloseTo(0.5);
    expect(pos.scoreToNext).toBeCloseTo(6.25);
    expect(rankForScore(700)).toMatchObject({ rank: { tier: 'champion' }, next: null });
    expect(floorForRank({ tier: 'platinum', division: 4 })).toBe(290);
  });
});

describe('calibration', () => {
  it('maps common strength standards (75 kg man) to the intended tiers', () => {
    // Bench: beginner, novice, intermediate, advanced, elite.
    const bench = [47, 68, 94, 125, 160].map((loadKg) =>
      tierOf({ ...male75, lift: 'benchPress', loadKg }),
    );
    expect(bench).toEqual(['iron', 'silver', 'gold', 'diamond', 'master']);
    const squat = [63, 92, 127, 170, 218].map((loadKg) =>
      tierOf({ ...male75, lift: 'backSquat', loadKg }),
    );
    expect(squat).toEqual(['iron', 'bronze', 'gold', 'platinum', 'master']);
  });

  it('puts world-record-level lifts in Champion for light and heavy lifters of both sexes', () => {
    const records: LiftEntry[] = [
      { lift: 'benchPress', loadKg: 190, reps: 1, bodyweightKg: 74, sex: 'male' },
      { lift: 'backSquat', loadKg: 300, reps: 1, bodyweightKg: 74, sex: 'male' },
      { lift: 'deadlift', loadKg: 340, reps: 1, bodyweightKg: 74, sex: 'male' },
      { lift: 'backSquat', loadKg: 480, reps: 1, bodyweightKg: 180, sex: 'male' },
      { lift: 'benchPress', loadKg: 130, reps: 1, bodyweightKg: 63, sex: 'female' },
      { lift: 'deadlift', loadKg: 230, reps: 1, bodyweightKg: 63, sex: 'female' },
    ];
    for (const entry of records) expect(tierOf(entry)).toBe('champion');
  });

  it('is pound-for-pound: the same DOTS-relative lift earns the same score at any bodyweight', () => {
    const light = 100 / dotsCoefficient(60, 'male');
    const heavy = 100 / dotsCoefficient(100, 'male');
    const at = (bodyweightKg: number, loadKg: number) =>
      strengthScore({ lift: 'deadlift', loadKg, reps: 1, bodyweightKg, sex: 'male' });
    expect(at(60, light)).toBeCloseTo(at(100, heavy), 6);
    // A heavier lifter needs more kg for the same rank, but not proportionally more.
    expect(heavy).toBeGreaterThan(light);
    expect(heavy / light).toBeLessThan(100 / 60);
  });

  it('judges pull-ups by bodyweight ratio', () => {
    expect(tierOf({ ...male75, lift: 'pullUp', loadKg: 0, reps: 1 })).toBe('bronze');
    expect(tierOf({ ...male75, lift: 'pullUp', loadKg: 0, reps: 12 })).toBe('gold');
    expect(tierOf({ ...male75, lift: 'pullUp', loadKg: 75, reps: 1 })).toBe('master');
    expect(tierOf({ lift: 'pullUp', loadKg: 0, reps: 1, bodyweightKg: 55, sex: 'female' })).toBe(
      'silver',
    );
  });
});

describe('predictions', () => {
  it('inverts the score for barbell and bodyweight lifts', () => {
    for (const lift of ['benchPress', 'pullUp', 'dip'] as const) {
      const loadKg = loadForScore(lift, 300, 72, 'male');
      expect(strengthScore({ lift, loadKg, reps: 1, bodyweightKg: 72, sex: 'male' })).toBeCloseTo(
        300,
        6,
      );
    }
  });
});

describe('records and overall', () => {
  it('keeps records for a year, then fades them gently to 75%', () => {
    expect(recordWeight(200)).toBe(1);
    expect(recordWeight(365 + 30 * 6)).toBeCloseTo(0.94);
    expect(recordWeight(365 * 5)).toBe(0.75);
  });

  it('needs three patterns, then averages them', () => {
    expect(overallScore({ squat: 300, horizontalPush: 280 })).toBeNull();
    expect(overallScore({ squat: 300, hinge: 320, horizontalPush: 280 })).toBe(300);
  });
});
