import { File } from 'expo-file-system';

import { getSupabase } from '@/lib/supabase';
import type { Database, Json } from '@/types/database';

import type { WorkoutDoc } from './types';

type Tables = Database['public']['Tables'];
type WorkoutRow = Tables['workouts']['Row'];
type ExerciseRow = Tables['workout_exercises']['Row'];
type SetRow = Tables['workout_sets']['Row'];
type WorkoutDocRow = WorkoutRow & {
  workout_exercises: (ExerciseRow & { workout_sets: SetRow[] })[];
};

const DOC_COLUMNS = '*, workout_exercises (*, workout_sets (*))';
export const PHOTO_BUCKET = 'workout-photos';

/** The save_workout payload (snake_case; order comes from array position). */
export function workoutToPayload(doc: WorkoutDoc, edit: boolean): Json {
  return {
    id: doc.id,
    routine_id: doc.routineId,
    plan_day_id: doc.planDayId,
    name: doc.name.trim(),
    started_at: doc.startedAt,
    ended_at: doc.endedAt,
    notes: doc.notes?.trim() || null,
    perceived_effort: doc.perceivedEffort,
    bodyweight_kg: doc.bodyweightKg,
    visibility: doc.visibility,
    status: doc.status,
    client_updated_at: doc.clientUpdatedAt,
    edit,
    exercises: doc.exercises.map((e) => ({
      id: e.id,
      exercise_id: e.exerciseId,
      superset_group: e.supersetGroup,
      rest_seconds: e.restSeconds,
      rest_after_superset_seconds: e.restAfterSupersetSeconds,
      notes: e.notes,
      sets: e.sets.map((s) => ({
        id: s.id,
        set_type: s.setType,
        weight_mode: s.weightMode,
        target_type: s.targetType,
        target_reps: s.targetReps,
        target_reps_min: s.targetRepsMin,
        target_reps_max: s.targetRepsMax,
        target_duration_sec: s.targetDurationSec,
        target_distance_m: s.targetDistanceM,
        target_weight_kg: s.targetWeightKg,
        target_rir: s.targetRir,
        target_rpe: s.targetRpe,
        tempo: s.tempo,
        reps: s.reps,
        weight_kg: s.weightKg,
        duration_sec: s.durationSec,
        distance_m: s.distanceM,
        rir: s.rir,
        rpe: s.rpe,
        completed: s.completed,
        completed_at: s.completedAt,
        failed: s.failed,
      })),
    })),
  };
}

const num = (v: number | null): number | null => (v === null ? null : Number(v));

export function workoutFromRow(row: WorkoutDocRow): WorkoutDoc {
  return {
    id: row.id,
    routineId: row.routine_id,
    planDayId: row.plan_day_id,
    name: row.name,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    durationSec: row.duration_sec,
    notes: row.notes,
    perceivedEffort: row.perceived_effort,
    bodyweightKg: num(row.bodyweight_kg),
    caloriesEst: row.calories_est,
    totalVolumeKg: Number(row.total_volume_kg),
    visibility: row.visibility,
    status: row.status,
    clientUpdatedAt: row.client_updated_at,
    revision: row.revision,
    photoPath: row.photo_path,
    exercises: [...row.workout_exercises]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((e) => ({
        id: e.id,
        exerciseId: e.exercise_id,
        supersetGroup: e.superset_group,
        restSeconds: e.rest_seconds,
        restAfterSupersetSeconds: e.rest_after_superset_seconds,
        notes: e.notes,
        sets: [...e.workout_sets]
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((s) => ({
            id: s.id,
            setType: s.set_type,
            weightMode: s.weight_mode,
            targetType: s.target_type,
            targetReps: s.target_reps,
            targetRepsMin: s.target_reps_min,
            targetRepsMax: s.target_reps_max,
            targetDurationSec: s.target_duration_sec,
            targetDistanceM: s.target_distance_m,
            targetWeightKg: num(s.target_weight_kg),
            targetRir: s.target_rir,
            targetRpe: num(s.target_rpe),
            tempo: s.tempo,
            reps: s.reps,
            weightKg: num(s.weight_kg),
            durationSec: s.duration_sec,
            distanceM: s.distance_m,
            rir: s.rir,
            rpe: num(s.rpe),
            completed: s.completed,
            completedAt: s.completed_at,
            failed: s.failed,
            isPr: s.is_pr,
          })),
      })),
  };
}

