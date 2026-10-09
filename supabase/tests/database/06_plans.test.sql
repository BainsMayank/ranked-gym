-- Plans: owner-only plans, weeks and days; checks; save_plan (idempotent, one active plan);
-- workouts marking their plan day done. Run with `pnpm db:test`.
begin;
set local role postgres;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(33);

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'alice@test.dev'),
  ('22222222-2222-2222-2222-222222222222', 'bob@test.dev');

-- A plan routine each (written as the owner would through save_routine).
insert into public.routines (id, user_id, name, source, source_ref) values
  ('aaaaaaaa-0000-0000-0000-0000000000b1', '11111111-1111-1111-1111-111111111111', 'Upper A', 'plan',
   'aaaaaaaa-0000-0000-0000-0000000000a1'),
  ('aaaaaaaa-0000-0000-0000-0000000000b2', '11111111-1111-1111-1111-111111111111', 'Lower A', 'plan',
   'aaaaaaaa-0000-0000-0000-0000000000a1'),
  ('bbbbbbbb-0000-0000-0000-0000000000b1', '22222222-2222-2222-2222-222222222222', 'Bob day', 'plan',
   null);

-- Alice's plan: two weeks, three sessions.
create temp table payloads (k text primary key, p jsonb not null);
grant select on payloads to authenticated, anon;
insert into payloads values ('alice', jsonb_build_object(
  'id', 'aaaaaaaa-0000-0000-0000-0000000000a1',
  'name', 'Build muscle · 4 days',
  'goal', 'muscle',
  'settings', jsonb_build_object('v', 1, 'seed', 0),
  'start_date', '2026-10-05',
  'end_date', '2026-10-18',
  'status', 'active',
  'weeks', jsonb_build_array(
    jsonb_build_object('id', 'aaaaaaaa-0000-0000-0000-0000000000c1', 'week', 1,
      'starts_on', '2026-10-05', 'deload', false),
    jsonb_build_object('id', 'aaaaaaaa-0000-0000-0000-0000000000c2', 'week', 2,
      'starts_on', '2026-10-12', 'deload', true)),
  'days', jsonb_build_array(
    jsonb_build_object('id', 'aaaaaaaa-0000-0000-0000-0000000000d1', 'week', 1, 'date', '2026-10-05',
      'original_date', '2026-10-05', 'template_key', 'UPPER_A', 'label', 'Upper A',
      'routine_id', 'aaaaaaaa-0000-0000-0000-0000000000b1', 'status', 'pending'),
    jsonb_build_object('id', 'aaaaaaaa-0000-0000-0000-0000000000d2', 'week', 1, 'date', '2026-10-06',
      'original_date', '2026-10-06', 'template_key', 'LOWER_A', 'label', 'Lower A',
      'routine_id', 'aaaaaaaa-0000-0000-0000-0000000000b2', 'status', 'pending'),
    jsonb_build_object('id', 'aaaaaaaa-0000-0000-0000-0000000000d3', 'week', 2, 'date', '2026-10-12',
      'original_date', '2026-10-12', 'template_key', 'UPPER_A', 'label', 'Upper A',
      'routine_id', 'aaaaaaaa-0000-0000-0000-0000000000b1', 'status', 'pending'))
));

-- ── Schema ──────────────────────────────────────────────────────────────────────────────────────

select has_table('public', 'plans', 'plans exists');
select has_table('public', 'plan_weeks', 'plan_weeks exists');
select has_table('public', 'plan_days', 'plan_days exists');
select enum_has_labels('public', 'plan_status', array['active', 'completed', 'abandoned'],
  'plan_status enum');
select enum_has_labels('public', 'plan_day_status', array['pending', 'done', 'missed', 'moved'],
  'plan_day_status enum');
select has_index('public', 'plans', 'plans_one_active', 'one active plan per user is indexed');
select ok(
  (select bool_and(relrowsecurity) from pg_class
   where oid in ('public.plans'::regclass, 'public.plan_weeks'::regclass,
                 'public.plan_days'::regclass)),
  'RLS is enabled on every plan table'
);

-- ── Alice saves a plan ──────────────────────────────────────────────────────────────────────────
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}', true);

select lives_ok($$ select public.save_plan(p) from payloads where k = 'alice' $$,
  'Alice saves a plan');
select lives_ok($$ select public.save_plan(p) from payloads where k = 'alice' $$,
  'replaying the same push works');
select results_eq(
  $$ select (select count(*) from public.plans)::int, (select count(*) from public.plan_weeks)::int,
            (select count(*) from public.plan_days)::int $$,
  $$ values (1, 2, 3) $$,
  'a replayed push never duplicates the plan, its weeks or its days'
);

