-- Workouts: save_workout (idempotent upserts, latest draft wins, completed workouts immutable
-- except edits, which keep a revision), server-computed totals, owner-only reads, photos.
-- Run with `pnpm db:test`.
begin;
set local role postgres;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(49);

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'alice@test.dev'),
  ('22222222-2222-2222-2222-222222222222', 'bob@test.dev');

insert into public.exercises (id, slug, name, category, equipment, mechanic, log_type, created_by)
values ('bbbbbbbb-0000-0000-0000-000000000001', 'custom-bob-curl', 'Bob curl', 'strength',
        'other', 'isolation', 'weight_reps', '22222222-2222-2222-2222-222222222222');

-- Payloads the tests modify. Squat: a warm-up (never counts) and a working set, both done; bench:
-- one working set not done yet.
create temp table payloads (k text primary key, p jsonb not null);
grant select on payloads to authenticated, anon;
insert into payloads values ('alice', jsonb_build_object(
  'id', 'aaaaaaaa-0000-0000-0000-00000000a001',
  'name', 'Morning lift',
  'started_at', '2026-10-01T06:00:00Z',
  'client_updated_at', '2026-10-01T06:10:00Z',
  'status', 'in_progress',
  'visibility', 'friends',
  'bodyweight_kg', 72,
  'exercises', jsonb_build_array(
    jsonb_build_object(
      'id', 'aaaaaaaa-0000-0000-0000-00000000e001',
      'exercise_id', (select id from public.exercises where slug = 'barbell-back-squat'),
      'rest_seconds', 180,
      'sets', jsonb_build_array(
        jsonb_build_object('id', 'aaaaaaaa-0000-0000-0000-00000000c001', 'set_type', 'warmup',
          'reps', 8, 'weight_kg', 60, 'completed', true,
          'completed_at', '2026-10-01T06:05:00Z'),
        jsonb_build_object('id', 'aaaaaaaa-0000-0000-0000-00000000c002', 'set_type', 'working',
          'target_type', 'rep_range', 'target_reps_min', 4, 'target_reps_max', 6,
          'target_weight_kg', 100, 'reps', 5, 'weight_kg', 100, 'rir', 2, 'completed', true,
          'completed_at', '2026-10-01T06:09:00Z'))),
    jsonb_build_object(
      'id', 'aaaaaaaa-0000-0000-0000-00000000e002',
      'exercise_id', (select id from public.exercises where slug = 'barbell-bench-press'),
      'sets', jsonb_build_array(
        jsonb_build_object('id', 'aaaaaaaa-0000-0000-0000-00000000c003', 'set_type', 'working',
          'reps', 8, 'weight_kg', 80, 'completed', false))))
));

-- ── Schema ──────────────────────────────────────────────────────────────────────────────────────

select has_table('public', 'workouts', 'workouts exists');
select has_table('public', 'workout_exercises', 'workout_exercises exists');
select has_table('public', 'workout_sets', 'workout_sets exists');
select has_table('public', 'workout_revisions', 'workout_revisions exists');
select enum_has_labels('public', 'workout_status',
  array['in_progress', 'completed', 'discarded'], 'workout_status enum');
select ok(
  (select bool_and(relrowsecurity) from pg_class
   where oid in ('public.workouts'::regclass, 'public.workout_exercises'::regclass,
                 'public.workout_sets'::regclass, 'public.workout_revisions'::regclass)),
  'RLS is enabled on every workout table'
);
select ok(
  (select not public from storage.buckets where id = 'workout-photos'),
  'the workout-photos bucket exists and is private'
);

-- ── Alice logs a workout ────────────────────────────────────────────────────────────────────────
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}', true);

select is(
  (select public.save_workout(p) ->> 'applied' from payloads where k = 'alice'),
  'true', 'Alice saves an in-progress workout'
);
select is(
  (select public.save_workout(p) ->> 'applied' from payloads where k = 'alice'),
  'false', 'replaying the same push changes nothing'
);
select results_eq(
  $$ select (select count(*) from public.workouts)::int, (select count(*) from public.workout_sets)::int $$,
  $$ values (1, 3) $$,
  'a replayed push never duplicates the workout or its sets'
);

select is(
  (select public.save_workout(p || jsonb_build_object(
     'name', 'Stale', 'client_updated_at', '2026-10-01T06:01:00Z')) ->> 'applied'
   from payloads where k = 'alice'),
  'false', 'an older draft push is ignored'
);
select is(
  (select name from public.workouts), 'Morning lift', 'the stale push left the name alone'
);
select is(
  (select public.save_workout(p || jsonb_build_object(
     'name', 'Push day', 'client_updated_at', '2026-10-01T06:20:00Z')) ->> 'applied'
   from payloads where k = 'alice'),
  'true', 'a newer draft push wins'
);
select is((select name from public.workouts), 'Push day', 'the newer draft is stored');

