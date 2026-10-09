import { randomUUID } from 'expo-crypto';
import { useMemo } from 'react';

import { useExercises } from '@/lib/exercises';
import type { EngineContext } from '@/lib/plans';
import { useTrainingSettings } from '@/lib/profile';

/** What the plan engine needs from the device: the exercise library and the effort metric. */
export function usePlanEngine(): { ctx: EngineContext; ready: boolean } {
  const { data: library } = useExercises();
  const settings = useTrainingSettings();
  const ctx = useMemo(
    () => ({ library: library ?? [], effort: settings.effort_metric, newId: randomUUID }),
    [library, settings.effort_metric],
  );
  return { ctx, ready: !!library?.length };
}
