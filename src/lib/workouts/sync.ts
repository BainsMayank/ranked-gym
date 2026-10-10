import { useAuthStore } from '@/lib/auth/authStore';
import { assertAccount, requireAccount } from '@/lib/auth/scope';
import { queryClient } from '@/lib/queryClient';
import { pendingIds, registerSyncHandler, runSync } from '@/lib/sync';

import {
  deleteRemoteWorkout,
  fetchRemoteWorkouts,
  fetchRemoteWorkoutVersions,
  pushWorkout,
  pushWorkoutPhoto,
} from './api';
import { localWorkoutVersions } from './queries';
import {
  applyWorkoutPull,
  loadWorkoutRecord,
  markPhotoUploaded,
  markWorkoutPushed,
  removeLocalWorkout,
  saveWorkoutRewards,
} from './repository';

/**
 * Workout sync. Pushes go through the outbox: a whole workout per push, idempotent on the server
 * (client ids; a replayed or older push changes nothing), and edits of finished workouts flagged so
 * the server keeps a revision. Photos push after their workout. The pull brings finished workouts
 * made on other devices (or before a reinstall) and drops ones deleted elsewhere.
 */

let registered = false;

function signedInUserId(): string {
  const userId = useAuthStore.getState().session?.user.id;
  if (!userId) throw new Error('Not signed in');
  return userId;
}

export function registerWorkoutSync(): void {
  if (registered) return;
  registered = true;

  registerSyncHandler('workout', {
    // After routines (a workout may point at a routine made offline); deletes last.
    rank: (op) => (op === 'upsert' ? 3 : 5),
    push: async (id, op) => {
      if (op === 'delete') {
        await deleteRemoteWorkout(signedInUserId(), id);
        void queryClient.invalidateQueries({ queryKey: ['insights'] });
        void queryClient.invalidateQueries({ queryKey: ['ranks'] });
        void queryClient.invalidateQueries({ queryKey: ['leagues'] });
        return;
      }
      const record = await loadWorkoutRecord(id);
      if (!record) return;
      // A draft the server never saw needs no "discarded" push.
      if (record.doc.status === 'discarded' && record.pushedAt === null) return;
      const result = await pushWorkout(record.doc, record.pendingEdit);
      // The server now knows it was discarded; nothing local is worth keeping.
      if (record.doc.status === 'discarded') return removeLocalWorkout(id);
      await markWorkoutPushed(id, {
        at: Date.now(),
        clientUpdatedAt: record.doc.clientUpdatedAt,
        revision: result.applied ? result.revision : record.doc.revision,
      });
      // The server scores finished workouts as they arrive; the summary screen is waiting.
      if (result.rewards) await saveWorkoutRewards(id, result.rewards);
      void queryClient.invalidateQueries({ queryKey: ['ranks'] });
      void queryClient.invalidateQueries({ queryKey: ['insights'] });
      void queryClient.invalidateQueries({ queryKey: ['leagues'] });
    },
  });

  registerSyncHandler('workout_photo', {
    rank: () => 4,
    push: async (id) => {
      const record = await loadWorkoutRecord(id);
      if (!record) return;
      const path = await pushWorkoutPhoto(signedInUserId(), id, record.photoUri);
      await markPhotoUploaded(id, path);
    },
  });
}

export interface WorkoutPullResult {
  downloaded: number;
  removed: number;
}

/** Pushes pending changes, then brings finished workouts on this device up to date. */
export async function syncWorkouts(): Promise<WorkoutPullResult> {
  const account = requireAccount();
  registerWorkoutSync();
  await runSync();

  const [remote, local, pending] = await Promise.all([
    fetchRemoteWorkoutVersions(),
    localWorkoutVersions(),
    pendingIds(['workout', 'workout_photo']),
  ]);
  const changed = [...remote]
    .filter(([id, v]) => !pending.has(id) && local.get(id) !== v)
    .map(([id]) => id);
  const removeIds = [...local.keys()].filter((id) => !remote.has(id) && !pending.has(id));
  const docs = await fetchRemoteWorkouts(changed);
  assertAccount(account);
  await applyWorkoutPull({ docs, removeIds });
  return { downloaded: docs.length, removed: removeIds.length };
}
