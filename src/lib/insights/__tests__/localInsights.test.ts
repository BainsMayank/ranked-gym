import { DatabaseSync } from 'node:sqlite';
import { SQLiteSyncDialect } from 'drizzle-orm/sqlite-core';
import type { SQL } from 'drizzle-orm';

import { loadLocalAnalytics } from '../localAnalytics';
import { loadLocalGoals, saveLocalGoal } from '../localGoals';
import { saveLocalBodyweight } from '../localBodyweight';
import { rangeFor } from '../metrics';

const mockStorage = new Map<string, string>();
let mockDb: { get: (query: SQL) => unknown; all: (query: SQL) => unknown };
jest.mock('@/lib/db/ensureDb', () => ({ ensureDb: async () => mockDb }));
jest.mock('expo-sqlite/kv-store', () => ({
  Storage: {
    getItemSync: (key: string) => mockStorage.get(key) ?? null,
    setItemSync: (key: string, value: string) => mockStorage.set(key, value),
  },
}));
let sqlite: DatabaseSync;
beforeEach(() => {
  jest.useFakeTimers().setSystemTime(new Date('2026-10-09T12:00:00Z'));
  mockStorage.clear();
  sqlite = new DatabaseSync(':memory:');
  const dialect = new SQLiteSyncDialect();
  const prepare = (query: SQL) => {
    const q = dialect.sqlToQuery(query);
    return { statement: sqlite.prepare(q.sql), params: q.params as (string | number | null)[] };
  };
  mockDb = {
    get: (query) => {
      const q = prepare(query);
      return q.statement.get(...q.params);
    },
    all: (query) => {
      const q = prepare(query);
      return q.statement.all(...q.params);
    },
  };
  sqlite.exec(`
    create table workouts(id text,status text,started_at text,ended_at text,total_volume_kg real,duration_sec integer,calories_est integer);
    create table workout_exercises(id text,workout_id text,exercise_id text);
    create table exercises(id text,category text);
    create table exercise_muscles(exercise_id text,muscle text,role text,weight real);
    create table workout_sets(workout_exercise_id text,weight_mode text,weight_kg real,reps integer,completed integer,failed integer,set_type text,rir real,rpe real,completed_at text);
    insert into workouts values('w','completed','2026-10-09T10:00:00.000Z','2026-10-09T11:00:00.000Z',1500,3600,300);
    insert into workouts values('draft','in_progress','2026-10-09T11:00:00.000Z',null,9000,0,null);
    insert into workout_exercises values('we','w','bench');
    insert into exercises values('bench','strength');
    insert into exercise_muscles values('bench','mid_lower_chest','primary',1),('bench','triceps','secondary',0.5);
    insert into workout_sets values('we','absolute',50,10,1,0,'normal',null,null,'2026-10-09T11:00:00.000Z');
    insert into workout_sets select * from workout_sets;
    insert into workout_sets values('we','absolute',50,10,1,0,'normal',null,null,'2026-10-09T11:00:00.000Z');
    insert into workout_sets values('we','absolute',50,10,1,0,'warmup',null,null,'2026-10-09T11:00:00.000Z');
    insert into workout_sets values('we','absolute',50,10,1,1,'normal',null,null,'2026-10-09T11:00:00.000Z');
    insert into workout_sets values('we','absolute',50,10,0,0,'normal',null,null,null);
  `);
});
afterEach(() => {
  sqlite.close();
  jest.useRealTimers();
});
test('account-free insights aggregate actual SQLite workouts, filter sets and decay fatigue', async () => {
  const bounds = rangeFor(14),
    data = await loadLocalAnalytics(bounds.start, bounds.end, 'UTC', 'normal');
  expect(data.periods[0]).toMatchObject({ sessions: 1, volume: 1500, duration: 3600 });
  expect(data.muscles).toContainEqual({ muscle: 'mid_lower_chest', sets: 3, volume: 1500 });
  expect(data.muscles).toContainEqual({ muscle: 'triceps', sets: 1.5, volume: 750 });
  expect(data.fatigue.find((m) => m.muscle === 'triceps')?.fatigue).toBeCloseTo(
    1.5 * 0.5 ** (1 / 24),
    8,
  );
  expect(data.streak).toBe(1);
});
test('device goals persist, complete once, and archive', async () => {
  const input = {
    id: 'g',
    type: 'custom' as const,
    target: { title: 'Test', checked: false },
    deadline: null,
    autoPost: false,
  };
  await saveLocalGoal(input);
  expect((await loadLocalGoals())[0]?.status).toBe('active');
  await saveLocalGoal({ ...input, target: { ...input.target, checked: true } });
  const achieved = (await loadLocalGoals())[0]!;
  expect(achieved.status).toBe('achieved');
  jest.advanceTimersByTime(60_000);
  expect((await loadLocalGoals())[0]?.achieved_at).toBe(achieved.achieved_at);
  await saveLocalGoal({ ...input, archive: true });
  expect((await loadLocalGoals())[0]?.status).toBe('archived');
});
test('weigh-ins drive device goals and client rank targets never award a rank', async () => {
  const goal = {
    id: 'bw',
    type: 'bodyweight' as const,
    target: { title: 'Target', kg: 75 },
    deadline: null,
    autoPost: false,
  };
  await expect(saveLocalGoal(goal)).rejects.toThrow('Log your current bodyweight');
  saveLocalBodyweight('first', 80);
  await saveLocalGoal(goal);
  jest.advanceTimersByTime(86_400_000);
  saveLocalBodyweight('second', 75);
  expect((await loadLocalGoals())[0]).toMatchObject({
    status: 'achieved',
    start_value: 80,
    current_value: 75,
  });
  await saveLocalGoal({
    ...goal,
    id: 'rank',
    type: 'rank',
    target: { title: 'Iron', scope: 'overall', key: 'overall', score: 0 },
  });
  expect((await loadLocalGoals()).find((g) => g.id === 'rank')?.status).toBe('active');
});
