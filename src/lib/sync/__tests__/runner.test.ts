import { createMemoryStore } from '../__fixtures__/memoryStore';
import {
  configureSync,
  flushNow,
  registerSyncHandler,
  retryNow,
  runSync,
  stopSync,
} from '../runner';
import { syncStateOf, useSyncStatusStore } from '../status';
import { backoffMs, STUCK_ATTEMPTS } from '../types';

/**
 * The outbox runner against a fake Supabase that behaves like save_workout(): rows keyed by the
 * client id, and a push only applies when its version is newer than the stored one.
 */

interface Draft {
  id: string;
  name: string;
  version: number;
}

function createServer() {
  const rows = new Map<string, Draft>();
  let mode: 'online' | 'offline' | 'lose-response' = 'online';
  const calls: string[] = [];
  return {
    rows,
    calls,
    setMode: (m: typeof mode) => (mode = m),
    save(draft: Draft): { applied: boolean } {
      calls.push(draft.id);
      if (mode === 'offline') throw { message: 'Network request failed' };
      const existing = rows.get(draft.id);
      const applied = !existing || draft.version > existing.version;
      if (applied) rows.set(draft.id, { ...draft });
      // The server applied it but the reply never arrived.
      if (mode === 'lose-response') throw { message: 'Network request failed' };
      return { applied };
    },
  };
}

let clock = 1_000_000;
let memory: ReturnType<typeof createMemoryStore>;
let server: ReturnType<typeof createServer>;
const local = new Map<string, Draft>();

function saveLocally(draft: Draft, delayMs = 0) {
  local.set(draft.id, draft);
  memory.enqueue('workout', draft.id, 'upsert', clock++, delayMs);
}

beforeEach(() => {
  clock = 1_000_000;
  memory = createMemoryStore();
  server = createServer();
  local.clear();
  useSyncStatusStore.setState({ online: true, syncing: false, lastSyncedAt: null });
  configureSync({
    reset: true,
    store: memory.store,
    now: () => clock,
    timers: false,
    scope: () => 'account-a',
  });
  registerSyncHandler('workout', {
    rank: () => 3,
    push: async (id) => {
      const draft = local.get(id);
      if (draft) server.save(draft);
    },
  });
});

it('keeps a change queued while offline and backs it off', async () => {
  server.setMode('offline');
  saveLocally({ id: 'w1', name: 'Leg day', version: 1 });

  const result = await runSync();

  expect(result).toEqual({ pushed: 0, failed: 1 });
  expect(server.rows.size).toBe(0);
  const row = memory.rows.get('workout:w1')!;
  expect(row.attempts).toBe(1);
  expect(row.nextAttemptAt).toBe(clock + backoffMs(1));
  expect(syncStateOf(useSyncStatusStore.getState())).toBe('pending');
});

it('retries after the backoff and then clears the item', async () => {
  server.setMode('offline');
  saveLocally({ id: 'w1', name: 'Leg day', version: 1 });
  await runSync();
  server.setMode('online');

  // Not due yet: nothing is pushed.
  clock += backoffMs(1) - 1;
  expect(await runSync()).toEqual({ pushed: 0, failed: 0 });

  clock += 1;
  expect(await runSync()).toEqual({ pushed: 1, failed: 0 });
  expect(memory.rows.size).toBe(0);
  expect(server.rows.get('w1')?.name).toBe('Leg day');
  expect(syncStateOf(useSyncStatusStore.getState())).toBe('synced');
});

it('never duplicates a workout when a response is lost and the push is retried', async () => {
  saveLocally({ id: 'w1', name: 'Leg day', version: 1 });
  server.setMode('lose-response');
  await runSync();
  // The server has it, but the device doesn't know: the item stays queued.
  expect(server.rows.size).toBe(1);
  expect(memory.rows.has('workout:w1')).toBe(true);

  server.setMode('online');
  clock += backoffMs(1);
  await runSync();
  await runSync();

  expect(server.rows.size).toBe(1);
  expect(server.calls).toEqual(['w1', 'w1']);
  expect(memory.rows.size).toBe(0);
});

it('pushes again when the workout changes while a push is in flight', async () => {
  saveLocally({ id: 'w1', name: 'Leg day', version: 1 });
  registerSyncHandler('workout', {
    rank: () => 3,
    push: async (id) => {
      const draft = local.get(id)!;
      // A set is ticked mid-push: a newer version is queued.
      if (draft.version === 1) saveLocally({ ...draft, name: 'Leg day + calves', version: 2 });
      server.save(draft);
    },
  });

  await runSync();
  expect(memory.rows.has('workout:w1')).toBe(true);

  await runSync();
  expect(server.rows.get('w1')).toEqual({ id: 'w1', name: 'Leg day + calves', version: 2 });
  expect(memory.rows.size).toBe(0);
});

