import { sql } from 'drizzle-orm';

import { ensureDb } from '@/lib/db/ensureDb';
import type { Muscle } from '@/lib/exercises/taxonomy';

import { localBodyweight } from './localBodyweight';
import { dateKey } from './metrics';
import { effortFactor, halfLife, SPEED, type RecoverySpeed } from './recovery';
import type { Analytics } from './schema';

export function emptyAnalytics(
  start: string,
  end: string,
  zone: string,
  now = Date.now(),
): Analytics {
  return {
    asOf: new Date(now).toISOString(),
    start,
    end,
    zone,
    speed: 'normal',
    streak: 0,
    periods: [0, 1].map((period) => ({
      period,
      sessions: 0,
      volume: 0,
      duration: 0,
      calories: null,
      missing_calories: 0,
    })),
    daily: [],
    muscles: [],
    fatigue: [],
    bodyweight: [],
    records: [],
    previous_records: 0,
    rankups: [],
  };
}

/** Development bypass only. SQLite aggregates actual on-device workouts; no invented sample stats. */
export async function loadLocalAnalytics(
  start: string,
  end: string,
  zone: string,
  speed: RecoverySpeed,
) {
  const db = await ensureDb(),
    now = Date.now();
  const result = emptyAnalytics(start, end, zone, now);
  result.speed = speed;
  const duration = Date.parse(end) - Date.parse(start);
  const previousStart = new Date(Date.parse(start) - duration).toISOString();
  result.periods = [0, 1].map((period) => {
    const a = period === 0 ? start : previousStart,
      b = period === 0 ? end : start;
    const totals = db.get<{
      sessions: number;
      volume: number;
      duration: number;
      calories: number | null;
      missing_calories: number;
    }>(sql`
      select count(*) sessions, coalesce(sum(total_volume_kg),0) volume,
      coalesce(sum(duration_sec),0) duration, sum(calories_est) calories,
      sum(case when calories_est is null then 1 else 0 end) missing_calories
      from workouts where status='completed' and started_at>=${a} and started_at<${b}`);
    return {
      period,
      sessions: totals?.sessions ?? 0,
      volume: totals?.volume ?? 0,
      duration: totals?.duration ?? 0,
      calories: totals?.calories ?? null,
      missing_calories: totals?.missing_calories ?? 0,
    };
  });
  const daily = db.all<Analytics['daily'][number]>(sql`
    select date(started_at,'localtime') day,count(*) sessions,sum(total_volume_kg) volume,sum(coalesce(duration_sec,0)) duration
    from workouts where status='completed' and started_at>=${previousStart} and started_at<${end} group by day`);
  for (
    const d = new Date(previousStart);
    d.getTime() < Date.parse(end);
    d.setDate(d.getDate() + 1)
  ) {
    const day = dateKey(d);
    result.daily.push(
      daily.find((row) => row.day === day) ?? { day, sessions: 0, volume: 0, duration: 0 },
    );
  }
  result.muscles = db.all<Analytics['muscles'][number]>(sql`
    select m.muscle, sum(case when m.role='primary' then 1.0 else 0.5 end) sets,
    sum(case when s.weight_mode in ('absolute','bodyweight') then coalesce(s.weight_kg,0)*coalesce(s.reps,0) else 0 end
      * case when m.role='primary' then 1.0 else 0.5 end) volume
    from workout_sets s join workout_exercises we on we.id=s.workout_exercise_id
    join workouts w on w.id=we.workout_id join exercises e on e.id=we.exercise_id
    join exercise_muscles m on m.exercise_id=e.id
    where w.status='completed' and s.completed=1 and s.failed=0 and s.set_type!='warmup'
      and e.category in ('strength','calisthenics') and m.role!='stabiliser'
      and w.started_at>=${start} and w.started_at<${end} group by m.muscle order by sets desc`);
  const loads = db.all<{
    muscle: Muscle;
    weight: number;
    rir: number | null;
    rpe: number | null;
    at: string;
  }>(sql`
    select m.muscle,m.weight,s.rir,s.rpe,coalesce(s.completed_at,w.ended_at,w.started_at) at
    from workout_sets s join workout_exercises we on we.id=s.workout_exercise_id
    join workouts w on w.id=we.workout_id join exercises e on e.id=we.exercise_id
    join exercise_muscles m on m.exercise_id=e.id
    where w.status='completed' and s.completed=1 and s.failed=0 and s.set_type!='warmup'
      and e.category in ('strength','calisthenics') and m.role!='stabiliser'`);
  for (const row of loads) {
    const at = Date.parse(row.at);
    if (at > now || !Number.isFinite(at)) continue;
    const fatigue =
      row.weight *
      effortFactor(row.rir, row.rpe) *
      0.5 ** ((now - at) / 3_600_000 / (halfLife(row.muscle) * SPEED[speed]));
    const found = result.fatigue.find((m) => m.muscle === row.muscle);
    if (found) {
      found.fatigue += fatigue;
      if (row.at > found.last_trained) found.last_trained = row.at;
    } else result.fatigue.push({ muscle: row.muscle, fatigue, last_trained: row.at });
  }
  const days = new Set(
    db
      .all<{ day: string }>(
        sql`select distinct date(started_at,'localtime') day from workouts where status='completed'`,
      )
      .map((d) => d.day),
  );
  const day = new Date(now);
  day.setHours(0, 0, 0, 0);
  if (!days.has(dateKey(day))) day.setDate(day.getDate() - 1);
  while (days.has(dateKey(day))) {
    result.streak++;
    day.setDate(day.getDate() - 1);
  }
  result.bodyweight = localBodyweight().filter(
    (p) => Date.parse(p.at) >= Date.parse(start) - 7 * 86400000 && p.at < end,
  );
  return result;
}
