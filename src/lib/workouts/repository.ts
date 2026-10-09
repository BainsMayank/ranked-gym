import { and, asc, eq, inArray } from 'drizzle-orm';

import { ensureDb } from '@/lib/db/ensureDb';
import { planDays, workoutExercises, workouts, workoutSets } from '@/lib/db/schema';
import { dequeueTx, enqueueTx, type Tx } from '@/lib/sync/queue';

import { workoutVolumeKg } from './summary';
import type { WorkoutDoc, WorkoutExercise, WorkoutRuntime } from './types';

/**
 * The local (SQLite) copy of the user's workouts: the source of truth on this device, and the only
 * place an in-progress workout lives until it syncs. Every write queues the change for Supabase in
 * the same transaction (src/lib/sync).
 */

/** In-progress drafts push at most this often while logging (finishing pushes straight away). */
export const DRAFT_PUSH_DELAY_MS = 20_000;

/** A workout with its local-only state. */
export interface WorkoutRecord {
  doc: WorkoutDoc;
  runtime: WorkoutRuntime;
  photoUri: string | null;
  pushedAt: number | null;
  pendingEdit: boolean;
}

const EMPTY_RUNTIME: WorkoutRuntime = { rest: null };

// ─── Reads ──────────────────────────────────────────────────────────────────────────────────────

function loadExercisesTx(db: Tx | Awaited<ReturnType<typeof ensureDb>>, workoutId: string) {
  const rows = db
    .select()
    .from(workoutExercises)
    .where(eq(workoutExercises.workoutId, workoutId))
    .orderBy(asc(workoutExercises.sortOrder))
    .all();
  const sets = rows.length
    ? db
        .select()
        .from(workoutSets)
        .where(
          inArray(
            workoutSets.workoutExerciseId,
            rows.map((r) => r.id),
          ),
        )
        .orderBy(asc(workoutSets.sortOrder))
        .all()
    : [];
  return rows.map(({ workoutId: _w, sortOrder: _s, ...e }): WorkoutExercise => ({
    ...e,
    sets: sets
      .filter((s) => s.workoutExerciseId === e.id)
      .map(({ workoutExerciseId: _e, sortOrder: _o, ...s }) => s),
  }));
}

export async function loadWorkoutRecord(id: string): Promise<WorkoutRecord | null> {
  const db = await ensureDb();
  const row = db.select().from(workouts).where(eq(workouts.id, id)).get();
  if (!row) return null;
  const { runtime, photoUri, pushedAt, pendingEdit, rewards: _rewards, ...workout } = row;
  return {
    doc: { ...workout, exercises: loadExercisesTx(db, id) },
    runtime: runtime ?? EMPTY_RUNTIME,
    photoUri,
    pushedAt,
    pendingEdit,
  };
}

export async function loadWorkoutDoc(id: string): Promise<WorkoutDoc | null> {
  return (await loadWorkoutRecord(id))?.doc ?? null;
}

/** The workout in progress on this device, if any (survives a kill and a restart). */
export async function loadActiveWorkout(): Promise<WorkoutRecord | null> {
  const db = await ensureDb();
  const row = db
    .select({ id: workouts.id })
    .from(workouts)
    .where(eq(workouts.status, 'in_progress'))
    .get();
  return row ? loadWorkoutRecord(row.id) : null;
}

// ─── Writes ─────────────────────────────────────────────────────────────────────────────────────

function deleteChildrenTx(tx: Tx, workoutIds: string[]): void {
  if (workoutIds.length === 0) return;
  const exerciseIds = tx
    .select({ id: workoutExercises.id })
    .from(workoutExercises)
    .where(inArray(workoutExercises.workoutId, workoutIds))
    .all()
    .map((r) => r.id);
  if (exerciseIds.length) {
    tx.delete(workoutSets).where(inArray(workoutSets.workoutExerciseId, exerciseIds)).run();
  }
  tx.delete(workoutExercises).where(inArray(workoutExercises.workoutId, workoutIds)).run();
}

type LocalPatch = Partial<Pick<WorkoutRecord, 'runtime' | 'photoUri' | 'pushedAt' | 'pendingEdit'>>;

