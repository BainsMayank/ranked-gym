import {
  backoffMs,
  errorMessage,
  STUCK_ATTEMPTS,
  type QueueItem,
  type QueueStore,
  type SyncEntity,
  type SyncOp,
} from '../types';

interface Row extends QueueItem {
  nextAttemptAt: number;
  lastError: string | null;
}

/** The SQLite outbox's rules in memory, for runner tests. */
export function createMemoryStore() {
  const rows = new Map<string, Row>();
  const key = (entity: SyncEntity, id: string) => `${entity}:${id}`;

  const store: QueueStore = {
    async due(now) {
      return [...rows.values()]
        .filter((r) => r.nextAttemptAt <= now)
        .sort((a, b) => a.createdAt - b.createdAt)
        .map(({ entity, entityId, op, attempts, createdAt }) => ({
          entity,
          entityId,
          op,
          attempts,
          createdAt,
        }));
    },
    async complete(item) {
      const row = rows.get(key(item.entity, item.entityId));
      if (!row || row.createdAt !== item.createdAt) return false;
      rows.delete(key(item.entity, item.entityId));
      return true;
    },
    async fail(item, error, now) {
      const row = rows.get(key(item.entity, item.entityId));
      if (!row || row.createdAt !== item.createdAt) return;
      row.attempts = item.attempts + 1;
      row.lastError = errorMessage(error);
      row.nextAttemptAt = now + backoffMs(row.attempts);
    },
    async nextDueAt() {
      const all = [...rows.values()].map((r) => r.nextAttemptAt);
      return all.length ? Math.min(...all) : null;
    },
    async retryNow(now, includeDelayed = false) {
      for (const r of rows.values()) if (includeDelayed || r.attempts > 0) r.nextAttemptAt = now;
    },
    async stats() {
      const all = [...rows.values()];
      return {
        pending: all.length,
        failing: all.filter((r) => r.attempts > 0).length,
        stuck: all.filter((r) => r.attempts >= STUCK_ATTEMPTS).length,
        lastError: all.find((r) => r.lastError)?.lastError ?? null,
      };
    },
  };

  /** Same as enqueueTx: one row per entity, a newer change replaces the pending one. */
  function enqueue(entity: SyncEntity, entityId: string, op: SyncOp, at: number, delayMs = 0) {
    rows.set(key(entity, entityId), {
      entity,
      entityId,
      op,
      attempts: 0,
      createdAt: at,
      nextAttemptAt: at + delayMs,
      lastError: null,
    });
  }

  return { store, enqueue, rows };
}
