-- Row level security: another user (or anon) can never read or change someone's private data.
-- Run with `pnpm db:test`.
begin;
-- `supabase test db --linked` logs in with a role that is a member of postgres but doesn't inherit
-- its rights, and hosted projects don't put `extensions` on the search path. Locally both are no-ops.
set local role postgres;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(31);

-- Alice is private, Bob is public, Carol is friends-only. All three finished onboarding.
insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'alice@test.dev'),
  ('22222222-2222-2222-2222-222222222222', 'bob@test.dev'),
  ('33333333-3333-3333-3333-333333333333', 'carol@test.dev');

update public.profiles set
  username = 'alice', display_name = 'Alice', birth_year = 2004, bio = 'Alice bio',
  city = 'Pune', college = 'COEP', sex_for_standards = 'female', height_cm = 162,
  visibility = 'private', onboarded_at = now()
where id = '11111111-1111-1111-1111-111111111111';
update public.profiles set
  username = 'bob', display_name = 'Bob', birth_year = 2003, bio = 'Bob bio', city = 'Delhi',
  visibility = 'public', onboarded_at = now()
where id = '22222222-2222-2222-2222-222222222222';
update public.profiles set
  username = 'carol', display_name = 'Carol', birth_year = 2005, bio = 'Carol bio',
  city = 'Bengaluru', visibility = 'friends', onboarded_at = now()
where id = '33333333-3333-3333-3333-333333333333';

insert into public.bodyweight_logs (id, user_id, weight_kg) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 58.4);

-- ── Signed in as Bob ────────────────────────────────────────────────────────────────────────────
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated"}', true);

select results_eq(
  $$ select id from public.profiles $$,
  $$ values ('22222222-2222-2222-2222-222222222222'::uuid) $$,
  'Bob reads only his own profile row'
);
select is_empty(
  $$ select 1 from public.profiles where id = '11111111-1111-1111-1111-111111111111' $$,
  'Bob cannot read Alice''s profile row (birth year, sex, height)'
);
select results_eq(
  $$ with u as (update public.profiles set bio = 'hacked'
                 where id = '11111111-1111-1111-1111-111111111111' returning 1)
     select count(*)::int from u $$,
  $$ values (0) $$,
  'Bob cannot update Alice''s profile'
);
select throws_ok(
  $$ insert into public.profiles (id) values ('44444444-4444-4444-4444-444444444444') $$,
  '42501', null, 'users cannot insert profiles (the trigger does)'
);
select throws_ok(
  $$ delete from public.profiles where id = '22222222-2222-2222-2222-222222222222' $$,
  '42501', null, 'users cannot delete profiles'
);

select is_empty(
  $$ select 1 from public.bodyweight_logs $$,
  'Bob cannot read Alice''s bodyweight logs'
);
select throws_ok(
  $$ insert into public.bodyweight_logs (user_id, weight_kg)
     values ('11111111-1111-1111-1111-111111111111', 99) $$,
  '42501', null, 'Bob cannot log bodyweight for Alice'
);
select results_eq(
  $$ with u as (update public.bodyweight_logs set weight_kg = 99
                 where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' returning 1)
     select count(*)::int from u $$,
  $$ values (0) $$,
  'Bob cannot change Alice''s weigh-in'
);
select results_eq(
  $$ with d as (delete from public.bodyweight_logs
                 where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' returning 1)
     select count(*)::int from d $$,
  $$ values (0) $$,
  'Bob cannot delete Alice''s weigh-in'
);
select lives_ok(
  $$ insert into public.bodyweight_logs (weight_kg) values (74.2) $$,
  'Bob can log his own bodyweight (user_id defaults to him)'
);
select results_eq(
  $$ select user_id from public.bodyweight_logs $$,
  $$ values ('22222222-2222-2222-2222-222222222222'::uuid) $$,
  'Bob sees only his own weigh-in'
);

select results_eq(
  $$ select user_id from public.user_settings $$,
  $$ values ('22222222-2222-2222-2222-222222222222'::uuid) $$,
  'Bob reads only his own settings'
);
select results_eq(
  $$ with u as (update public.user_settings set theme = 'light'
                 where user_id = '11111111-1111-1111-1111-111111111111' returning 1)
     select count(*)::int from u $$,
  $$ values (0) $$,
  'Bob cannot update Alice''s settings'
);
select lives_ok(
  $$ update public.user_settings set rest_timer_default_sec = 90
      where user_id = '22222222-2222-2222-2222-222222222222' $$,
  'Bob can update his own settings'
);

-- Profile cards: identity always, details by visibility, sensitive fields never.
select results_eq(
  $$ select username, display_name, bio, city, college
       from public.public_profile_cards where id = '11111111-1111-1111-1111-111111111111' $$,
  $$ values ('alice'::text, 'Alice'::text, null::text, null::text, null::text) $$,
  'private profile card shows identity only'
);
select results_eq(
  $$ select bio, city from public.public_profile_cards
      where id = '33333333-3333-3333-3333-333333333333' $$,
  $$ values (null::text, null::text) $$,
  'friends-only details are hidden from non-friends'
);
select results_eq(
  $$ select bio, city from public.public_profile_cards
      where id = '22222222-2222-2222-2222-222222222222' $$,
  $$ values ('Bob bio'::text, 'Delhi'::text) $$,
  'Bob sees his own details on his card'
);
select hasnt_column(
  'public', 'public_profile_cards', 'birth_year', 'cards never expose birth year'
);
select hasnt_column(
  'public', 'public_profile_cards', 'sex_for_standards', 'cards never expose sex for standards'
);

select is(public.username_available('alice'), false, 'taken username is unavailable');
select is(public.username_available('new_lifter'), true, 'free username is available');
select is(public.username_available('admin'), false, 'reserved username is unavailable');
select is(public.username_available('Bad Name'), false, 'badly formatted username is unavailable');
select throws_ok(
  $$ update public.profiles set username = 'alice'
      where id = '22222222-2222-2222-2222-222222222222' $$,
  '23505', null, 'usernames are unique'
);

-- ── Signed in as Alice ──────────────────────────────────────────────────────────────────────────
select set_config('request.jwt.claims', '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}', true);

select results_eq(
  $$ select bio, city from public.public_profile_cards
      where id = '22222222-2222-2222-2222-222222222222' $$,
  $$ values ('Bob bio'::text, 'Delhi'::text) $$,
  'public profile details are visible to other users'
);
select is(public.username_available('alice'), true, 'your own username counts as available');
select results_eq(
  $$ select weight_kg from public.bodyweight_logs $$,
  $$ values (58.40::numeric(5, 2)) $$,
  'Alice still has her weigh-in, unchanged'
);

-- ── Not signed in ───────────────────────────────────────────────────────────────────────────────
set local role postgres;
set local role anon;
select set_config('request.jwt.claims', '{"role": "anon"}', true);

select throws_ok(
  $$ select * from public.profiles $$, '42501', null, 'anon cannot read profiles'
);
select throws_ok(
  $$ select * from public.bodyweight_logs $$, '42501', null, 'anon cannot read bodyweight logs'
);
select throws_ok(
  $$ select * from public.public_profile_cards $$, '42501', null, 'anon cannot read profile cards'
);
select throws_ok(
  $$ select public.username_available('anyone') $$,
  '42501', null, 'anon cannot probe usernames'
);

select * from finish();
rollback;
