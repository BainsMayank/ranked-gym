import { desc, eq, inArray, isNotNull, isNull, sql } from 'drizzle-orm';

import type { LocalDb } from '@/lib/db/client';
import { ensureDb } from '@/lib/db/ensureDb';
import { exerciseMuscles, exercises, exerciseUsage, meta } from '@/lib/db/schema';

import type { Exercise, ExerciseUsage } from './types';

/**
 * The local (SQLite) copy of the exercise library. Search and the picker read only from here, so
 * they work offline; sync.ts keeps it fresh.
 */

const LIBRARY_VERSION_KEY = 'exercise_library_version';
const LIBRARY_SOURCE_KEY = 'exercise_library_source';
const CHUNK = 100;

type Tx = Parameters<Parameters<LocalDb['transaction']>[0]>[0];

function chunks<T>(items: T[]): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += CHUNK) out.push(items.slice(i, i + CHUNK));
  return out;
}

function insertExercises(tx: Tx, list: Exercise[]): void {
  for (const part of chunks(list)) {
    tx.insert(exercises)
      .values(part.map(({ muscles: _muscles, ...row }) => row))
      .run();
  }
  const muscleRows = list.flatMap((e) => e.muscles.map((m) => ({ exerciseId: e.id, ...m })));
  for (const part of chunks(muscleRows)) tx.insert(exerciseMuscles).values(part).run();
}

function deleteExercises(tx: Tx, ids: string[]): void {
  for (const part of chunks(ids)) {
    tx.delete(exerciseMuscles).where(inArray(exerciseMuscles.exerciseId, part)).run();
    tx.delete(exercises).where(inArray(exercises.id, part)).run();
  }
}

/** Every exercise in the local library (official and custom) with its muscles. */
export async function loadExercises(): Promise<Exercise[]> {
  const db = await ensureDb();
  const rows = db.select().from(exercises).all();
  const muscleRows = db.select().from(exerciseMuscles).all();
  const byExercise = new Map<string, Exercise['muscles']>();
  for (const { exerciseId, ...m } of muscleRows) {
    const list = byExercise.get(exerciseId) ?? [];
    list.push(m);
    byExercise.set(exerciseId, list);
  }
  return rows.map((row) => ({ ...row, muscles: byExercise.get(row.id) ?? [] }));
}

export async function countOfficialExercises(): Promise<number> {
  const db = await ensureDb();
  const row = db
    .select({ count: sql<number>`count(*)` })
    .from(exercises)
    .where(isNull(exercises.createdBy))
    .get();
  return row?.count ?? 0;
}

/** Replaces the whole official library in one transaction and records its version. */
export async function replaceOfficialExercises(
  list: Exercise[],
  version: number,
  source: string,
): Promise<void> {
  const db = await ensureDb();
  db.transaction((tx) => {
    const old = tx
      .select({ id: exercises.id })
      .from(exercises)
      .where(isNull(exercises.createdBy))
      .all();
    deleteExercises(
      tx,
      old.map((r) => r.id),
    );
    insertExercises(tx, list);
    tx.insert(meta)
      .values({ key: LIBRARY_VERSION_KEY, value: String(version) })
      .onConflictDoUpdate({ target: meta.key, set: { value: String(version) } })
      .run();
    tx.insert(meta)
      .values({ key: LIBRARY_SOURCE_KEY, value: source })
      .onConflictDoUpdate({ target: meta.key, set: { value: source } })
      .run();
  });
}

/** Replaces the user's custom exercises with the server's copy. */
export async function replaceCustomExercises(list: Exercise[]): Promise<void> {
  const db = await ensureDb();
  db.transaction((tx) => {
    const old = tx
      .select({ id: exercises.id })
      .from(exercises)
      .where(isNotNull(exercises.createdBy))
      .all();
    deleteExercises(
      tx,
      old.map((r) => r.id),
    );
    insertExercises(tx, list);
  });
}

/** Saves one exercise (a custom one just created or edited). */
export async function upsertLocalExercise(exercise: Exercise): Promise<void> {
  const db = await ensureDb();
  db.transaction((tx) => {
    deleteExercises(tx, [exercise.id]);
    insertExercises(tx, [exercise]);
  });
}

export async function deleteLocalExercise(id: string): Promise<void> {
  const db = await ensureDb();
  db.transaction((tx) => {
    deleteExercises(tx, [id]);
    tx.delete(exerciseUsage).where(eq(exerciseUsage.exerciseId, id)).run();
  });
}

export async function readLocalLibraryVersion(): Promise<number | null> {
  const db = await ensureDb();
  const row = db.select().from(meta).where(eq(meta.key, LIBRARY_VERSION_KEY)).get();
  return row ? Number(row.value) : null;
}

export async function readLocalLibrarySource(): Promise<string | null> {
  const db = await ensureDb();
  return db.select().from(meta).where(eq(meta.key, LIBRARY_SOURCE_KEY)).get()?.value ?? null;
}

/** Counts a pick (or, from Phase 4, a logged exercise) for recent and most-used lists. */
export async function recordExerciseUse(ids: string[], at = Date.now()): Promise<void> {
  if (ids.length === 0) return;
  const db = await ensureDb();
  db.transaction((tx) => {
    for (const id of new Set(ids)) {
      tx.insert(exerciseUsage)
        .values({ exerciseId: id, useCount: 1, lastUsedAt: at })
        .onConflictDoUpdate({
          target: exerciseUsage.exerciseId,
          set: { useCount: sql`${exerciseUsage.useCount} + 1`, lastUsedAt: at },
        })
        .run();
    }
  });
}

export async function loadExerciseUsage(): Promise<ExerciseUsage[]> {
  const db = await ensureDb();
  return db.select().from(exerciseUsage).orderBy(desc(exerciseUsage.lastUsedAt)).all();
}

/** Sign-out: drop this user's custom exercises and usage. The official library stays. */
export async function clearUserExerciseData(): Promise<void> {
  const db = await ensureDb();
  db.transaction((tx) => {
    const custom = tx
      .select({ id: exercises.id })
      .from(exercises)
      .where(isNotNull(exercises.createdBy))
      .all();
    deleteExercises(
      tx,
      custom.map((r) => r.id),
    );
    tx.delete(exerciseUsage).run();
  });
}
