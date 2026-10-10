import { sql } from 'drizzle-orm';
import {
  index,
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';

// Type-only imports: drizzle-kit loads this file without the `@/` alias.
import type {
  Equipment,
  ExerciseCategory,
  LogType,
  Mechanic,
  Muscle,
  MuscleRole,
} from '@/lib/exercises/taxonomy';
import type {
  RoutineColour,
  RoutineSource,
  SetType,
  TargetType,
  WeightMode,
} from '@/lib/routines/taxonomy';
import type { PlanDayStatus, PlanGoal, PlanSettings, PlanStatus } from '@/lib/plans/engine/types';
import type { ProgressionRule, RoutineDoc } from '@/lib/routines/types';
import type { SyncEntity } from '@/lib/sync/types';
import type { WorkoutStatus, WorkoutVisibility } from '@/lib/workouts/taxonomy';
import type { WorkoutRuntime } from '@/lib/workouts/types';

/**
 * Local SQLite schema (Drizzle). Change it, then run `pnpm db:local:generate` to add a migration in
 * drizzle/; the app applies pending migrations on first use (ensureDb).
 *
 * Phase 2: an offline mirror of the exercise library (official + the user's custom exercises) and
 * local usage counts. Phase 3: routines, drafts and the sync queue. Phase 4: workouts. Phase 5:
 * plans.
 */

/** Mirrors public.exercises. Arrays are JSON text. */
export const exercises = sqliteTable(
  'exercises',
  {
    id: text('id').primaryKey(),
    slug: text('slug').notNull(),
    name: text('name').notNull(),
    aliases: text('aliases', { mode: 'json' }).$type<string[]>().notNull(),
    category: text('category').$type<ExerciseCategory>().notNull(),
    equipment: text('equipment').$type<Equipment>().notNull(),
    mechanic: text('mechanic').$type<Mechanic>().notNull(),
    logType: text('log_type').$type<LogType>().notNull(),
    unilateral: integer('unilateral', { mode: 'boolean' }).notNull(),
    instructions: text('instructions', { mode: 'json' }).$type<string[]>().notNull(),
    tips: text('tips', { mode: 'json' }).$type<string[]>().notNull(),
    commonMistakes: text('common_mistakes', { mode: 'json' }).$type<string[]>().notNull(),
    mediaUrl: text('media_url'),
    metValue: real('met_value').notNull(),
    isRankable: integer('is_rankable', { mode: 'boolean' }).notNull(),
    rankKey: text('rank_key'),
    /** Null for the official library. */
    createdBy: text('created_by'),
    updatedAt: text('updated_at').notNull(),
  },
  (t) => [index('exercises_created_by').on(t.createdBy)],
);

/** Mirrors public.exercise_muscles. Deleted explicitly with their exercise. */
export const exerciseMuscles = sqliteTable(
  'exercise_muscles',
  {
    exerciseId: text('exercise_id').notNull(),
    muscle: text('muscle').$type<Muscle>().notNull(),
    role: text('role').$type<MuscleRole>().notNull(),
    weight: real('weight').notNull(),
  },
  (t) => [primaryKey({ columns: [t.exerciseId, t.muscle] })],
);

/** How often and how recently this device's user picked each exercise (recent / most used). */
export const exerciseUsage = sqliteTable('exercise_usage', {
  exerciseId: text('exercise_id').primaryKey(),
  useCount: integer('use_count').notNull().default(0),
  /** Epoch milliseconds. */
  lastUsedAt: integer('last_used_at').notNull(),
});

/** Small key-value store for sync state (for example `exercise_library_version`). */
export const meta = sqliteTable('meta', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});

// ─── Phase 3: routines (mirrors of the Supabase tables; source of truth on this device) ────────

/** Mirrors public.routine_folders. */
export const routineFolders = sqliteTable('routine_folders', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  sortOrder: integer('sort_order').notNull(),
  updatedAt: text('updated_at').notNull(),
});

