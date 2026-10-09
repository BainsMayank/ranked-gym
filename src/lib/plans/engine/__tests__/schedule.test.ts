import { planWeek, trainingWeekdays, backToBack } from '../schedule';
import { templatesFor } from '../splits';
import type { Weekday } from '../types';

const keysFor = (
  goal: Parameters<typeof templatesFor>[0],
  weekdays: Weekday[],
  level = 'intermediate' as const,
) => planWeek(goal, level, weekdays, templatesFor(goal)).week.map((d) => d.key);

describe('schedule', () => {
  it('spreads N days through the week', () => {
    expect(trainingWeekdays({ kind: 'count', days: 3 })).toEqual([0, 2, 4]);
    expect(trainingWeekdays({ kind: 'weekdays', weekdays: [4, 0, 4, 2] })).toEqual([0, 2, 4]);
  });

  it('treats Sunday and Monday as back to back', () => {
    expect(backToBack(6, 0)).toBe(true);
    expect(backToBack(0, 2)).toBe(false);
  });

  it('uses full body on spaced days and push/pull/legs on back-to-back ones', () => {
    expect(keysFor('general', [0, 2, 4])).toEqual(['FB_A', 'FB_B', 'FB_C']);
    expect(keysFor('general', [0, 1, 2])).toEqual(['PUSH_A', 'PULL_A', 'LEGS_A']);
  });

  it('replaces full body A/B with upper/lower on a weekend pair', () => {
    expect(keysFor('muscle', [5, 6])).toEqual(['UPPER_A', 'LOWER_A']);
    expect(keysFor('muscle', [6, 0]).sort()).toEqual(['LOWER_A', 'UPPER_A']);
  });

  it('orders the 5-day hybrid so upper days never touch push or pull days', () => {
    const week = planWeek('muscle', 'intermediate', [0, 1, 2, 3, 4], templatesFor('muscle'));
    expect(week.week.map((d) => d.key)).toEqual([
      'UPPER_A',
      'LOWER_A',
      'PUSH_B',
      'PULL_B',
      'LEGS_B',
    ]);
  });

  it('falls back to alternating upper and lower when nothing else fits', () => {
    // Five glute sessions can't all avoid each other on Thu–Mon; it alternates instead.
    const week = planWeek('curvier', 'intermediate', [0, 3, 4, 5, 6], templatesFor('curvier'));
    const families = week.week.map((d) => templatesFor('curvier')[d.key]!.family);
    for (let i = 0; i < week.week.length; i++) {
      const j = (i + 1) % week.week.length;
      if (backToBack(week.week[i]!.weekday, week.week[j]!.weekday)) {
        expect(families[i]).not.toBe(families[j]);
      }
    }
  });
});
