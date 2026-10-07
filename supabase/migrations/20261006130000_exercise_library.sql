-- Phase 2: the exercise library (official + custom exercises) and muscle mapping.
-- Described in docs/SCHEMA.md. The official rows arrive in generated migrations
-- (supabase/seed/build.ts → *_exercise_library_v<N>.sql), never by hand.

-- ─── Types ──────────────────────────────────────────────────────────────────────────────────────

-- Same lists as src/lib/exercises/taxonomy.ts (a test keeps them in sync). Muscle keys are also the
-- body-map SVG path ids.
create type public.muscle as enum (
  'upper_chest', 'mid_lower_chest',
  'front_delts', 'side_delts', 'rear_delts',
  'biceps', 'triceps', 'forearms',
  'lats', 'upper_back', 'traps', 'lower_back',
  'abs', 'obliques',
  'quads', 'hamstrings', 'glutes', 'adductors', 'abductors', 'calves',
  'neck'
);
create type public.muscle_region as enum ('chest', 'shoulders', 'arms', 'back', 'core', 'legs');
create type public.exercise_category as enum ('strength', 'calisthenics', 'cardio', 'mobility');
create type public.equipment as enum (
  'barbell', 'dumbbell', 'machine', 'cable', 'bodyweight', 'kettlebell', 'band', 'smith', 'other'
);
create type public.exercise_mechanic as enum ('compound', 'isolation');
create type public.exercise_log_type as enum (
  'weight_reps', 'bodyweight_reps', 'weighted_bodyweight', 'assisted_bodyweight',
  'duration', 'distance_duration'
);
create type public.muscle_role as enum ('primary', 'secondary', 'stabiliser');

-- ─── Helpers ────────────────────────────────────────────────────────────────────────────────────

-- The body region a muscle belongs to (null for optional muscles such as the neck). Server-side
-- muscle maths (Phase 8) groups by this.
create function public.region_of_muscle(m public.muscle)
returns public.muscle_region
language sql
immutable
set search_path = ''
as $$
  select case
    when m in ('upper_chest', 'mid_lower_chest') then 'chest'
    when m in ('front_delts', 'side_delts', 'rear_delts') then 'shoulders'
    when m in ('biceps', 'triceps', 'forearms') then 'arms'
    when m in ('lats', 'upper_back', 'traps', 'lower_back') then 'back'
    when m in ('abs', 'obliques') then 'core'
    when m in ('quads', 'hamstrings', 'glutes', 'adductors', 'abductors', 'calves') then 'legs'
  end::public.muscle_region;
$$;

-- ─── exercises ──────────────────────────────────────────────────────────────────────────────────

create table public.exercises (
  -- The client may supply the id so custom exercises can be created offline later (Phase 4).
  id uuid primary key default gen_random_uuid(),
  slug text not null
    constraint exercises_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 80),
  name text not null
    constraint exercises_name_length check (char_length(btrim(name)) between 2 and 60),
  -- Other names people search for, including Indian gym names ('pec deck' for the machine fly).
  aliases text[] not null default '{}',
  category public.exercise_category not null,
  equipment public.equipment not null,
  mechanic public.exercise_mechanic not null,
  log_type public.exercise_log_type not null,
  unilateral boolean not null default false,
  instructions text[] not null default '{}',
  tips text[] not null default '{}',
  common_mistakes text[] not null default '{}',
  media_url text
    constraint exercises_media_url_length check (char_length(media_url) <= 2048),
  -- Metabolic equivalent, for calorie estimates (open decision #9).
  met_value numeric(4, 1) not null default 3.5
    constraint exercises_met_range check (met_value between 1 and 20),
  is_rankable boolean not null default false,
  -- Links to a ranked lift (src/lib/game/rankKeys.ts). One exercise per key.
  rank_key text
    constraint exercises_rank_key_format check (rank_key ~ '^[a-z][A-Za-z]{1,39}$'),
  -- Null for the official library; otherwise the user who made this custom exercise.
  created_by uuid default auth.uid() references public.profiles (id) on delete cascade,
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint exercises_rank_key_needs_rankable check (rank_key is null or is_rankable),
  -- Custom exercises never rank (anti-cheat): only official, standardised lifts do.
  constraint exercises_custom_not_rankable check (
    created_by is null or (not is_rankable and rank_key is null)
  ),
  -- Official exercises are public; custom ones are private until sharing exists (Phase 9).
  constraint exercises_visibility check (
    (created_by is null and is_public) or (created_by is not null and not is_public)
  ),
  constraint exercises_official_has_instructions check (
    created_by is not null or cardinality(instructions) > 0
  )
);