select lives_ok(
  $$ select public.save_plan(p #- '{days,2}') from payloads where k = 'alice' $$,
  'Alice saves the plan without its last day'
);
select is((select count(*)::int from public.plan_days), 2, 'the missing day is deleted');

select throws_ok(
  $$ select public.save_plan(jsonb_set(p, '{days,0,routine_id}',
       '"bbbbbbbb-0000-0000-0000-0000000000b1"')) from payloads where k = 'alice' $$,
  '42501', null, 'a plan day cannot point at someone else''s routine'
);
select throws_ok(
  $$ select public.save_plan(jsonb_set(p, '{days,0,template_key}', '""')) from payloads where k = 'alice' $$,
  '23514', null, 'a plan day needs a template key'
);
select throws_ok(
  $$ select public.save_plan(p || '{"end_date": "2026-10-01"}') from payloads where k = 'alice' $$,
  '23514', null, 'a plan cannot end before it starts'
);
select throws_ok(
  $$ select public.save_plan(p || jsonb_build_object('days',
       (select jsonb_agg(d) from (select p -> 'days' -> 0 as d from generate_series(1, 101)) x)))
     from payloads where k = 'alice' $$,
  '22023', null, 'save_plan rejects more than 100 days'
);

-- A workout from the plan marks its day done, and a later plan push can't undo it.
select is(
  (select public.save_workout(jsonb_build_object(
     'id', 'aaaaaaaa-0000-0000-0000-00000000f001', 'name', 'Upper A',
     'plan_day_id', 'aaaaaaaa-0000-0000-0000-0000000000d1',
     'routine_id', 'aaaaaaaa-0000-0000-0000-0000000000b1',
     'started_at', '2026-10-05T06:00:00Z', 'ended_at', '2026-10-05T07:00:00Z',
     'client_updated_at', '2026-10-05T07:00:00Z', 'status', 'completed')) ->> 'applied'),
  'true', 'Alice finishes the planned session'
);
select is(
  (select status::text from public.plan_days where id = 'aaaaaaaa-0000-0000-0000-0000000000d1'),
  'done', 'the completed workout marks its plan day done'
);
select lives_ok($$ select public.save_plan(p) from payloads where k = 'alice' $$,
  'a stale push of the plan (day still pending) is saved');
select is(
  (select status::text from public.plan_days where id = 'aaaaaaaa-0000-0000-0000-0000000000d1'),
  'done', 'a day already done stays done'
);

-- One active plan: saving a new active plan ends the old one; a direct insert can't make two.
select lives_ok(
  $$ select public.save_plan(jsonb_build_object(
       'id', 'aaaaaaaa-0000-0000-0000-0000000000a2', 'name', 'Get stronger · 3 days',
       'goal', 'stronger', 'start_date', '2026-10-19', 'end_date', '2026-11-29', 'status', 'active')) $$,
  'Alice starts a new plan'
);
select results_eq(
  $$ select id::text, status::text from public.plans order by start_date $$,
  $$ values ('aaaaaaaa-0000-0000-0000-0000000000a1', 'abandoned'),
            ('aaaaaaaa-0000-0000-0000-0000000000a2', 'active') $$,
  'the old plan is abandoned when a new one starts'
);
select throws_ok(
  $$ insert into public.plans (name, goal, start_date, end_date)
     values ('Second', 'general', '2026-10-19', '2026-11-01') $$,
  '23505', null, 'a second active plan cannot be inserted directly'
);

-- ── Bob can't see or change Alice's plans ───────────────────────────────────────────────────────
select set_config('request.jwt.claims', '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated"}', true);

select is((select count(*)::int from public.plans), 0, 'Bob sees none of Alice''s plans');
select is((select count(*)::int from public.plan_weeks), 0, 'Bob sees none of Alice''s weeks');
select is((select count(*)::int from public.plan_days), 0, 'Bob sees none of Alice''s days');
select throws_ok(
  $$ select public.save_plan(p) from payloads where k = 'alice' $$,
  '42501', null, 'Bob cannot overwrite Alice''s plan through save_plan'
);
select throws_ok(
  $$ insert into public.plan_days (plan_id, week, date, original_date, template_key, label)
     values ('aaaaaaaa-0000-0000-0000-0000000000a2', 1, '2026-10-19', '2026-10-19', 'UPPER_A', 'X') $$,
  '42501', null, 'Bob cannot add a day to Alice''s plan'
);
update public.plan_days set status = 'missed' where id = 'aaaaaaaa-0000-0000-0000-0000000000d2';
select is(
  (select public.save_workout(jsonb_build_object(
     'id', 'bbbbbbbb-0000-0000-0000-00000000f001', 'name', 'Bob lift',
     'plan_day_id', 'aaaaaaaa-0000-0000-0000-0000000000d2',
     'started_at', '2026-10-06T06:00:00Z', 'ended_at', '2026-10-06T07:00:00Z',
     'client_updated_at', '2026-10-06T07:00:00Z', 'status', 'completed')) ->> 'applied'),
  'true', 'Bob saves a workout claiming Alice''s plan day'
);
select is(
  (select plan_day_id from public.workouts where id = 'bbbbbbbb-0000-0000-0000-00000000f001'),
  null, 'the foreign plan day is dropped from Bob''s workout'
);

-- ── Anonymous ───────────────────────────────────────────────────────────────────────────────────
set local role anon;
select set_config('request.jwt.claims', '{"role": "anon"}', true);
select throws_ok($$ select id from public.plans $$, '42501', null, 'anon cannot read plans');
select throws_ok($$ select public.save_plan('{}') $$, '42501', null, 'anon cannot call save_plan');

-- ── Alice's day was untouched by Bob ────────────────────────────────────────────────────────────
set local role postgres;
select is(
  (select status::text from public.plan_days where id = 'aaaaaaaa-0000-0000-0000-0000000000d2'),
  'pending', 'Bob''s update and workout left Alice''s day alone'
);

select * from finish();
rollback;
