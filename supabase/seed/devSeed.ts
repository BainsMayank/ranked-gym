/// <reference types="node" />
/**
 * Shared pieces of the local dev seed (`pnpm dev:seed`) and the league simulator
 * (`pnpm leagues:simulate`): fake lifters as real, onboarded accounts, their workouts expanded into
 * realistic sessions, and a runner that pipes SQL into the local database container.
 *
 * Local only: these scripts talk to the Docker database `supabase start` runs, never a hosted one.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { FakeSet, FakeUser } from './fakeUsers.ts';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

/** Dev-seed ids start with this, so they never collide with the parity test's `fa4e…` lifters. */
export const DEV_PREFIX = 'de5e0000-0000-4000-8000-';
export const devId = (n: number) => `${DEV_PREFIX}${n.toString(16).padStart(12, '0')}`;
export const DEMO_ID = devId(0x99);

const FIRST = [
  'Aarav',
  'Vivaan',
  'Aditya',
  'Arjun',
  'Kabir',
  'Rohan',
  'Ishaan',
  'Dev',
  'Yash',
  'Karan',
  'Neha',
  'Ananya',
  'Ishita',
  'Tanya',
  'Priya',
  'Sneha',
  'Riya',
  'Meera',
  'Diya',
  'Kavya',
  'Rahul',
  'Siddharth',
  'Nikhil',
  'Varun',
  'Aman',
  'Harsh',
  'Manav',
  'Pranav',
  'Kunal',
  'Sahil',
  'Pooja',
  'Simran',
  'Aditi',
  'Nandini',
  'Shreya',
  'Aisha',
  'Zoya',
  'Tara',
  'Mira',
  'Kiara',
  'Arnav',
  'Reyansh',
  'Vihaan',
  'Atharv',
  'Laksh',
  'Rudra',
  'Shaurya',
  'Om',
  'Veer',
  'Ayaan',
] as const;
const LAST = [
  'Sharma',
  'Verma',
  'Mehta',
  'Rana',
  'Kapoor',
  'Iyer',
  'Nair',
  'Reddy',
  'Gupta',
  'Singh',
  'Khanna',
  'Joshi',
  'Malhotra',
  'Bose',
  'Das',
  'Patel',
  'Chopra',
  'Bhatt',
  'Menon',
  'Saxena',
] as const;
const COLLEGES = ['DTU', 'NSUT', 'IIT Delhi', 'BITS Pilani', 'Manipal'] as const;
const CITIES = ['Delhi', 'Delhi', 'Bengaluru', 'Pune', 'Mumbai'] as const;

export interface DevPerson {
  id: string;
  email: string;
  username: string;
  displayName: string;
  college: string;
  city: string;
  /** Usual training hour in IST (morning, evening and late lifters). */
  hour: number;
  user: FakeUser;
}

export function devPeople(users: readonly FakeUser[], demo: FakeUser): DevPerson[] {
  const people = users.map((user, i) => {
    const first = FIRST[i % FIRST.length] ?? 'Lifter';
    const last = LAST[(i * 7) % LAST.length] ?? 'Kumar';
    return {
      id: devId(i + 1),
      email: `lifter${String(i + 1).padStart(2, '0')}@fake.test`,
      username: `${first}_${last}`.toLowerCase().slice(0, 20),
      displayName: `${first} ${last.charAt(0)}.`,
      college: COLLEGES[i % COLLEGES.length] ?? 'DTU',
      city: CITIES[i % CITIES.length] ?? 'Delhi',
      hour: [6, 7, 7, 17, 18, 18, 19, 20, 21, 9][i % 10] ?? 18,
      user: { ...user, id: devId(i + 1) },
    };
  });
  people.push({
    id: DEMO_ID,
    email: 'demo@fake.test',
    username: 'demo',
    displayName: 'Demo Lifter',
    college: 'DTU',
    city: 'Delhi',
    hour: 18,
    user: { ...demo, id: DEMO_ID },
  });
  return people;
}

