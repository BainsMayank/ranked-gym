import { exercises as seed } from '../../../../../supabase/seed/exercises.ts';
import { testId } from '@/lib/routines/__fixtures__/routine';

import { defaultPlanInput } from '../input';
import type { EngineContext, PlanExercise, PlanInput } from '../types';

/** The official library as the app holds it (uuid-shaped ids, one per slug). */
export const library: PlanExercise[] = seed.map((e, i) => ({
  id: `00000000-0000-4000-a000-${String(i + 1).padStart(12, '0')}`,
  slug: e.slug,
  name: e.name,
  category: e.category,
  equipment: e.equipment,
  mechanic: e.mechanic,
  logType: e.logType,
  muscles: e.muscles,
  createdBy: null,
  isRankable: !!e.rankKey,
}));

export const byId = new Map(library.map((e) => [e.id, e]));
const bySlug = new Map(library.map((e) => [e.slug, e]));

export function idOf(slug: string): string {
  const e = bySlug.get(slug);
  if (!e) throw new Error(`No exercise ${slug}`);
  return e.id;
}

export const ctx: EngineContext = { library, newId: testId, effort: 'rir' };

export const NOW = '2026-10-08T06:00:00.000Z';

export function input(patch: Partial<PlanInput> = {}): PlanInput {
  return { ...defaultPlanInput, ...patch };
}