/** Writes a workout and its children (replacing the old ones). No queueing: pull uses it too. */
export function writeWorkoutTx(tx: Tx, doc: WorkoutDoc, local: LocalPatch = {}): void {
  const { exercises, ...workout } = doc;
  deleteChildrenTx(tx, [doc.id]);
  const row = { ...workout, ...local };
  tx.insert(workouts)
    .values({ ...row, pendingEdit: local.pendingEdit ?? false })
    .onConflictDoUpdate({ target: workouts.id, set: row })
    .run();
  exercises.forEach(({ sets, ...e }, i) => {
    tx.insert(workoutExercises)
      .values({ ...e, workoutId: doc.id, sortOrder: i })
      .run();
    sets.forEach((s, j) => {
      tx.insert(workoutSets)
        .values({ ...s, workoutExerciseId: e.id, sortOrder: j })
        .run();
    });
  });
}

/** Stamps the device clock and the local volume preview on each change. */
function stamp(doc: WorkoutDoc, at: string): WorkoutDoc {
  return { ...doc, clientUpdatedAt: at, totalVolumeKg: workoutVolumeKg(doc.exercises) };
}

/**
 * Saves the workout being logged. The push is held back (DRAFT_PUSH_DELAY_MS) so a session sends a
 * draft every so often rather than after every set. Starting a new one replaces nothing: there can
 * be only one in progress (a unique index enforces it).
 */
export async function saveActiveWorkout(
  doc: WorkoutDoc,
  runtime: WorkoutRuntime,
  at = new Date(),
): Promise<WorkoutDoc> {
  const db = await ensureDb();
  const next = stamp(doc, at.toISOString());
  db.transaction((tx) => {
    writeWorkoutTx(tx, next, { runtime });
    enqueueTx(tx, 'workout', next.id, 'upsert', at.getTime(), DRAFT_PUSH_DELAY_MS);
  });
  return next;
}

/** Rest timer and other live state only: no sync. */
export async function saveRuntime(id: string, runtime: WorkoutRuntime): Promise<void> {
  const db = await ensureDb();
  db.update(workouts).set({ runtime }).where(eq(workouts.id, id)).run();
}

/**
 * Finishes the workout: stored as completed and pushed straight away (with its photo, if any).
 * A finished workout can only change again through an edit.
 */
export async function finishWorkout(
  doc: WorkoutDoc,
  photoUri: string | null,
  at = new Date(),
): Promise<WorkoutDoc> {
  const db = await ensureDb();
  const iso = at.toISOString();
  const next = stamp({ ...doc, status: 'completed', endedAt: doc.endedAt ?? iso }, iso);
  db.transaction((tx) => {
    writeWorkoutTx(tx, next, { runtime: EMPTY_RUNTIME, photoUri });
    // A planned session marks its day done (the server does the same when the workout arrives).
    if (next.planDayId) {
      tx.update(planDays).set({ status: 'done' }).where(eq(planDays.id, next.planDayId)).run();
    }
    enqueueTx(tx, 'workout', next.id, 'upsert', at.getTime());
    if (photoUri) enqueueTx(tx, 'workout_photo', next.id, 'upsert', at.getTime());
  });
  return next;
}

/** Edits a finished workout: pushed as an edit, which the server keeps as a new revision. */
export async function saveWorkoutEdit(doc: WorkoutDoc, at = new Date()): Promise<WorkoutDoc> {
  const db = await ensureDb();
  const next = stamp(doc, at.toISOString());
  db.transaction((tx) => {
    writeWorkoutTx(tx, next, { pendingEdit: true });
    enqueueTx(tx, 'workout', next.id, 'upsert', at.getTime());
  });
  return next;
}

/** Replaces or removes the photo of a finished workout. */
export async function setWorkoutPhoto(id: string, photoUri: string | null): Promise<void> {
  const db = await ensureDb();
  const at = Date.now();
  db.transaction((tx) => {
    tx.update(workouts).set({ photoUri }).where(eq(workouts.id, id)).run();
    enqueueTx(tx, 'workout_photo', id, 'upsert', at);
  });
}

/**
 * Discards the workout in progress. One the server never saw just disappears; one it has a draft
 * of is pushed as discarded (latest change wins) so it doesn't linger there.
 */
