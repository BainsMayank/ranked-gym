import type { RoutineColour, RoutineSource, SetType, TargetType, WeightMode } from './taxonomy';

/**
 * One planned set. Columns mirror public.routine_sets. Which target field is used follows
 * `targetType` (reps, repsMin/repsMax, durationSec or distanceM); the load follows `weightMode`:
 *
 * - absolute: weightKg is the bar/stack weight (null = not set yet)
 * - percent_of_1rm / percent_of_top_set: weightPercent (1–150)
 * - bodyweight: weightKg is added load (null or 0 = none)
 * - assisted: weightKg is the assistance (machine counterweight or band estimate)
 *
 * Phase 4 copies these targets into a session; Phase 5 writes them from a plan.
 */
export interface RoutineSet {
  id: string;
  setType: SetType;
  targetType: TargetType;
  reps: number | null;
  repsMin: number | null;
  repsMax: number | null;
  durationSec: number | null;
  distanceM: number | null;
  weightKg: number | null;
  weightMode: WeightMode;
  weightPercent: number | null;
  /** Reps in reserve, 0–5. */
  rir: number | null;
  /** 5–10 in 0.5 steps. */
  rpe: number | null;
  /** Eccentric-pause-concentric-pause seconds, e.g. '3-1-1-0'. X = explosive. */
  tempo: string | null;
}

/** Plan rules for progressing an exercise (Phase 5). Opaque to the builder. */
export type ProgressionRule = Record<string, unknown>;

/** One exercise in a routine, with its sets in order. Mirrors public.routine_exercises. */
export interface RoutineExercise {
  id: string;
  exerciseId: string;
  /** Exercises next to each other with the same value run as a superset or circuit. */
  supersetGroup: number | null;
  /** Rest after each set; inside a superset, rest before the next member (usually 0). */
  restSeconds: number;
  /** Superset members only: rest after a full round. The same on every member. */
  restAfterSupersetSeconds: number | null;
  notes: string | null;
  progressionRule: ProgressionRule | null;
  sets: RoutineSet[];
}

export interface RoutineFolder {
  id: string;
  name: string;
  sortOrder: number;
  updatedAt: string;
}

/** Routine row without its exercises (lists). Mirrors public.routines. */
export interface Routine {
  id: string;
  folderId: string | null;
  name: string;
  description: string | null;
  colour: RoutineColour | null;
  /** Computed by the client on save (estimateDurationMin). */
  estimatedDurationMin: number;
  source: RoutineSource;
  /** Where it came from: 'template:<slug>', a plan id, a post id. */
  sourceRef: string | null;
  /** Credit for a copy, e.g. '@aarav' (shown as "Copied from @aarav"). */
  sourceLabel?: string | null;
  sortOrder: number;
  archived: boolean;
  updatedAt: string;
}

/** A routine with its exercises and sets: the unit the editor saves and sync pushes. */
export interface RoutineDoc extends Routine {
  exercises: RoutineExercise[];
}

/** What list screens show for a routine (counts come from the local tables). */
export interface RoutineListItem extends Routine {
  setCount: number;
  /** In order, with working-set counts (for target muscles and search). */
  exercises: { exerciseId: string; workingSets: number }[];
}
