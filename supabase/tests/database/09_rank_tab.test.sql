-- Rank tab reads (Phase 7): rank history, rank events timed by the workout, record history,
-- lift detail and the percentile (no identities, nothing below 20 lifters), plus RLS.
-- Run with `pnpm db:test`.
begin;
set local role postgres;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(28);

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'alice@test.dev'),
  ('22222222-2222-2222-2222-222222222222', 'bob@test.dev');
update public.profiles set sex_for_standards = 'male',
  birth_year = extract(year from now() at time zone 'utc')::integer - 21
where id in ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222');
insert into public.bodyweight_logs (user_id, weight_kg, logged_at)
values ('11111111-1111-1111-1111-111111111111', 75, now() - interval '25 days');

-- 25 other men around 75 kg with a bench score of 20, 40 … 500 (only their scores matter here).
insert into auth.users (id, email)
select ('aaaa0000-0000-4000-8000-' || lpad(i::text, 12, '0'))::uuid, 'cohort' || i || '@test.dev'
from generate_series(1, 25) i;
update public.profiles set sex_for_standards = 'male'
where id::text like 'aaaa0000-%';
insert into public.bodyweight_logs (user_id, weight_kg, logged_at)
select id, 77, now() - interval '1 day'
from public.profiles where id::text like 'aaaa0000-%';
delete from public.rank_jobs;

create function pg_temp.workout(p_id text, p_days_ago numeric, p_exercises jsonb)
returns jsonb language sql as $$
  select jsonb_build_object(
    'id', p_id, 'name', 'Push day', 'status', 'completed',
    'started_at', now() - p_days_ago * interval '1 day' - interval '1 hour',
    'ended_at', now() - p_days_ago * interval '1 day',
    'client_updated_at', now() - p_days_ago * interval '1 day',
    'exercises', (
      select jsonb_agg(jsonb_build_object(
        'id', md5(p_id || e.n)::uuid,
        'exercise_id', (select id from public.exercises where slug = e.v ->> 0 and created_by is null),
        'sets', (
          select jsonb_agg(s.v || jsonb_build_object(
            'id', md5(p_id || e.n || ':' || s.n)::uuid,
            'completed', true,
            'completed_at', now() - p_days_ago * interval '1 day' - interval '10 minutes' + s.n * interval '1 minute'
          ) order by s.n)
          from jsonb_array_elements(e.v -> 1) with ordinality s(v, n)
        )
      ) order by e.n)
      from jsonb_array_elements(p_exercises) with ordinality e(v, n)
    )
  );
$$;
grant execute on function pg_temp.workout(text, numeric, jsonb) to authenticated;

-- ── Alice logs three bench sessions ─────────────────────────────────────────────────────────────
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}', true);
select public.save_workout(pg_temp.workout('aaaaaaaa-0000-0000-0000-000000000001', 20,
  '[["barbell-bench-press", [{"reps": 5, "weight_kg": 50}, {"reps": 5, "weight_kg": 50}]]]'));
select public.save_workout(pg_temp.workout('aaaaaaaa-0000-0000-0000-000000000002', 10,
  '[["barbell-bench-press", [{"reps": 5, "weight_kg": 60}, {"reps": 8, "weight_kg": 50}]]]'));
select public.save_workout(pg_temp.workout('aaaaaaaa-0000-0000-0000-000000000003', 2,
  '[["barbell-bench-press", [{"reps": 5, "weight_kg": 72.5}]]]'));

-- In a test everything happens at one now(); spread the history out like real saves would.
reset role;
with numbered as (
  select s.id, row_number() over (partition by s.scope, s.key order by s.id) as n
  from public.rank_snapshots s where s.user_id = '11111111-1111-1111-1111-111111111111'
)
update public.rank_snapshots s
set taken_at = now() - (case n.n when 1 then 20 when 2 then 10 else 2 end) * interval '1 day'
from numbered n where n.id = s.id;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}', true);

-- ── History ─────────────────────────────────────────────────────────────────────────────────────
select is(jsonb_array_length(public.get_rank_history('lift', 'benchPress', now() - interval '30 days') -> 'snapshots'),
  3, 'three bench snapshots in the last 30 days');
select is(
  (select (h -> 'snapshots' -> 0 ->> 'at')::timestamptz < now() - interval '12 days'
   from public.get_rank_history('lift', 'benchPress', now() - interval '12 days') h),
  true, 'a shorter range starts with the last snapshot before it');
select is(jsonb_array_length(public.get_rank_history('lift', 'benchPress', now() - interval '12 days') -> 'snapshots'),
  3, 'so the line reaches the left edge (2 in range + 1 before)');
select ok(
  (select bool_and(e ->> 'kind' in ('placed', 'rank_up', 'rank_down'))
   from jsonb_array_elements(public.get_rank_history('lift', 'benchPress', now() - interval '30 days') -> 'events') e),
  'events mark the rank changes');
select is(
  (select e ->> 'kind' from jsonb_array_elements(public.get_rank_history('lift', 'benchPress', now() - interval '30 days') -> 'events') e
   order by (e ->> 'at')::timestamptz limit 1),
  'placed', 'the first event is the placement');

