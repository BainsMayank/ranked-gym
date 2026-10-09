import { create } from 'zustand';

import type { QueueStats } from './types';

/**
 * What the sync indicator shows. Updated by the runner after every drain and by the network
 * watcher; read with `useSyncStatus()`.
 */
interface SyncStatusState extends QueueStats {
  /** A drain is running. */
  syncing: boolean;
  /** False only when the OS says there's no connection (unknown counts as online). */
  online: boolean;
  /** Epoch ms of the last drain that ended with nothing failing. */
  lastSyncedAt: number | null;
}

export const useSyncStatusStore = create<SyncStatusState>()(() => ({
  pending: 0,
  failing: 0,
  stuck: 0,
  lastError: null,
  syncing: false,
  online: true,
  lastSyncedAt: null,
}));

export type SyncState = 'synced' | 'syncing' | 'pending' | 'offline' | 'error';

/** One word for the indicator: offline wins, then a stuck item, then work in progress. */
export function syncStateOf(
  s: Pick<SyncStatusState, keyof QueueStats | 'syncing' | 'online'>,
): SyncState {
  if (s.pending === 0) return s.syncing ? 'syncing' : 'synced';
  if (!s.online) return 'offline';
  if (s.stuck > 0) return 'error';
  if (s.syncing) return 'syncing';
  return 'pending';
}

export function useSyncStatus() {
  const status = useSyncStatusStore();
  return { ...status, state: syncStateOf(status) };
}
