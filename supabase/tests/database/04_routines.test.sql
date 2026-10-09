-- Routines: owner-only folders, routines, exercises and sets; set checks; save_routine.
-- Run with `pnpm db:test`.
begin;
set local role postgres;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(55);

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'alice@test.dev'),
  ('22222222-2222-2222-2222-222222222222', 'bob@test.dev');

-- Bob's custom exercise, which Alice must not be able to use.
insert into public.exercises (id, slug, name, category, equipment, mechanic, log_type, created_by)
values ('bbbbbbbb-0000-0000-0000-000000000001', 'custom-bob-curl', 'Bob curl', 'strength',
        'other', 'isolation', 'weight_reps', '22222222-2222-2222-2222-222222222222');

-- ── Schema ──────────────────────────────────────────────────────────────────────────────────────

select has_table('public', 'routine_folders', 'routine_folders exists');
select has_table('public', 'routines', 'routines exists');
select has_table('public', 'routine_exercises', 'routine_exercises exists');
select has_table('public', 'routine_sets', 'routine_sets exists');
select enum_has_labels('public', 'set_type',
  array['warmup', 'working', 'top', 'backoff', 'drop', 'failure', 'amrap'], 'set_type enum');
select enum_has_labels('public', 'target_type',
  array['reps', 'rep_range', 'duration', 'distance'], 'target_type enum');
select enum_has_labels('public', 'weight_mode',
  array['absolute', 'percent_of_1rm', 'percent_of_top_set', 'bodyweight', 'assisted'],
  'weight_mode enum');
select enum_has_labels('public', 'routine_source',
  array['manual', 'plan', 'copied', 'generated'], 'routine_source enum');
select enum_has_labels('public', 'effort_metric', array['rir', 'rpe', 'both'], 'effort_metric enum');
select col_default_is('public', 'user_settings', 'effort_metric', 'rir'::public.effort_metric,
  'effort metric defaults to RIR');
select ok(
  (select bool_and(relrowsecurity) from pg_class
   where oid in ('public.routine_folders'::regclass, 'public.routines'::regclass,
                 'public.routine_exercises'::regclass, 'public.routine_sets'::regclass)),
  'RLS is enabled on every routine table'
);

-- ── Signed in as Alice ──────────────────────────────────────────────────────────────────────────
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}', true);

select lives_ok(
  $$ insert into public.routine_folders (id, name) values
       ('aaaaaaaa-0000-0000-0000-00000000f001', 'Push Pull Legs') $$,
  'Alice creates a folder'
);

