-- Leagues (Phase 7): IST weeks, the LP formula and its caps, placement into groups by overall
-- score, mid-week joins, promotion and demotion (Rookie floor, Legend ceiling, no promotion on
-- 0 LP), idempotent cycles, season rewards, custom league scoring, challenges and RLS.
-- Everything runs in 2031–2032 (league_run_cycle takes p_now), so dev-seed data never interferes.
-- Run with `pnpm db:test`.
begin;
set local role postgres;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(64);

-- ── Helpers ─────────────────────────────────────────────────────────────────────────────────────
create function pg_temp.uid(n integer) returns uuid language sql immutable as $$
  select ('00000000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid;
$$;

create function pg_temp.mkuser(n integer, p_onboarded boolean default true) returns uuid
language plpgsql as $$
begin
  insert into auth.users (id, email) values (pg_temp.uid(n), 'u' || n || '@leagues.test');
  if p_onboarded then
    update public.profiles set username = 'league_u' || n, display_name = 'Lifter ' || n,
      birth_year = 2000, onboarded_at = '2030-01-01'
    where id = pg_temp.uid(n);
  end if;
  return pg_temp.uid(n);
end;
$$;

-- A completed workout of n bench sets (50 kg × 5) starting at p_at.
create function pg_temp.wk(p_user uuid, p_at timestamptz, p_sets integer default 4,
  p_plan_day uuid default null) returns uuid
language plpgsql as $$
declare
  v_id uuid := gen_random_uuid();
  v_we uuid := gen_random_uuid();
begin
  insert into public.workouts (id, user_id, name, started_at, ended_at, status, client_updated_at,
    plan_day_id)
  values (v_id, p_user, 'T', p_at, p_at + interval '1 hour', 'completed', p_at, p_plan_day);
  insert into public.workout_exercises (id, workout_id, exercise_id, sort_order)
  values (v_we, v_id, (select id from public.exercises where slug = 'barbell-bench-press'
    and created_by is null), 0);
  insert into public.workout_sets (id, workout_exercise_id, sort_order, set_type, weight_mode,
    reps, weight_kg, completed, completed_at)
  select gen_random_uuid(), v_we, i, 'working', 'absolute', 5, 50, true, p_at + i * interval '1 minute'
  from generate_series(1, p_sets) i;
  return v_id;
end;
$$;

create function pg_temp.snap(p_user uuid, p_scope public.rank_scope, p_key text, p_score numeric,
  p_at timestamptz) returns void
language sql as $$
  insert into public.rank_snapshots (user_id, scope, key, score, tier, division, standards_version, taken_at)
  values (p_user, p_scope, p_key, p_score, 'iron', 3, 1, p_at);
$$;

create function pg_temp.standing(n integer) returns text language sql as $$
  select division::text from public.league_standing where user_id = pg_temp.uid(n);
$$;

create temp table t (k text primary key, v timestamptz, id uuid, n bigint, s text);
grant all on t to authenticated;
grant execute on function pg_temp.uid(integer) to authenticated;

-- ── Schema ──────────────────────────────────────────────────────────────────────────────────────
select is(
  (select count(*) from pg_tables where schemaname = 'public' and rowsecurity and tablename in (
    'league_seasons', 'league_weeks', 'leagues', 'league_members', 'league_standing',
    'league_challenges', 'season_rewards')),
  7::bigint, 'all 7 league tables exist with RLS');
select ok((select exists (select 1 from cron.job where jobname = 'league-weekly-cycle')),
  'pg_cron runs the weekly cycle');

-- ── IST weeks ───────────────────────────────────────────────────────────────────────────────────
select is(public.league_week_start('2031-03-09 18:29:59+00'), '2031-03-03 00:00+05:30'::timestamptz,
  'Sunday 23:59 IST still belongs to the week that began on Monday 3 March');
select is(public.league_week_start('2031-03-09 18:30:00+00'), '2031-03-10 00:00+05:30'::timestamptz,
  'Monday 00:00 IST starts a new week');

-- ── The LP formula (a 2032 week, one source at a time) ─────────────────────────────────────────
insert into t (k, v) values ('L', public.league_week_start('2032-06-09 12:00+05:30'));
select pg_temp.mkuser(60, false);

-- One qualifying workout in the 4 weeks before: a baseline of 1 set a week.
select pg_temp.wk(pg_temp.uid(60), (select v from t where k = 'L') - interval '10 days');
-- Mon, Tue, Tue again (same IST day) and Thu; a 3-set workout doesn't qualify.
select pg_temp.wk(pg_temp.uid(60), (select v from t where k = 'L') + interval '8 hours');
select pg_temp.wk(pg_temp.uid(60), (select v from t where k = 'L') + interval '1 day 8 hours');
select pg_temp.wk(pg_temp.uid(60), (select v from t where k = 'L') + interval '1 day 18 hours');
select pg_temp.wk(pg_temp.uid(60), (select v from t where k = 'L') + interval '3 days 8 hours', 3);
-- A planned session done on its day.
insert into public.plans (id, user_id, name, goal, start_date, end_date)
values ('aaaa6000-0000-4000-8000-000000000001', pg_temp.uid(60), 'Plan', 'stronger',
  '2032-06-01', '2032-07-01');
insert into public.plan_days (id, plan_id, week, date, original_date, template_key, label)
values ('aaaa6000-0000-4000-8000-000000000002', 'aaaa6000-0000-4000-8000-000000000001', 1,
  ((select v from t where k = 'L') at time zone 'Asia/Kolkata')::date + 3,
  ((select v from t where k = 'L') at time zone 'Asia/Kolkata')::date + 3, 'A', 'A');
select pg_temp.wk(pg_temp.uid(60), (select v from t where k = 'L') + interval '3 days 9 hours', 4,
  'aaaa6000-0000-4000-8000-000000000002');
-- 8 PRs and a baseline, 4 lift rank-ups, a muscle rank-up (doesn't count).
insert into public.personal_records (user_id, exercise_id, kind, value, previous_value, workout_id, achieved_at)
select pg_temp.uid(60), x.id, 'weight', 60 + i, case when i > 0 then 50 end,
  (select id from public.workouts where user_id = pg_temp.uid(60) order by started_at desc limit 1),
  (select v from t where k = 'L') + interval '2 days'
from generate_series(0, 8) i, public.exercises x where x.slug = 'barbell-bench-press' and x.created_by is null;
insert into public.rank_events (user_id, scope, key, kind, to_tier, to_division, score, created_at)
select pg_temp.uid(60), s, 'benchPress', 'rank_up', 'gold', 3, 400, (select v from t where k = 'L') + interval '2 days'
from (values ('lift'::public.rank_scope), ('lift'), ('lift'), ('lift'), ('muscle')) v(s);
-- Bench rose 20 points this week; a lift first ranked this week doesn't count as a gain.
select pg_temp.snap(pg_temp.uid(60), 'lift', 'benchPress', 300, (select v from t where k = 'L') - interval '5 days');
select pg_temp.snap(pg_temp.uid(60), 'lift', 'benchPress', 320, (select v from t where k = 'L') + interval '2 days');
select pg_temp.snap(pg_temp.uid(60), 'lift', 'backSquat', 500, (select v from t where k = 'L') + interval '2 days');

create temp table bd as
select public.league_lp_breakdown(pg_temp.uid(60), (select v from t where k = 'L'),
  (select v from t where k = 'L') + interval '7 days') as b;

select is((select (b ->> 'workouts')::integer from bd), 120, 'workouts: 40 a day, once per IST day; 3-set workouts don''t count');
select is((select (b ->> 'planned')::integer from bd), 15, 'a planned session done on its day: +15');
select is((select (b ->> 'prs')::integer from bd), 60, 'PRs: 10 each, capped at 60 (baselines don''t count)');
select is((select (b ->> 'rank_ups')::integer from bd), 90, 'lift rank-ups: 30 each, capped at 90 (muscles don''t count)');
select is((select (b ->> 'baseline')::integer from bd), 50, 'beating your 4-week baseline: +50');
select is((select (b ->> 'strength')::integer from bd), 40, 'strength gain: 2 × points gained on lifts you already had');
select is((select (b ->> 'total')::integer from bd), 375, 'total LP for the week');
select is(public.league_lp(pg_temp.uid(60), (select v from t where k = 'L'), (select v from t where k = 'L') + interval '7 days'),
  375, 'league_lp matches the breakdown');

-- Same training, very different strength: same LP.
select pg_temp.mkuser(61, false);
select pg_temp.mkuser(62, false);
select pg_temp.snap(pg_temp.uid(61), 'overall', 'overall', 50, (select v from t where k = 'L') - interval '30 days');
select pg_temp.snap(pg_temp.uid(62), 'overall', 'overall', 760, (select v from t where k = 'L') - interval '30 days');
select pg_temp.wk(pg_temp.uid(n), (select v from t where k = 'L') + d * interval '1 day' + interval '9 hours')
from (values (61), (62)) u(n), generate_series(0, 2) d;
select is(
  public.league_lp(pg_temp.uid(61), (select v from t where k = 'L'), (select v from t where k = 'L') + interval '7 days'),
  public.league_lp(pg_temp.uid(62), (select v from t where k = 'L'), (select v from t where k = 'L') + interval '7 days'),
  'an Iron and a Diamond lifter with the same training earn the same LP');
select ok(public.league_lp(pg_temp.uid(61), (select v from t where k = 'L'), (select v from t where k = 'L') + interval '7 days') > 0,
  '(and both earn some)');

-- ── Placement (week W1 of 2031) ─────────────────────────────────────────────────────────────────
insert into t (k, v) values ('W1', public.league_week_start('2031-03-12 12:00+05:30'));
select pg_temp.mkuser(n) from generate_series(1, 31) n;
select pg_temp.snap(pg_temp.uid(n), 'overall', 'overall', 10 * n, '2031-02-01') from generate_series(1, 31) n;
select pg_temp.wk(pg_temp.uid(n), (select v from t where k = 'W1') - interval '3 days') from generate_series(1, 31) n;
select pg_temp.mkuser(40, false);
select pg_temp.wk(pg_temp.uid(40), (select v from t where k = 'W1') - interval '3 days');
select pg_temp.mkuser(41);
select pg_temp.wk(pg_temp.uid(41), (select v from t where k = 'W1') - interval '20 days');

select public.league_run_cycle((select v from t where k = 'W1') + interval '1 hour');
insert into t (k, n) select 'w1', id from public.league_weeks where starts_at = (select v from t where k = 'W1');

select is((select count(*) from public.league_members m join public.leagues l on l.id = m.league_id
  where l.week_id = (select n from t where k = 'w1')), 31::bigint,
  'everyone onboarded and active in the last 14 days is placed');
select is((select count(*) from public.league_members m join public.leagues l on l.id = m.league_id
  where l.week_id = (select n from t where k = 'w1') and m.user_id in (pg_temp.uid(40), pg_temp.uid(41))),
  0::bigint, 'not onboarded or inactive for 14 days: not placed');
select is((select array_agg(c order by g) from (
    select l.group_no as g, count(*) as c from public.leagues l join public.league_members m on m.league_id = l.id
    where l.week_id = (select n from t where k = 'w1') group by l.group_no) x),
  array[16, 15]::bigint[], '31 Rookies make two near-equal groups');
select ok((select min(m.seed_score) from public.league_members m join public.leagues l on l.id = m.league_id
    where l.week_id = (select n from t where k = 'w1') and l.group_no = 1)
  > (select max(m.seed_score) from public.league_members m join public.leagues l on l.id = m.league_id
    where l.week_id = (select n from t where k = 'w1') and l.group_no = 2),
  'groups hold similar overall ranks');
select is((select count(*) from public.league_challenges c join public.leagues l on l.id = c.league_id
  where l.week_id = (select n from t where k = 'w1')), 4::bigint, 'two challenges per group');
select is(pg_temp.standing(1), 'rookie', 'everyone starts in Rookie');
select is((select week_no from public.league_weeks where id = (select n from t where k = 'w1')), 1::smallint,
  'a new season starts at week 1');

select public.league_run_cycle((select v from t where k = 'W1') + interval '2 hours');
select is((select count(*) from public.leagues where week_id = (select n from t where k = 'w1')), 2::bigint,
  'running the cycle again changes nothing');

-- Mid-week join: a first workout drops a new lifter into the closest group with room.
select pg_temp.mkuser(32);
select pg_temp.wk(pg_temp.uid(32), (select v from t where k = 'W1') + interval '1 day 10 hours');
select is((select l.group_no from public.leagues l join public.league_members m on m.league_id = l.id
  where l.week_id = (select n from t where k = 'w1') and m.user_id = pg_temp.uid(32)), 2::smallint,
  'a mid-week first workout joins the group nearest their score');

-- ── Week 1 results ──────────────────────────────────────────────────────────────────────────────
select pg_temp.wk(pg_temp.uid(31), (select v from t where k = 'W1') + d * interval '1 day' + interval '9 hours')
from generate_series(0, 2) d;
select pg_temp.wk(pg_temp.uid(30), (select v from t where k = 'W1') + d * interval '1 day' + interval '9 hours')
from generate_series(0, 1) d;
select pg_temp.wk(pg_temp.uid(28), (select v from t where k = 'W1') + interval '9 hours');
select pg_temp.wk(pg_temp.uid(29), (select v from t where k = 'W1') + interval '2 days 9 hours');

-- Standings are live during the week (looked at on Sunday through the league clock).
select set_config('app.league_now', ((select v from t where k = 'W1') + interval '6 days')::text, true);
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-000000000031", "role": "authenticated"}', true);
select is((public.get_league_home() #>> '{league,position}')::integer, 1, 'the leader sees position 1');
select ok((public.get_league_home() -> 'breakdown') ? 'workouts', 'and their LP breakdown');
select is(jsonb_array_length(public.get_league_standings(
    (select l.id from public.leagues l join public.league_members m on m.league_id = l.id
     where l.week_id = (select n from t where k = 'w1') and m.user_id = pg_temp.uid(31))) -> 'rows'),
  16, 'standings list the whole group');
select is(public.get_league_standings(
    (select l.id from public.leagues l where l.week_id = (select n from t where k = 'w1') and l.group_no = 2)),
  null, 'but not another group');
select is((select count(*) from public.leagues where week_id = (select n from t where k = 'w1')), 1::bigint,
  'RLS: members see only their own league');
reset role;

select public.league_run_cycle((select v from t where k = 'W1') + interval '7 days 1 hour');

select is((select array_agg(m.user_id order by m.final_position) from public.league_members m
    join public.leagues l on l.id = m.league_id
    where l.week_id = (select n from t where k = 'w1') and l.group_no = 1 and m.outcome = 'promoted'),
  array[pg_temp.uid(31), pg_temp.uid(30), pg_temp.uid(28)],
  'top 20% promote; a tie goes to whoever trained first');
select is((select outcome::text from public.league_members m join public.leagues l on l.id = m.league_id
  where l.week_id = (select n from t where k = 'w1') and m.user_id = pg_temp.uid(29)), 'stayed',
  'fourth place stays');
select is((select count(*) from public.league_members m join public.leagues l on l.id = m.league_id
  where l.week_id = (select n from t where k = 'w1') and l.group_no = 2 and m.outcome = 'promoted'),
  1::bigint, 'nobody promotes on 0 LP (only one lifter in group 2 trained)');
select is((select count(*) from public.league_members m join public.leagues l on l.id = m.league_id
  where l.week_id = (select n from t where k = 'w1') and m.outcome = 'demoted'), 0::bigint,
  'Rookie is the floor');
select is(array[pg_temp.standing(31), pg_temp.standing(32), pg_temp.standing(29)],
  array['contender', 'contender', 'rookie'], 'standings move with the results');
select is((select status::text from public.league_weeks where id = (select n from t where k = 'w1')), 'closed',
  'week 1 is closed');
select is((select final_points from public.league_members m join public.leagues l on l.id = m.league_id
  where l.week_id = (select n from t where k = 'w1') and m.user_id = pg_temp.uid(31)), 170,
  'final LP are frozen (3 days + beating the baseline)');

-- ── Week 2: Contender, demotion and the Legend ceiling ─────────────────────────────────────────
insert into t (k, n) select 'w2', id from public.league_weeks
where starts_at = (select v from t where k = 'W1') + interval '7 days';
select is((select count(*) from public.leagues l join public.league_members m on m.league_id = l.id
  where l.week_id = (select n from t where k = 'w2') and l.division = 'contender'), 4::bigint,
  'promoted lifters play week 2 in Contender');

select pg_temp.wk(pg_temp.uid(32), (select v from t where k = 'W1') + interval '7 days' + d * interval '1 day' + interval '9 hours')
from generate_series(0, 1) d;
select pg_temp.wk(pg_temp.uid(31), (select v from t where k = 'W1') + interval '8 days 9 hours');

-- A Legend group of 5 (built by hand) to check the ceiling.
with l as (
  insert into public.leagues (kind, week_id, division, group_no, name, starts_at, ends_at)
  values ('ranked', (select n from t where k = 'w2'), 'legend', 1, 'Legend league',
    (select v from t where k = 'W1') + interval '7 days', (select v from t where k = 'W1') + interval '14 days')
  returning id)
insert into t (k, id) select 'legend', id from l;
select pg_temp.mkuser(n, false) from generate_series(70, 74) n;
insert into public.league_members (league_id, user_id) select (select id from t where k = 'legend'), pg_temp.uid(n)
from generate_series(70, 74) n;
select pg_temp.wk(pg_temp.uid(70), (select v from t where k = 'W1') + interval '9 days 9 hours');

select public.league_run_cycle((select v from t where k = 'W1') + interval '14 days 1 hour');

select is(array[pg_temp.standing(32), pg_temp.standing(31), pg_temp.standing(28), pg_temp.standing(30)],
  array['elite', 'contender', 'contender', 'rookie'],
  'Contender: the winner promotes, the last place demotes');
select is((select outcome::text from public.league_members where league_id = (select id from t where k = 'legend')
  and user_id = pg_temp.uid(70)), 'stayed', 'Legend is the ceiling');
select is(pg_temp.standing(74), 'elite', 'the bottom of Legend demotes to Elite');

-- Results reach the lifter once.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-000000000032", "role": "authenticated"}', true);
select is(public.get_league_home() #>> '{result,outcome}', 'promoted', 'the Monday result shows once');
select public.mark_league_result_seen((public.get_league_home() #>> '{result,league_id}')::uuid);
select is(public.get_league_home() -> 'result', 'null'::jsonb,
  'dismissing it clears older unseen results too');
select is(jsonb_array_length(public.get_league_history()), 2, 'history lists both finished weeks');
reset role;

-- ── Season end ──────────────────────────────────────────────────────────────────────────────────
insert into t (k, n) select 'season', season_id from public.league_weeks where id = (select n from t where k = 'w1');
select public.league_run_cycle((select ends_at from public.league_seasons where id = (select n from t where k = 'season')) + interval '1 hour');
select is((select status::text from public.league_seasons where id = (select n from t where k = 'season')), 'closed',
  'the season closes after 8 weeks');
select is((select (best_division::text, frame_key) from public.season_rewards
    where season_id = (select n from t where k = 'season') and user_id = pg_temp.uid(32))::text,
  '(elite,season-elite)', 'Elite earns a frame');
select is((select (badge_key, frame_key) from public.season_rewards
    where season_id = (select n from t where k = 'season') and user_id = pg_temp.uid(1))::text,
  format('(season-%s-rookie,)', (select number from public.league_seasons where id = (select n from t where k = 'season'))),
  'every player earns a season badge');
select is((select count(*) from public.season_rewards where season_id = (select n from t where k = 'season')
  and user_id in (select pg_temp.uid(n) from generate_series(1, 32) n)), 32::bigint, 'one reward per player');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-000000000031", "role": "authenticated"}', true);
select is((public.get_season_recap((select n from t where k = 'season')::integer) ->> 'weeks_played')::integer, 3,
  'the recap counts the weeks played');
select is((public.get_season_recap((select n from t where k = 'season')::integer) ->> 'promotions')::integer, 1,
  'and promotions');
reset role;

-- ── Custom league scoring (built by hand over week 1) ──────────────────────────────────────────
create temp table custom as
select s::public.league_scoring as scoring, gen_random_uuid() as id from unnest(
  array['lp', 'volume', 'attendance', 'lift_improvement']) s;
grant select on custom to authenticated;
insert into public.leagues (id, kind, name, owner_id, scoring, scoring_rank_key, starts_at, ends_at, invite_code)
select c.id, 'custom', 'Friends', pg_temp.uid(31), c.scoring,
  case when c.scoring = 'lift_improvement' then 'benchPress' end,
  (select v from t where k = 'W1'), (select v from t where k = 'W1') + interval '7 days',
  'ABCDEFG' || (row_number() over () + 1)::text
from custom c;
select pg_temp.snap(pg_temp.uid(31), 'lift', 'benchPress', 300, (select v from t where k = 'W1') - interval '1 day');
select pg_temp.snap(pg_temp.uid(31), 'lift', 'benchPress', 340, (select v from t where k = 'W1') + interval '2 days');
select is((select array_agg(public.league_member_points(l, pg_temp.uid(31), l.ends_at) order by c.scoring)
    from custom c join public.leagues l on l.id = c.id),
  array[230, 3000, 40, 3], 'LP (a 40-point bench gain, capped at 60 LP), volume (kg), lift improvement and attendance (days)');

-- Challenges.
insert into public.league_members (league_id, user_id) select id, pg_temp.uid(31) from custom where scoring = 'volume';
insert into public.league_challenges (league_id, kind, title, rank_key, target, starts_at, ends_at)
select l.id, k::public.challenge_kind, k, case when k <> 'workouts' then 'benchPress' end,
  case when k = 'most_reps' then null else 3 end, l.starts_at, l.ends_at
from public.leagues l, unnest(array['most_reps', 'lift_frequency', 'workouts']) k
where l.id = (select id from custom where scoring = 'volume');
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-000000000031", "role": "authenticated"}', true);
select is((select array_agg((c ->> 'mine')::integer order by c ->> 'title')
    from jsonb_array_elements(public.get_league_challenges((select id from custom where scoring = 'volume'))) c),
  array[3, 60, 3], 'challenge progress: days benched, reps and workouts');
select is((select count(*) from jsonb_array_elements(public.get_league_challenges((select id from custom where scoring = 'volume'))) c
  where (c ->> 'completed_by')::integer = 1), 2::bigint, 'targets reached count as completed');

-- ── Custom leagues through the API ──────────────────────────────────────────────────────────────
insert into t (k, id) select 'mine', (r ->> 'id')::uuid from public.create_custom_league('Hostel H4', 2, 'attendance') r;
select matches((select invite_code from public.leagues where id = (select id from t where k = 'mine')), '^[A-Z2-9]{8}$',
  'a custom league gets an 8-character invite code');
insert into t (k, s) select 'code', invite_code from public.leagues where id = (select id from t where k = 'mine');
select throws_ok($$select public.create_custom_league('Too long', 9, 'lp')$$, '22023', null,
  'leagues run 1 to 8 weeks');
select throws_ok($$select public.create_custom_league('Lift', 2, 'lift_improvement')$$, '22023', null,
  'lift-improvement leagues need a lift');
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-000000000005", "role": "authenticated"}', true);
select is((select count(*) from public.leagues where id = (select id from t where k = 'mine')), 0::bigint,
  'outsiders can''t see a custom league');
select is(public.join_league(lower((select s from t where k = 'code'))),
  (select id from t where k = 'mine'), 'joining with the code (any case) works');
select is(jsonb_array_length(public.get_league_standings((select id from t where k = 'mine')) -> 'rows'), 2,
  'members see each other');
select throws_ok($$select public.join_league('ZZZZZZZZ')$$, 'P0002', null, 'a wrong code says so');
select throws_ok(format($$select public.create_league_challenge(%L, 'workouts', 'Gym 5 times', null, 5)$$,
  (select id from t where k = 'mine')), '42501', null, 'only the creator adds challenges');
select lives_ok(format($$select public.leave_league(%L)$$, (select id from t where k = 'mine')),
  'members can leave');

-- ── Nobody writes league tables directly ────────────────────────────────────────────────────────
select throws_ok($$insert into public.leagues (kind, name, starts_at, ends_at) values ('community', 'x', now(), now() + interval '1 day')$$,
  '42501', null, 'no direct inserts');
select throws_ok($$update public.league_members set final_points = 9999$$, '42501', null, 'or edits');
select throws_ok($$select public.league_run_cycle()$$, '42501', null, 'clients can''t run the cycle');
set local role anon;
select throws_ok($$select public.get_league_home()$$, '42501', null, 'anon can''t read leagues');

select * from finish();
rollback;
