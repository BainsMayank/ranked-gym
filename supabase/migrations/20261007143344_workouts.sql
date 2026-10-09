-- Phase 4: logged workouts (sessions, their exercises and sets), edit history and workout photos.
-- Described in docs/SCHEMA.md. The app logs into SQLite first and pushes whole workouts through
-- save_workout(), which is the only way to write them:
--
-- - Ids are client-generated, so a replayed push never creates a second row.
-- - In-progress and discarded drafts: the push with the latest client_updated_at wins.
-- - Completed workouts are immutable. Only an explicit edit changes one, and it first snapshots the
--   old version into workout_revisions (append-only).
-- - Duration, volume and the calorie estimate are computed here; the client only previews them.
--   is_pr is filled by the rank engine (Phase 6) and can't be written by clients.

-- ─── Types ──────────────────────────────────────────────────────────────────────────────────────

-- Same list as src/lib/workouts/taxonomy.ts (a test keeps them in sync).
create type public.workout_status as enum ('in_progress', 'completed', 'discarded');

-- ─── workouts ───────────────────────────────────────────────────────────────────────────────────

create table public.workouts (
  -- Client-supplied ids, so a workout logged offline syncs exactly once.
  id uuid primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  -- The routine it started from (null for empty and generated workouts, or once deleted).
  routine_id uuid references public.routines (id) on delete set null,
  -- Phase 5 plan day; no foreign key until plans exist.
  plan_day_id uuid,
  name text not null
    constraint workouts_name_length check (char_length(btrim(name)) between 1 and 60),
  started_at timestamptz not null,
  ended_at timestamptz,
  -- Server-computed from started_at/ended_at once completed.
  duration_sec integer
    constraint workouts_duration_range check (duration_sec between 0 and 86400),
  notes text constraint workouts_notes_length check (char_length(notes) <= 1000),
  perceived_effort smallint
    constraint workouts_effort_range check (perceived_effort between 1 and 10),
  -- Bodyweight on the day (snapshot from the latest weigh-in), kg.
  bodyweight_kg numeric(5, 2)
    constraint workouts_bodyweight_range check (bodyweight_kg between 20 and 400),
  -- Server-computed: MET x bodyweight x hours. An estimate, labelled as one in the app.
  calories_est integer constraint workouts_calories_range check (calories_est >= 0),
  -- Server-computed: weight x reps over completed working sets.
  total_volume_kg numeric(10, 2) not null default 0,
  visibility public.profile_visibility not null default 'friends',
  status public.workout_status not null default 'in_progress',
  -- The device's clock at its last change: the version used for "latest draft wins".
  client_updated_at timestamptz not null,
  -- Bumped by each edit of a completed workout.
  revision integer not null default 0,
  -- Storage object path in the workout-photos bucket (<user id>/<workout id>.jpg).
  photo_path text constraint workouts_photo_path_length check (char_length(photo_path) <= 200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workouts_ended_after_start check (ended_at is null or ended_at >= started_at),
  constraint workouts_completed_has_end check (status <> 'completed' or ended_at is not null)
);

create index workouts_user_started on public.workouts (user_id, started_at desc);

comment on table public.workouts is
  'Logged workouts. Owner-only. Written only through save_workout(); deletable by the owner.';

-- ─── workout_exercises ──────────────────────────────────────────────────────────────────────────

create table public.workout_exercises (
  id uuid primary key,
  workout_id uuid not null references public.workouts (id) on delete cascade,
  -- Restrict: a custom exercise with logged sets can't be deleted.
  exercise_id uuid not null references public.exercises (id) on delete restrict,
  sort_order integer not null default 0,
  superset_group smallint
    constraint workout_exercises_superset_range check (superset_group between 1 and 100),
  rest_seconds integer not null default 90
    constraint workout_exercises_rest_range check (rest_seconds between 0 and 900),
  rest_after_superset_seconds integer
    constraint workout_exercises_round_rest_range
      check (rest_after_superset_seconds between 0 and 900),
  notes text constraint workout_exercises_notes_length check (char_length(notes) <= 500)
);

create index workout_exercises_workout on public.workout_exercises (workout_id, sort_order);
-- Exercise history (every time you did this exercise).
create index workout_exercises_exercise on public.workout_exercises (exercise_id);

comment on table public.workout_exercises is
  'Exercises in a logged workout, in order. Readable with the parent workout.';

-- ─── workout_sets ───────────────────────────────────────────────────────────────────────────────

create table public.workout_sets (
  id uuid primary key,
  workout_exercise_id uuid not null references public.workout_exercises (id) on delete cascade,
  sort_order integer not null default 0,
  set_type public.set_type not null default 'working',
  -- How weight_kg is read: bar/stack weight, added load on bodyweight, or assistance.
  weight_mode public.weight_mode not null default 'absolute',
  -- Targets (copied from the routine, all optional).
  target_type public.target_type,
  target_reps smallint constraint workout_sets_target_reps_range check (target_reps between 1 and 100),
  target_reps_min smallint
    constraint workout_sets_target_reps_min_range check (target_reps_min between 1 and 100),
  target_reps_max smallint
    constraint workout_sets_target_reps_max_range check (target_reps_max between 1 and 100),
  target_duration_sec integer
    constraint workout_sets_target_duration_range check (target_duration_sec between 1 and 7200),
  target_distance_m integer
    constraint workout_sets_target_distance_range check (target_distance_m between 1 and 100000),
  target_weight_kg numeric(6, 2)
    constraint workout_sets_target_weight_range check (target_weight_kg between 0 and 1000),
  target_rir smallint constraint workout_sets_target_rir_range check (target_rir between 0 and 5),
  target_rpe numeric(3, 1)
    constraint workout_sets_target_rpe_range check (target_rpe between 5 and 10),
  tempo text constraint workout_sets_tempo_format check (tempo ~ '^[0-9X]-[0-9X]-[0-9X]-[0-9X]$'),
  -- What was actually done.
  reps smallint constraint workout_sets_reps_range check (reps between 0 and 500),
  weight_kg numeric(6, 2) constraint workout_sets_weight_range check (weight_kg between 0 and 1000),
  duration_sec integer constraint workout_sets_duration_range check (duration_sec between 0 and 86400),
  distance_m integer constraint workout_sets_distance_range check (distance_m between 0 and 1000000),
  rir smallint constraint workout_sets_rir_range check (rir between 0 and 10),
  rpe numeric(3, 1)
    constraint workout_sets_rpe_range check (rpe between 1 and 10 and rpe * 2 = trunc(rpe * 2)),
  completed boolean not null default false,
  completed_at timestamptz,
  -- The set was attempted and missed (still counts as done, flagged for history and ranks).
  failed boolean not null default false,
  -- Filled by the rank engine (Phase 6). Clients can't write it.
  is_pr boolean not null default false
);

create index workout_sets_exercise on public.workout_sets (workout_exercise_id, sort_order);

comment on table public.workout_sets is
  'Sets of a logged exercise: targets plus what was done. Readable with the parent workout.';

-- ─── workout_revisions ──────────────────────────────────────────────────────────────────────────

create table public.workout_revisions (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references public.workouts (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  -- The revision number the snapshot had (0 = as first completed).
  revision integer not null,
  -- The whole workout before the edit (same shape as the save_workout payload).
  snapshot jsonb not null,
  created_at timestamptz not null default now(),
  constraint workout_revisions_unique unique (workout_id, revision)
);

comment on table public.workout_revisions is
  'Append-only history of edits to completed workouts (anti-cheat and undo). Owner can read.';

-- ─── Triggers ───────────────────────────────────────────────────────────────────────────────────

create trigger workouts_updated_at
  before update on public.workouts
  for each row execute function public.set_updated_at();

-- ─── Helpers ────────────────────────────────────────────────────────────────────────────────────

-- A workout as JSON in the save_workout payload shape (for revisions).
create function public.workout_snapshot(p_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select to_jsonb(w) - 'user_id' || jsonb_build_object(
    'exercises', coalesce((
      select jsonb_agg(to_jsonb(we) - 'workout_id' || jsonb_build_object(
        'sets', coalesce((
          select jsonb_agg(to_jsonb(s) - 'workout_exercise_id' order by s.sort_order)
          from public.workout_sets s where s.workout_exercise_id = we.id
        ), '[]'::jsonb)
      ) order by we.sort_order)
      from public.workout_exercises we where we.workout_id = w.id
    ), '[]'::jsonb)
  )
  from public.workouts w
  where w.id = p_id;
$$;

-- Duration, volume and calories from the stored rows. Mirrored by src/lib/workouts/summary.ts and
-- calories.ts (keep them in step).
create function public.refresh_workout_totals(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_w public.workouts;
  v_duration integer;
  v_volume numeric;
  v_met numeric;
begin
  select * into v_w from public.workouts where id = p_id;
  if v_w.id is null then
    return;
  end if;

  v_duration := case
    when v_w.status = 'completed' and v_w.ended_at is not null
      then least(86400, floor(extract(epoch from v_w.ended_at - v_w.started_at)))::integer
  end;

  -- Completed working sets only (warm-ups never count). Assisted sets lift less than bodyweight
  -- and carry no added load, so they add no volume.
  select coalesce(sum(s.weight_kg * s.reps), 0) into v_volume
  from public.workout_sets s
  join public.workout_exercises we on we.id = s.workout_exercise_id
  where we.workout_id = p_id
    and s.completed
    and s.set_type <> 'warmup'
    and s.weight_mode in ('absolute', 'bodyweight')
    and s.weight_kg is not null
    and s.reps is not null;

  -- MET weighted by each exercise's completed working sets.
  select sum(e.met_value * n.sets) / nullif(sum(n.sets), 0) into v_met
  from (
    select we.exercise_id, count(*) filter (where s.completed and s.set_type <> 'warmup') as sets
    from public.workout_exercises we
    join public.workout_sets s on s.workout_exercise_id = we.id
    where we.workout_id = p_id
    group by we.exercise_id
  ) n
  join public.exercises e on e.id = n.exercise_id;

  update public.workouts set
    duration_sec = v_duration,
    total_volume_kg = round(v_volume, 2),
    calories_est = case
      when v_duration is not null and v_met is not null and v_w.bodyweight_kg is not null
        then round(v_met * v_w.bodyweight_kg * v_duration / 3600.0)::integer
    end
  where id = p_id;
end;
$$;

-- ─── save_workout ───────────────────────────────────────────────────────────────────────────────

-- Saves a whole workout (snake_case JSON: the workout columns plus `exercises`, each with `sets`;
-- order comes from array position). Returns { applied, revision, client_updated_at, status }.
-- `edit: true` is required to change a completed workout. Runs as the definer so it can enforce
-- the rules above on tables clients can't write; it checks ownership itself.
create function public.save_workout(p jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid := (p ->> 'id')::uuid;
  v_exercises jsonb := coalesce(p -> 'exercises', '[]'::jsonb);
  v_status public.workout_status := coalesce((p ->> 'status')::public.workout_status, 'in_progress');
  v_client timestamptz := (p ->> 'client_updated_at')::timestamptz;
  v_edit boolean := coalesce((p ->> 'edit')::boolean, false);
  v_routine uuid := (p ->> 'routine_id')::uuid;
  v_old public.workouts;
  v_revision integer := 0;
begin
  if v_uid is null then
    raise exception 'Sign in to save workouts.' using errcode = '42501';
  end if;
  if v_id is null or v_client is null then
    raise exception 'A workout needs an id and client_updated_at.' using errcode = '22023';
  end if;
  if jsonb_typeof(v_exercises) <> 'array' or jsonb_array_length(v_exercises) > 40 then
    raise exception '40 exercises per workout at most.' using errcode = '22023';
  end if;
  if exists (
    select 1 from jsonb_array_elements(v_exercises) e
    where jsonb_array_length(coalesce(e -> 'sets', '[]'::jsonb)) > 30
  ) then
    raise exception '30 sets per exercise at most.' using errcode = '22023';
  end if;
  if (p ->> 'started_at')::timestamptz > now() + interval '10 minutes' then
    raise exception 'A workout can''t start in the future.' using errcode = '22023';
  end if;

  select * into v_old from public.workouts where id = v_id for update;

  if v_old.id is not null then
    if v_old.user_id <> v_uid then
      raise exception 'Not your workout.' using errcode = '42501';
    end if;
    -- Replays and stale pushes change nothing (latest client_updated_at wins).
    if v_client <= v_old.client_updated_at then
      return jsonb_build_object('applied', false, 'revision', v_old.revision,
        'client_updated_at', v_old.client_updated_at, 'status', v_old.status);
    end if;
    if v_old.status = 'completed' then
      if not v_edit then
        return jsonb_build_object('applied', false, 'revision', v_old.revision,
          'client_updated_at', v_old.client_updated_at, 'status', v_old.status);
      end if;
      if v_status <> 'completed' then
        raise exception 'A finished workout can only be edited or deleted.' using errcode = '22023';
      end if;
      insert into public.workout_revisions (workout_id, user_id, revision, snapshot)
      values (v_id, v_uid, v_old.revision, public.workout_snapshot(v_id));
      v_revision := v_old.revision + 1;
    end if;
  end if;

  -- Children must not belong to another workout (ids are client-supplied).
  if exists (
    select 1 from public.workout_exercises we
    where we.workout_id <> v_id
      and we.id in (select (e ->> 'id')::uuid from jsonb_array_elements(v_exercises) e)
  ) or exists (
    select 1 from public.workout_sets s
    join public.workout_exercises we on we.id = s.workout_exercise_id
    where we.workout_id <> v_id
      and s.id in (
        select (st ->> 'id')::uuid
        from jsonb_array_elements(v_exercises) e,
          jsonb_array_elements(coalesce(e -> 'sets', '[]'::jsonb)) st
      )
  ) then
    raise exception 'Those ids are already in use.' using errcode = '42501';
  end if;

  -- Only official exercises and the caller's own custom ones.
  if exists (
    select 1 from jsonb_array_elements(v_exercises) e
    left join public.exercises x on x.id = (e ->> 'exercise_id')::uuid
    where x.id is null or (x.created_by is not null and x.created_by <> v_uid)
  ) then
    raise exception 'Unknown exercise.' using errcode = '42501';
  end if;

  -- A routine reference that isn't the caller's (or no longer exists) is dropped, not fatal.
  if v_routine is not null and not exists (
    select 1 from public.routines r where r.id = v_routine and r.user_id = v_uid
  ) then
    v_routine := null;
  end if;

  insert into public.workouts as w (
    id, user_id, routine_id, plan_day_id, name, started_at, ended_at, notes, perceived_effort,
    bodyweight_kg, visibility, status, client_updated_at, revision
  )
  values (
    v_id,
    v_uid,
    v_routine,
    (p ->> 'plan_day_id')::uuid,
    p ->> 'name',
    (p ->> 'started_at')::timestamptz,
    (p ->> 'ended_at')::timestamptz,
    p ->> 'notes',
    (p ->> 'perceived_effort')::smallint,
    (p ->> 'bodyweight_kg')::numeric,
    coalesce((p ->> 'visibility')::public.profile_visibility, 'friends'),
    v_status,
    v_client,
    v_revision
  )
  on conflict (id) do update set
    routine_id = excluded.routine_id,
    plan_day_id = excluded.plan_day_id,
    name = excluded.name,
    started_at = excluded.started_at,
    ended_at = excluded.ended_at,
    notes = excluded.notes,
    perceived_effort = excluded.perceived_effort,
    bodyweight_kg = excluded.bodyweight_kg,
    visibility = excluded.visibility,
    status = excluded.status,
    client_updated_at = excluded.client_updated_at,
    revision = excluded.revision;

  delete from public.workout_exercises we
  where we.workout_id = v_id
    and we.id not in (select (e ->> 'id')::uuid from jsonb_array_elements(v_exercises) e);

  insert into public.workout_exercises as we (
    id, workout_id, exercise_id, sort_order, superset_group, rest_seconds,
    rest_after_superset_seconds, notes
  )
  select
    (e ->> 'id')::uuid,
    v_id,
    (e ->> 'exercise_id')::uuid,
    n::integer - 1,
    (e ->> 'superset_group')::smallint,
    coalesce((e ->> 'rest_seconds')::integer, 90),
    (e ->> 'rest_after_superset_seconds')::integer,
    e ->> 'notes'
  from jsonb_array_elements(v_exercises) with ordinality as x(e, n)
  on conflict (id) do update set
    exercise_id = excluded.exercise_id,
    sort_order = excluded.sort_order,
    superset_group = excluded.superset_group,
    rest_seconds = excluded.rest_seconds,
    rest_after_superset_seconds = excluded.rest_after_superset_seconds,
    notes = excluded.notes;

  delete from public.workout_sets s
  using public.workout_exercises we
  where s.workout_exercise_id = we.id
    and we.workout_id = v_id
    and s.id not in (
      select (st ->> 'id')::uuid
      from jsonb_array_elements(v_exercises) e,
        jsonb_array_elements(coalesce(e -> 'sets', '[]'::jsonb)) st
    );

  insert into public.workout_sets as s (
    id, workout_exercise_id, sort_order, set_type, weight_mode, target_type, target_reps,
    target_reps_min, target_reps_max, target_duration_sec, target_distance_m, target_weight_kg,
    target_rir, target_rpe, tempo, reps, weight_kg, duration_sec, distance_m, rir, rpe, completed,
    completed_at, failed
  )
  select
    (st ->> 'id')::uuid,
    (e ->> 'id')::uuid,
    sn::integer - 1,
    coalesce((st ->> 'set_type')::public.set_type, 'working'),
    coalesce((st ->> 'weight_mode')::public.weight_mode, 'absolute'),
    (st ->> 'target_type')::public.target_type,
    (st ->> 'target_reps')::smallint,
    (st ->> 'target_reps_min')::smallint,
    (st ->> 'target_reps_max')::smallint,
    (st ->> 'target_duration_sec')::integer,
    (st ->> 'target_distance_m')::integer,
    (st ->> 'target_weight_kg')::numeric,
    (st ->> 'target_rir')::smallint,
    (st ->> 'target_rpe')::numeric,
    st ->> 'tempo',
    (st ->> 'reps')::smallint,
    (st ->> 'weight_kg')::numeric,
    (st ->> 'duration_sec')::integer,
    (st ->> 'distance_m')::integer,
    (st ->> 'rir')::smallint,
    (st ->> 'rpe')::numeric,
    coalesce((st ->> 'completed')::boolean, false),
    (st ->> 'completed_at')::timestamptz,
    coalesce((st ->> 'failed')::boolean, false)
  from jsonb_array_elements(v_exercises) e,
    jsonb_array_elements(coalesce(e -> 'sets', '[]'::jsonb)) with ordinality as y(st, sn)
  on conflict (id) do update set
    workout_exercise_id = excluded.workout_exercise_id,
    sort_order = excluded.sort_order,
    set_type = excluded.set_type,
    weight_mode = excluded.weight_mode,
    target_type = excluded.target_type,
    target_reps = excluded.target_reps,
    target_reps_min = excluded.target_reps_min,
    target_reps_max = excluded.target_reps_max,
    target_duration_sec = excluded.target_duration_sec,
    target_distance_m = excluded.target_distance_m,
    target_weight_kg = excluded.target_weight_kg,
    target_rir = excluded.target_rir,
    target_rpe = excluded.target_rpe,
    tempo = excluded.tempo,
    reps = excluded.reps,
    weight_kg = excluded.weight_kg,
    duration_sec = excluded.duration_sec,
    distance_m = excluded.distance_m,
    rir = excluded.rir,
    rpe = excluded.rpe,
    completed = excluded.completed,
    completed_at = excluded.completed_at,
    failed = excluded.failed;

  perform public.refresh_workout_totals(v_id);

  return jsonb_build_object('applied', true, 'revision', v_revision,
    'client_updated_at', v_client, 'status', v_status);
end;
$$;

-- Attaches (or clears) the workout's photo once it's uploaded. Not an edit of the workout itself,
-- so it's allowed on completed workouts. The path must sit in the caller's own folder.
create function public.set_workout_photo(p_id uuid, p_path text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Sign in first.' using errcode = '42501';
  end if;
  if p_path is not null and split_part(p_path, '/', 1) <> v_uid::text then
    raise exception 'Photos go in your own folder.' using errcode = '42501';
  end if;
  update public.workouts set photo_path = p_path where id = p_id and user_id = v_uid;
  if not found then
    raise exception 'Workout not found.' using errcode = 'P0002';
  end if;
end;
$$;

-- ─── Row level security ─────────────────────────────────────────────────────────────────────────

alter table public.workouts enable row level security;
alter table public.workout_exercises enable row level security;
alter table public.workout_sets enable row level security;
alter table public.workout_revisions enable row level security;

-- Clients only read and delete; every write goes through save_workout().
create policy "workouts: owner can read"
  on public.workouts for select to authenticated
  using (user_id = (select auth.uid()));
create policy "workouts: owner can delete"
  on public.workouts for delete to authenticated
  using (user_id = (select auth.uid()));

create function public.owns_workout(p_workout_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select exists (
    select 1 from public.workouts w
    where w.id = p_workout_id and w.user_id = (select auth.uid())
  );
$$;

create policy "workout_exercises: owner can read"
  on public.workout_exercises for select to authenticated
  using (public.owns_workout(workout_id));

create policy "workout_sets: owner can read"
  on public.workout_sets for select to authenticated
  using (exists (
    select 1 from public.workout_exercises we
    where we.id = workout_exercise_id and public.owns_workout(we.workout_id)
  ));

create policy "workout_revisions: owner can read"
  on public.workout_revisions for select to authenticated
  using (user_id = (select auth.uid()));

-- ─── Grants ─────────────────────────────────────────────────────────────────────────────────────

revoke all on public.workouts, public.workout_exercises, public.workout_sets,
  public.workout_revisions from anon, authenticated;
grant select, delete on public.workouts to authenticated;
grant select on public.workout_exercises, public.workout_sets, public.workout_revisions
  to authenticated;

revoke execute on function public.save_workout(jsonb), public.set_workout_photo(uuid, text),
  public.owns_workout(uuid) from public, anon;
grant execute on function public.save_workout(jsonb), public.set_workout_photo(uuid, text),
  public.owns_workout(uuid) to authenticated;
revoke execute on function public.workout_snapshot(uuid), public.refresh_workout_totals(uuid)
  from public, anon, authenticated;

-- ─── Storage: workout photos ────────────────────────────────────────────────────────────────────

-- Private bucket; each user writes only inside their own folder (<user id>/<workout id>.jpg).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('workout-photos', 'workout-photos', false, 5242880, array['image/jpeg', 'image/png'])
on conflict (id) do nothing;

create policy "workout-photos: owner can read"
  on storage.objects for select to authenticated
  using (bucket_id = 'workout-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "workout-photos: owner can upload"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'workout-photos' and (storage.foldername(name))[1] = (select auth.uid())::text
  );
create policy "workout-photos: owner can replace"
  on storage.objects for update to authenticated
  using (bucket_id = 'workout-photos' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (
    bucket_id = 'workout-photos' and (storage.foldername(name))[1] = (select auth.uid())::text
  );
create policy "workout-photos: owner can delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'workout-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