-- A Leg Day with warm-ups, a top set, back-offs at 85% of it, and a superset.
select lives_ok(
  $$ select public.save_routine(jsonb_build_object(
       'id', 'aaaaaaaa-0000-0000-0000-000000000001',
       'folder_id', 'aaaaaaaa-0000-0000-0000-00000000f001',
       'name', 'Leg day', 'colour', 'gold', 'estimated_duration_min', 65,
       'exercises', jsonb_build_array(
         jsonb_build_object(
           'id', 'aaaaaaaa-0000-0000-0000-0000000000e1',
           'exercise_id', (select id from public.exercises where slug = 'barbell-back-squat'),
           'rest_seconds', 180, 'notes', 'Belt on for the top set',
           'sets', jsonb_build_array(
             jsonb_build_object('id', 'aaaaaaaa-0000-0000-0000-0000000005a1', 'set_type', 'warmup',
               'target_type', 'reps', 'reps', 8, 'weight_kg', 60, 'weight_mode', 'absolute'),
             jsonb_build_object('id', 'aaaaaaaa-0000-0000-0000-0000000005a2', 'set_type', 'top',
               'target_type', 'rep_range', 'reps_min', 4, 'reps_max', 6, 'weight_kg', 140,
               'weight_mode', 'absolute', 'rir', 1),
             jsonb_build_object('id', 'aaaaaaaa-0000-0000-0000-0000000005a3', 'set_type', 'backoff',
               'target_type', 'rep_range', 'reps_min', 8, 'reps_max', 10,
               'weight_mode', 'percent_of_top_set', 'weight_percent', 85, 'rir', 2,
               'tempo', '3-1-X-0'))),
         jsonb_build_object(
           'id', 'aaaaaaaa-0000-0000-0000-0000000000e2',
           'exercise_id', (select id from public.exercises where slug = 'leg-extension'),
           'superset_group', 1, 'rest_seconds', 0, 'rest_after_superset_seconds', 90,
           'sets', jsonb_build_array(
             jsonb_build_object('id', 'aaaaaaaa-0000-0000-0000-0000000005b1', 'set_type', 'working',
               'target_type', 'reps', 'reps', 12, 'weight_kg', 55, 'weight_mode', 'absolute',
               'rpe', 8.5),
             jsonb_build_object('id', 'aaaaaaaa-0000-0000-0000-0000000005b2', 'set_type', 'drop',
               'target_type', 'reps', 'reps', 10, 'weight_kg', 40, 'weight_mode', 'absolute'))),
         jsonb_build_object(
           'id', 'aaaaaaaa-0000-0000-0000-0000000000e3',
           'exercise_id', (select id from public.exercises where slug = 'lying-leg-curl'),
           'superset_group', 1, 'rest_seconds', 0, 'rest_after_superset_seconds', 90,
           'sets', jsonb_build_array(
             jsonb_build_object('id', 'aaaaaaaa-0000-0000-0000-0000000005c1', 'set_type', 'working',
               'target_type', 'reps', 'reps', 12, 'weight_mode', 'absolute'))),
         jsonb_build_object(
           'id', 'aaaaaaaa-0000-0000-0000-0000000000e4',
           'exercise_id', (select id from public.exercises where slug = 'plank'),
           'rest_seconds', 60,
           'sets', jsonb_build_array(
             jsonb_build_object('id', 'aaaaaaaa-0000-0000-0000-0000000005d1', 'set_type', 'working',
               'target_type', 'duration', 'duration_sec', 45, 'weight_mode', 'bodyweight')))))) $$,
  'save_routine saves a whole routine'
);
select results_eq(
  $$ select name, folder_id, colour, user_id from public.routines
     where id = 'aaaaaaaa-0000-0000-0000-000000000001' $$,
  $$ values ('Leg day', 'aaaaaaaa-0000-0000-0000-00000000f001'::uuid, 'gold',
             '11111111-1111-1111-1111-111111111111'::uuid) $$,
  'the routine is saved and owned by Alice'
);
select results_eq(
  $$ select sort_order, superset_group::int from public.routine_exercises
     where routine_id = 'aaaaaaaa-0000-0000-0000-000000000001' order by sort_order $$,
  $$ values (0, null::int), (1, 1), (2, 1), (3, null::int) $$,
  'exercises keep their order and superset'
);
select results_eq(
  $$ select set_type::text, sort_order from public.routine_sets
     where routine_exercise_id = 'aaaaaaaa-0000-0000-0000-0000000000e1' order by sort_order $$,
  $$ values ('warmup', 0), ('top', 1), ('backoff', 2) $$,
  'sets keep their order and types'
);

-- Saving again replaces: drop the plank and the warm-up, keep the rest.
select lives_ok(
  $$ select public.save_routine(jsonb_build_object(
       'id', 'aaaaaaaa-0000-0000-0000-000000000001', 'name', 'Leg day v2',
       'exercises', jsonb_build_array(jsonb_build_object(
         'id', 'aaaaaaaa-0000-0000-0000-0000000000e1',
         'exercise_id', (select id from public.exercises where slug = 'barbell-back-squat'),
         'sets', jsonb_build_array(
           jsonb_build_object('id', 'aaaaaaaa-0000-0000-0000-0000000005a2', 'set_type', 'top',
             'target_type', 'reps', 'reps', 5, 'weight_kg', 140, 'weight_mode', 'absolute')))))) $$,
  'save_routine updates an existing routine'
);
select results_eq(
  $$ select (select count(*)::int from public.routine_exercises
             where routine_id = 'aaaaaaaa-0000-0000-0000-000000000001'),
            (select count(*)::int from public.routine_sets s
             join public.routine_exercises re on re.id = s.routine_exercise_id
             where re.routine_id = 'aaaaaaaa-0000-0000-0000-000000000001') $$,
  $$ values (1, 1) $$,
  'missing exercises and sets are deleted'
);
select results_eq(
  $$ select folder_id from public.routines where id = 'aaaaaaaa-0000-0000-0000-000000000001' $$,
  $$ values (null::uuid) $$,
  'saving without a folder moves the routine out of it'
);

