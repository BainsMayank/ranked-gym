-- Phase 3: routines (folders, routines, their exercises and planned sets) and the user's effort
-- metric. Described in docs/SCHEMA.md. The set model is shared with live logging (Phase 4) and the
-- plan generator (Phase 5). The app keeps a local copy in SQLite and pushes whole routines through
-- save_routine().

-- ─── Types ──────────────────────────────────────────────────────────────────────────────────────

-- Same lists as src/lib/routines/taxonomy.ts (a test keeps them in sync).
create type public.set_type as enum (
  'warmup', 'working', 'top', 'backoff', 'drop', 'failure', 'amrap'
);
create type public.target_type as enum ('reps', 'rep_range', 'duration', 'distance');
create type public.weight_mode as enum (
  'absolute', 'percent_of_1rm', 'percent_of_top_set', 'bodyweight', 'assisted'
);
create type public.routine_source as enum ('manual', 'plan', 'copied', 'generated');
create type public.effort_metric as enum ('rir', 'rpe', 'both');

-- ─── user_settings: which effort target the user tracks ─────────────────────────────────────────

alter table public.user_settings
  add column effort_metric public.effort_metric not null default 'rir';

comment on column public.user_settings.effort_metric is
  'Effort target shown in routines and logging: RIR, RPE or both (advanced).';

-- ─── routine_folders ────────────────────────────────────────────────────────────────────────────

create table public.routine_folders (
  -- Client-supplied ids, so folders made offline sync idempotently.
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  name text not null
    constraint routine_folders_name_length check (char_length(btrim(name)) between 1 and 40),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Target of routines' composite foreign key (a routine can only sit in its owner's folder).
  constraint routine_folders_id_user unique (id, user_id)
);

create index routine_folders_user on public.routine_folders (user_id, sort_order);

comment on table public.routine_folders is 'Groups of routines (e.g. Push Pull Legs). Owner-only.';

-- ─── routines ───────────────────────────────────────────────────────────────────────────────────

create table public.routines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  folder_id uuid,
  name text not null
    constraint routines_name_length check (char_length(btrim(name)) between 1 and 60),
  description text
    constraint routines_description_length check (char_length(description) <= 500),
  -- A rank hue key, shown only as a small mark (MOBILE-DESIGN.md).
  colour text
    constraint routines_colour_key check (colour in (
      'iron', 'bronze', 'silver', 'gold', 'platinum', 'diamond', 'master', 'champion'
    )),
  -- Computed by the client on save (src/lib/routines/duration.ts). Display only.
  estimated_duration_min integer not null default 0
    constraint routines_duration_range check (estimated_duration_min between 0 and 1440),
  source public.routine_source not null default 'manual',
  -- Where a copy came from: 'template:<slug>', a plan id, a post id.
  source_ref text
    constraint routines_source_ref_length check (char_length(source_ref) <= 100),
  sort_order integer not null default 0,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Deleting a folder leaves its routines without one.
  constraint routines_folder_same_owner foreign key (folder_id, user_id)
    references public.routine_folders (id, user_id) on delete set null (folder_id)
);

create index routines_user on public.routines (user_id, sort_order);
create index routines_folder on public.routines (folder_id) where folder_id is not null;

comment on table public.routines is
  'Saved routines. Owner-only. Written whole through save_routine() so exercises and sets stay '
  'consistent.';

-- ─── routine_exercises ──────────────────────────────────────────────────────────────────────────

create table public.routine_exercises (
  id uuid primary key default gen_random_uuid(),
  routine_id uuid not null references public.routines (id) on delete cascade,
  -- Restrict: a custom exercise in use must be removed from routines before it can be deleted.
  exercise_id uuid not null references public.exercises (id) on delete restrict,
  sort_order integer not null default 0,
  -- Consecutive exercises with the same value run as a superset or circuit (A1, A2…).
  superset_group smallint
    constraint routine_exercises_superset_range check (superset_group between 1 and 100),
  -- Rest after each set; inside a superset, rest before the next member.
  rest_seconds integer not null default 90
    constraint routine_exercises_rest_range check (rest_seconds between 0 and 900),
  -- Superset members: rest after a full round (the same on every member).
  rest_after_superset_seconds integer
    constraint routine_exercises_round_rest_range
      check (rest_after_superset_seconds between 0 and 900),
  notes text
    constraint routine_exercises_notes_length check (char_length(notes) <= 500),
  -- Plan progression (Phase 5), e.g. {"kind": "double", "step_kg": 2.5}.
  progression_rule jsonb
    constraint routine_exercises_progression_object
      check (progression_rule is null or jsonb_typeof(progression_rule) = 'object'),
  created_at timestamptz not null default now()
);