/** Mirrors public.routines (user_id is implied: only the signed-in user's rows are stored). */
export const routines = sqliteTable(
  'routines',
  {
    id: text('id').primaryKey(),
    folderId: text('folder_id'),
    name: text('name').notNull(),
    description: text('description'),
    colour: text('colour').$type<RoutineColour>(),
    estimatedDurationMin: integer('estimated_duration_min').notNull(),
    source: text('source').$type<RoutineSource>().notNull(),
    sourceRef: text('source_ref'),
    sourceLabel: text('source_label'),
    sortOrder: integer('sort_order').notNull(),
    archived: integer('archived', { mode: 'boolean' }).notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (t) => [index('routines_folder').on(t.folderId)],
);

/** Mirrors public.routine_exercises. Deleted explicitly with their routine. */
export const routineExercises = sqliteTable(
  'routine_exercises',
  {
    id: text('id').primaryKey(),
    routineId: text('routine_id').notNull(),
    exerciseId: text('exercise_id').notNull(),
    sortOrder: integer('sort_order').notNull(),
    supersetGroup: integer('superset_group'),
    restSeconds: integer('rest_seconds').notNull(),
    restAfterSupersetSeconds: integer('rest_after_superset_seconds'),
    notes: text('notes'),
    progressionRule: text('progression_rule', { mode: 'json' }).$type<ProgressionRule>(),
  },
  (t) => [index('routine_exercises_routine').on(t.routineId)],
);

/** Mirrors public.routine_sets. */
export const routineSets = sqliteTable(
  'routine_sets',
  {
    id: text('id').primaryKey(),
    routineExerciseId: text('routine_exercise_id').notNull(),
    sortOrder: integer('sort_order').notNull(),
    setType: text('set_type').$type<SetType>().notNull(),
    targetType: text('target_type').$type<TargetType>().notNull(),
    reps: integer('reps'),
    repsMin: integer('reps_min'),
    repsMax: integer('reps_max'),
    durationSec: integer('duration_sec'),
    distanceM: integer('distance_m'),
    weightKg: real('weight_kg'),
    weightMode: text('weight_mode').$type<WeightMode>().notNull(),
    weightPercent: real('weight_percent'),
    rir: integer('rir'),
    rpe: real('rpe'),
    tempo: text('tempo'),
  },
  (t) => [index('routine_sets_exercise').on(t.routineExerciseId)],
);

/** Unsaved editor state per routine (autosaved), restored when the editor reopens. */
export const routineDrafts = sqliteTable('routine_drafts', {
  routineId: text('routine_id').primaryKey(),
  doc: text('doc', { mode: 'json' }).$type<RoutineDoc>().notNull(),
  /** Epoch milliseconds. */
  updatedAt: integer('updated_at').notNull(),
});

/**
 * Outbox of local changes waiting to reach Supabase. One row per entity: repeated edits collapse
 * into the latest operation (routines, folders, workouts and workout photos).
 */
export const syncQueue = sqliteTable(
  'sync_queue',
  {
    entity: text('entity').$type<SyncEntity>().notNull(),
    entityId: text('entity_id').notNull(),
    op: text('op').$type<'upsert' | 'delete'>().notNull(),
    attempts: integer('attempts').notNull().default(0),
    lastError: text('last_error'),
    /** Epoch milliseconds. */
    createdAt: integer('created_at').notNull(),
    /** Epoch milliseconds; backoff after a failure. */
    nextAttemptAt: integer('next_attempt_at').notNull(),
  },
  (t) => [primaryKey({ columns: [t.entity, t.entityId] })],
);

// ─── Phase 4: workouts (mirrors of the Supabase tables plus local-only state) ──────────────────

/**
 * Mirrors public.workouts (this user's rows only). At most one row is `in_progress`: the active
 * workout, the source of truth while logging. Local-only columns carry what never syncs: the rest
 * timer, the picked photo file, and whether the server has seen the workout.
 */
export const workouts = sqliteTable(
  'workouts',
  {
    id: text('id').primaryKey(),
    routineId: text('routine_id'),
    planDayId: text('plan_day_id'),
    name: text('name').notNull(),
    /** ISO timestamps (as in Postgres). */
    startedAt: text('started_at').notNull(),
    endedAt: text('ended_at'),
    durationSec: integer('duration_sec'),
    notes: text('notes'),
    perceivedEffort: integer('perceived_effort'),
    bodyweightKg: real('bodyweight_kg'),
    caloriesEst: integer('calories_est'),
    totalVolumeKg: real('total_volume_kg').notNull(),
    visibility: text('visibility').$type<WorkoutVisibility>().notNull(),
    status: text('status').$type<WorkoutStatus>().notNull(),
    clientUpdatedAt: text('client_updated_at').notNull(),
    revision: integer('revision').notNull(),
    photoPath: text('photo_path'),
    // Local only.
    /** The picked photo, copied into the app's documents folder until it's uploaded. */
    photoUri: text('photo_uri'),
    /** Rest timer and other live-session state (survives a kill). */
    runtime: text('runtime', { mode: 'json' }).$type<WorkoutRuntime>(),
    /** Epoch ms of the last successful push (null = the server has never seen it). */
    pushedAt: integer('pushed_at'),
    /** A completed workout edited on this device; the next push sends it as an edit. */
    pendingEdit: integer('pending_edit', { mode: 'boolean' }).notNull().default(false),
    /** What the server said it earned (records, rank changes), as returned by save_workout. */
    rewards: text('rewards', { mode: 'json' }).$type<unknown>(),
  },
  (t) => [
    index('workouts_started').on(t.startedAt),
    index('workouts_status').on(t.status),
    // One workout in progress at a time.
    uniqueIndex('workouts_one_active')
      .on(t.status)
      .where(sql`${t.status} = 'in_progress'`),
  ],
);

/** Mirrors public.workout_exercises. */
export const workoutExercises = sqliteTable(
  'workout_exercises',
  {
    id: text('id').primaryKey(),
    workoutId: text('workout_id').notNull(),
    exerciseId: text('exercise_id').notNull(),
    sortOrder: integer('sort_order').notNull(),
    supersetGroup: integer('superset_group'),
    restSeconds: integer('rest_seconds').notNull(),
    restAfterSupersetSeconds: integer('rest_after_superset_seconds'),
    notes: text('notes'),
  },
  (t) => [
    index('workout_exercises_workout').on(t.workoutId),
    index('workout_exercises_exercise').on(t.exerciseId),
  ],
);

/** Mirrors public.workout_sets. */
export const workoutSets = sqliteTable(
  'workout_sets',
  {
    id: text('id').primaryKey(),
    workoutExerciseId: text('workout_exercise_id').notNull(),
    sortOrder: integer('sort_order').notNull(),
    setType: text('set_type').$type<SetType>().notNull(),
    weightMode: text('weight_mode').$type<WeightMode>().notNull(),
    targetType: text('target_type').$type<TargetType>(),
    targetReps: integer('target_reps'),
    targetRepsMin: integer('target_reps_min'),
    targetRepsMax: integer('target_reps_max'),
    targetDurationSec: integer('target_duration_sec'),
    targetDistanceM: integer('target_distance_m'),
    targetWeightKg: real('target_weight_kg'),
    targetRir: integer('target_rir'),
    targetRpe: real('target_rpe'),
    tempo: text('tempo'),
    reps: integer('reps'),
    weightKg: real('weight_kg'),
    durationSec: integer('duration_sec'),
    distanceM: integer('distance_m'),
    rir: integer('rir'),
    rpe: real('rpe'),
    completed: integer('completed', { mode: 'boolean' }).notNull(),
    completedAt: text('completed_at'),
    failed: integer('failed', { mode: 'boolean' }).notNull(),
    isPr: integer('is_pr', { mode: 'boolean' }).notNull(),
  },
  (t) => [index('workout_sets_exercise').on(t.workoutExerciseId)],
);

// ─── Phase 5: plans (mirrors of the Supabase tables) ───────────────────────────────────────────

/** Mirrors public.plans (this user's rows only). */
export const plans = sqliteTable(
  'plans',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    goal: text('goal').$type<PlanGoal>().notNull(),
    settings: text('settings', { mode: 'json' }).$type<PlanSettings>().notNull(),
    /** YYYY-MM-DD. */
    startDate: text('start_date').notNull(),
    endDate: text('end_date').notNull(),
    status: text('status').$type<PlanStatus>().notNull(),
    pausedAt: text('paused_at'),
    /** The sync version (server updated_at once pushed). */
    updatedAt: text('updated_at').notNull(),
  },
  (t) => [index('plans_status').on(t.status)],
);

/** Mirrors public.plan_weeks. */
export const planWeeks = sqliteTable(
  'plan_weeks',
  {
    id: text('id').primaryKey(),
    planId: text('plan_id').notNull(),
    week: integer('week').notNull(),
    startsOn: text('starts_on').notNull(),
    deload: integer('deload', { mode: 'boolean' }).notNull(),
  },
  (t) => [index('plan_weeks_plan').on(t.planId)],
);

/** Mirrors public.plan_days. */
export const planDays = sqliteTable(
  'plan_days',
  {
    id: text('id').primaryKey(),
    planId: text('plan_id').notNull(),
    week: integer('week').notNull(),
    date: text('date').notNull(),
    originalDate: text('original_date').notNull(),
    templateKey: text('template_key').notNull(),
    label: text('label').notNull(),
    routineId: text('routine_id'),
    status: text('status').$type<PlanDayStatus>().notNull(),
  },
  (t) => [index('plan_days_plan').on(t.planId, t.date)],
);