-- Finish: bench done, one hour long.
select is(
  (select public.save_workout(jsonb_set(p, '{exercises,1,sets,0,completed}', 'true')
     || jsonb_build_object('name', 'Push day', 'status', 'completed',
          'ended_at', '2026-10-01T07:00:00Z', 'client_updated_at', '2026-10-01T07:00:00Z',
          'perceived_effort', 8, 'notes', 'Felt strong')) ->> 'status'
   from payloads where k = 'alice'),
  'completed', 'Alice finishes the workout'
);
select results_eq(
  $$ select duration_sec, total_volume_kg, calories_est from public.workouts $$,
  $$ values (3600, 1140.00::numeric, 432) $$,
  'server computes duration, volume (warm-ups excluded) and MET x bodyweight x hours'
);

select is(
  (select public.save_workout(p || jsonb_build_object(
     'name', 'Rewritten', 'status', 'completed', 'ended_at', '2026-10-01T07:00:00Z',
     'client_updated_at', '2026-10-01T08:00:00Z')) ->> 'applied'
   from payloads where k = 'alice'),
  'false', 'a plain push cannot change a completed workout'
);
select is((select name from public.workouts), 'Push day', 'the completed workout is unchanged');

-- Edit: squat working set was really 6 reps.
select is(
  (select public.save_workout(jsonb_set(jsonb_set(p, '{exercises,1,sets,0,completed}', 'true'),
       '{exercises,0,sets,1,reps}', '6')
     || jsonb_build_object('name', 'Push day', 'status', 'completed', 'edit', true,
          'ended_at', '2026-10-01T07:00:00Z', 'client_updated_at', '2026-10-02T09:00:00Z')) ->> 'revision'
   from payloads where k = 'alice'),
  '1', 'an explicit edit changes a completed workout and bumps its revision'
);
select results_eq(
  $$ select revision, snapshot ->> 'name', (snapshot -> 'exercises' -> 0 -> 'sets' -> 1 ->> 'reps')
     from public.workout_revisions $$,
  $$ values (0, 'Push day', '5') $$,
  'the version before the edit is kept as a revision'
);
select is(
  (select total_volume_kg from public.workouts), 1240.00::numeric, 'volume is recomputed after an edit'
);
select throws_ok(
  $$ select public.save_workout(p || jsonb_build_object('edit', true, 'status', 'in_progress',
       'client_updated_at', '2026-10-03T09:00:00Z')) from payloads where k = 'alice' $$,
  '22023', null, 'a finished workout cannot go back to in progress'
);

select throws_ok(
  $$ insert into public.workouts (id, user_id, name, started_at, client_updated_at)
     values (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 'Sneaky', now(), now()) $$,
  '42501', null, 'clients cannot insert workouts directly'
);
select throws_ok(
  $$ update public.workout_sets set is_pr = true $$,
  '42501', null, 'clients cannot mark their own PRs'
);
select throws_ok(
  $$ select public.save_workout(jsonb_build_object(
       'id', gen_random_uuid(), 'name', 'Too long', 'started_at', now(),
       'client_updated_at', now(),
       'exercises', (select jsonb_agg(jsonb_build_object('id', gen_random_uuid(),
         'exercise_id', (select id from public.exercises where slug = 'plank')))
         from generate_series(1, 41)))) $$,
  '22023', null, 'a workout has 40 exercises at most'
);
select throws_ok(
  $$ select public.save_workout(jsonb_build_object(
       'id', gen_random_uuid(), 'name', 'Tomorrow', 'started_at', now() + interval '1 day',
       'client_updated_at', now())) $$,
  '22023', null, 'a workout cannot start in the future'
);
select throws_ok(
  $$ select public.save_workout(jsonb_build_object(
       'id', gen_random_uuid(), 'name', 'Bob''s exercise', 'started_at', now(),
       'client_updated_at', now(),
       'exercises', jsonb_build_array(jsonb_build_object('id', gen_random_uuid(),
         'exercise_id', 'bbbbbbbb-0000-0000-0000-000000000001')))) $$,
  '42501', null, 'Alice cannot log Bob''s custom exercise'
);
select lives_ok(
  $$ select public.save_workout(jsonb_build_object(
       'id', 'aaaaaaaa-0000-0000-0000-00000000a002', 'name', 'Quick one',
       'started_at', '2026-10-04T06:00:00Z', 'client_updated_at', '2026-10-04T06:00:00Z',
       'routine_id', gen_random_uuid(),
       'exercises', jsonb_build_array(jsonb_build_object(
         'id', 'aaaaaaaa-0000-0000-0000-00000000e003',
         'exercise_id', (select id from public.exercises where slug = 'pull-up'),
         'sets', jsonb_build_array(jsonb_build_object(
           'id', 'aaaaaaaa-0000-0000-0000-00000000c004', 'set_type', 'working',
           'weight_mode', 'bodyweight', 'reps', 10, 'completed', true)))))) $$,
  'Alice saves a second workout pointing at a routine she does not have'
);
select is(
  (select routine_id from public.workouts where id = 'aaaaaaaa-0000-0000-0000-00000000a002'),
  null::uuid, 'an unknown routine reference is dropped, not fatal'
);
select lives_ok(
  $$ select public.set_workout_photo('aaaaaaaa-0000-0000-0000-00000000a001',
       '11111111-1111-1111-1111-111111111111/aaaaaaaa-0000-0000-0000-00000000a001.jpg') $$,
  'Alice attaches a photo to her completed workout'
);

