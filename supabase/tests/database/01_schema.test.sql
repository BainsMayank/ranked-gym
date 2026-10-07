-- Schema, defaults and the new-user trigger. Run with `pnpm db:test`.
begin;
-- `supabase test db --linked` logs in with a role that is a member of postgres but doesn't inherit
-- its rights, and hosted projects don't put `extensions` on the search path. Locally both are no-ops.
set local role postgres;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(16);

select has_table('public', 'profiles', 'profiles exists');
select has_table('public', 'bodyweight_logs', 'bodyweight_logs exists');
select has_table('public', 'user_settings', 'user_settings exists');
select has_view('public', 'public_profile_cards', 'public_profile_cards exists');

select is(
  (select count(*)::int
     from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity),
  0,
  'every table in public has row level security enabled'
);

-- A Google sign-up carries a name and picture; an email sign-up carries nothing.
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000a1', 'google@test.dev',
   '{"full_name": "Asha Rao", "avatar_url": "https://example.com/a.png"}'),
  ('00000000-0000-0000-0000-0000000000a2', 'email@test.dev', '{}');

select is(
  (select display_name from public.profiles where id = '00000000-0000-0000-0000-0000000000a1'),
  'Asha Rao',
  'trigger copies the Google name into display_name'
);
select is(
  (select avatar_url from public.profiles where id = '00000000-0000-0000-0000-0000000000a1'),
  'https://example.com/a.png',
  'trigger copies the Google picture into avatar_url'
);
select ok(
  exists (select 1 from public.profiles
           where id = '00000000-0000-0000-0000-0000000000a2'
             and display_name is null and username is null and onboarded_at is null),
  'email sign-up gets a blank, not-yet-onboarded profile'
);
select is(
  (select count(*)::int from public.user_settings
    where user_id in ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a2')),
  2,
  'trigger creates a user_settings row for each new user'
);

select results_eq(
  $$ select units::text, visibility::text, sex_for_standards::text, country
       from public.profiles where id = '00000000-0000-0000-0000-0000000000a2' $$,
  $$ values ('kg', 'friends', 'unspecified', 'IN') $$,
  'profile defaults: kg, friends, unspecified, India'
);
select results_eq(
  $$ select theme::text, rest_timer_default_sec, bar_weight_kg, jsonb_array_length(plate_inventory)
       from public.user_settings where user_id = '00000000-0000-0000-0000-0000000000a2' $$,
  $$ values ('dark', 120, 20.0::numeric(4, 1), 7) $$,
  'settings defaults: dark, 120 s rest, 20 kg bar, 7 plate sizes'
);

-- Constraints hold even for the table owner.
select throws_ok(
  $$ update public.profiles set username = 'Asha Rao'
      where id = '00000000-0000-0000-0000-0000000000a1' $$,
  '23514', null, 'username must be lowercase letters, numbers or underscores'
);
select throws_ok(
  $$ update public.profiles set username = 'admin'
      where id = '00000000-0000-0000-0000-0000000000a1' $$,
  '23514', null, 'reserved usernames are rejected'
);
select throws_ok(
  format(
    'update public.profiles set birth_year = %s where id = %L',
    extract(year from now())::int - 12, '00000000-0000-0000-0000-0000000000a1'
  ),
  '23514', null, 'under-13s are blocked'
);
select throws_ok(
  $$ update public.profiles set onboarded_at = now()
      where id = '00000000-0000-0000-0000-0000000000a2' $$,
  '23514', null, 'onboarding cannot finish without username, name and birth year'
);

delete from auth.users where id = '00000000-0000-0000-0000-0000000000a1';
select ok(
  not exists (select 1 from public.user_settings where user_id = '00000000-0000-0000-0000-0000000000a1'),
  'deleting the auth user cascades to profile and settings'
);

select * from finish();
rollback;