create unique index exercises_official_slug on public.exercises (slug) where created_by is null;
create unique index exercises_custom_slug on public.exercises (created_by, slug)
  where created_by is not null;
create unique index exercises_rank_key on public.exercises (rank_key) where rank_key is not null;
create index exercises_created_by on public.exercises (created_by) where created_by is not null;

comment on table public.exercises is
  'Exercise library. created_by null = official (readable by everyone signed in); otherwise a '
  'custom exercise readable and writable by its creator only.';

-- id, created_by and created_at can't be rewritten (so a custom exercise can't become official).
create function public.exercises_protect_columns()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.id := old.id;
  new.created_by := old.created_by;
  new.created_at := old.created_at;
  return new;
end;
$$;

create trigger exercises_protect_columns
  before update on public.exercises
  for each row execute function public.exercises_protect_columns();

create trigger exercises_updated_at
  before update on public.exercises
  for each row execute function public.set_updated_at();

-- ─── exercise_muscles ───────────────────────────────────────────────────────────────────────────

create table public.exercise_muscles (
  exercise_id uuid not null references public.exercises (id) on delete cascade,
  muscle public.muscle not null,
  role public.muscle_role not null,
  -- Share of a set's volume that counts for this muscle.
  weight numeric(3, 2) not null,
  primary key (exercise_id, muscle),
  constraint exercise_muscles_role_weight check (
    (role = 'primary' and weight = 1)
    or (role = 'secondary' and weight in (0.5, 0.25))
    or (role = 'stabiliser' and weight = 0.25)
  )
);

create index exercise_muscles_muscle on public.exercise_muscles (muscle);

comment on table public.exercise_muscles is
  'Muscles each exercise trains, with role and volume weight (primary 1, secondary 0.5 or 0.25, '
  'stabiliser 0.25). Readable and writable along with the parent exercise.';

-- ─── exercise_library_meta ──────────────────────────────────────────────────────────────────────

-- One row. Each generated library migration bumps `version`; apps re-download the official library
-- into SQLite when it changes.
create table public.exercise_library_meta (
  id boolean primary key default true
    constraint exercise_library_meta_single_row check (id),
  version integer not null default 0
    constraint exercise_library_meta_version_positive check (version >= 0),
  updated_at timestamptz not null default now()
);

insert into public.exercise_library_meta (id, version) values (true, 0);

comment on table public.exercise_library_meta is
  'Official exercise library version. Read-only for clients.';

-- ─── Custom exercises ───────────────────────────────────────────────────────────────────────────