-- ── Bob can't see or change Alice's workouts ────────────────────────────────────────────────────
select set_config('request.jwt.claims', '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated"}', true);

select is((select count(*)::int from public.workouts), 0, 'Bob sees none of Alice''s workouts');
select is((select count(*)::int from public.workout_exercises), 0,
  'Bob sees none of Alice''s workout exercises');
select is((select count(*)::int from public.workout_sets), 0, 'Bob sees none of Alice''s sets');
select is((select count(*)::int from public.workout_revisions), 0,
  'Bob sees none of Alice''s revisions');
select throws_ok(
  $$ select public.save_workout(p || jsonb_build_object('client_updated_at', '2027-01-01T00:00:00Z'))
     from payloads where k = 'alice' $$,
  '42501', null, 'Bob cannot overwrite Alice''s workout by its id'
);
select throws_ok(
  $$ select public.save_workout(jsonb_build_object(
       'id', 'bbbbbbbb-0000-0000-0000-00000000a001', 'name', 'Hijack', 'started_at', now(),
       'client_updated_at', now(),
       'exercises', jsonb_build_array(jsonb_build_object(
         'id', 'aaaaaaaa-0000-0000-0000-00000000e001',
         'exercise_id', (select id from public.exercises where slug = 'plank'))))) $$,
  '42501', null, 'Bob cannot take over Alice''s exercise rows by reusing their ids'
);
select throws_ok(
  $$ select public.save_workout(jsonb_build_object(
       'id', 'bbbbbbbb-0000-0000-0000-00000000a002', 'name', 'Hijack sets', 'started_at', now(),
       'client_updated_at', now(),
       'exercises', jsonb_build_array(jsonb_build_object(
         'id', 'bbbbbbbb-0000-0000-0000-00000000e001',
         'exercise_id', (select id from public.exercises where slug = 'plank'),
         'sets', jsonb_build_array(jsonb_build_object(
           'id', 'aaaaaaaa-0000-0000-0000-00000000c001', 'reps', 1)))))) $$,
  '42501', null, 'Bob cannot take over Alice''s set rows by reusing their ids'
);
select lives_ok(
  $$ delete from public.workouts where id = 'aaaaaaaa-0000-0000-0000-00000000a001' $$,
  'Bob''s delete of Alice''s workout runs (and matches nothing)'
);
select throws_ok(
  $$ select public.set_workout_photo('aaaaaaaa-0000-0000-0000-00000000a001',
       '22222222-2222-2222-2222-222222222222/x.jpg') $$,
  'P0002', null, 'Bob cannot attach a photo to Alice''s workout'
);
select throws_ok(
  $$ select public.set_workout_photo('aaaaaaaa-0000-0000-0000-00000000a001',
       '11111111-1111-1111-1111-111111111111/x.jpg') $$,
  '42501', null, 'Bob cannot point a photo into Alice''s folder'
);

-- ── Anonymous ───────────────────────────────────────────────────────────────────────────────────
set local role anon;
select set_config('request.jwt.claims', '{"role": "anon"}', true);

select throws_ok($$ select id from public.workouts $$, '42501', null, 'anon cannot read workouts');
select throws_ok($$ select id from public.workout_sets $$, '42501', null,
  'anon cannot read workout sets');
select throws_ok($$ select public.save_workout('{}') $$, '42501', null,
  'anon cannot call save_workout');

-- ── Alice deletes a workout ─────────────────────────────────────────────────────────────────────
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}', true);

select lives_ok(
  $$ delete from public.workouts where id = 'aaaaaaaa-0000-0000-0000-00000000a002' $$,
  'Alice deletes her second workout'
);
select is(
  (select count(*)::int from public.workout_sets where id = 'aaaaaaaa-0000-0000-0000-00000000c004'),
  0, 'its sets go with it'
);
select is(
  (select count(*)::int from public.workouts where id = 'aaaaaaaa-0000-0000-0000-00000000a001'),
  1, 'Bob''s delete did not touch Alice''s workout'
);
select is(
  (select photo_path from public.workouts where id = 'aaaaaaaa-0000-0000-0000-00000000a001'),
  '11111111-1111-1111-1111-111111111111/aaaaaaaa-0000-0000-0000-00000000a001.jpg',
  'the photo path is stored'
);

-- ── Storage policies ────────────────────────────────────────────────────────────────────────────
set local role postgres;
insert into storage.objects (bucket_id, name, owner)
values ('workout-photos', '11111111-1111-1111-1111-111111111111/aaaaaaaa-0000-0000-0000-00000000a001.jpg',
        '11111111-1111-1111-1111-111111111111');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated"}', true);
select is(
  (select count(*)::int from storage.objects where bucket_id = 'workout-photos'), 0,
  'Bob cannot see Alice''s workout photos'
);
select set_config('request.jwt.claims', '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}', true);
select is(
  (select count(*)::int from storage.objects where bucket_id = 'workout-photos'), 1,
  'Alice sees her own workout photo'
);

select * from finish();
rollback;
