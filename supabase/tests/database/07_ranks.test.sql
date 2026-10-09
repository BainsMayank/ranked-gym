-- Rank engine: pure functions (table-driven, same cases as the TypeScript mirror), scoring on
-- save_workout, records, history, edits and deletes, guardrails, jobs, predictions and RLS.
-- Run with `pnpm db:test`.
begin;
set local role postgres;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(100);

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'alice@test.dev'),
  ('22222222-2222-2222-2222-222222222222', 'bob@test.dev');
update public.profiles set sex_for_standards = 'male',
  birth_year = extract(year from now() at time zone 'utc')::integer - 21
where id = '11111111-1111-1111-1111-111111111111';
update public.profiles set sex_for_standards = 'male'
where id = '22222222-2222-2222-2222-222222222222';
insert into public.bodyweight_logs (user_id, weight_kg, logged_at)
values ('11111111-1111-1111-1111-111111111111', 75, now() - interval '3 days');
-- The setup above queued recomputes (profile and weigh-in changes); start with an empty queue.
delete from public.rank_jobs;

-- A workout payload: one exercise per [slug, sets[]] with sets as {reps, weight_kg, ...}.
create function pg_temp.workout(p_id text, p_days_ago numeric, p_exercises jsonb, p_edit boolean default false)
returns jsonb language sql as $$
  select jsonb_build_object(
    'id', p_id, 'name', 'Test', 'status', 'completed', 'edit', p_edit,
    'started_at', now() - p_days_ago * interval '1 day' - interval '1 hour',
    'ended_at', now() - p_days_ago * interval '1 day',
    'client_updated_at', now() - p_days_ago * interval '1 day' + case when p_edit then interval '1 minute' else interval '0' end,
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
grant execute on function pg_temp.workout(text, numeric, jsonb, boolean) to authenticated;

create temp table results (k text primary key, r jsonb);
grant all on results to authenticated;

-- ── Schema and standards ────────────────────────────────────────────────────────────────────────

select is(
  (select count(*) from pg_tables where schemaname = 'public' and tablename in (
    'rank_settings', 'rank_thresholds', 'rank_region_weights', 'strength_age_brackets',
    'rank_lifts', 'rank_variants', 'strength_standards', 'ranks_current', 'rank_snapshots',
    'rank_events', 'personal_records', 'rank_flags', 'workout_rewards', 'rank_jobs')),
  14::bigint, 'all 14 rank tables exist');
select ok(
  (select bool_and(rowsecurity) from pg_tables where schemaname = 'public' and tablename in (
    'rank_settings', 'rank_thresholds', 'rank_region_weights', 'strength_age_brackets',
    'rank_lifts', 'rank_variants', 'strength_standards', 'ranks_current', 'rank_snapshots',
    'rank_events', 'personal_records', 'rank_flags', 'workout_rewards', 'rank_jobs')),
  'RLS is enabled on every rank table');
select is((select active_standards_version from public.rank_settings), 1, 'standards v1 are active');
select is(
  (select count(*) from public.exercises x where x.rank_key is not null and x.created_by is null
   and not exists (select 1 from public.rank_lifts l where l.rank_key = x.rank_key)),
  0::bigint, 'every rank key in the library has a rank_lifts row');
select is((select count(*) from public.rank_thresholds where version = 1), 22::bigint,
  '22 divisions: III–I for 7 tiers plus Champion');
select is(
  (select count(*) from public.rank_variants v
   where not exists (select 1 from public.exercises x where x.slug = v.slug and x.created_by is null)),
  0::bigint, 'every skill progression is in the library');
select ok((select exists (select 1 from cron.job where jobname = 'process-rank-jobs')),
  'pg_cron processes queued recomputes');

-- ── Pure maths (same tables as src/lib/game/engine/__tests__) ─────────────────────────────────

select is(round(public.rank_e1rm(l, r), 2), e, format('e1RM %s kg × %s = %s', l, r, e))
from (values (100::numeric, 1, 100::numeric), (100, 5, 114.58), (100, 10, 133.33),
  (60, 5, 68.75), (100, 11, null), (0, 5, null)) v(l, r, e);

select is(round(public.rank_interp(x, '{1,2,4}', '{100,250,400}'), 4), y, format('interp(%s) = %s', x, y))
from (values (0.5::numeric, 50::numeric), (1.5, 175), (6, 550), (-1, 0)) v(x, y);

select is((t.tier::text || coalesce(' ' || t.division, '')), e, format('score %s → %s', s, e))
from (values (0::numeric, 'iron 3'), (33.33, 'iron 2'), (100, 'bronze 3'), (549.99, 'gold 1'),
  (883.33, 'master 2'), (950, 'champion'), (1000, 'champion')) v(s, e)
cross join lateral public.rank_tier_for(s, 1) t;

select is(public.rank_ordinal('iron', 3::smallint), 0, 'Iron III is ordinal 0');
select is(public.rank_ordinal('champion', null), 21, 'Champion is ordinal 21');

select is(public.rank_age_factor(b), f, format('age factor for birth year %s', b))
from (values (null::smallint, 1::numeric),
  ((extract(year from now())::integer - 17)::smallint, 1.06),
  ((extract(year from now())::integer - 45)::smallint, 1.08)) v(b, f);

select is(
  (select round(u.vals[3], 6) from public.rank_standard_at(1, 'benchPress', '', 'e1rm_ratio', 'unspecified', 70) u),
  (select round((m.vals[3] + f.vals[3]) / 2, 6)
   from public.rank_standard_at(1, 'benchPress', '', 'e1rm_ratio', 'male', 70) m,
        public.rank_standard_at(1, 'benchPress', '', 'e1rm_ratio', 'female', 70) f),
  '"rather not say" uses the average of both curves');
select ok(
  (select abs(a.vals[3] * 75.01 - b.vals[3] * 74.99) < 0.05
   from public.rank_standard_at(1, 'benchPress', '', 'e1rm_ratio', 'male', 75.01) a,
        public.rank_standard_at(1, 'benchPress', '', 'e1rm_ratio', 'male', 74.99) b),
  'no jump at a bodyweight band edge');

-- Set scoring: tier for (lift, variant, log type, mode, kg, reps, seconds, bodyweight, sex).
select is(
  (select coalesce(t.tier::text, 'none') from public.rank_set_score(1, k, v, lt::public.exercise_log_type,
     m::public.weight_mode, kg, r, d, bw, s::public.sex_for_standards, 1, 1000) sc
   left join lateral public.rank_tier_for(sc.score, 1) t on true),
  e, label)
from (values
  ('benchPress', '', 'weight_reps', 'absolute', 85::numeric, 1, null::integer, 75::numeric, 'male', 'gold', 'bench 85 kg at 75 kg: Gold'),
  ('pullUp', '', 'weighted_bodyweight', 'bodyweight', 0, 5, null, null, 'male', 'silver', '5 pull-ups, no weigh-in: Silver'),
  ('pullUp', '', 'weighted_bodyweight', 'bodyweight', 0, 1, null, null, 'female', 'silver', 'a woman''s first pull-up: Silver'),
  ('pullUp', '', 'weighted_bodyweight', 'bodyweight', 75, 1, null, 75, 'male', 'master', 'pull-up +75 kg at 75 kg: Master'),
  ('frontLever', '', 'duration', 'bodyweight', null, null, 3, null, 'male', 'master', 'a 3 s front lever: Master'),
  ('frontLever', 'tuck-front-lever', 'duration', 'bodyweight', null, null, 15, null, 'male', 'silver', 'a 15 s tuck front lever: Silver'),
  ('pullUp', '', 'weighted_bodyweight', 'assisted', 20, 8, null, 75, 'male', 'none', 'assisted pull-ups never rank'),
  ('benchPress', '', 'weight_reps', 'absolute', 100, 12, null, 75, 'male', 'none', 'sets above 10 reps don''t rank weight lifts')
) v(k, v, lt, m, kg, r, d, bw, s, e, label);

select is(
  (select score from public.rank_set_score(1, 'frontLever', 'tuck-front-lever', 'duration', 'bodyweight',
    null, null, 600, null, 'male', 1, 1000)),
  450.00, 'a progression is capped below the next one');
select ok(
  (select needs_bw from public.rank_set_score(1, 'benchPress', '', 'weight_reps', 'absolute', 80, 5,
    null, null, 'male', 1, 1000)),
  'a weighted set without a weigh-in asks for one');

select is(public.rank_flag_reason(lt::public.exercise_log_type, m::public.weight_mode, kg, r, d, bw, mr, mx, mh)::text,
  e, label)
from (values
  ('weight_reps', 'absolute', 100::numeric, 5, null::integer, 80::numeric, 4::numeric, null::integer, null::integer, null, 'a normal bench is fine'),
  ('weight_reps', 'absolute', 330, 1, null, 80, 4, null, null, 'e1rm_over_limit', 'bench over 4× bodyweight is flagged'),
  ('weight_reps', 'absolute', 20, 101, null, null, null, null, null, 'reps_over_limit', '101 loaded reps are flagged'),
  ('duration', 'bodyweight', null, null, 300, null, null, null, 120, 'hold_over_limit', 'a 5-minute front lever is flagged')
) v(lt, m, kg, r, d, bw, mr, mx, mh, e, label);

-- ── Alice logs two workouts ─────────────────────────────────────────────────────────────────────
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}', true);

