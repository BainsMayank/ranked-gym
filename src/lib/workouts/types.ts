import type { SetType, TargetType, WeightMode } from '@/lib/routines/taxonomy';

import type { WorkoutStatus, WorkoutVisibility } from './taxonomy';

/**
 * One logged set: the targets it was planned with (copied from a routine; all optional) and what
 * was actually done. Columns mirror public.workout_sets. `weightKg` is read through `weightMode`:
 * bar/stack weight (absolute), added load (bodyweight) or assistance (assisted). Percentage loads
 * are resolved to kg when the session starts, so a logged set never carries a percentage.
 */
export interface WorkoutSet {
  id: string;
  setType: SetType;
  weightMode: WeightMode;
  targetType: TargetType | null;
  targetReps: number | null;
  targetRepsMin: number | null;
  targetRepsMax: number | null;
  targetDurationSec: number | null;
  targetDistanceM: number | null;
  targetWeightKg: number | null;
  targetRir: number | null;
  targetRpe: number | null;
  tempo: string | null;
  reps: number | null;
  weightKg: number | null;
  durationSec: number | null;
  distanceM: number | null;
  rir: number | null;
  rpe: number | null;
  completed: boolean;
  /** ISO timestamp. */
  completedAt: string | null;
  /** Attempted and missed. */
  failed: boolean;
  /** Filled by the server (Phase 6). */
  isPr: boolean;
}

/** One exercise in a workout, with its sets in order. Mirrors public.workout_exercises. */
export interface WorkoutExercise {
  id: string;
  exerciseId: string;
  supersetGroup: number | null;
  restSeconds: number;
  restAfterSupersetSeconds: number | null;
  notes: string | null;
  sets: WorkoutSet[];
}

/** Workout row without exercises. Mirrors public.workouts. */
export interface Workout {
  id: string;
  routineId: string | null;
  planDayId: string | null;
  name: string;
  /** ISO timestamps. */
  startedAt: string;
  endedAt: string | null;
  /** Server-computed once completed (the client previews it). */
  durationSec: number | null;
  notes: string | null;
  /** 1–10. */
  perceivedEffort: number | null;
  bodyweightKg: number | null;
  /** Server-computed estimate. */
  caloriesEst: number | null;
  /** Server-computed. */
  totalVolumeKg: number;
  visibility: WorkoutVisibility;
  status: WorkoutStatus;
  /** The device clock at the last change: the version for "latest draft wins". */
  clientUpdatedAt: string;
  revision: number;
  photoPath: string | null;
}

/** A workout with its exercises and sets: the unit logging edits and sync pushes. */
export interface WorkoutDoc extends Workout {
  exercises: WorkoutExercise[];
}

/** Live-session state that never syncs but must survive a kill (stored on the local row). */
export interface WorkoutRuntime {
  rest: RestTimer | null;
}

export interface RestTimer {
  /** Epoch ms when the rest ends. */
  endsAt: number;
  /** Full length in seconds (for the ring), including any +/-15 s. */
  totalSec: number;
  /** The exercise whose set started it. */
  exerciseId: string;
  /** What comes next, for the sheet and the notification ("Bench press, set 3"). */
  nextLabel: string | null;
  /** The scheduled local notification, so it can be cancelled. */
  notificationId: string | null;
}

/** A row in History. */
export interface WorkoutListItem extends Workout {
  exerciseCount: number;
  setCount: number;
  /** Library ids in order (for names and muscles). */
  exerciseIds: string[];
}
