import { rankTiers } from '@/theme';

import { rankConfig, TIER_FLOORS } from '../../../../../supabase/seed/standards.ts';
import { loadForE1rm, rankE1rm, repFactor } from '../e1rm';
import { interpolate } from '../interpolate';
import { evenThresholds, ordinal, tierFor } from '../tiers';
import { TIERS } from '../types';

describe('e1RM (mean of Epley and Brzycki, 1–10 reps)', () => {
  it.each([
    [100, 1, 100],
    [100, 2, 104.76],
    [100, 5, 114.58],
    [100, 8, 125.4],
    [100, 10, 133.33],
    [60, 5, 68.75],
  ])('%p kg × %p = %p', (load, reps, expected) => {
    expect(rankE1rm(load, reps)).toBeCloseTo(expected, 1);
  });

  it.each([
    [100, 11],
    [100, 0],
    [0, 5],
    [null, 5],
    [100, null],
    [100, 2.5],
  ])('gives no estimate for %p kg × %p', (load, reps) => {
    expect(rankE1rm(load, reps)).toBeNull();
  });

  it('inverts exactly', () => {
    for (const reps of [1, 3, 5, 8, 10]) {
      expect(loadForE1rm(rankE1rm(87.5, reps) ?? 0, reps)).toBeCloseTo(87.5, 6);
    }
    expect(repFactor(1)).toBe(1);
  });
});

describe('interpolation through the origin', () => {
  const xs = [1, 2, 4];
  const ys = [100, 250, 400];
  it.each([
    [0, 0],
    [-3, 0],
    [0.5, 50],
    [1, 100],
    [1.5, 175],
    [3, 325],
    [4, 400],
    [6, 550],
  ])('x = %p → %p', (x, y) => {
    expect(interpolate(x, xs, ys)).toBeCloseTo(y, 9);
  });

  it('is its own inverse with the axes swapped', () => {
    for (const x of [0.3, 1.7, 3.9, 5.5]) {
      expect(interpolate(interpolate(x, xs, ys), ys, xs)).toBeCloseTo(x, 9);
    }
  });

  it('handles a single point and empty input', () => {
    expect(interpolate(2, [4], [400])).toBe(200);
    expect(interpolate(8, [4], [400])).toBe(800);
    expect(interpolate(2, [], [])).toBe(0);
  });
});

describe('tiers and divisions', () => {
  const thresholds = evenThresholds(TIER_FLOORS);

  it('has III, II, I for every tier but Champion', () => {
    expect(thresholds).toHaveLength(22);
    expect(thresholds.map((t) => t.minScore)).toEqual(
      [...thresholds.map((t) => t.minScore)].sort((a, b) => a - b),
    );
    expect(TIERS).toEqual(rankTiers);
    expect(rankConfig.thresholds).toEqual(thresholds);
  });

  it.each([
    [0, 'iron', 3],
    [33.33, 'iron', 2],
    [99.99, 'iron', 1],
    [100, 'bronze', 3],
    [150, 'bronze', 2],
    [249.99, 'bronze', 1],
    [400, 'gold', 3],
    [520, 'gold', 1],
    [850, 'master', 3],
    [883.33, 'master', 2],
    [949.99, 'master', 1],
    [950, 'champion', null],
    [1000, 'champion', null],
  ])('score %p → %s %p', (score, tier, division) => {
    expect(tierFor(score, thresholds)).toMatchObject({ tier, division });
  });

  it('reports progress and the next division', () => {
    const pos = tierFor(475, thresholds);
    expect(pos).toMatchObject({ tier: 'gold', division: 2, next: { tier: 'gold', division: 1 } });
    expect(pos.progress).toBeCloseTo(0.5);
    expect(pos.nextScore).toBe(500);
    expect(tierFor(990, thresholds)).toMatchObject({ next: null, nextScore: null, progress: 0.8 });
  });

  it('orders the ladder from Iron III (0) to Champion (21)', () => {
    expect(ordinal('iron', 3)).toBe(0);
    expect(ordinal('iron', 1)).toBe(2);
    expect(ordinal('bronze', 3)).toBe(3);
    expect(ordinal('master', 1)).toBe(20);
    expect(ordinal('champion', null)).toBe(21);
    const all = thresholds.map((t) => ordinal(t.tier, t.division));
    expect(all).toEqual(all.map((_, i) => i));
  });
});
