import { testId } from '@/lib/routines/__fixtures__/routine';

import {
  addDays,
  currentWeek,
  defaultStart,
  missedDays,
  mondayOf,
  moveDay,
  resumeShift,
  schedulePlan,
  shiftFromMissed,
  skipDay,
  weekdayOf,
} from '../calendar';
import { generatePlan, templateFamily } from '../generate';
import { ctx, input, NOW } from '../__fixtures__/library';

// Thursday 8 October 2026.
const TODAY = '2026-10-08';
const plan = generatePlan(
  input({ goal: 'muscle', level: 'intermediate', schedule: { kind: 'count', days: 4 }, weeks: 6 }),
  ctx,
  { now: NOW },
);
const familyOf = (key: string) => templateFamily({ goal: 'muscle' }, key);

describe('dates', () => {
  it('works in local calendar days with Monday-first weeks', () => {
    expect(weekdayOf(TODAY)).toBe(3);
    expect(mondayOf(TODAY)).toBe('2026-10-05');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  });
});

describe('schedulePlan', () => {
  it('starts this week when at least half the sessions are still ahead', () => {
    // Mon, Tue, Thu, Fri: Thu and Fri remain.
    expect(defaultStart(plan, TODAY)).toBe('this_week');
    expect(defaultStart(plan, '2026-10-10')).toBe('next_week');
  });

  it('lays out weeks Monday to Sunday, leaves out past days and marks the deload week', () => {
    const laid = schedulePlan(plan, { today: TODAY, start: 'this_week', newId: testId });
    expect(laid.weeks).toHaveLength(6);
    expect(laid.weeks[0]!.startsOn).toBe('2026-10-05');
    expect(laid.weeks[5]!.deload).toBe(true);
    expect(laid.days[0]!.date).toBe(TODAY);
    expect(laid.days.filter((d) => d.week === 1)).toHaveLength(2);
    expect(laid.days).toHaveLength(2 + 5 * 4);
    expect(laid.endDate).toBe('2026-11-15');
    const deloadIds = new Set(plan.sessions.map((s) => s.deload!.id));
    expect(laid.days.filter((d) => d.week === 6).every((d) => deloadIds.has(d.routineId!))).toBe(
      true,
    );
  });

  it('starts next Monday when asked', () => {
    const laid = schedulePlan(plan, { today: TODAY, start: 'next_week', newId: testId });
    expect(laid.startDate).toBe('2026-10-12');
    expect(laid.days).toHaveLength(24);
  });
});

describe('editing', () => {
  const laid = schedulePlan(plan, { today: '2026-10-05', start: 'this_week', newId: testId });
  const doc = { ...laid, pausedAt: null };

  it('finds missed sessions and the current week', () => {
    expect(missedDays(doc, '2026-10-07').map((d) => d.date)).toEqual(['2026-10-05', '2026-10-06']);
    expect(missedDays({ ...doc, pausedAt: '2026-10-06T00:00:00Z' }, '2026-10-07')).toEqual([]);
    expect(currentWeek(doc, '2026-10-20')).toBe(3);
  });

  it('skips a session', () => {
    const first = doc.days[0]!;
    expect(skipDay(doc.days, first.id).find((d) => d.id === first.id)!.status).toBe('missed');
  });

  it('shifts the week: the missed session comes to today and later ones keep their spacing', () => {
    // Monday's Upper A missed; it's now Wednesday.
    const missed = doc.days[0]!;
    const out = shiftFromMissed(doc, missed.id, '2026-10-07', familyOf);
    const moved = out.days.find((d) => d.id === missed.id)!;
    expect(moved.date).toBe('2026-10-07');
    expect(moved.status).toBe('moved');
    expect(moved.originalDate).toBe('2026-10-05');
    const tue = out.days.find((d) => d.id === doc.days[1]!.id)!;
    expect(tue.date).toBe('2026-10-08');
    expect(out.endDate).toBe(addDays(doc.endDate, 2));
  });

  it('moves a session within its week and warns about back-to-back overlap', () => {
    const thu = doc.days[2]!; // Upper B
    const ok = moveDay(doc, thu.id, '2026-10-10', '2026-10-05', familyOf);
    expect(ok.ok && ok.warning).toBeNull();
    // Friday's Lower B on Wednesday would follow Tuesday's Lower A.
    const fri = doc.days[3]!;
    const warned = moveDay(doc, fri.id, '2026-10-07', '2026-10-05', familyOf);
    expect(warned.ok && warned.warning).toMatch(/same muscles/);
    expect(moveDay(doc, fri.id, '2026-10-06', '2026-10-05', familyOf)).toEqual({
      ok: false,
      reason: 'There’s already a session that day.',
    });
    expect(moveDay(doc, fri.id, '2026-10-20', '2026-10-05', familyOf).ok).toBe(false);
  });

  it('resuming a pause moves open sessions on by the days paused', () => {
    const out = resumeShift(doc, '2026-10-06', '2026-10-09');
    expect(out.days[0]!.date).toBe('2026-10-05');
    expect(out.days[1]!.date).toBe('2026-10-09');
    expect(out.endDate).toBe(addDays(doc.endDate, 3));
  });
});