it('holds a delayed draft push until its delay passes', async () => {
  saveLocally({ id: 'w1', name: 'Leg day', version: 1 }, 20_000);
  expect(await runSync()).toEqual({ pushed: 0, failed: 0 });
  clock += 20_000;
  expect(await runSync()).toEqual({ pushed: 1, failed: 0 });
});

it('pushes parents before children (workout before its photo)', async () => {
  const order: string[] = [];
  registerSyncHandler('workout', { rank: () => 3, push: async (id) => void order.push(`w:${id}`) });
  registerSyncHandler('workout_photo', {
    rank: () => 4,
    push: async (id) => void order.push(`p:${id}`),
  });
  memory.enqueue('workout_photo', 'w1', 'upsert', clock++);
  memory.enqueue('workout', 'w1', 'upsert', clock++);

  await runSync();
  expect(order).toEqual(['w:w1', 'p:w1']);
});

it('does not spend attempts while the device has no connection', async () => {
  useSyncStatusStore.setState({ online: false });
  saveLocally({ id: 'w1', name: 'Leg day', version: 1 });

  expect(await runSync()).toEqual({ pushed: 0, failed: 0 });
  expect(memory.rows.get('workout:w1')?.attempts).toBe(0);
  expect(syncStateOf(useSyncStatusStore.getState())).toBe('offline');
});

it('retries failed items straight away when the connection returns', async () => {
  server.setMode('offline');
  saveLocally({ id: 'w1', name: 'Leg day', version: 1 });
  await runSync();
  await runSync();
  server.setMode('online');

  // Still inside the backoff window, but the connection is back.
  expect(await retryNow()).toEqual({ pushed: 1, failed: 0 });
  expect(server.rows.size).toBe(1);
});

it('reports an item as stuck after repeated failures, and keeps it', async () => {
  server.setMode('offline');
  saveLocally({ id: 'w1', name: 'Leg day', version: 1 });
  for (let i = 0; i < STUCK_ATTEMPTS; i++) {
    await runSync();
    clock += backoffMs(i + 1);
  }
  const status = useSyncStatusStore.getState();
  expect(status.stuck).toBe(1);
  expect(status.lastError).toBe('Network request failed');
  expect(syncStateOf(status)).toBe('error');
  expect(memory.rows.has('workout:w1')).toBe(true);
});

it('flushNow pushes held-back drafts too (sign-out)', async () => {
  saveLocally({ id: 'w1', name: 'Leg day', version: 1 }, 20_000);

  expect(await retryNow()).toEqual({ pushed: 0, failed: 0 });
  expect(await flushNow()).toEqual({ pushed: 1, failed: 0 });
  expect(server.rows.get('w1')?.version).toBe(1);
  expect(memory.rows.size).toBe(0);
});

it('leaves preview writes queued without attempting a server push', async () => {
  configureSync({ scope: () => undefined });
  saveLocally({ id: 'w1', name: 'Preview', version: 1 });
  expect(await runSync()).toEqual({ pushed: 0, failed: 0 });
  expect(server.calls).toEqual([]);
  expect(memory.rows.get('workout:w1')?.attempts).toBe(0);
});

it('stops the batch if the account changes while a push is in flight', async () => {
  let account: string | undefined = 'account-a';
  configureSync({ scope: () => account });
  saveLocally({ id: 'w1', name: 'First', version: 1 });
  saveLocally({ id: 'w2', name: 'Second', version: 1 });
  const push = jest.fn(async () => {
    account = 'account-b';
  });
  registerSyncHandler('workout', { rank: () => 3, push });
  expect(await runSync()).toEqual({ pushed: 0, failed: 0 });
  expect(push).toHaveBeenCalledTimes(1);
  expect(memory.rows.size).toBe(2);
  expect(useSyncStatusStore.getState().syncing).toBe(false);
});

it('does not continue a batch after the network watcher stops', async () => {
  saveLocally({ id: 'w1', name: 'First', version: 1 });
  saveLocally({ id: 'w2', name: 'Second', version: 1 });
  const push = jest.fn(async () => stopSync());
  registerSyncHandler('workout', { rank: () => 3, push });
  await runSync();
  expect(push).toHaveBeenCalledTimes(1);
  expect(memory.rows.size).toBe(2);
});