-- Creates or edits the caller's custom exercise and replaces its muscles in one transaction.
-- Runs with the caller's rights, so RLS still decides what they can write. Category, mechanic,
-- slug and MET are derived; custom exercises never rank. Returns the exercise id.
create function public.save_custom_exercise(
  p_id uuid,
  p_name text,
  p_equipment public.equipment,
  p_log_type public.exercise_log_type,
  p_primary public.muscle[],
  p_secondary public.muscle[] default '{}'
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid := coalesce(p_id, gen_random_uuid());
  v_name text := btrim(p_name);
  v_primary public.muscle[] := array(select distinct m from unnest(p_primary) m);
  v_secondary public.muscle[] := array(select distinct m from unnest(coalesce(p_secondary, '{}')) m);
  v_category public.exercise_category;
  v_mechanic public.exercise_mechanic;
  v_slug text;
begin
  if v_uid is null then
    raise exception 'Sign in to create exercises.' using errcode = '42501';
  end if;
  if cardinality(v_primary) = 0 then
    raise exception 'Pick at least one primary muscle.' using errcode = '22023';
  end if;
  if v_primary && v_secondary then
    raise exception 'A muscle can''t be both primary and secondary.' using errcode = '22023';
  end if;

  v_category := case
    when p_log_type = 'distance_duration' then 'cardio'
    when p_log_type in ('bodyweight_reps', 'weighted_bodyweight', 'assisted_bodyweight')
      then 'calisthenics'
    else 'strength'
  end;
  v_mechanic := case
    when cardinality(v_primary) + cardinality(v_secondary) >= 3 then 'compound'
    else 'isolation'
  end;
  v_slug := 'custom-'
    || coalesce(nullif(trim(both '-' from left(
         regexp_replace(lower(v_name), '[^a-z0-9]+', '-', 'g'), 50)), ''), 'exercise')
    || '-' || left(replace(v_id::text, '-', ''), 8);

  insert into public.exercises as e (
    id, slug, name, category, equipment, mechanic, log_type, met_value, created_by, is_public
  )
  values (
    v_id, v_slug, v_name, v_category, p_equipment, v_mechanic, p_log_type,
    case v_category when 'cardio' then 7 when 'calisthenics' then 4 else 3.5 end,
    v_uid, false
  )
  on conflict (id) do update set
    slug = excluded.slug,
    name = excluded.name,
    category = excluded.category,
    equipment = excluded.equipment,
    mechanic = excluded.mechanic,
    log_type = excluded.log_type,
    met_value = excluded.met_value;

  delete from public.exercise_muscles where exercise_id = v_id;
  insert into public.exercise_muscles (exercise_id, muscle, role, weight)
  select v_id, m, 'primary'::public.muscle_role, 1 from unnest(v_primary) m
  union all
  select v_id, m, 'secondary'::public.muscle_role, 0.5 from unnest(v_secondary) m;

  return v_id;
end;
$$;

-- ─── Row level security ─────────────────────────────────────────────────────────────────────────

alter table public.exercises enable row level security;
alter table public.exercise_muscles enable row level security;
alter table public.exercise_library_meta enable row level security;

-- exercises: everyone signed in reads the official library; custom exercises are owner-only.
-- Official rows have created_by null, which never equals auth.uid(), so clients can't write them.
create policy "exercises: read official and own"
  on public.exercises for select to authenticated
  using (created_by is null or created_by = (select auth.uid()));

create policy "exercises: owner can insert"
  on public.exercises for insert to authenticated
  with check (created_by = (select auth.uid()));

create policy "exercises: owner can update"
  on public.exercises for update to authenticated
  using (created_by = (select auth.uid()))
  with check (created_by = (select auth.uid()));

create policy "exercises: owner can delete"
  on public.exercises for delete to authenticated
  using (created_by = (select auth.uid()));

-- exercise_muscles: follow the parent exercise.
create policy "exercise_muscles: read with exercise"
  on public.exercise_muscles for select to authenticated
  using (exists (
    select 1 from public.exercises e
    where e.id = exercise_id
      and (e.created_by is null or e.created_by = (select auth.uid()))
  ));

create policy "exercise_muscles: owner can insert"
  on public.exercise_muscles for insert to authenticated
  with check (exists (
    select 1 from public.exercises e
    where e.id = exercise_id and e.created_by = (select auth.uid())
  ));

create policy "exercise_muscles: owner can update"
  on public.exercise_muscles for update to authenticated
  using (exists (
    select 1 from public.exercises e
    where e.id = exercise_id and e.created_by = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.exercises e
    where e.id = exercise_id and e.created_by = (select auth.uid())
  ));

create policy "exercise_muscles: owner can delete"
  on public.exercise_muscles for delete to authenticated
  using (exists (
    select 1 from public.exercises e
    where e.id = exercise_id and e.created_by = (select auth.uid())
  ));

create policy "exercise_library_meta: signed in can read"
  on public.exercise_library_meta for select to authenticated
  using (true);

-- ─── Grants ─────────────────────────────────────────────────────────────────────────────────────

revoke all on public.exercises, public.exercise_muscles, public.exercise_library_meta
  from anon, authenticated;
grant select, insert, update, delete on public.exercises, public.exercise_muscles to authenticated;
grant select on public.exercise_library_meta to authenticated;

revoke execute on function
  public.save_custom_exercise(
    uuid, text, public.equipment, public.exercise_log_type, public.muscle[], public.muscle[]
  ) from public, anon;
grant execute on function
  public.save_custom_exercise(
    uuid, text, public.equipment, public.exercise_log_type, public.muscle[], public.muscle[]
  ) to authenticated;

revoke execute on function public.region_of_muscle(public.muscle) from public, anon;
grant execute on function public.region_of_muscle(public.muscle) to authenticated;
