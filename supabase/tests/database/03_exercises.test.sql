-- Exercise library: the official library is seeded and readable by everyone signed in; custom
-- exercises are private to their creator and can never rank. Run with `pnpm db:test`.
begin;
set local role postgres;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(43);

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'alice@test.dev'),
  ('22222222-2222-2222-2222-222222222222', 'bob@test.dev');

-- ── Schema and seed ─────────────────────────────────────────────────────────────────────────────

select has_table('public', 'exercises', 'exercises exists');
select has_table('public', 'exercise_muscles', 'exercise_muscles exists');
select has_table('public', 'exercise_library_meta', 'exercise_library_meta exists');

-- Same lists as src/lib/exercises/taxonomy.ts.
select enum_has_labels('public', 'muscle', array[
  'upper_chest', 'mid_lower_chest', 'front_delts', 'side_delts', 'rear_delts', 'biceps', 'triceps',
  'forearms', 'lats', 'upper_back', 'traps', 'lower_back', 'abs', 'obliques', 'quads', 'hamstrings',
  'glutes', 'adductors', 'abductors', 'calves', 'neck'
], 'muscle enum matches the app taxonomy');
select enum_has_labels('public', 'muscle_region',
  array['chest', 'shoulders', 'arms', 'back', 'core', 'legs'], 'muscle_region enum');
select enum_has_labels('public', 'exercise_log_type', array[
  'weight_reps', 'bodyweight_reps', 'weighted_bodyweight', 'assisted_bodyweight', 'duration',
  'distance_duration'
], 'exercise_log_type enum');

select ok(
  (select count(*) from public.exercises where created_by is null) >= 250,
  'at least 250 official exercises are seeded'
);
select is_empty(
  $$ select e.slug from public.exercises e
     where e.created_by is null
       and not exists (select 1 from public.exercise_muscles m
                       where m.exercise_id = e.id and m.role = 'primary') $$,
  'every official exercise has a primary muscle'
);
select ok(
  (select count(*) from public.exercises where rank_key is not null) >= 30,
  'at least 30 rankable exercises'
);
select is_empty(
  $$ select slug from public.exercises
     where rank_key is not null and equipment in ('machine', 'cable', 'smith') $$,
  'machines never rank'
);
select ok(
  (select version from public.exercise_library_meta) >= 1,
  'library version is set by the seed migration'
);
select is(public.region_of_muscle('lats'), 'back'::public.muscle_region, 'lats are in the back region');
select is(public.region_of_muscle('neck'), null, 'neck has no region');

-- ── Signed in as Alice: custom exercises ────────────────────────────────────────────────────────
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}', true);

select ok(
  (select count(*) from public.exercises) >= 250,
  'a signed-in user reads the official library'
);

select is(
  public.save_custom_exercise(
    'cccccccc-cccc-cccc-cccc-cccccccccccc', ' Hostel bucket squat ', 'other', 'weight_reps',
    array['quads']::public.muscle[], array['glutes']::public.muscle[]
  ),
  'cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid,
  'save_custom_exercise creates a custom exercise'
);
select results_eq(
  $$ select name, created_by, is_public, is_rankable, category::text, mechanic::text
     from public.exercises where id = 'cccccccc-cccc-cccc-cccc-cccccccccccc' $$,
  $$ values ('Hostel bucket squat', '11111111-1111-1111-1111-111111111111'::uuid, false, false,
             'strength', 'isolation') $$,
  'custom exercise is private, unranked and owned by its creator'
);
select results_eq(
  $$ select muscle::text, role::text, weight from public.exercise_muscles
     where exercise_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc' order by role $$,
  $$ values ('quads', 'primary', 1.00), ('glutes', 'secondary', 0.50) $$,
  'custom exercise muscles are saved with role weights'
);

select lives_ok(
  $$ select public.save_custom_exercise(
       'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Bucket squat', 'other', 'weight_reps',
       array['quads', 'glutes']::public.muscle[], '{}') $$,
  'save_custom_exercise edits an existing custom exercise'
);
select results_eq(
  $$ select count(*)::int from public.exercise_muscles
     where exercise_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc' and role = 'primary' $$,
  $$ values (2) $$,
  'editing replaces the muscles'
);
select throws_ok(
  $$ select public.save_custom_exercise(null, 'No muscles', 'other', 'weight_reps', '{}', '{}') $$,
  '22023', null, 'a custom exercise needs a primary muscle'
);
select throws_ok(
  $$ select public.save_custom_exercise(null, 'Overlap', 'other', 'weight_reps',
       array['quads']::public.muscle[], array['quads']::public.muscle[]) $$,
  '22023', null, 'a muscle cannot be both primary and secondary'
);

