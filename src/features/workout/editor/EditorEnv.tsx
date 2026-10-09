import { createContext, useContext, type ReactNode } from 'react';

import type { Exercise } from '@/lib/exercises';
import type { EffortMetric } from '@/lib/routines';
import type { WeightUnit } from '@/lib/units';

/** Read-only things every card needs: the library, units and the user's training settings. */
export interface EditorEnv {
  exercises: ReadonlyMap<string, Exercise>;
  unit: WeightUnit;
  effort: EffortMetric;
  barKg: number;
  /** The user's default rest (Settings → Training), used for newly added exercises. */
  defaultRestSec: number;
}

const Context = createContext<EditorEnv | null>(null);

export function EditorEnvProvider({ value, children }: { value: EditorEnv; children: ReactNode }) {
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useEditorEnv(): EditorEnv {
  const env = useContext(Context);
  if (!env) throw new Error('useEditorEnv must be used inside EditorEnvProvider');
  return env;
}
