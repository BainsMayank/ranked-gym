/** Shared sync types. Free of React Native and SQLite so tests can use them with a memory store. */

export type SyncOp = 'upsert' | 'delete';
export type SyncEntity = 'routine_folder' | 'routine' | 'plan' | 'workout' | 'workout_photo';

export interface QueueItem {
  entity: SyncEntity;
  entityId: string;
  op: SyncOp;
  attempts: number;
  /** Version of the queued change: a newer local change replaces it with a later value. */
  createdAt: number;
}

export interface QueueStats {
  /** Changes waiting to be pushed. */
  pending: number;
  /** Of those, how many failed at least once. */
  failing: number;
  /** Of those, how many failed STUCK_ATTEMPTS times or more (shown as a problem). */
  stuck: number;
  lastError: string | null;
}

/** Where the outbox lives: SQLite in the app, memory in tests. */
export interface QueueStore {
  /** Items whose next attempt is due, oldest first. */
  due(now: number): Promise<QueueItem[]>;
  /** Removes a pushed item unless it changed again while the push was in flight. */
  complete(item: QueueItem): Promise<boolean>;
  /** Records a failure and backs the item off. */
  fail(item: QueueItem, error: unknown, now: number): Promise<void>;
  /** Earliest next attempt among waiting items (null when the queue is empty). */
  nextDueAt(): Promise<number | null>;
  /**
   * Makes failed items due now (the connection came back). `includeDelayed` also makes held-back
   * drafts due (sign-out wants everything pushed).
   */
  retryNow(now: number, includeDelayed?: boolean): Promise<void>;
  stats(): Promise<QueueStats>;
}

/** After this many failures an item is reported as stuck (it keeps retrying at the max backoff). */
export const STUCK_ATTEMPTS = 8;

const BASE_BACKOFF_MS = 5000;
export const MAX_BACKOFF_MS = 10 * 60 * 1000;

/** 5 s, 10 s, 20 s … capped at 10 minutes. */
export function backoffMs(attempts: number): number {
  return Math.min(MAX_BACKOFF_MS, BASE_BACKOFF_MS * 2 ** Math.max(0, attempts - 1));
}

/** Supabase errors are plain objects with a message (and a code), not Error instances. */
export function errorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error) {
    const code = 'code' in error && error.code ? ` (${String(error.code)})` : '';
    return `${String(error.message)}${code}`;
  }
  return String(error);
}
