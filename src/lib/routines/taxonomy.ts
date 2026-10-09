/**
 * Routine enums. The same lists are Postgres enums (docs/SCHEMA.md); a test keeps them in sync.
 * Shared by the routine builder (Phase 3), live logging (Phase 4) and the plan generator (Phase 5),
 * so this file stays free of React Native.
 */
import type { RankTier } from '@/theme/tokens';

export const setTypes = [
  'warmup',
  'working',
  'top',
  'backoff',
  'drop',
  'failure',
  'amrap',
] as const;
export type SetType = (typeof setTypes)[number];

export const targetTypes = ['reps', 'rep_range', 'duration', 'distance'] as const;
export type TargetType = (typeof targetTypes)[number];

export const weightModes = [
  'absolute',
  'percent_of_1rm',
  'percent_of_top_set',
  'bodyweight',
  'assisted',
] as const;
export type WeightMode = (typeof weightModes)[number];

export const routineSources = ['manual', 'plan', 'copied', 'generated'] as const;
export type RoutineSource = (typeof routineSources)[number];

export const effortMetrics = ['rir', 'rpe', 'both'] as const;
export type EffortMetric = (typeof effortMetrics)[number];

/** A routine's colour is a rank hue, shown only as a small mark (MOBILE-DESIGN.md). */
export const routineColours = [
  'iron',
  'bronze',
  'silver',
  'gold',
  'platinum',
  'diamond',
  'master',
  'champion',
] as const satisfies readonly RankTier[];
export type RoutineColour = (typeof routineColours)[number];

/** Rest timer presets in seconds (30s, 60s, 90s, 2m, 3m, 5m). */
export const restPresets = [30, 60, 90, 120, 180, 300] as const;

export const setTypeInfo: Record<SetType, { mark: string; name: string; description: string }> = {
  warmup: {
    mark: 'W',
    name: 'Warm-up',
    description: 'Lighter ramp-up sets. Not counted in working sets or volume.',
  },
  working: { mark: '1', name: 'Working', description: 'A normal hard set. Numbered 1, 2, 3.' },
  top: { mark: 'T', name: 'Top set', description: 'Your heaviest set of the day.' },
  backoff: {
    mark: 'B',
    name: 'Back-off',
    description: 'Lighter sets after the top set, often a % of it.',
  },
  drop: {
    mark: 'D',
    name: 'Drop set',
    description: 'Straight after the set above, with less weight. Little or no rest.',
  },
  failure: { mark: 'F', name: 'To failure', description: 'Go until you cannot do another rep.' },
  amrap: { mark: 'A', name: 'AMRAP', description: 'As many reps as possible at the target.' },
};

export const weightModeLabels: Record<WeightMode, string> = {
  absolute: 'Weight',
  percent_of_1rm: '% of 1RM',
  percent_of_top_set: '% of top set',
  bodyweight: 'Bodyweight',
  assisted: 'Assisted',
};

export const effortMetricLabels: Record<EffortMetric, string> = {
  rir: 'RIR',
  rpe: 'RPE',
  both: 'Both',
};

/** Limits shared with the server checks (save_routine and table constraints). */
export const ROUTINE_LIMITS = {
  nameMax: 60,
  textMax: 500,
  exercisesMax: 30,
  setsMax: 20,
  restMaxSec: 900,
  repsMax: 100,
  durationMaxSec: 7200,
  distanceMaxM: 100_000,
  percentMax: 150,
  weightMaxKg: 1000,
} as const;

export const DEFAULT_REST_SEC = 90;