select throws_ok(
  $$ select public.save_routine(jsonb_build_object(
       'id', 'aaaaaaaa-0000-0000-0000-000000000002', 'name', 'Bad',
       'exercises', jsonb_build_array(jsonb_build_object(
         'id', 'aaaaaaaa-0000-0000-0000-0000000000f1',
         'exercise_id', (select id from public.exercises where slug = 'leg-extension'),
         'sets', jsonb_build_array(
           jsonb_build_object('id', 'aaaaaaaa-0000-0000-0000-0000000006a1', 'set_type', 'drop',
             'target_type', 'reps', 'reps', 10, 'weight_mode', 'absolute')))))) $$,
  '22023', null, 'a routine cannot start an exercise with a drop set'
);
select throws_ok(
  $$ select public.save_routine(jsonb_build_object(
       'id', 'aaaaaaaa-0000-0000-0000-000000000002', 'name', 'Too long',
       'exercises', (select jsonb_agg(jsonb_build_object('id', gen_random_uuid(),
         'exercise_id', (select id from public.exercises where slug = 'plank')))
         from generate_series(1, 31)))) $$,
  '22023', null, 'a routine has 30 exercises at most'
);
select throws_ok(
  $$ select public.save_routine(jsonb_build_object(
       'id', 'aaaaaaaa-0000-0000-0000-000000000003', 'name', 'Bob''s exercise',
       'exercises', jsonb_build_array(jsonb_build_object(
         'id', 'aaaaaaaa-0000-0000-0000-0000000000f3',
         'exercise_id', 'bbbbbbbb-0000-0000-0000-000000000001')))) $$,
  '42501', null, 'Alice cannot use Bob''s custom exercise'
);

-- Set checks.
select throws_ok(
  $$ insert into public.routine_sets (routine_exercise_id, target_type, reps, rpe)
     values ('aaaaaaaa-0000-0000-0000-0000000000e1', 'reps', 8, 8.3) $$,
  '23514', null, 'RPE goes in steps of 0.5'
);
select throws_ok(
  $$ insert into public.routine_sets (routine_exercise_id, target_type, reps_min, reps_max)
     values ('aaaaaaaa-0000-0000-0000-0000000000e1', 'rep_range', 10, 8) $$,
  '23514', null, 'a rep range needs min below max'
);
select throws_ok(
  $$ insert into public.routine_sets (routine_exercise_id, target_type)
     values ('aaaaaaaa-0000-0000-0000-0000000000e1', 'reps') $$,
  '23514', null, 'a reps target needs reps'
);
select throws_ok(
  $$ insert into public.routine_sets (routine_exercise_id, target_type, duration_sec)
     values ('aaaaaaaa-0000-0000-0000-0000000000e1', 'distance', 60) $$,
  '23514', null, 'a distance target needs a distance'
);
select throws_ok(
  $$ insert into public.routine_sets (routine_exercise_id, target_type, reps, weight_mode)
     values ('aaaaaaaa-0000-0000-0000-0000000000e1', 'reps', 5, 'percent_of_1rm') $$,
  '23514', null, 'a percentage load needs a percentage'
);
select throws_ok(
  $$ insert into public.routine_sets (routine_exercise_id, target_type, reps, weight_percent)
     values ('aaaaaaaa-0000-0000-0000-0000000000e1', 'reps', 5, 80) $$,
  '23514', null, 'an absolute load takes no percentage'
);
select throws_ok(
  $$ insert into public.routine_sets (routine_exercise_id, target_type, reps, tempo)
     values ('aaaaaaaa-0000-0000-0000-0000000000e1', 'reps', 5, '31') $$,
  '23514', null, 'tempo needs four parts'
);
select throws_ok(
  $$ insert into public.routine_sets (routine_exercise_id, target_type, reps, rir)
     values ('aaaaaaaa-0000-0000-0000-0000000000e1', 'reps', 5, 6) $$,
  '23514', null, 'RIR is 0 to 5'
);
select throws_ok(
  $$ update public.routine_exercises set rest_seconds = 901
     where id = 'aaaaaaaa-0000-0000-0000-0000000000e1' $$,
  '23514', null, 'rest is 15 minutes at most'
);
select throws_ok(
  $$ update public.routines set colour = 'neon' where id = 'aaaaaaaa-0000-0000-0000-000000000001' $$,
  '23514', null, 'colour must be a rank hue key'
);

update public.routines set user_id = '22222222-2222-2222-2222-222222222222'
  where id = 'aaaaaaaa-0000-0000-0000-000000000001';
select results_eq(
  $$ select user_id from public.routines where id = 'aaaaaaaa-0000-0000-0000-000000000001' $$,
  $$ values ('11111111-1111-1111-1111-111111111111'::uuid) $$,
  'a routine cannot be given to another user'
);

select lives_ok(
  $$ update public.user_settings set effort_metric = 'both'
     where user_id = '11111111-1111-1111-1111-111111111111' $$,
  'Alice changes her effort metric'
);

-- ── Signed in as Bob ────────────────────────────────────────────────────────────────────────────
select set_config('request.jwt.claims', '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated"}', true);