insert into results select 'w1', public.save_workout(pg_temp.workout('aaaaaaaa-0000-0000-0000-000000000001', 2,
  '[["barbell-bench-press", [{"set_type": "warmup", "reps": 5, "weight_kg": 100}, {"reps": 5, "weight_kg": 60}]],
    ["pull-up", [{"weight_mode": "bodyweight", "reps": 6, "weight_kg": 0}]]]'));

select is((select r #>> '{rewards,rank_changes,0,kind}' from results where k = 'w1'), 'placed',
  'the first workout places lifts');
select is((select jsonb_array_length(r #> '{rewards,prs}') from results where k = 'w1'), 0,
  'a first time is a baseline, not a PR');
select is((select (r #>> '{rewards,baselines}')::integer from results where k = 'w1'), 2,
  'two exercises got baselines');
select is((select tier::text || ' ' || division from public.ranks_current where scope = 'lift' and key = 'benchPress'),
  'silver 1', 'bench 60 × 5 (68.75 kg e1RM) at 75 kg is Silver I');
select is((select best_set_id from public.ranks_current where scope = 'lift' and key = 'benchPress'),
  md5('aaaaaaaa-0000-0000-0000-0000000000011:2')::uuid, 'the warm-up never counts');
select is((select r #>> '{rewards,placement,lifts}' from results where k = 'w1'), '2',
  'placement shows 2 of 5 lifts');
select is((select status::text from public.ranks_current where scope = 'overall'), 'placement',
  'no overall rank before placement');

insert into results select 'w2', public.save_workout(pg_temp.workout('aaaaaaaa-0000-0000-0000-000000000002', 0,
  '[["barbell-bench-press", [{"reps": 5, "weight_kg": 70}]]]'));

select is(
  (select string_agg(p ->> 'kind', ',' order by p ->> 'kind') from results, jsonb_array_elements(r #> '{rewards,prs}') p where k = 'w2'),
  'e1rm,session_volume,set_volume,weight',
  'heavier bench: e1RM, weight, set and session volume PRs (70 kg reps are a new baseline)');
select is(
  (select c ->> 'kind' from results, jsonb_array_elements(r #> '{rewards,rank_changes}') c
   where k = 'w2' and c ->> 'scope' = 'lift' and c ->> 'key' = 'benchPress'),
  'rank_up', 'bench ranks up');
select is((select tier::text || ' ' || division from public.ranks_current where scope = 'lift' and key = 'benchPress'),
  'gold 2', 'bench 70 × 5 is Gold II');
select ok((select is_pr from public.workout_sets where id = md5('aaaaaaaa-0000-0000-0000-0000000000021:1')::uuid),
  'the PR set is marked is_pr');
select is((select count(*) from public.rank_snapshots where scope = 'lift' and key = 'benchPress'), 2::bigint,
  'history has a snapshot per bench score');
select is((select string_agg(kind::text, ',' order by id) from public.rank_events where scope = 'lift' and key = 'benchPress'),
  'placed,rank_up', 'events: placed, then ranked up');
select is(public.get_workout_rewards('aaaaaaaa-0000-0000-0000-000000000002'),
  (select r -> 'rewards' from results where k = 'w2'), 'rewards can be fetched again later');
select ok(not (select r #>> '{rewards,needs_bodyweight}' from results where k = 'w2')::boolean,
  'no weigh-in prompt with a recent weigh-in');

select is((select count(*) from public.get_ranks() where scope = 'lift'), 2::bigint, 'get_ranks lists both lifts');
select ok(not (select bool_or(inactive) from public.get_ranks()), 'Alice is active');
select is(
  (select jsonb_array_length(p -> 'loads') from jsonb_array_elements(public.get_rank_predictions()) p
   where p ->> 'rank_key' = 'benchPress'),
  4, 'predictions give loads for 1, 3, 5 and 8 reps');
select is(
  (select p #>> '{eta,status}' from jsonb_array_elements(public.get_rank_predictions()) p
   where p ->> 'rank_key' = 'benchPress'),
  'need_more_sessions', 'no ETA from two sessions');
select is(
  (select p ->> 'reps' from jsonb_array_elements(public.get_rank_predictions()) p
   where p ->> 'rank_key' = 'pullUp'),
  '7', 'pull-ups: 7 clean reps for Silver II');

-- An edit that lowers the weight ranks back down and removes the PRs.
insert into results select 'w2-edit', public.save_workout(pg_temp.workout('aaaaaaaa-0000-0000-0000-000000000002', 0,
  '[["barbell-bench-press", [{"reps": 5, "weight_kg": 50}]]]', true));
select is(
  (select c ->> 'kind' from results, jsonb_array_elements(r #> '{rewards,rank_changes}') c
   where k = 'w2-edit' and c ->> 'scope' = 'lift' and c ->> 'key' = 'benchPress'),
  'rank_down', 'editing the weight down ranks bench down');
select is((select tier::text from public.ranks_current where scope = 'lift' and key = 'benchPress'),
  'silver', 'bench is back to the first workout''s Silver');
select ok(not (select is_pr from public.workout_sets where id = md5('aaaaaaaa-0000-0000-0000-0000000000021:1')::uuid),
  'the edited set is no longer a PR');
select is((select count(*) from public.personal_records where workout_id = 'aaaaaaaa-0000-0000-0000-000000000002'
  and previous_value is not null), 0::bigint, 'no records point at the edited workout');

-- An impossible set is flagged, not ranked.
insert into results select 'w3', public.save_workout(pg_temp.workout('aaaaaaaa-0000-0000-0000-000000000003', 0,
  '[["barbell-bench-press", [{"reps": 1, "weight_kg": 330}]]]'));
select is((select r #>> '{rewards,flagged}' from results where k = 'w3'), '1', 'the rewards say one set was flagged');
select is((select reason::text || ' ' || status from public.rank_flags), 'e1rm_over_limit pending',
  'it waits in rank_flags for review');
select is((select tier::text from public.ranks_current where scope = 'lift' and key = 'benchPress'),
  'silver', 'and doesn''t change the rank');
select is((select count(*) from public.personal_records where workout_id = 'aaaaaaaa-0000-0000-0000-000000000003'),
  0::bigint, 'or set records');

-- Deleting a workout queues a recompute.
delete from public.workouts where id = 'aaaaaaaa-0000-0000-0000-000000000003';
set local role postgres;
select is((select reason from public.rank_jobs where user_id = '11111111-1111-1111-1111-111111111111'),
  'workout_deleted', 'deleting a finished workout queues a recompute');
select is(public.process_rank_jobs(10), 1, 'the job runner processes it');
select is((select count(*) from public.rank_jobs), 0::bigint, 'and empties the queue');
select is((select count(*) from public.rank_flags), 0::bigint, 'the deleted set''s flag is gone');

insert into public.bodyweight_logs (user_id, weight_kg)
values ('11111111-1111-1111-1111-111111111111', 76);
select is((select reason from public.rank_jobs where user_id = '11111111-1111-1111-1111-111111111111'),
  'bodyweight', 'a new weigh-in queues a recompute');
update public.profiles set sex_for_standards = 'unspecified' where id = '11111111-1111-1111-1111-111111111111';
select is((select reason from public.rank_jobs where user_id = '11111111-1111-1111-1111-111111111111'),
  'profile', 'changing standards queues a recompute');
update public.rank_settings set updated_at = now();
select is((select reason from public.rank_jobs where user_id = '11111111-1111-1111-1111-111111111111'),
  'standards', 'new standards queue everyone');
-- Other lifters in the database (e.g. from local testing) are queued too, so check Alice's job only.
select ok(public.process_rank_jobs(100) >= 1, 'the runner processes the queue');
select ok(not exists (select 1 from public.rank_jobs where user_id = '11111111-1111-1111-1111-111111111111'),
  'including Alice''s recompute');
select ok((select score from public.ranks_current where user_id = '11111111-1111-1111-1111-111111111111'
  and scope = 'lift' and key = 'benchPress') >
  (select score from public.rank_snapshots where user_id = '11111111-1111-1111-1111-111111111111'
   and scope = 'lift' and key = 'benchPress' order by id limit 1),
  '"rather not say" scores higher on the averaged curve');

-- Inactivity: nothing rankable for 60 days (with a weigh-in from back then, so the sets still rank).
insert into results select 'before-break', to_jsonb(score) from public.ranks_current
where user_id = '11111111-1111-1111-1111-111111111111' and scope = 'lift' and key = 'benchPress';
insert into public.bodyweight_logs (user_id, weight_kg, logged_at)
values ('11111111-1111-1111-1111-111111111111', 75, now() - interval '72 days');
update public.workout_sets s set completed_at = now() - interval '70 days'
from public.workout_exercises we
where we.id = s.workout_exercise_id
  and we.workout_id in (select id from public.workouts where user_id = '11111111-1111-1111-1111-111111111111');
select public.rank_recompute_user('11111111-1111-1111-1111-111111111111');
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}', true);
select ok((select bool_and(inactive) from public.get_ranks()), '60 days without rankable sets: Inactive');
select is((select to_jsonb(score) from public.ranks_current where scope = 'lift' and key = 'benchPress'),
  (select r from results where k = 'before-break'), 'but no score is lost');

-- ── Bob: no weigh-in ────────────────────────────────────────────────────────────────────────────
select set_config('request.jwt.claims', '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated"}', true);
insert into results select 'bob', public.save_workout(pg_temp.workout('bbbbbbbb-0000-0000-0000-000000000001', 0,
  '[["barbell-bench-press", [{"reps": 5, "weight_kg": 80}]],
    ["pull-up", [{"weight_mode": "bodyweight", "reps": 8, "weight_kg": 0}]]]'));
select ok((select r #>> '{rewards,needs_bodyweight}' from results where k = 'bob')::boolean,
  'without a weigh-in the rewards ask for one');
select is((select string_agg(key, ',') from public.ranks_current where scope = 'lift'), 'pullUp',
  'bodyweight reps still rank; the bench waits');

-- ── RLS ─────────────────────────────────────────────────────────────────────────────────────────
select is((select count(*) from public.ranks_current where user_id = '11111111-1111-1111-1111-111111111111'),
  0::bigint, 'Bob can''t read Alice''s ranks');
select is((select count(*) from public.personal_records where user_id = '11111111-1111-1111-1111-111111111111'),
  0::bigint, 'or her records');
select is((select count(*) from public.rank_snapshots where user_id = '11111111-1111-1111-1111-111111111111')
  + (select count(*) from public.rank_events where user_id = '11111111-1111-1111-1111-111111111111'),
  0::bigint, 'or her rank history');
select is(public.get_workout_rewards('aaaaaaaa-0000-0000-0000-000000000002'), null,
  'or her workout rewards');
select throws_ok(
  $$insert into public.ranks_current (user_id, scope, key, score, status, standards_version)
    values ('22222222-2222-2222-2222-222222222222', 'overall', 'overall', 999, 'ranked', 1)$$,
  '42501', null, 'nobody can write their own rank');
select throws_ok(
  $$update public.personal_records set value = 9999$$,
  '42501', null, 'or edit a record');
select throws_ok(
  $$update public.workout_sets set is_pr = true$$,
  '42501', null, 'or mark a PR');
select throws_ok(
  $$select public.rank_recompute_user('22222222-2222-2222-2222-222222222222')$$,
  '42501', null, 'clients can''t run the engine directly');
select throws_ok($$select public.process_rank_jobs(10)$$, '42501', null, 'or the job runner');
select throws_ok(
  $$update public.strength_standards set anchor_values = '{1,1,1,1,1,1,1}'$$,
  '42501', null, 'or change the standards');
select ok((select count(*) > 0 from public.strength_standards), 'signed-in users can read the standards');

set local role anon;
select throws_ok($$select count(*) from public.strength_standards$$, '42501', null,
  'anon can''t read the standards');
select throws_ok($$select public.get_ranks()$$, '42501', null, 'or call the rank functions');

select * from finish();
rollback;
