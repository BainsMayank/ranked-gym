import { ensureDb } from '@/lib/db/ensureDb';
import { routineFolders } from '@/lib/db/schema';
import { pendingIds, registerSyncHandler, runSync } from '@/lib/sync';

import {
  deleteRemoteFolder,
  deleteRemoteRoutine,
  fetchRemoteDocs,
  fetchRemoteFolders,
  fetchRemoteVersions,
  pushFolder,
  pushRoutine,
} from './api';
import {
  applyPull,
  loadFolders,
  loadRoutineDoc,
  localRoutineVersions,
  markRoutineSynced,
} from './repository';

/**
 * Routine sync. Pushes go through the outbox (latest local state wins while a change is pending);
 * pulls fetch only routines whose server updated_at differs from the local copy, and remove local
 * ones the server no longer has (unless they are waiting to be pushed).
 */

let registered = false;

export function registerRoutineSync(): void {
  if (registered) return;
  registered = true;

  registerSyncHandler('routine_folder', {
    // Folders go first (routines point at them); folder deletes go last.
    rank: (op) => (op === 'upsert' ? 0 : 2),
    push: async (id, op) => {
      if (op === 'delete') return deleteRemoteFolder(id);
      const folder = (await loadFolders()).find((f) => f.id === id);
      if (folder) await pushFolder(folder);
    },
  });

  registerSyncHandler('routine', {
    rank: () => 1,
    push: async (id, op) => {
      if (op === 'delete') return deleteRemoteRoutine(id);
      const doc = await loadRoutineDoc(id);
      if (!doc) return;
      const updatedAt = await pushRoutine(doc);
      const latest = await loadRoutineDoc(id);
      // Only adopt the server version if nothing changed locally during the push.
      if (latest && latest.updatedAt === doc.updatedAt) await markRoutineSynced(id, updatedAt);
    },
  });
}

export interface PullResult {
  downloaded: number;
  removed: number;
}

/** Pushes pending changes, then brings this device up to date with the server. */
export async function syncRoutines(): Promise<PullResult> {
  registerRoutineSync();
  await runSync();

  const [remoteFolders, remoteVersions, localVersions, pending] = await Promise.all([
    fetchRemoteFolders(),
    fetchRemoteVersions(),
    localRoutineVersions(),
    pendingIds(['routine', 'routine_folder']),
  ]);

  const db = await ensureDb();
  const localFolderIds = db.select({ id: routineFolders.id }).from(routineFolders).all();
  const remoteFolderIds = new Set(remoteFolders.map((f) => f.id));
  const removeFolderIds = localFolderIds
    .map((f) => f.id)
    .filter((id) => !remoteFolderIds.has(id) && !pending.has(id));

  const changed = [...remoteVersions]
    .filter(([id, v]) => !pending.has(id) && localVersions.get(id) !== v)
    .map(([id]) => id);
  const removeRoutineIds = [...localVersions.keys()].filter(
    (id) => !remoteVersions.has(id) && !pending.has(id),
  );

  const docs = await fetchRemoteDocs(changed);
  await applyPull({
    folders: remoteFolders.filter((f) => !pending.has(f.id)),
    removeFolderIds,
    docs,
    removeRoutineIds,
  });
  return { downloaded: docs.length, removed: removeRoutineIds.length };
}
