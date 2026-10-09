import { savedPlan } from '@/lib/plans/__fixtures__/plan';

import { planView } from '../view';

jest.mock('@/lib/plans/repository', () => ({}));
jest.mock('@/lib/plans/hooks', () => ({}));
jest.mock('@/lib/plans/start', () => ({}));

const { plan } = savedPlan();

describe('planView', () => {
  it("shows today's session, the week strip and progress", () => {
    const view = planView(plan, '2026-10-05');
    expect(view.today?.label).toBe('Upper A');
    expect(view.week).toBe(1);
    expect(view.strip.map((d) => d.state)).toEqual([
      'today',
      'upcoming',
      'rest',
      'upcoming',
      'upcoming',
      'rest',
      'rest',
    ]);
    expect(view.total).toBe(24);
  });

  it('marks passed open sessions as missed and finds the next one on a rest day', () => {
    const view = planView(plan, '2026-10-07');
    expect(view.today).toBeNull();
    expect(view.next?.date).toBe('2026-10-08');
    expect(view.missed.map((d) => d.date)).toEqual(['2026-10-05', '2026-10-06']);
    expect(view.strip.slice(0, 2).map((d) => d.state)).toEqual(['missed', 'missed']);
  });

  it('counts done sessions and knows when it is paused or finished', () => {
    const done = {
      ...plan,
      days: plan.days.map((d, i) => (i === 0 ? { ...d, status: 'done' as const } : d)),
    };
    expect(planView(done, '2026-10-06').done).toBe(1);
    expect(planView({ ...plan, pausedAt: '2026-10-06T00:00:00Z' }, '2026-10-08').missed).toEqual(
      [],
    );
    expect(planView(plan, '2026-11-16').finished).toBe(true);
  });
});