export async function discardWorkout(id: string, at = new Date()): Promise<void> {
  const db = await ensureDb();
  const row = db
    .select({ pushedAt: workouts.pushedAt })
    .from(workouts)
    .where(eq(workouts.id, id))
    .get();
  db.transaction((tx) => {
    if (!row?.pushedAt) {
      deleteChildrenTx(tx, [id]);
      tx.delete(workouts).where(eq(workouts.id, id)).run();
      dequeueTx(tx, 'workout', id);
      return;
    }
    tx.update(workouts)
      .set({ status: 'discarded', runtime: EMPTY_RUNTIME, clientUpdatedAt: at.toISOString() })
      .where(eq(workouts.id, id))
      .run();
    enqueueTx(tx, 'workout', id, 'upsert', at.getTime());
  });
}

/** Drops a workout from this device only (a discarded draft the server has been told about). */
export async function removeLocalWorkout(id: string): Promise<void> {
  const db = await ensureDb();
  db.transaction((tx) => {
    deleteChildrenTx(tx, [id]);
    tx.delete(workouts)
      .where(and(eq(workouts.id, id), eq(workouts.status, 'discarded')))
      .run();
  });
}

/** Deletes a workout from history (and from the server, if it got there). */
export async function deleteWorkout(id: string): Promise<void> {
  const db = await ensureDb();
  const row = db
    .select({ pushedAt: workouts.pushedAt })
    .from(workouts)
    .where(eq(workouts.id, id))
    .get();
  db.transaction((tx) => {
    deleteChildrenTx(tx, [id]);
    tx.delete(workouts).where(eq(workouts.id, id)).run();
    dequeueTx(tx, 'workout_photo', id);
    if (row?.pushedAt) enqueueTx(tx, 'workout', id, 'delete');
    else dequeueTx(tx, 'workout', id);
  });
}

/** After a successful push: remember the server has it (and that an edit went through). */
export async function markWorkoutPushed(
  id: string,
  pushed: { at: number; clientUpdatedAt: string; revision: number },
): Promise<void> {
  const db = await ensureDb();
  db.transaction((tx) => {
    tx.update(workouts).set({ pushedAt: pushed.at }).where(eq(workouts.id, id)).run();
    // Clear the edit flag only if nothing changed again during the push.
    tx.update(workouts)
      .set({ pendingEdit: false, revision: pushed.revision })
      .where(and(eq(workouts.id, id), eq(workouts.clientUpdatedAt, pushed.clientUpdatedAt)))
      .run();
  });
}

/** Keeps the server's rewards for a finished workout (raw JSON; parsed by @/lib/ranks). */
export async function saveWorkoutRewards(id: string, rewards: unknown): Promise<void> {
  const db = await ensureDb();
  db.update(workouts).set({ rewards }).where(eq(workouts.id, id)).run();
}

/** The stored rewards and whether the server has seen the workout yet. */
export async function loadWorkoutRewards(
  id: string,
): Promise<{ rewards: unknown; pushedAt: number | null } | null> {
  const db = await ensureDb();
  const row = db
    .select({ rewards: workouts.rewards, pushedAt: workouts.pushedAt })
    .from(workouts)
    .where(eq(workouts.id, id))
    .get();
  return row ?? null;
}

export async function markPhotoUploaded(id: string, photoPath: string | null): Promise<void> {
  const db = await ensureDb();
  db.update(workouts).set({ photoPath }).where(eq(workouts.id, id)).run();
}

/** Pull: stores finished workouts from the server and removes ones deleted elsewhere. */
export async function applyWorkoutPull(input: {
  docs: WorkoutDoc[];
  removeIds: string[];
  at?: number;
}): Promise<void> {
  const db = await ensureDb();
  const at = input.at ?? Date.now();
  db.transaction((tx) => {
    for (const doc of input.docs) writeWorkoutTx(tx, doc, { pushedAt: at, pendingEdit: false });
    if (input.removeIds.length) {
      deleteChildrenTx(tx, input.removeIds);
      tx.delete(workouts).where(inArray(workouts.id, input.removeIds)).run();
    }
  });
}

/** Sign-out: drop this user's workouts (an unsynced one goes with them, by design). */
export async function clearWorkoutData(): Promise<void> {
  const db = await ensureDb();
  db.transaction((tx) => {
    tx.delete(workoutSets).run();
    tx.delete(workoutExercises).run();
    tx.delete(workouts).run();
  });
}