// ─── Workouts ───────────────────────────────────────────────────────────────────────────────────

/** A set as the seed inserts it: [slug, kg | null, reps | null, seconds | null]. */
export type SeedSet = FakeSet;

const roundTo = (value: number, step: number) => Math.max(step, Math.round(value / step) * step);

/**
 * One logged lift becomes a real-looking exercise: the top set, then two back-offs (lighter or
 * fewer reps). The top set is unchanged, so ranks match the parity test's single-set histories.
 */
export function expandSet([slug, kg, reps, seconds]: FakeSet): SeedSet[] {
  if (seconds !== null) {
    return [
      [slug, kg, reps, seconds],
      [slug, kg, reps, Math.max(1, Math.round(seconds * 0.8))],
    ];
  }
  if (kg !== null && kg > 0 && reps !== null) {
    const step = slug.startsWith('dumbbell') ? 1 : 2.5;
    return [
      [slug, kg, reps, null],
      [slug, roundTo(kg * 0.92, step), reps, null],
      [slug, roundTo(kg * 0.85, step), Math.min(10, reps + 2), null],
    ];
  }
  const r = reps ?? 1;
  return [
    [slug, kg, r, null],
    [slug, kg, Math.max(1, r - 2), null],
    [slug, kg, Math.max(1, r - 3), null],
  ];
}

export function workoutName(sets: readonly FakeSet[]): string {
  const slugs = sets.map((s) => s[0]).join(' ');
  if (/lever|l-sit|dip|push-up|pistol/.test(slugs) && !/barbell/.test(slugs)) return 'Calisthenics';
  if (/squat|deadlift/.test(slugs) && /bench|press/.test(slugs)) return 'Full body';
  if (/squat|deadlift/.test(slugs)) return 'Leg day';
  if (/bench|press|dip/.test(slugs)) return 'Push day';
  return 'Pull day';
}

const IST_OFFSET_MS = 330 * 60_000;
const DAY_MS = 86_400_000;

/** `daysAgo` days before `now`, at `hour`:mm in IST (as an ISO instant). */
export function istAt(now: Date, daysAgo: number, hour: number, minute: number): string {
  const istMidnight = Math.floor((now.getTime() + IST_OFFSET_MS) / DAY_MS) * DAY_MS;
  return new Date(
    istMidnight - daysAgo * DAY_MS + (hour * 60 + minute) * 60_000 - IST_OFFSET_MS,
  ).toISOString();
}

// ─── SQL ────────────────────────────────────────────────────────────────────────────────────────

export const sqlText = (value: string) => `'${value.replace(/'/g, "''")}'`;

export interface SeedWorkout {
  userId: string;
  id: string;
  name: string;
  startedAt: string;
  sets: SeedSet[];
}

/** A staging row per workout; `replaySql` inserts and scores them in date order. */
export function workoutRows(workouts: readonly SeedWorkout[]): string {
  return workouts
    .map(
      (w) =>
        `  (${sqlText(w.userId)}, ${sqlText(w.id)}, ${sqlText(w.name)}, ${sqlText(w.startedAt)}, ${sqlText(JSON.stringify(w.sets))})`,
    )
    .join(',\n');
}

/**
 * Inserts the staged workouts one at a time, oldest first, and runs the rank engine after each,
 * then re-dates the snapshots and events that run wrote to the workout's end. The engine is
 * incremental (it only records changes), so this leaves the history a lifter would have built
 * logging these sessions live: progression charts, rank-up days and records.
 */