create index routine_exercises_routine on public.routine_exercises (routine_id, sort_order);
create index routine_exercises_exercise on public.routine_exercises (exercise_id);

comment on table public.routine_exercises is
  'Exercises in a routine, in order. Readable and writable with the parent routine.';

-- ─── routine_sets ───────────────────────────────────────────────────────────────────────────────

create table public.routine_sets (
  id uuid primary key default gen_random_uuid(),
  routine_exercise_id uuid not null references public.routine_exercises (id) on delete cascade,
  sort_order integer not null default 0,
  -- Warm-ups never count toward working sets, volume or ranking.
  set_type public.set_type not null default 'working',
  target_type public.target_type not null default 'reps',
  reps smallint constraint routine_sets_reps_range check (reps between 1 and 100),
  reps_min smallint constraint routine_sets_reps_min_range check (reps_min between 1 and 100),
  reps_max smallint constraint routine_sets_reps_max_range check (reps_max between 1 and 100),
  duration_sec integer
    constraint routine_sets_duration_range check (duration_sec between 1 and 7200),
  distance_m integer
    constraint routine_sets_distance_range check (distance_m between 1 and 100000),
  -- kg: bar/stack weight (absolute), added load (bodyweight) or assistance (assisted).
  weight_kg numeric(6, 2)
    constraint routine_sets_weight_range check (weight_kg between 0 and 1000),
  weight_mode public.weight_mode not null default 'absolute',
  weight_percent numeric(4, 1)
    constraint routine_sets_percent_range check (weight_percent between 1 and 150),
  rir smallint constraint routine_sets_rir_range check (rir between 0 and 5),
  rpe numeric(3, 1)
    constraint routine_sets_rpe_range check (rpe between 5 and 10 and rpe * 2 = trunc(rpe * 2)),
  tempo text constraint routine_sets_tempo_format check (tempo ~ '^[0-9X]-[0-9X]-[0-9X]-[0-9X]$'),
  created_at timestamptz not null default now(),
  constraint routine_sets_target_present check (
    case target_type
      when 'reps' then reps is not null
      when 'rep_range' then reps_min is not null and reps_max is not null and reps_min < reps_max
      when 'duration' then duration_sec is not null
      when 'distance' then distance_m is not null
    end
  ),
  -- A percentage only with a percentage load, and always with one.
  constraint routine_sets_percent_matches_mode check (
    (weight_mode in ('percent_of_1rm', 'percent_of_top_set')) = (weight_percent is not null)
  )
);

create index routine_sets_exercise on public.routine_sets (routine_exercise_id, sort_order);

comment on table public.routine_sets is
  'Planned sets of a routine exercise. Readable and writable with the parent routine.';

-- ─── Triggers ───────────────────────────────────────────────────────────────────────────────────

create function public.routine_owned_protect_columns()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.id := old.id;
  new.user_id := old.user_id;
  new.created_at := old.created_at;
  return new;
end;
$$;

create trigger routine_folders_protect_columns
  before update on public.routine_folders
  for each row execute function public.routine_owned_protect_columns();
create trigger routine_folders_updated_at
  before update on public.routine_folders
  for each row execute function public.set_updated_at();

create trigger routines_protect_columns
  before update on public.routines
  for each row execute function public.routine_owned_protect_columns();
create trigger routines_updated_at
  before update on public.routines
  for each row execute function public.set_updated_at();

-- ─── save_routine ───────────────────────────────────────────────────────────────────────────────

-- Saves a whole routine (snake_case JSON: the routine columns plus `exercises`, each with `sets`)
-- in one transaction: upserts the routine, its exercises and sets with the client's ids, deletes
-- the ones no longer present, and returns the new updated_at. Order comes from array position.
-- Runs as the caller, so RLS applies to every row.
create function public.save_routine(p jsonb)
returns timestamptz
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid := (p ->> 'id')::uuid;
  v_exercises jsonb := coalesce(p -> 'exercises', '[]'::jsonb);
  v_updated timestamptz;
