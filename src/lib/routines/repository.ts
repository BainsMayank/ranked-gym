import { asc, eq, inArray } from 'drizzle-orm';

import { ensureDb } from '@/lib/db/ensureDb';
import {
  routineDrafts,
  routineExercises,
  routineFolders,
  routines,
  routineSets,
} from '@/lib/db/schema';
import { enqueueTx, type Tx } from '@/lib/sync/queue';

import { countWorkingSets } from './setRules';
import type {
  Routine,
  RoutineDoc,
  RoutineExercise,
  RoutineFolder,
  RoutineListItem,
  RoutineSet,
} from './types';

/**
 * The local (SQLite) copy of the user's routines: the source of truth on this device. Every write
 * queues the change for Supabase in the same transaction (src/lib/sync).
 */

// ─── Reads ──────────────────────────────────────────────────────────────────────────────────────

export async function loadFolders(): Promise<RoutineFolder[]> {
  const db = await ensureDb();
  return db.select().from(routineFolders).orderBy(asc(routineFolders.sortOrder)).all();
}

/** Every routine (archived too) with set counts and its exercises in order. */
export async function loadRoutineList(): Promise<RoutineListItem[]> {
  const db = await ensureDb();
  const rows = db.select().from(routines).orderBy(asc(routines.sortOrder)).all();
  const exerciseRows = db
    .select({
      id: routineExercises.id,
      routineId: routineExercises.routineId,
      exerciseId: routineExercises.exerciseId,
      sortOrder: routineExercises.sortOrder,
    })
    .from(routineExercises)
    .orderBy(asc(routineExercises.sortOrder))
    .all();
  const setRows = db
    .select({ routineExerciseId: routineSets.routineExerciseId, setType: routineSets.setType })
    .from(routineSets)
    .all();

  const setsByExercise = new Map<string, { setType: RoutineSet['setType'] }[]>();
  for (const s of setRows) {
    const list = setsByExercise.get(s.routineExerciseId) ?? [];
    list.push(s);
    setsByExercise.set(s.routineExerciseId, list);
  }
  const byRoutine = new Map<string, RoutineListItem['exercises']>();
  const setCount = new Map<string, number>();
  for (const e of exerciseRows) {
    const sets = setsByExercise.get(e.id) ?? [];
    const list = byRoutine.get(e.routineId) ?? [];
    list.push({ exerciseId: e.exerciseId, workingSets: countWorkingSets(sets) });
    byRoutine.set(e.routineId, list);
    setCount.set(e.routineId, (setCount.get(e.routineId) ?? 0) + sets.length);
  }
  return rows.map((r) => ({
    ...r,
    exercises: byRoutine.get(r.id) ?? [],
    setCount: setCount.get(r.id) ?? 0,
  }));
}

export async function loadRoutineDoc(id: string): Promise<RoutineDoc | null> {
  const db = await ensureDb();
  const routine = db.select().from(routines).where(eq(routines.id, id)).get();
  if (!routine) return null;
  const exerciseRows = db
    .select()
    .from(routineExercises)
    .where(eq(routineExercises.routineId, id))
    .orderBy(asc(routineExercises.sortOrder))
    .all();
  const setRows = exerciseRows.length
    ? db
        .select()
        .from(routineSets)
        .where(
          inArray(
            routineSets.routineExerciseId,
            exerciseRows.map((e) => e.id),
          ),
        )
        .orderBy(asc(routineSets.sortOrder))
        .all()
    : [];
  const exercises: RoutineExercise[] = exerciseRows.map(
    ({ routineId: _r, sortOrder: _s, ...e }) => ({
      ...e,
      sets: setRows
        .filter((s) => s.routineExerciseId === e.id)
        .map(({ routineExerciseId: _e, sortOrder: _o, ...s }) => s),
    }),
  );
  return { ...routine, exercises };
}

// ─── Writes ─────────────────────────────────────────────────────────────────────────────────────

function deleteChildren(tx: Tx, routineIds: string[]): void {
  if (routineIds.length === 0) return;
  const exerciseIds = tx
    .select({ id: routineExercises.id })
    .from(routineExercises)
    .where(inArray(routineExercises.routineId, routineIds))
    .all()
    .map((r) => r.id);
  if (exerciseIds.length) {
    tx.delete(routineSets).where(inArray(routineSets.routineExerciseId, exerciseIds)).run();
  }
  tx.delete(routineExercises).where(inArray(routineExercises.routineId, routineIds)).run();
}

/** Writes a routine and its children (replacing the old ones). No queueing: pull uses it too. */
export function writeDocTx(tx: Tx, doc: RoutineDoc): void {
  const { exercises, ...routine } = doc;
  deleteChildren(tx, [doc.id]);
  tx.insert(routines)
    .values(routine)
    .onConflictDoUpdate({ target: routines.id, set: routine })
    .run();
  exercises.forEach(({ sets, ...e }, i) => {
    tx.insert(routineExercises)
      .values({ ...e, routineId: doc.id, sortOrder: i })
      .run();
    sets.forEach((s, j) => {
      tx.insert(routineSets)
        .values({ ...s, routineExerciseId: e.id, sortOrder: j })
        .run();
    });
  });
}