select throws_ok(
  $$ insert into public.exercises (slug, name, category, equipment, mechanic, log_type,
       is_rankable, rank_key)
     values ('my-bench', 'My bench', 'strength', 'barbell', 'compound', 'weight_reps', true,
       'benchPress') $$,
  '23514', null, 'custom exercises cannot rank'
);
select throws_ok(
  $$ insert into public.exercises (slug, name, category, equipment, mechanic, log_type,
       instructions, created_by, is_public)
     values ('fake-official', 'Fake official', 'strength', 'barbell', 'compound', 'weight_reps',
       array['Lift'], null, true) $$,
  '42501', null, 'users cannot insert official exercises'
);
select throws_ok(
  $$ update public.exercises set is_public = true
     where id = 'cccccccc-cccc-cccc-cccc-cccccccccccc' $$,
  '23514', null, 'custom exercises stay private'
);

update public.exercises set created_by = null where id = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
select results_eq(
  $$ select created_by from public.exercises where id = 'cccccccc-cccc-cccc-cccc-cccccccccccc' $$,
  $$ values ('11111111-1111-1111-1111-111111111111'::uuid) $$,
  'a custom exercise cannot be turned into an official one'
);

select results_eq(
  $$ with u as (update public.exercises set name = 'Hacked'
                where slug = 'barbell-bench-press' and created_by is null returning 1)
     select count(*)::int from u $$,
  $$ values (0) $$,
  'users cannot update official exercises'
);
select results_eq(
  $$ with d as (delete from public.exercises
                where slug = 'barbell-bench-press' and created_by is null returning 1)
     select count(*)::int from d $$,
  $$ values (0) $$,
  'users cannot delete official exercises'
);
select throws_ok(
  $$ insert into public.exercise_muscles (exercise_id, muscle, role, weight)
     select id, 'neck', 'primary', 1 from public.exercises
     where slug = 'barbell-bench-press' and created_by is null $$,
  '42501', null, 'users cannot change official muscle mappings'
);
select results_eq(
  $$ with d as (delete from public.exercise_muscles m using public.exercises e
                where m.exercise_id = e.id and e.slug = 'barbell-bench-press'
                  and e.created_by is null returning 1)
     select count(*)::int from d $$,
  $$ values (0) $$,
  'users cannot delete official muscle mappings'
);

-- ── Signed in as Bob ────────────────────────────────────────────────────────────────────────────
select set_config('request.jwt.claims', '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated"}', true);

select is_empty(
  $$ select id from public.exercises where id = 'cccccccc-cccc-cccc-cccc-cccccccccccc' $$,
  'Bob cannot read Alice''s custom exercise'
);
select is_empty(
  $$ select muscle from public.exercise_muscles
     where exercise_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc' $$,
  'Bob cannot read Alice''s custom muscles'
);
select results_eq(
  $$ with u as (update public.exercises set name = 'Mine now'
                where id = 'cccccccc-cccc-cccc-cccc-cccccccccccc' returning 1)
     select count(*)::int from u $$,
  $$ values (0) $$,
  'Bob cannot update Alice''s custom exercise'
);
select results_eq(
  $$ with d as (delete from public.exercises
                where id = 'cccccccc-cccc-cccc-cccc-cccccccccccc' returning 1)
     select count(*)::int from d $$,
  $$ values (0) $$,
  'Bob cannot delete Alice''s custom exercise'
);
select throws_ok(
  $$ insert into public.exercise_muscles (exercise_id, muscle, role, weight)
     values ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'calves', 'secondary', 0.5) $$,
  '42501', null, 'Bob cannot add muscles to Alice''s exercise'
);
select throws_ok(
  $$ select public.save_custom_exercise(
       'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Stolen', 'other', 'weight_reps',
       array['quads']::public.muscle[], '{}') $$,
  '42501', null, 'Bob cannot overwrite Alice''s exercise through the function'
);
select ok(
  (select version from public.exercise_library_meta) >= 1,
  'Bob reads the library version'
);
select throws_ok(
  $$ update public.exercise_library_meta set version = 99 $$,
  '42501', null, 'clients cannot change the library version'
);

-- ── Back as Alice: her exercise is untouched ────────────────────────────────────────────────────
select set_config('request.jwt.claims', '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}', true);
select results_eq(
  $$ select name from public.exercises where id = 'cccccccc-cccc-cccc-cccc-cccccccccccc' $$,
  $$ values ('Bucket squat') $$,
  'Alice''s exercise survived Bob''s attempts'
);
select results_eq(
  $$ with d as (delete from public.exercises
                where id = 'cccccccc-cccc-cccc-cccc-cccccccccccc' returning 1)
     select count(*)::int from d $$,
  $$ values (1) $$,
  'Alice can delete her own custom exercise'
);

-- ── Not signed in ───────────────────────────────────────────────────────────────────────────────
set local role postgres;
set local role anon;
select set_config('request.jwt.claims', '{"role": "anon"}', true);

select throws_ok($$ select * from public.exercises $$, '42501', null, 'anon cannot read exercises');
select throws_ok(
  $$ select * from public.exercise_muscles $$, '42501', null, 'anon cannot read exercise muscles'
);
select throws_ok(
  $$ select * from public.exercise_library_meta $$, '42501', null, 'anon cannot read the library version'
);
select throws_ok(
  $$ select public.save_custom_exercise(null, 'Anon', 'other', 'weight_reps',
       array['quads']::public.muscle[], '{}') $$,
  '42501', null, 'anon cannot create exercises'
);

select * from finish();
rollback;
