import { testId } from '@/lib/routines/__fixtures__/routine';

import { schedulePlan } from '../engine/calendar';
import { generatePlan } from '../engine/generate';
import type { PlanDoc } from '../engine/types';
import { ctx, input, NOW } from '../engine/__fixtures__/library';

/** A saved 4-day, 6-week muscle plan starting Monday 5 Oct 2026, with its routines. */
export function savedPlan(patch: Partial<PlanDoc> = {}) {
  const generated = generatePlan(
    input({
      goal: 'muscle',
      level: 'intermediate',
      schedule: { kind: 'count', days: 4 },
      weeks: 6,
    }),
    ctx,
    { now: NOW },
  );
  const laid = schedulePlan(generated, { today: '2026-10-05', start: 'this_week', newId: testId });
  const plan: PlanDoc = {
    id: generated.id,
    name: generated.name,
    goal: generated.goal,
    settings: generated.settings,
    status: 'active',
    pausedAt: null,
    updatedAt: NOW,
    ...laid,
    ...patch,
  };
  const routines = generated.sessions.flatMap((s) =>
    s.deload ? [s.routine, s.deload] : [s.routine],
  );
  return { plan, generated, routines: new Map(routines.map((r) => [r.id, r])) };
}
