import { useQuery } from '@tanstack/react-query';

import type { PlanDoc } from '@/lib/plans';
import { loadRoutineDoc, type RoutineDoc } from '@/lib/routines';

/** The routines a plan's days point at, by id (local reads). */
export function usePlanRoutines(plan: PlanDoc | null | undefined) {
  const ids = [
    ...new Set((plan?.days ?? []).map((d) => d.routineId).filter((x): x is string => !!x)),
  ].sort();
  return useQuery({
    queryKey: ['routines', 'plan', ...ids],
    queryFn: async () => {
      const docs = await Promise.all(ids.map((id) => loadRoutineDoc(id)));
      return new Map(docs.filter((d): d is RoutineDoc => !!d).map((d) => [d.id, d]));
    },
    enabled: ids.length > 0,
    networkMode: 'always',
    staleTime: 0,
  });
}
