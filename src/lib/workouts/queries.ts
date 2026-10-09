import { and, desc, eq, inArray, ne } from 'drizzle-orm';

import { ensureDb } from '@/lib/db/ensureDb';
import { workoutExercises, workouts, workoutSets } from '@/lib/db/schema';

import type { PreviousSet } from './lastTime';
import { setE1rm } from './oneRepMax';
import type { WorkoutListItem, WorkoutSet } from './types';

/** Read-only queries over local history (finished workouts). All work offline. */

/** Finished workouts, newest first. */
export async function loadWorkoutHistory(): Promise<WorkoutListItem[]> {
  const db = await ensureDb();
  const rows = db
    .select()
    .from(workouts)
    .where(eq(workouts.status, 'completed'))
    .orderBy(desc(workouts.startedAt))
    .all();
  if (rows.length === 0) return [];
  const exerciseRows = db
    .select({
      id: workoutExercises.id,
      workoutId: workoutExercises.workoutId,
      exerciseId: workoutExercises.exerciseId,
      sortOrder: workoutExercises.sortOrder,
    })
    .from(workoutExercises)
    .where(
      inArray(
        workoutExercises.workoutId,
        rows.map((r) => r.id),
      ),
    )
    .all()
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const setRows = db
    .select({ exerciseId: workoutSets.workoutExerciseId, completed: workoutSets.completed })
    .from(workoutSets)
    .where(
      inArray(
        workoutSets.workoutExerciseId,
        exerciseRows.map((e) => e.id),
      ),
    )
    .all();
  const doneByExercise = new Map<string, number>();
  for (const s of setRows) {
    if (s.completed) doneByExercise.set(s.exerciseId, (doneByExercise.get(s.exerciseId) ?? 0) + 1);
  }
  return rows.map(({ runtime: _r, photoUri: _p, pushedAt: _a, pendingEdit: _e, ...w }) => {
    const mine = exerciseRows.filter((e) => e.workoutId === w.id);
    return {
      ...w,
      exerciseCount: mine.length,
      setCount: mine.reduce((n, e) => n + (doneByExercise.get(e.id) ?? 0), 0),
      exerciseIds: mine.map((e) => e.exerciseId),
    };
  });
}

/** Sets of one finished workout's exercise, in order. */
function setsOf(db: Awaited<ReturnType<typeof ensureDb>>, workoutExerciseId: string): WorkoutSet[] {
  return db
    .select()
    .from(workoutSets)
    .where(eq(workoutSets.workoutExerciseId, workoutExerciseId))
    .orderBy(workoutSets.sortOrder)
    .all()
    .map(({ workoutExerciseId: _e, sortOrder: _o, ...s }) => s);
}

/**
 * "Last time": for each exercise, the completed sets of the most recent finished workout that had
 * it (other than `excludeWorkoutId`, the one being logged).
 */
export async function loadPreviousSets(
  exerciseIds: string[],
  excludeWorkoutId?: string,
): Promise<Map<string, PreviousSet[]>> {
  const out = new Map<string, PreviousSet[]>();
  if (exerciseIds.length === 0) return out;
  const db = await ensureDb();
  const rows = db
    .select({ id: workoutExercises.id, exerciseId: workoutExercises.exerciseId })
    .from(workoutExercises)
    .innerJoin(workouts, eq(workouts.id, workoutExercises.workoutId))
    .where(
      and(
        inArray(workoutExercises.exerciseId, exerciseIds),
        eq(workouts.status, 'completed'),
        excludeWorkoutId ? ne(workouts.id, excludeWorkoutId) : undefined,
      ),
    )
    .orderBy(desc(workouts.startedAt))
    .all();
  for (const row of rows) {
    if (out.has(row.exerciseId)) continue;
    out.set(
      row.exerciseId,
      setsOf(db, row.id).filter((s) => s.completed),
    );
  }
  return out;
}

/** Best estimated 1RM per exercise from recent history (for % of 1RM loads). */
export async function loadBestE1rm(exerciseIds: string[]): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  if (exerciseIds.length === 0) return out;
  const db = await ensureDb();
  const rows = db
    .select({
      exerciseId: workoutExercises.exerciseId,
      setType: workoutSets.setType,
      weightMode: workoutSets.weightMode,
      weightKg: workoutSets.weightKg,
      reps: workoutSets.reps,
    })
    .from(workoutSets)
    .innerJoin(workoutExercises, eq(workoutExercises.id, workoutSets.workoutExerciseId))
    .innerJoin(workouts, eq(workouts.id, workoutExercises.workoutId))
    .where(
      and(
        inArray(workoutExercises.exerciseId, exerciseIds),
        eq(workouts.status, 'completed'),
        eq(workoutSets.completed, true),
      ),
    )
    .all();
  for (const r of rows) {
    const e1rm = setE1rm(r);
    if (e1rm !== null && e1rm > (out.get(r.exerciseId) ?? 0)) out.set(r.exerciseId, e1rm);
  }
  return out;
}

export interface ExerciseHistoryEntry {
  workoutId: string;
  workoutName: string;
  startedAt: string;
  sets: WorkoutSet[];
}

/** Every finished workout with this exercise, newest first (exercise detail → History). */
export async function loadExerciseHistory(exerciseId: string): Promise<ExerciseHistoryEntry[]> {
  const db = await ensureDb();
  const rows = db
    .select({
      id: workoutExercises.id,
      workoutId: workouts.id,
      workoutName: workouts.name,
      startedAt: workouts.startedAt,
    })
    .from(workoutExercises)
    .innerJoin(workouts, eq(workouts.id, workoutExercises.workoutId))
    .where(and(eq(workoutExercises.exerciseId, exerciseId), eq(workouts.status, 'completed')))
    .orderBy(desc(workouts.startedAt))
    .all();
  return rows
    .map(({ id, ...r }) => ({ ...r, sets: setsOf(db, id).filter((s) => s.completed) }))
    .filter((r) => r.sets.length > 0);
}

/** When each exercise was last done (epoch ms), for the generator's "least recently trained". */
export async function loadLastDone(): Promise<Map<string, number>> {
  const db = await ensureDb();
  const rows = db
    .select({ exerciseId: workoutExercises.exerciseId, startedAt: workouts.startedAt })
    .from(workoutExercises)
    .innerJoin(workouts, eq(workouts.id, workoutExercises.workoutId))
    .where(eq(workouts.status, 'completed'))
    .all();
  const out = new Map<string, number>();
  for (const r of rows) {
    const at = Date.parse(r.startedAt);
    if (at > (out.get(r.exerciseId) ?? 0)) out.set(r.exerciseId, at);
  }
  return out;
}

/** Version of each finished workout on this device (pull compares these with the server's). */
export async function localWorkoutVersions(): Promise<Map<string, string>> {
  const db = await ensureDb();
  const rows = db
    .select({ id: workouts.id, v: workouts.clientUpdatedAt, r: workouts.revision })
    .from(workouts)
    .where(eq(workouts.status, 'completed'))
    .all();
  return new Map(rows.map((r) => [r.id, `${Date.parse(r.v)}:${r.r}`]));
}