-- ── Events are timed by the workout ─────────────────────────────────────────────────────────────
select is(
  (select min(at) from public.get_rank_events(now() - interval '60 days') where key = 'benchPress'),
  now() - interval '20 days' - interval '1 hour', 'events carry the workout''s start, not the save time');
select ok((select count(*) > 0 from public.get_rank_events(now() - interval '60 days') where kind = 'rank_up'),
  'heavier sessions produce rank-ups');
select is((select count(*) from public.get_rank_events(now() + interval '1 day')), 0::bigint,
  'nothing after the requested date');

-- ── Records ─────────────────────────────────────────────────────────────────────────────────────
select ok((select count(*) > 0 from public.get_personal_records() where previous_value is null),
  'record history includes baselines');
select is(
  (select value from public.get_personal_records() where kind = 'weight' order by achieved_at desc limit 1),
  72.50, 'and the latest heaviest weight');
select is(
  (select (set_reps, set_weight_kg, workout_name)::text from public.get_personal_records()
   where kind = 'weight' order by achieved_at desc limit 1),
  '(5,72.50,"Push day")', 'with the set and workout behind it');
select is((select distinct rank_key from public.get_personal_records()), 'benchPress',
  'records carry the rank key');

-- ── Lift detail ─────────────────────────────────────────────────────────────────────────────────
select is(public.get_lift_detail('benchPress') #>> '{rank,tier}',
  (select tier::text from public.ranks_current where scope = 'lift' and key = 'benchPress'),
  'lift detail carries the current rank');
select is(jsonb_array_length(public.get_lift_detail('benchPress') -> 'sets'), 5,
  'every set in the window is listed');
select is(
  (select count(*) from jsonb_array_elements(public.get_lift_detail('benchPress') -> 'sets') s
   where (s ->> 'is_best')::boolean),
  1::bigint, 'one of them is the best set');
select is(public.get_lift_detail('benchPress') #>> '{sets,0,weight_kg}', '72.50',
  'sets are ordered by score');
select is(jsonb_array_length(public.get_lift_detail('benchPress') -> 'sessions'), 3,
  'one history point per session');
select is(
  (select jsonb_array_length(s -> 'anchors') from jsonb_array_elements(public.get_lift_detail('benchPress') -> 'standards') s
   where s ->> 'metric' = 'e1rm_ratio'),
  7, 'the standard lists the seven tier anchors in kg');
select ok(
  (select bool_and((a ->> 'value')::numeric > 0) from jsonb_array_elements(
     public.get_lift_detail('benchPress') #> '{standards,0,anchors}') a),
  'anchor values are converted to kilograms');
select is(public.get_lift_detail('notALift'), null, 'unknown lifts give null');

-- ── Best sets ───────────────────────────────────────────────────────────────────────────────────
select is(
  (select (weight_kg, reps)::text from public.get_lift_bests() where rank_key = 'benchPress'),
  '(72.50,5)', 'each ranked lift carries its best set');
select is(
  (select bodyweight_kg from public.get_lift_bests() where rank_key = 'benchPress'),
  75.00, 'with the weigh-in it was scored at');

-- ── Percentile ──────────────────────────────────────────────────────────────────────────────────
-- On a lift the dev seed never trains, so seeded lifters don't join the cohort.
reset role;
insert into public.ranks_current (user_id, scope, key, score, tier, division, status, standards_version)
values ('11111111-1111-1111-1111-111111111111', 'lift', 'sumoDeadlift', 250, 'silver', 3, 'ranked', 1);
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}', true);
select is(public.get_lift_percentile('sumoDeadlift') ->> 'percentile', null,
  'no percentile with fewer than 20 lifters like you');
reset role;
insert into public.ranks_current (user_id, scope, key, score, tier, division, status, standards_version)
select id, 'lift', 'sumoDeadlift', 20 * substr(id::text, 25)::integer, 'iron', 3, 'ranked', 1
from public.profiles where id::text like 'aaaa0000-%';
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}', true);
select is((public.get_lift_percentile('sumoDeadlift') ->> 'cohort')::integer, 25,
  '25 men in your bodyweight band');
select is((public.get_lift_percentile('sumoDeadlift') ->> 'percentile')::numeric, 48::numeric,
  'the percentile counts the lifters below you (12 of 25)');
select is(
  (select array_agg(k order by k) from jsonb_object_keys(public.get_lift_percentile('sumoDeadlift')) k),
  array['bw_max', 'bw_min', 'cohort', 'min_cohort', 'percentile', 'sex'],
  'and returns no one''s identity or score');

-- ── RLS ─────────────────────────────────────────────────────────────────────────────────────────
select set_config('request.jwt.claims', '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated"}', true);
select is(
  (select count(*) from public.get_personal_records())
  + (select count(*) from public.get_rank_events('-infinity'))
  + jsonb_array_length(public.get_rank_history('lift', 'benchPress', '-infinity') -> 'snapshots')
  + jsonb_array_length(public.get_lift_detail('benchPress') -> 'sets')
  + (select count(*) from public.get_lift_bests()),
  0::bigint, 'Bob sees none of Alice''s history, events, records or sets');

set local role anon;
select throws_ok($$select public.get_lift_detail('benchPress')$$, '42501', null,
  'anon can''t call the rank tab functions');

select * from finish();
rollback;
