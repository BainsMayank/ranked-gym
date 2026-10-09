import { and, asc, eq, gt, inArray, lte, min, sql } from 'drizzle-orm';

import type { LocalDb } from '@/lib/db/client';
import { ensureDb } from '@/lib/db/ensureDb';
import { syncQueue } from '@/lib/db/schema';

import { summarisePending, type PendingSummary } from './pending';
import {
  backoffMs,
  errorMessage,
  STUCK_ATTEMPTS,
  type QueueItem,
  type QueueStats,
  type QueueStore,
  type SyncEntity,
  type SyncOp,
} from './types';

/**
 * The outbox. Local writes add a row here in the same SQLite transaction, so a change can never be
 * saved without also being queued for Supabase. One row per entity: a newer change replaces the
 * pending one (the push always sends the latest local state).
 */

export type { QueueItem, SyncEntity, SyncOp } from './types';
export type Tx = Parameters<Parameters<LocalDb['transaction']>[0]>[0];

/**
 * Queues an entity. `delayMs` holds the push back (an in-progress workout pushes at most every
 * 20 s instead of after every set); each newer change restarts the delay.
 */
export function enqueueTx(
  tx: Tx,
  entity: SyncEntity,
  entityId: string,
  op: SyncOp,
  at = Date.now(),
  delayMs = 0,
): void {
  const nextAttemptAt = at + delayMs;
  tx.insert(syncQueue)
    .values({ entity, entityId, op, attempts: 0, createdAt: at, nextAttemptAt })
    .onConflictDoUpdate({
      target: [syncQueue.entity, syncQueue.entityId],
      set: { op, attempts: 0, lastError: null, createdAt: at, nextAttemptAt },
    })
    .run();
}

/** Drops a queued item (for example a draft discarded before it ever reached the server). */
export function dequeueTx(tx: Tx, entity: SyncEntity, entityId: string): void {
  tx.delete(syncQueue)
    .where(and(eq(syncQueue.entity, entity), eq(syncQueue.entityId, entityId)))
    .run();
}

const sameVersion = (item: QueueItem) =>
  and(
    eq(syncQueue.entity, item.entity),
    eq(syncQueue.entityId, item.entityId),
    eq(syncQueue.createdAt, item.createdAt),
  );

/** The outbox in the app's SQLite database. */
export const sqliteQueueStore: QueueStore = {
  async due(now) {
    const db = await ensureDb();
    return db
      .select({
        entity: syncQueue.entity,
        entityId: syncQueue.entityId,
        op: syncQueue.op,
        attempts: syncQueue.attempts,
        createdAt: syncQueue.createdAt,
      })
      .from(syncQueue)
      .where(lte(syncQueue.nextAttemptAt, now))
      .orderBy(asc(syncQueue.createdAt))
      .all();
  },
  async complete(item) {
    const db = await ensureDb();
    return db.delete(syncQueue).where(sameVersion(item)).run().changes > 0;
  },
  async fail(item, error, now) {
    const db = await ensureDb();
    const attempts = item.attempts + 1;
    db.update(syncQueue)
      .set({ attempts, lastError: errorMessage(error), nextAttemptAt: now + backoffMs(attempts) })
      .where(sameVersion(item))
      .run();
  },
  async nextDueAt() {
    const db = await ensureDb();
    const row = db
      .select({ at: min(syncQueue.nextAttemptAt) })
      .from(syncQueue)
      .get();
    return row?.at ?? null;
  },
  async retryNow(now, includeDelayed = false) {
    const db = await ensureDb();
    db.update(syncQueue)
      .set({ nextAttemptAt: now })
      .where(includeDelayed ? undefined : gt(syncQueue.attempts, 0))
      .run();
  },
  async stats(): Promise<QueueStats> {
    const db = await ensureDb();
    const row = db
      .select({
        pending: sql<number>`count(*)`,
        failing: sql<number>`coalesce(sum(case when ${syncQueue.attempts} > 0 then 1 else 0 end), 0)`,
        stuck: sql<number>`coalesce(sum(case when ${syncQueue.attempts} >= ${STUCK_ATTEMPTS} then 1 else 0 end), 0)`,
        lastError: sql<string | null>`max(${syncQueue.lastError})`,
      })
      .from(syncQueue)
      .get();
    return {
      pending: Number(row?.pending ?? 0),
      failing: Number(row?.failing ?? 0),
      stuck: Number(row?.stuck ?? 0),
      lastError: row?.lastError ?? null,
    };
  },
};

/** Ids with a change still waiting to be pushed (pulls never overwrite these). */
export async function pendingIds(entities: SyncEntity[]): Promise<Set<string>> {
  const db = await ensureDb();
  const rows = db
    .select({ id: syncQueue.entityId })
    .from(syncQueue)
    .where(inArray(syncQueue.entity, entities))
    .all();
  return new Set(rows.map((r) => r.id));
}

/** Sign-out warning: what would be lost, by kind. */
export async function pendingSummary(): Promise<PendingSummary> {
  const db = await ensureDb();
  const rows = db
    .select({ entity: syncQueue.entity, entityId: syncQueue.entityId })
    .from(syncQueue)
    .all();
  return summarisePending(rows);
}

export async function countPending(): Promise<number> {
  return (await sqliteQueueStore.stats()).pending;
}

/** Sign-out: drop everything not yet pushed (it belongs to the old account). */
export async function clearQueue(): Promise<void> {
  const db = await ensureDb();
  db.delete(syncQueue).run();
}