export function replaySql(stagingRows: string): string {
  return `
create temp table seed_workouts (user_id uuid, id uuid, name text, started_at timestamptz, sets jsonb);
insert into seed_workouts values
${stagingRows};

do $$
declare
  w record;
  v_snap bigint;
  v_event bigint;
  v_end timestamptz;
begin
  for w in select * from seed_workouts order by started_at loop
    v_end := w.started_at + (12 + jsonb_array_length(w.sets) * 3) * interval '1 minute';
    insert into public.workouts (id, user_id, name, started_at, ended_at, status, client_updated_at,
      visibility)
    values (w.id, w.user_id, w.name, w.started_at, v_end, 'completed', v_end, 'public');

    insert into public.workout_exercises (id, workout_id, exercise_id, sort_order)
    select md5(w.id::text || ':' || (s.st ->> 0))::uuid, w.id, x.id, min(s.n) - 1
    from jsonb_array_elements(w.sets) with ordinality s(st, n)
    join public.exercises x on x.slug = s.st ->> 0 and x.created_by is null
    group by s.st ->> 0, x.id;

    insert into public.workout_sets (id, workout_exercise_id, sort_order, set_type, weight_mode,
      reps, weight_kg, duration_sec, completed, completed_at)
    select md5(w.id::text || ':set:' || n)::uuid, md5(w.id::text || ':' || (st ->> 0))::uuid,
      (row_number() over (partition by st ->> 0 order by n)) - 1, 'working',
      case when x.log_type = 'weight_reps' then 'absolute' else 'bodyweight' end::public.weight_mode,
      (st ->> 2)::smallint, (st ->> 1)::numeric, (st ->> 3)::integer, true,
      w.started_at + (10 + n * 3) * interval '1 minute'
    from jsonb_array_elements(w.sets) with ordinality s(st, n)
    join public.exercises x on x.slug = st ->> 0 and x.created_by is null;

    perform public.refresh_workout_totals(w.id);
    select coalesce(max(id), 0) into v_snap from public.rank_snapshots;
    select coalesce(max(id), 0) into v_event from public.rank_events;
    perform public.rank_recompute_user(w.user_id, w.id);
    update public.rank_snapshots set taken_at = v_end where id > v_snap and user_id = w.user_id;
    update public.rank_events set created_at = v_end where id > v_event and user_id = w.user_id;
    -- The engine's temp tables hold locks until commit; one transaction per workout.
    commit;
  end loop;
end $$;

delete from public.rank_jobs where user_id::text like '${DEV_PREFIX}%';
drop table seed_workouts;
`;
}

/** Turns a fake lifter's history into seed workouts at their usual hour (IST). */
export function seedWorkouts(person: DevPerson, now: Date): SeedWorkout[] {
  return person.user.workouts.map((w, i) => ({
    userId: person.id,
    id: uuidFrom(`${person.id}:${w.daysAgo}:${i}`),
    name: workoutName(w.sets),
    startedAt: istAt(now, w.daysAgo, person.hour, (i * 17) % 50),
    sets: w.sets.flatMap(expandSet),
  }));
}

/** A stable uuid-shaped id from a string (FNV-1a, not cryptographic; dev data only). */
export function uuidFrom(input: string): string {
  let hex = '';
  for (let round = 0; round < 4; round += 1) {
    let h = 0x811c9dc5 ^ round;
    for (let i = 0; i < input.length; i += 1) {
      h ^= input.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    hex += h.toString(16).padStart(8, '0');
  }
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

// ─── Running SQL against the local database ─────────────────────────────────────────────────────

function containerName(): string {
  const config = readFileSync(join(ROOT, 'supabase', 'config.toml'), 'utf8');
  const projectId = /^project_id\s*=\s*"([^"]+)"/m.exec(config)?.[1] ?? 'ranked-gym';
  return `supabase_db_${projectId}`;
}

/** Pipes SQL into psql inside the local Supabase database container; returns its output. */
export function runSql(sql: string): string {
  try {
    return execFileSync(
      'docker',
      ['exec', '-i', containerName(), 'psql', '-U', 'postgres', '-v', 'ON_ERROR_STOP=1', '-qAt'],
      { input: sql, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
    );
  } catch (error) {
    const stderr = (error as { stderr?: string }).stderr ?? String(error);
    throw new Error(`psql failed (is the local stack running? \`pnpm db:start\`)\n${stderr}`);
  }
}