begin
  if v_uid is null then
    raise exception 'Sign in to save routines.' using errcode = '42501';
  end if;
  if v_id is null then
    raise exception 'A routine needs an id.' using errcode = '22023';
  end if;
  if jsonb_typeof(v_exercises) <> 'array' or jsonb_array_length(v_exercises) > 30 then
    raise exception '30 exercises per routine at most.' using errcode = '22023';
  end if;
  if exists (
    select 1 from jsonb_array_elements(v_exercises) e
    where jsonb_array_length(coalesce(e -> 'sets', '[]'::jsonb)) > 20
  ) then
    raise exception '20 sets per exercise at most.' using errcode = '22023';
  end if;
  if exists (
    select 1 from jsonb_array_elements(v_exercises) e
    where e -> 'sets' -> 0 ->> 'set_type' = 'drop'
  ) then
    raise exception 'A drop set needs a set before it.' using errcode = '22023';
  end if;

  insert into public.routines as r (
    id, user_id, folder_id, name, description, colour, estimated_duration_min, source, source_ref,
    sort_order, archived
  )
  values (
    v_id,
    v_uid,
    (p ->> 'folder_id')::uuid,
    p ->> 'name',
    p ->> 'description',
    p ->> 'colour',
    coalesce((p ->> 'estimated_duration_min')::integer, 0),
    coalesce((p ->> 'source')::public.routine_source, 'manual'),
    p ->> 'source_ref',
    coalesce((p ->> 'sort_order')::integer, 0),
    coalesce((p ->> 'archived')::boolean, false)
  )
  on conflict (id) do update set
    folder_id = excluded.folder_id,
    name = excluded.name,
    description = excluded.description,
    colour = excluded.colour,
    estimated_duration_min = excluded.estimated_duration_min,
    source = excluded.source,
    source_ref = excluded.source_ref,
    sort_order = excluded.sort_order,
    archived = excluded.archived,
    -- Bumps updated_at through the trigger even when only children change.
    updated_at = now()
  returning r.updated_at into v_updated;

  delete from public.routine_exercises re
  where re.routine_id = v_id
    and re.id not in (select (e ->> 'id')::uuid from jsonb_array_elements(v_exercises) e);

  insert into public.routine_exercises as re (
    id, routine_id, exercise_id, sort_order, superset_group, rest_seconds,
    rest_after_superset_seconds, notes, progression_rule
  )
  select
    (e ->> 'id')::uuid,
    v_id,
    (e ->> 'exercise_id')::uuid,
    n::integer - 1,
    (e ->> 'superset_group')::smallint,
    coalesce((e ->> 'rest_seconds')::integer, 90),
    (e ->> 'rest_after_superset_seconds')::integer,
    e ->> 'notes',
    case when jsonb_typeof(e -> 'progression_rule') = 'object' then e -> 'progression_rule' end
  from jsonb_array_elements(v_exercises) with ordinality as x(e, n)
  on conflict (id) do update set
    routine_id = excluded.routine_id,
    exercise_id = excluded.exercise_id,
    sort_order = excluded.sort_order,
    superset_group = excluded.superset_group,
    rest_seconds = excluded.rest_seconds,
    rest_after_superset_seconds = excluded.rest_after_superset_seconds,
    notes = excluded.notes,
    progression_rule = excluded.progression_rule;

  delete from public.routine_sets s
  using public.routine_exercises re
  where s.routine_exercise_id = re.id
    and re.routine_id = v_id
    and s.id not in (
      select (st ->> 'id')::uuid
      from jsonb_array_elements(v_exercises) e,
        jsonb_array_elements(coalesce(e -> 'sets', '[]'::jsonb)) st
    );

  insert into public.routine_sets as s (
    id, routine_exercise_id, sort_order, set_type, target_type, reps, reps_min, reps_max,
    duration_sec, distance_m, weight_kg, weight_mode, weight_percent, rir, rpe, tempo
  )
  select
    (st ->> 'id')::uuid,
    (e ->> 'id')::uuid,
    sn::integer - 1,
    (st ->> 'set_type')::public.set_type,
    (st ->> 'target_type')::public.target_type,
    (st ->> 'reps')::smallint,
    (st ->> 'reps_min')::smallint,
    (st ->> 'reps_max')::smallint,
    (st ->> 'duration_sec')::integer,
    (st ->> 'distance_m')::integer,
    (st ->> 'weight_kg')::numeric,
    (st ->> 'weight_mode')::public.weight_mode,
    (st ->> 'weight_percent')::numeric,
    (st ->> 'rir')::smallint,
    (st ->> 'rpe')::numeric,
    st ->> 'tempo'
  from jsonb_array_elements(v_exercises) e,
    jsonb_array_elements(coalesce(e -> 'sets', '[]'::jsonb)) with ordinality as y(st, sn)
  on conflict (id) do update set
    routine_exercise_id = excluded.routine_exercise_id,
    sort_order = excluded.sort_order,
    set_type = excluded.set_type,
    target_type = excluded.target_type,
    reps = excluded.reps,
    reps_min = excluded.reps_min,
    reps_max = excluded.reps_max,
    duration_sec = excluded.duration_sec,
    distance_m = excluded.distance_m,
    weight_kg = excluded.weight_kg,
    weight_mode = excluded.weight_mode,
    weight_percent = excluded.weight_percent,
    rir = excluded.rir,
    rpe = excluded.rpe,
    tempo = excluded.tempo;

  return v_updated;