/** Saves a routine from the editor: writes it, clears its draft and queues the push. */
export async function saveRoutineDoc(doc: RoutineDoc): Promise<void> {
  const db = await ensureDb();
  db.transaction((tx) => {
    writeDocTx(tx, doc);
    tx.delete(routineDrafts).where(eq(routineDrafts.routineId, doc.id)).run();
    enqueueTx(tx, 'routine', doc.id, 'upsert');
  });
}

export type RoutinePatch = Partial<Pick<Routine, 'folderId' | 'archived' | 'sortOrder' | 'name'>>;

/** List actions (move, archive, reorder): changes routine rows only and queues each. */
export async function patchRoutines(
  changes: { id: string; patch: RoutinePatch }[],
  now = new Date().toISOString(),
): Promise<void> {
  if (changes.length === 0) return;
  const db = await ensureDb();
  db.transaction((tx) => {
    for (const { id, patch } of changes) {
      tx.update(routines)
        .set({ ...patch, updatedAt: now })
        .where(eq(routines.id, id))
        .run();
      enqueueTx(tx, 'routine', id, 'upsert');
    }
  });
}

export async function deleteRoutine(id: string): Promise<void> {
  const db = await ensureDb();
  db.transaction((tx) => {
    deleteChildren(tx, [id]);
    tx.delete(routines).where(eq(routines.id, id)).run();
    tx.delete(routineDrafts).where(eq(routineDrafts.routineId, id)).run();
    enqueueTx(tx, 'routine', id, 'delete');
  });
}

export async function saveFolder(folder: RoutineFolder): Promise<void> {
  const db = await ensureDb();
  db.transaction((tx) => {
    tx.insert(routineFolders)
      .values(folder)
      .onConflictDoUpdate({ target: routineFolders.id, set: folder })
      .run();
    enqueueTx(tx, 'routine_folder', folder.id, 'upsert');
  });
}

export async function reorderFolders(ids: string[], now = new Date().toISOString()) {
  const db = await ensureDb();
  db.transaction((tx) => {
    ids.forEach((id, i) => {
      tx.update(routineFolders)
        .set({ sortOrder: i, updatedAt: now })
        .where(eq(routineFolders.id, id))
        .run();
      enqueueTx(tx, 'routine_folder', id, 'upsert');
    });
  });
}

/** Deletes a folder; its routines stay, without a folder (the server does the same). */
export async function deleteFolder(id: string): Promise<void> {
  const db = await ensureDb();
  db.transaction((tx) => {
    tx.update(routines).set({ folderId: null }).where(eq(routines.folderId, id)).run();
    tx.delete(routineFolders).where(eq(routineFolders.id, id)).run();
    enqueueTx(tx, 'routine_folder', id, 'delete');
  });
}

/** Marks a pushed routine with the server's updated_at so the next pull skips it. */
export async function markRoutineSynced(id: string, updatedAt: string): Promise<void> {
  const db = await ensureDb();
  db.update(routines).set({ updatedAt }).where(eq(routines.id, id)).run();
}

/** Pull: replaces the given routines and folders, and removes ones gone from the server. */
export async function applyPull(input: {
  folders: RoutineFolder[] | null;
  removeFolderIds: string[];
  docs: RoutineDoc[];
  removeRoutineIds: string[];
}): Promise<void> {
  const db = await ensureDb();
  db.transaction((tx) => {
    for (const f of input.folders ?? []) {
      tx.insert(routineFolders)
        .values(f)
        .onConflictDoUpdate({ target: routineFolders.id, set: f })
        .run();
    }
    if (input.removeFolderIds.length) {
      tx.delete(routineFolders).where(inArray(routineFolders.id, input.removeFolderIds)).run();
    }
    for (const doc of input.docs) writeDocTx(tx, doc);
    if (input.removeRoutineIds.length) {
      deleteChildren(tx, input.removeRoutineIds);
      tx.delete(routines).where(inArray(routines.id, input.removeRoutineIds)).run();
    }
  });
}

export async function localRoutineVersions(): Promise<Map<string, string>> {
  const db = await ensureDb();
  const rows = db.select({ id: routines.id, updatedAt: routines.updatedAt }).from(routines).all();
  return new Map(rows.map((r) => [r.id, r.updatedAt]));
}

// ─── Drafts ─────────────────────────────────────────────────────────────────────────────────────

export async function loadDraft(
  routineId: string,
): Promise<{ doc: RoutineDoc; updatedAt: number } | null> {
  const db = await ensureDb();
  const row = db.select().from(routineDrafts).where(eq(routineDrafts.routineId, routineId)).get();
  return row ? { doc: row.doc, updatedAt: row.updatedAt } : null;
}

export async function saveDraft(doc: RoutineDoc, at = Date.now()): Promise<void> {
  const db = await ensureDb();
  db.insert(routineDrafts)
    .values({ routineId: doc.id, doc, updatedAt: at })
    .onConflictDoUpdate({ target: routineDrafts.routineId, set: { doc, updatedAt: at } })
    .run();
}

export async function deleteDraft(routineId: string): Promise<void> {
  const db = await ensureDb();
  db.delete(routineDrafts).where(eq(routineDrafts.routineId, routineId)).run();
}

/** Sign-out: drop this user's routines, folders and drafts. */
export async function clearRoutineData(): Promise<void> {
  const db = await ensureDb();
  db.transaction((tx) => {
    tx.delete(routineSets).run();
    tx.delete(routineExercises).run();
    tx.delete(routines).run();
    tx.delete(routineFolders).run();
    tx.delete(routineDrafts).run();
  });
}
