import { getSupabase } from '@/lib/supabase';
import type { Database, Json } from '@/types/database';

import type { RoutineColour } from './taxonomy';
import type { ProgressionRule, RoutineDoc, RoutineFolder } from './types';

type Tables = Database['public']['Tables'];
type RoutineRow = Tables['routines']['Row'];
type ExerciseRow = Tables['routine_exercises']['Row'];
type SetRow = Tables['routine_sets']['Row'];

type RoutineDocRow = RoutineRow & {
  routine_exercises: (ExerciseRow & { routine_sets: SetRow[] })[];
};

const DOC_COLUMNS = '*, routine_exercises (*, routine_sets (*))';

/** The save_routine payload (snake_case; order comes from array position). */
export function docToPayload(doc: RoutineDoc): Json {
  return {
    id: doc.id,
    folder_id: doc.folderId,
    name: doc.name.trim(),
    description: doc.description,
    colour: doc.colour,
    estimated_duration_min: doc.estimatedDurationMin,
    source: doc.source,
    source_ref: doc.sourceRef,
    sort_order: doc.sortOrder,
    archived: doc.archived,
    exercises: doc.exercises.map((e) => ({
      id: e.id,
      exercise_id: e.exerciseId,
      superset_group: e.supersetGroup,
      rest_seconds: e.restSeconds,
      rest_after_superset_seconds: e.restAfterSupersetSeconds,
      notes: e.notes,
      progression_rule: (e.progressionRule ?? null) as Json,
      sets: e.sets.map((s) => ({
        id: s.id,
        set_type: s.setType,
        target_type: s.targetType,
        reps: s.reps,
        reps_min: s.repsMin,
        reps_max: s.repsMax,
        duration_sec: s.durationSec,
        distance_m: s.distanceM,
        weight_kg: s.weightKg,
        weight_mode: s.weightMode,
        weight_percent: s.weightPercent,
        rir: s.rir,
        rpe: s.rpe,
        tempo: s.tempo,
      })),
    })),
  };
}

const num = (v: number | null): number | null => (v === null ? null : Number(v));

export function docFromRow(row: RoutineDocRow): RoutineDoc {
  const exercises = [...row.routine_exercises].sort((a, b) => a.sort_order - b.sort_order);
  return {
    id: row.id,
    folderId: row.folder_id,
    name: row.name,
    description: row.description,
    colour: row.colour as RoutineColour | null,
    estimatedDurationMin: row.estimated_duration_min,
    source: row.source,
    sourceRef: row.source_ref,
    sortOrder: row.sort_order,
    archived: row.archived,
    updatedAt: row.updated_at,
    exercises: exercises.map((e) => ({
      id: e.id,
      exerciseId: e.exercise_id,
      supersetGroup: e.superset_group,
      restSeconds: e.rest_seconds,
      restAfterSupersetSeconds: e.rest_after_superset_seconds,
      notes: e.notes,
      progressionRule: (e.progression_rule ?? null) as ProgressionRule | null,
      sets: [...e.routine_sets]
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((s) => ({
          id: s.id,
          setType: s.set_type,
          targetType: s.target_type,
          reps: s.reps,
          repsMin: s.reps_min,
          repsMax: s.reps_max,
          durationSec: s.duration_sec,
          distanceM: s.distance_m,
          weightKg: num(s.weight_kg),
          weightMode: s.weight_mode,
          weightPercent: num(s.weight_percent),
          rir: s.rir,
          rpe: num(s.rpe),
          tempo: s.tempo,
        })),
    })),
  };
}

/** Saves a whole routine; returns the server's updated_at. */
export async function pushRoutine(doc: RoutineDoc): Promise<string> {
  const { data, error } = await getSupabase().rpc('save_routine', { p: docToPayload(doc) });
  if (error) throw error;
  return data;
}

export async function deleteRemoteRoutine(id: string): Promise<void> {
  const { error } = await getSupabase().from('routines').delete().eq('id', id);
  if (error) throw error;
}

export async function pushFolder(folder: RoutineFolder): Promise<void> {
  const { error } = await getSupabase()
    .from('routine_folders')
    .upsert({ id: folder.id, name: folder.name.trim(), sort_order: folder.sortOrder });
  if (error) throw error;
}

export async function deleteRemoteFolder(id: string): Promise<void> {
  const { error } = await getSupabase().from('routine_folders').delete().eq('id', id);
  if (error) throw error;
}

export async function fetchRemoteFolders(): Promise<RoutineFolder[]> {
  const { data, error } = await getSupabase()
    .from('routine_folders')
    .select('id, name, sort_order, updated_at');
  if (error) throw error;
  return data.map((f) => ({
    id: f.id,
    name: f.name,
    sortOrder: f.sort_order,
    updatedAt: f.updated_at,
  }));
}

/** Ids and versions of every routine on the server (cheap; used to find what changed). */
export async function fetchRemoteVersions(): Promise<Map<string, string>> {
  const { data, error } = await getSupabase().from('routines').select('id, updated_at');
  if (error) throw error;
  return new Map(data.map((r) => [r.id, r.updated_at]));
}

export async function fetchRemoteDocs(ids: string[]): Promise<RoutineDoc[]> {
  const out: RoutineDoc[] = [];
  for (let i = 0; i < ids.length; i += 50) {
    const { data, error } = await getSupabase()
      .from('routines')
      .select(DOC_COLUMNS)
      .in('id', ids.slice(i, i + 50))
      .returns<RoutineDocRow[]>();
    if (error) throw error;
    out.push(...data.map(docFromRow));
  }
  return out;
}
