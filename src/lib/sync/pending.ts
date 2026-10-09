import type { SyncEntity } from './types';

/**
 * What the outbox still holds, counted the way a person thinks of it: a workout and its photo are
 * one workout, and a photo counts on its own only when its workout already synced.
 */
export interface PendingSummary {
  total: number;
  workouts: number;
  photos: number;
  routines: number;
  folders: number;
  plans: number;
}

export const NOTHING_PENDING: PendingSummary = {
  total: 0,
  workouts: 0,
  photos: 0,
  routines: 0,
  folders: 0,
  plans: 0,
};

export function summarisePending(rows: { entity: SyncEntity; entityId: string }[]): PendingSummary {
  const ids = (entity: SyncEntity) =>
    new Set(rows.filter((r) => r.entity === entity).map((r) => r.entityId));
  const workouts = ids('workout');
  const photos = [...ids('workout_photo')].filter((id) => !workouts.has(id)).length;
  const routines = ids('routine').size;
  const folders = ids('routine_folder').size;
  const plans = ids('plan').size;
  return {
    total: workouts.size + photos + routines + folders + plans,
    workouts: workouts.size,
    photos,
    routines,
    folders,
    plans,
  };
}
