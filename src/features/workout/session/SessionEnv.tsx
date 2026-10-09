import { createContext, useContext, useMemo, type ReactNode } from 'react';

import { useExercises, type Exercise } from '@/lib/exercises';
import { useProfile, useTrainingSettings } from '@/lib/profile';
import type { EffortMetric } from '@/lib/routines';
import type { WeightUnit } from '@/lib/units';
import { barFor, platesFor, usePreviousSets, type Plate, type PreviousSet } from '@/lib/workouts';

import { useSession } from './store';

/** Read-only things every card needs: the library, units, settings and last time's sets. */
export interface SessionEnv {
  exercises: ReadonlyMap<string, Exercise>;
  unit: WeightUnit;
  effort: EffortMetric;
  defaultRestSec: number;
  /** Bar and plates in the display unit (plate calculator). */
  bar: number;
  plates: Plate[];
  previous: ReadonlyMap<string, PreviousSet[]>;
  nameOf: (exerciseId: string) => string;
}

const Context = createContext<SessionEnv | null>(null);

export function useSessionEnv(): SessionEnv {
  const env = useContext(Context);
  if (!env) throw new Error('useSessionEnv must be used inside SessionEnvProvider');
  return env;
}

export function SessionEnvProvider({ children }: { children: ReactNode }) {
  const { data: library } = useExercises();
  const { data: profile } = useProfile();
  const settings = useTrainingSettings();
  const workoutId = useSession((s) => s.doc?.id);
  // Re-query "last time" only when the set of exercises changes, not on every tick.
  const exerciseKey = useSession((s) => s.doc?.exercises.map((e) => e.exerciseId).join(',') ?? '');
  const ids = useMemo(() => (exerciseKey ? exerciseKey.split(',') : []), [exerciseKey]);
  const { data: previous } = usePreviousSets(ids, workoutId);
  const unit = profile?.units ?? 'kg';

  const value = useMemo<SessionEnv>(() => {
    const map = new Map((library ?? []).map((e) => [e.id, e]));
    return {
      exercises: map,
      unit,
      effort: settings.effort_metric,
      defaultRestSec: settings.rest_timer_default_sec,
      bar: barFor(settings.bar_weight_kg, unit),
      plates: platesFor(settings.plate_inventory, unit),
      previous: previous ?? new Map(),
      nameOf: (id) => map.get(id)?.name ?? 'Exercise',
    };
  }, [library, unit, settings, previous]);

  return <Context.Provider value={value}>{children}</Context.Provider>;
}
