-- Phase 1: profiles, user settings and bodyweight logs, with row level security.
-- Described table by table in docs/SCHEMA.md. Never edit the hosted schema in the dashboard.

-- ─── Types ──────────────────────────────────────────────────────────────────────────────────────

create type public.sex_for_standards as enum ('male', 'female', 'unspecified');
create type public.experience_level as enum ('beginner', 'intermediate', 'advanced');
-- Same list as the plan generator (src/lib/profile/options.ts).
create type public.primary_goal as enum (
  'stronger', 'muscle', 'fat', 'gain', 'toned', 'curvier', 'calisthenics', 'general'
);
create type public.weight_unit as enum ('kg', 'lb');
create type public.profile_visibility as enum ('public', 'friends', 'private');
create type public.theme_mode as enum ('dark', 'light', 'system');

-- ─── Helpers ────────────────────────────────────────────────────────────────────────────────────

-- Names nobody can claim (support impersonation, routes, the brand).
create function public.is_reserved_username(name text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select name = any (array[
    'admin', 'administrator', 'support', 'help', 'moderator', 'mod', 'staff', 'team', 'official',
    'rankedgym', 'ranked_gym', 'ranked', 'gym', 'root', 'system', 'null', 'undefined', 'me',
    'settings', 'profile', 'welcome', 'onboarding', 'api', 'auth'
  ]);
$$;

-- Keeps updated_at current on every update.
create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ─── profiles ───────────────────────────────────────────────────────────────────────────────────

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  -- Null until onboarding step 1. Lowercase letters, numbers and underscores, 3–20 characters.
  username text unique
    constraint profiles_username_format check (username ~ '^[a-z0-9_]{3,20}$')
    constraint profiles_username_not_reserved check (not public.is_reserved_username(username)),
  display_name text
    constraint profiles_display_name_length check (char_length(btrim(display_name)) between 1 and 40),
  avatar_url text
    constraint profiles_avatar_url_length check (char_length(avatar_url) <= 2048),
  bio text
    constraint profiles_bio_length check (char_length(bio) <= 160),
  -- Used only to compare the user to fair strength standards. 'unspecified' ranks on men's standards.
  sex_for_standards public.sex_for_standards not null default 'unspecified',
  -- Under-13s are blocked by profiles_enforce_min_age (a check constraint can't use the date).
  birth_year smallint
    constraint profiles_birth_year_range check (birth_year between 1900 and 2100),
  height_cm numeric(4, 1)
    constraint profiles_height_range check (height_cm between 100 and 250),
  experience_level public.experience_level,
  primary_goal public.primary_goal,
  -- ISO 3166-1 alpha-2.
  country text not null default 'IN'
    constraint profiles_country_format check (country ~ '^[A-Z]{2}$'),
  city text
    constraint profiles_city_length check (char_length(btrim(city)) between 1 and 60),
  college text
    constraint profiles_college_length check (char_length(btrim(college)) between 1 and 100),
  units public.weight_unit not null default 'kg',
  visibility public.profile_visibility not null default 'friends',
  -- Set when onboarding finishes; the app gates on it.
  onboarded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_onboarding_complete check (
    onboarded_at is null
    or (username is not null and display_name is not null and birth_year is not null)
  )
);

comment on table public.profiles is
  'One row per user (created by handle_new_user). Owner-only; others read public_profile_cards.';
comment on column public.profiles.sex_for_standards is
  'Used only to compare the user to fair strength standards. unspecified ranks on men''s standards.';

create function public.profiles_enforce_min_age()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.birth_year is not null
     and extract(year from now())::int - new.birth_year < 13 then
    raise exception 'You need to be at least 13 to use Ranked Gym.'
      using errcode = 'check_violation', constraint = 'profiles_min_age';
  end if;
  return new;
end;
$$;

-- id and created_at can't be rewritten by an update.
create function public.profiles_protect_columns()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.id := old.id;
  new.created_at := old.created_at;
  return new;
end;
$$;

create trigger profiles_min_age
  before insert or update of birth_year on public.profiles
  for each row execute function public.profiles_enforce_min_age();

create trigger profiles_protect_columns
  before update on public.profiles
  for each row execute function public.profiles_protect_columns();

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ─── bodyweight_logs ────────────────────────────────────────────────────────────────────────────

create table public.bodyweight_logs (
  -- The client may supply the id so offline weigh-ins sync idempotently.
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  -- Always kilograms; the UI converts.
  weight_kg numeric(5, 2) not null
    constraint bodyweight_logs_weight_range check (weight_kg between 20 and 400),
  logged_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index bodyweight_logs_user_logged_at on public.bodyweight_logs (user_id, logged_at desc);

comment on table public.bodyweight_logs is 'Weigh-ins in kg. Owner-only.';

-- ─── user_settings ──────────────────────────────────────────────────────────────────────────────

create table public.user_settings (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  notification_prefs jsonb not null default '{
    "workout_reminders": true,
    "streak_at_risk": true,
    "rank_ups": true,
    "friend_activity": true,
    "league_results": true
  }'::jsonb
    constraint user_settings_notification_prefs_object
      check (jsonb_typeof(notification_prefs) = 'object'),
  theme public.theme_mode not null default 'dark',
  rest_timer_default_sec integer not null default 120
    constraint user_settings_rest_timer_range check (rest_timer_default_sec between 0 and 900),
  -- Plates available, as pairs per weight. Standard Indian gym set by default.
  plate_inventory jsonb not null default '[
    {"weight_kg": 25, "pairs": 4},
    {"weight_kg": 20, "pairs": 2},
    {"weight_kg": 15, "pairs": 2},
    {"weight_kg": 10, "pairs": 2},
    {"weight_kg": 5, "pairs": 2},
    {"weight_kg": 2.5, "pairs": 2},
    {"weight_kg": 1.25, "pairs": 2}
  ]'::jsonb
    constraint user_settings_plate_inventory_array check (jsonb_typeof(plate_inventory) = 'array'),
  bar_weight_kg numeric(4, 1) not null default 20
    constraint user_settings_bar_weight_range check (bar_weight_kg between 0 and 50),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.user_settings is 'Per-user app preferences. Owner-only.';

create function public.user_settings_protect_columns()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.user_id := old.user_id;
  new.created_at := old.created_at;
  return new;
end;
$$;

create trigger user_settings_protect_columns
  before update on public.user_settings
  for each row execute function public.user_settings_protect_columns();

create trigger user_settings_updated_at
  before update on public.user_settings
  for each row execute function public.set_updated_at();

-- ─── New user → profile + settings ──────────────────────────────────────────────────────────────

-- Runs as the table owner because the signing-up user has no rights yet. Google supplies a name and
-- picture in raw_user_meta_data; email OTP sign-ups start blank and fill them in during onboarding.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  meta_name text := nullif(btrim(left(coalesce(
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'name'
  ), 40)), '');
  meta_avatar text := coalesce(
    new.raw_user_meta_data ->> 'avatar_url',
    new.raw_user_meta_data ->> 'picture'
  );
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    meta_name,
    case when char_length(meta_avatar) <= 2048 then meta_avatar end
  );
  insert into public.user_settings (user_id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─── Friendship placeholder ─────────────────────────────────────────────────────────────────────

-- Phase 10 replaces this with a real lookup on the friendships table. Until then nobody is a friend,
-- so 'friends' visibility behaves like 'private' for everyone except the owner.
create function public.are_friends(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select false;
$$;

-- Whether `viewer` may see the details (bio, city, college, country) of a profile.
create function public.can_view_profile_details(
  owner uuid,
  vis public.profile_visibility,
  viewer uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select viewer is not null and (
    owner = viewer
    or vis = 'public'
    or (vis = 'friends' and public.are_friends(owner, viewer))
  );
$$;

-- ─── What other users can see ───────────────────────────────────────────────────────────────────

-- profiles is owner-only, so other users read this view. It deliberately runs with the view owner's
-- rights (security_invoker = false) to expose a column subset of rows RLS would hide:
--   • identity (id, username, display_name, avatar_url) of every onboarded user, so people can find
--     and add each other;
--   • details (bio, city, college, country) only where can_view_profile_details allows;
--   • never sex_for_standards, birth_year, height, goals, units or bodyweight.
-- Signed-in users only (auth.uid() is null for anon, so anon sees no rows).
create view public.public_profile_cards
with (security_invoker = false, security_barrier = true)
as
select
  p.id,
  p.username,
  p.display_name,
  p.avatar_url,
  p.visibility,
  case when d.allowed then p.bio end as bio,
  case when d.allowed then p.city end as city,
  case when d.allowed then p.college end as college,
  case when d.allowed then p.country end as country
from public.profiles p
cross join lateral (
  select public.can_view_profile_details(p.id, p.visibility, auth.uid()) as allowed
) d
where auth.uid() is not null
  and p.onboarded_at is not null;

comment on view public.public_profile_cards is
  'Profile fields other signed-in users may see, filtered by visibility. See docs/SCHEMA.md.';

-- ─── Username availability ──────────────────────────────────────────────────────────────────────

-- profiles RLS hides other users' rows, so availability needs a definer function. Returns false for
-- badly formatted or reserved names too. The caller's own current username counts as available.
create function public.username_available(name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    name ~ '^[a-z0-9_]{3,20}$'
    and not public.is_reserved_username(name)
    and not exists (
      select 1 from public.profiles p
      where p.username = name and p.id is distinct from auth.uid()
    );
$$;

-- ─── Row level security ─────────────────────────────────────────────────────────────────────────

alter table public.profiles enable row level security;
alter table public.bodyweight_logs enable row level security;
alter table public.user_settings enable row level security;

-- profiles: owner reads and updates their row. Rows are created by handle_new_user and removed with
-- the auth user, so there are no insert or delete policies.
create policy "profiles: owner can read"
  on public.profiles for select to authenticated
  using ((select auth.uid()) = id);

create policy "profiles: owner can update"
  on public.profiles for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- bodyweight_logs: owner has full access to their own rows only.
create policy "bodyweight_logs: owner can read"
  on public.bodyweight_logs for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "bodyweight_logs: owner can insert"
  on public.bodyweight_logs for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "bodyweight_logs: owner can update"
  on public.bodyweight_logs for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "bodyweight_logs: owner can delete"
  on public.bodyweight_logs for delete to authenticated
  using ((select auth.uid()) = user_id);

-- user_settings: owner reads and updates. Created by handle_new_user.
create policy "user_settings: owner can read"
  on public.user_settings for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "user_settings: owner can update"
  on public.user_settings for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- ─── Grants ─────────────────────────────────────────────────────────────────────────────────────

-- Supabase grants everything on public to anon and authenticated by default; RLS already blocks
-- them, but narrow the grants too so a missing policy can never open a table.
revoke all on public.profiles, public.bodyweight_logs, public.user_settings from anon;
revoke all on public.profiles, public.user_settings from authenticated;
grant select, update on public.profiles, public.user_settings to authenticated;
revoke all on public.bodyweight_logs from authenticated;
grant select, insert, update, delete on public.bodyweight_logs to authenticated;

revoke all on public.public_profile_cards from anon, authenticated;
grant select on public.public_profile_cards to authenticated;

revoke execute on function public.username_available(text) from public, anon;
grant execute on function public.username_available(text) to authenticated;

revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.are_friends(uuid, uuid) from public, anon;
revoke execute on function
  public.can_view_profile_details(uuid, public.profile_visibility, uuid) from public, anon;
grant execute on function public.are_friends(uuid, uuid) to authenticated;
grant execute on function
  public.can_view_profile_details(uuid, public.profile_visibility, uuid) to authenticated;
