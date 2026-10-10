/// <reference types="node" />
/**
 * `pnpm leagues:simulate [--weeks N]`: fast-forwards the weekly league cycle on the LOCAL database.
 * For each week it gives the dev-seed lifters (`pnpm dev:seed` first) a week of training inside the
 * open league week, scored by the rank engine so PRs and rank-ups land, then runs
 * `league_run_cycle` at the week's end and prints every group's result.
 *
 * Simulated weeks can run ahead of today: their workouts are dated in that future week. Run
 * `pnpm dev:seed` again to go back to a clean history.
 */
import {
  devPeople,
  DEMO_ID,
  DEV_PREFIX,
  replaySql,
  runSql,
  uuidFrom,
  workoutName,
  workoutRows,
  type SeedSet,
  type SeedWorkout,
} from './devSeed.ts';
import { weekSummarySql } from './devLeagues.ts';
import { makeDemoUser, makeFakeUsers } from './fakeUsers.ts';

const arg = process.argv.indexOf('--weeks');
const weeks = Math.max(1, Math.min(20, Number(arg >= 0 ? process.argv[arg + 1] : 1) || 1));
const people = devPeople(makeFakeUsers(), makeDemoUser(DEMO_ID));
const hourById = new Map(people.map((p) => [p.id, p.hour]));

/** Small deterministic pseudo-random number in [0, 1) from a string. */
function chance(key: string): number {
  return parseInt(uuidFrom(key).slice(0, 8), 16) / 0x1_0000_0000;
}

/** Last week's sessions, a little stronger: +2.5% load, +1 rep on bodyweight lifts, +1 s holds. */
function progress([slug, kg, reps, seconds]: SeedSet): SeedSet {
  if (seconds !== null) return [slug, kg, reps, seconds + 1];
  if (kg !== null && kg > 0 && reps !== null) {
    const step = slug.startsWith('dumbbell') ? 1 : 2.5;
    return [slug, Math.max(step, Math.round((kg * 1.025) / step) * step), reps, null];
  }
  return [slug, kg, reps === null ? reps : reps + 1, null];
}

interface Template {
  user_id: string;
  sessions: SeedSet[][];
}

function openWeek(): { id: string; startsAt: string; endsAt: string; label: string } {
  const row = runSql(`
select id || '|' || starts_at || '|' || ends_at || '|' || (select format('Season %s · week %s', s.number, w.week_no)
  from public.league_seasons s where s.id = w.season_id)
from public.league_weeks w where status = 'open' order by starts_at desc limit 1;`).trim();
  if (!row) {
    runSql('select public.league_run_cycle();');
    return openWeek();
  }
  const [id = '', startsAt = '', endsAt = '', label = ''] = row.split('|');
  return { id, startsAt, endsAt, label };
}

for (let i = 0; i < weeks; i += 1) {
  const week = openWeek();
  const templates: Template[] = JSON.parse(
    runSql(`
select coalesce(json_agg(t), '[]') from (
  select u.user_id, json_agg(u.sets order by u.started_at desc) as sessions from (
    select w.user_id, w.started_at, json_agg(json_build_array(x.slug, s.weight_kg, s.reps, s.duration_sec)
      order by we.sort_order, s.sort_order) as sets,
      row_number() over (partition by w.user_id order by w.started_at desc) as rn
    from public.workouts w
    join public.workout_exercises we on we.workout_id = w.id
    join public.workout_sets s on s.workout_exercise_id = we.id
    join public.exercises x on x.id = we.exercise_id
    where w.user_id::text like '${DEV_PREFIX}%' and w.status = 'completed'
      and w.started_at < '${week.startsAt}'
    group by w.id
  ) u where u.rn <= 3
  group by u.user_id
) t;`).trim() || '[]',
  );

  const start = Date.parse(week.startsAt);
  const workouts: SeedWorkout[] = [];
  for (const t of templates) {
    // About one in six lifters skips the week; the rest train 2–4 days.
    if (chance(`${t.user_id}:${week.id}:skip`) < 0.16) continue;
    const days = 2 + Math.floor(chance(`${t.user_id}:${week.id}:days`) * 3);
    const offsets = [0, 1, 2, 3, 4, 5, 6]
      .sort(
        (a, b) => chance(`${t.user_id}:${week.id}:${a}`) - chance(`${t.user_id}:${week.id}:${b}`),
      )
      .slice(0, days)
      .sort((a, b) => a - b);
    offsets.forEach((day, n) => {
      const sets = (t.sessions[n % t.sessions.length] ?? []).map(progress);
      const hour = hourById.get(t.user_id) ?? 18;
      workouts.push({
        userId: t.user_id,
        id: uuidFrom(`sim:${t.user_id}:${week.id}:${day}`),
        name: workoutName(sets),
        startedAt: new Date(start + (day * 24 + hour) * 3_600_000 + 30 * 60_000).toISOString(),
        sets,
      });
    });
  }

  console.log(`\n${week.label}: ${workouts.length} workouts for ${templates.length} lifters…`);
  if (workouts.length) runSql(replaySql(workoutRows(workouts)));
  const result = runSql(
    `select public.league_run_cycle('${week.endsAt}'::timestamptz + interval '5 minutes');`,
  ).trim();
  console.log(runSql(weekSummarySql(week.id)).trim());
  const rewards = runSql(`
select format('Season %s finished: %s rewards (%s Elite, %s Legend frames)', s.number, count(r.user_id),
  count(*) filter (where r.frame_key = 'season-elite'), count(*) filter (where r.frame_key = 'season-legend'))
from public.league_seasons s join public.season_rewards r on r.season_id = s.id
where s.ends_at = '${week.endsAt}'::timestamptz group by s.number;`).trim();
  if (rewards) console.log(rewards);
  console.log(`Cycle: ${result}`);
}