select is_empty($$ select id from public.routine_folders $$, 'Bob cannot read Alice''s folders');
select is_empty($$ select id from public.routines $$, 'Bob cannot read Alice''s routines');
select is_empty($$ select id from public.routine_exercises $$,
  'Bob cannot read Alice''s routine exercises');
select is_empty($$ select id from public.routine_sets $$, 'Bob cannot read Alice''s routine sets');

select results_eq(
  $$ with u as (update public.routines set name = 'Mine' returning 1) select count(*)::int from u $$,
  $$ values (0) $$, 'Bob cannot rename Alice''s routine'
);
select results_eq(
  $$ with u as (update public.routine_folders set name = 'Mine' returning 1)
     select count(*)::int from u $$,
  $$ values (0) $$, 'Bob cannot rename Alice''s folder'
);
select results_eq(
  $$ with u as (update public.routine_exercises set rest_seconds = 0 returning 1)
     select count(*)::int from u $$,
  $$ values (0) $$, 'Bob cannot change Alice''s routine exercises'
);
select results_eq(
  $$ with u as (update public.routine_sets set reps = 1 returning 1) select count(*)::int from u $$,
  $$ values (0) $$, 'Bob cannot change Alice''s sets'
);
select results_eq(
  $$ with d as (delete from public.routine_sets returning 1) select count(*)::int from d $$,
  $$ values (0) $$, 'Bob cannot delete Alice''s sets'
);
select results_eq(
  $$ with d as (delete from public.routine_exercises returning 1) select count(*)::int from d $$,
  $$ values (0) $$, 'Bob cannot delete Alice''s routine exercises'
);
select results_eq(
  $$ with d as (delete from public.routines returning 1) select count(*)::int from d $$,
  $$ values (0) $$, 'Bob cannot delete Alice''s routines'
);
select results_eq(
  $$ with d as (delete from public.routine_folders returning 1) select count(*)::int from d $$,
  $$ values (0) $$, 'Bob cannot delete Alice''s folders'
);
select throws_ok(
  $$ insert into public.routine_sets (routine_exercise_id, target_type, reps)
     values ('aaaaaaaa-0000-0000-0000-0000000000e1', 'reps', 5) $$,
  '42501', null, 'Bob cannot add sets to Alice''s routine'
);
select throws_ok(
  $$ insert into public.routine_exercises (routine_id, exercise_id)
     select 'aaaaaaaa-0000-0000-0000-000000000001', id from public.exercises
     where slug = 'plank' $$,
  '42501', null, 'Bob cannot add exercises to Alice''s routine'
);
select throws_ok(
  $$ select public.save_routine(jsonb_build_object(
       'id', 'aaaaaaaa-0000-0000-0000-000000000001', 'name', 'Taken over')) $$,
  '42501', null, 'Bob cannot overwrite Alice''s routine through save_routine'
);
select throws_ok(
  $$ insert into public.routines (name, folder_id)
     values ('In Alice''s folder', 'aaaaaaaa-0000-0000-0000-00000000f001') $$,
  '23503', null, 'Bob cannot put a routine in Alice''s folder'
);
select throws_ok(
  $$ insert into public.routines (user_id, name)
     values ('11111111-1111-1111-1111-111111111111', 'Planted') $$,
  '42501', null, 'Bob cannot create a routine for Alice'
);

-- ── Anonymous ───────────────────────────────────────────────────────────────────────────────────
set local role anon;
select set_config('request.jwt.claims', '{"role": "anon"}', true);

select throws_ok($$ select id from public.routines $$, '42501', null,
  'anon cannot read routines');
select throws_ok($$ select id from public.routine_sets $$, '42501', null,
  'anon cannot read routine sets');
select throws_ok($$ select public.save_routine('{}') $$, '42501', null,
  'anon cannot call save_routine');

-- ── Folder deletion ─────────────────────────────────────────────────────────────────────────────
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}', true);
update public.routines set folder_id = 'aaaaaaaa-0000-0000-0000-00000000f001'
  where id = 'aaaaaaaa-0000-0000-0000-000000000001';
delete from public.routine_folders where id = 'aaaaaaaa-0000-0000-0000-00000000f001';
select results_eq(
  $$ select folder_id, user_id from public.routines
     where id = 'aaaaaaaa-0000-0000-0000-000000000001' $$,
  $$ values (null::uuid, '11111111-1111-1111-1111-111111111111'::uuid) $$,
  'deleting a folder keeps its routines, without a folder'
);

select * from finish();
rollback;