end;
$$;

-- ─── Row level security ─────────────────────────────────────────────────────────────────────────

alter table public.routine_folders enable row level security;
alter table public.routines enable row level security;
alter table public.routine_exercises enable row level security;
alter table public.routine_sets enable row level security;

create policy "routine_folders: owner can read"
  on public.routine_folders for select to authenticated
  using (user_id = (select auth.uid()));
create policy "routine_folders: owner can insert"
  on public.routine_folders for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "routine_folders: owner can update"
  on public.routine_folders for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "routine_folders: owner can delete"
  on public.routine_folders for delete to authenticated
  using (user_id = (select auth.uid()));

create policy "routines: owner can read"
  on public.routines for select to authenticated
  using (user_id = (select auth.uid()));
create policy "routines: owner can insert"
  on public.routines for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "routines: owner can update"
  on public.routines for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "routines: owner can delete"
  on public.routines for delete to authenticated
  using (user_id = (select auth.uid()));

-- Children follow the parent routine. Writes also require the exercise to be one the caller can
-- see (official or their own custom exercise).
create function public.owns_routine(p_routine_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select exists (
    select 1 from public.routines r
    where r.id = p_routine_id and r.user_id = (select auth.uid())
  );
$$;

create function public.can_use_exercise(p_exercise_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select exists (
    select 1 from public.exercises e
    where e.id = p_exercise_id
      and (e.created_by is null or e.created_by = (select auth.uid()))
  );
$$;

create policy "routine_exercises: owner can read"
  on public.routine_exercises for select to authenticated
  using (public.owns_routine(routine_id));
create policy "routine_exercises: owner can insert"
  on public.routine_exercises for insert to authenticated
  with check (public.owns_routine(routine_id) and public.can_use_exercise(exercise_id));
create policy "routine_exercises: owner can update"
  on public.routine_exercises for update to authenticated
  using (public.owns_routine(routine_id))
  with check (public.owns_routine(routine_id) and public.can_use_exercise(exercise_id));
create policy "routine_exercises: owner can delete"
  on public.routine_exercises for delete to authenticated
  using (public.owns_routine(routine_id));

create function public.owns_routine_exercise(p_routine_exercise_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select exists (
    select 1 from public.routine_exercises re
    join public.routines r on r.id = re.routine_id
    where re.id = p_routine_exercise_id and r.user_id = (select auth.uid())
  );
$$;

create policy "routine_sets: owner can read"
  on public.routine_sets for select to authenticated
  using (public.owns_routine_exercise(routine_exercise_id));
create policy "routine_sets: owner can insert"
  on public.routine_sets for insert to authenticated
  with check (public.owns_routine_exercise(routine_exercise_id));
create policy "routine_sets: owner can update"
  on public.routine_sets for update to authenticated
  using (public.owns_routine_exercise(routine_exercise_id))
  with check (public.owns_routine_exercise(routine_exercise_id));
create policy "routine_sets: owner can delete"
  on public.routine_sets for delete to authenticated
  using (public.owns_routine_exercise(routine_exercise_id));

-- ─── Grants ─────────────────────────────────────────────────────────────────────────────────────

revoke all on public.routine_folders, public.routines, public.routine_exercises,
  public.routine_sets from anon, authenticated;
grant select, insert, update, delete on public.routine_folders, public.routines,
  public.routine_exercises, public.routine_sets to authenticated;

revoke execute on function public.save_routine(jsonb) from public, anon;
grant execute on function public.save_routine(jsonb) to authenticated;
revoke execute on function public.owns_routine(uuid), public.owns_routine_exercise(uuid),
  public.can_use_exercise(uuid) from public, anon;
grant execute on function public.owns_routine(uuid), public.owns_routine_exercise(uuid),
  public.can_use_exercise(uuid) to authenticated;
revoke execute on function public.routine_owned_protect_columns()
  from public, anon, authenticated;