export interface PushResult {
  applied: boolean;
  revision: number;
  clientUpdatedAt: string;
  /** Records and rank changes when a finished workout was scored (raw JSON; see @/lib/ranks). */
  rewards: Json | null;
}

function readPushResult(data: Json): PushResult {
  const o = (data ?? {}) as Record<string, Json>;
  return {
    applied: o.applied === true,
    revision: typeof o.revision === 'number' ? o.revision : 0,
    clientUpdatedAt: typeof o.client_updated_at === 'string' ? o.client_updated_at : '',
    rewards: o.rewards ?? null,
  };
}

/** Saves a whole workout. Idempotent: a replay or an older draft changes nothing. */
export async function pushWorkout(doc: WorkoutDoc, edit: boolean): Promise<PushResult> {
  const { data, error } = await getSupabase().rpc('save_workout', {
    p: workoutToPayload(doc, edit),
  });
  if (error) throw error;
  return readPushResult(data);
}

/** Deletes the workout (its rows cascade) and its photo, if it had one. Idempotent. */
export async function deleteRemoteWorkout(userId: string, id: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.from('workouts').delete().eq('id', id);
  if (error) throw error;
  await supabase.storage.from(PHOTO_BUCKET).remove([photoPathFor(userId, id)]);
}

export function photoPathFor(userId: string, workoutId: string): string {
  return `${userId}/${workoutId}.jpg`;
}

/** Uploads (or replaces) the photo and attaches it; with no file, detaches and removes it. */
export async function pushWorkoutPhoto(
  userId: string,
  workoutId: string,
  fileUri: string | null,
): Promise<string | null> {
  const supabase = getSupabase();
  const path = photoPathFor(userId, workoutId);
  if (!fileUri) {
    const { error } = await supabase.rpc('set_workout_photo', { p_id: workoutId });
    if (error) throw error;
    await supabase.storage.from(PHOTO_BUCKET).remove([path]);
    return null;
  }
  const bytes = await new File(fileUri).arrayBuffer();
  const upload = await supabase.storage
    .from(PHOTO_BUCKET)
    .upload(path, bytes, { contentType: 'image/jpeg', upsert: true });
  if (upload.error) throw upload.error;
  const { error } = await supabase.rpc('set_workout_photo', { p_id: workoutId, p_path: path });
  if (error) throw error;
  return path;
}

/** A short-lived link to show a synced photo on another device. */
export async function photoUrl(path: string): Promise<string | null> {
  const { data } = await getSupabase().storage.from(PHOTO_BUCKET).createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}

/** Version of every finished workout on the server (cheap; used to find what changed). */
export async function fetchRemoteWorkoutVersions(): Promise<Map<string, string>> {
  const { data, error } = await getSupabase()
    .from('workouts')
    .select('id, client_updated_at, revision')
    .eq('status', 'completed');
  if (error) throw error;
  return new Map(data.map((r) => [r.id, `${Date.parse(r.client_updated_at)}:${r.revision}`]));
}

export async function fetchRemoteWorkouts(ids: string[]): Promise<WorkoutDoc[]> {
  const out: WorkoutDoc[] = [];
  for (let i = 0; i < ids.length; i += 25) {
    const { data, error } = await getSupabase()
      .from('workouts')
      .select(DOC_COLUMNS)
      .in('id', ids.slice(i, i + 25))
      .returns<WorkoutDocRow[]>();
    if (error) throw error;
    out.push(...data.map(workoutFromRow));
  }
  return out;
}
