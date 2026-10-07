import { index, integer, primaryKey, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

// Type-only imports: drizzle-kit loads this file without the `@/` alias.
import type {
  Equipment,
  ExerciseCategory,
  LogType,
  Mechanic,
  Muscle,
  MuscleRole,
} from '@/lib/exercises/taxonomy';

/**
 * Local SQLite schema (Drizzle). Change it, then run `pnpm db:local:generate` to add a migration in
 * drizzle/; the app applies pending migrations on first use (ensureDb).
 *
 * Phase 2: an offline mirror of the exercise library (official + the user's custom exercises) and
 * local usage counts. Phase 4 adds workouts, sets and the sync queue.
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
