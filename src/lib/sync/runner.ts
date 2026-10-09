import { sqliteQueueStore } from './queue';
import { useSyncStatusStore } from './status';
import {
  MAX_BACKOFF_MS,
  type QueueItem,
  type QueueStore,
  type SyncEntity,
  type SyncOp,
} from './types';

/**
 * Drains the outbox. Each entity registers a handler that pushes one item; `rank` orders a batch
 * so parents go before children (a folder before its routines, a workout before its photo) and
 * deletes of parents last. A failed push backs off (5 s doubling to 10 min) and a timer retries it
 * while the app is open; launch, foreground, a new local change and a regained connection also run
 * it. Pushes are idempotent on the server (client ids, versions), so a retry after a lost response
 * never duplicates anything.
 */

export interface SyncHandler {
  push: (id: string, op: SyncOp) => Promise<void>;
  rank: (op: SyncOp) => number;
}

export interface SyncRunResult {
  pushed: number;
  failed: number;
}

const handlers = new Map<SyncEntity, SyncHandler>();

export function registerSyncHandler(entity: SyncEntity, handler: SyncHandler): void {
  handlers.set(entity, handler);
}

interface RunnerConfig {
  store: QueueStore;
  now: () => number;
  /** Schedule the next retry with a timer (off in tests that step time by hand). */
  timers: boolean;
}

let config: RunnerConfig = { store: sqliteQueueStore, now: Date.now, timers: true };

function getConfig(): RunnerConfig {
  return config;
}

/** Tests: swap the store and clock, and clear handlers and state. */
export function configureSync(next: Partial<RunnerConfig> & { reset?: boolean }): void {
  const { reset, ...rest } = next;
  if (reset) {
    handlers.clear();
    running = undefined;
    again = false;
    if (timer) clearTimeout(timer);
    timer = undefined;
  }
  config = { ...config, ...rest };
}

let running: Promise<SyncRunResult> | undefined;
let again = false;
let timer: ReturnType<typeof setTimeout> | undefined;

function rankOf(item: QueueItem): number {
  return handlers.get(item.entity)?.rank(item.op) ?? 99;
}

async function refreshStatus(patch: { syncing?: boolean; synced?: boolean } = {}): Promise<void> {
  const stats = await getConfig().store.stats();
  useSyncStatusStore.setState({
    ...stats,
    ...(patch.syncing === undefined ? {} : { syncing: patch.syncing }),
    ...(patch.synced && stats.failing === 0 ? { lastSyncedAt: getConfig().now() } : {}),
  });
}

/** Sets a timer for the next due item (a backoff retry or a delayed draft push). */
async function scheduleNext(): Promise<void> {
  const { store, now, timers } = getConfig();
  if (!timers) return;
  if (timer) clearTimeout(timer);
  timer = undefined;
  const at = await store.nextDueAt();
  if (at === null) return;
  const wait = Math.min(MAX_BACKOFF_MS, Math.max(1000, at - now()));
  timer = setTimeout(() => {
    timer = undefined;
    void runSync();
  }, wait);
}

async function drain(): Promise<SyncRunResult> {
  const { store, now } = getConfig();
  const result: SyncRunResult = { pushed: 0, failed: 0 };
  // With no connection at all, don't burn attempts; the network watcher runs us when it's back.
  if (!useSyncStatusStore.getState().online) {
    await refreshStatus();
    return result;
  }
  const items = (await store.due(now())).sort((a, b) => rankOf(a) - rankOf(b));
  if (items.length) useSyncStatusStore.setState({ syncing: true });
  for (const item of items) {
    const handler = handlers.get(item.entity);
    if (!handler) continue;
    try {
      await handler.push(item.entityId, item.op);
      await store.complete(item);
      result.pushed += 1;
    } catch (error) {
      await store.fail(item, error, now());
      result.failed += 1;
    }
  }
  await refreshStatus({ syncing: false, synced: items.length > 0 });
  await scheduleNext();
  return result;
}

/** Pushes every due item. Concurrent calls share one run (and trigger one more after it). */
export function runSync(): Promise<SyncRunResult> {
  if (running) {
    again = true;
    return running;
  }
  running = drain().finally(() => {
    running = undefined;
    if (again) {
      again = false;
      void runSync();
    }
  });
  return running;
}

/** The connection is back: retry failed items straight away instead of waiting out the backoff. */
export async function retryNow(): Promise<SyncRunResult> {
  const { store, now } = getConfig();
  await store.retryNow(now());
  return runSync();
}

/** Sign-out: push everything now, failed items and held-back drafts alike. */
export async function flushNow(): Promise<SyncRunResult> {
  const { store, now } = getConfig();
  await store.retryNow(now(), true);
  return runSync();
}
