-- Phase 5: training plans. A plan is a schedule of days over 4–8 weeks; each day points at a
-- routine the generator wrote (routines.source = 'plan'). Described in docs/SCHEMA.md; the rules
-- that build plans are in docs/PLAN_ENGINE.md. The app keeps a local copy in SQLite and pushes
-- whole plans through save_plan().

-- ─── Types ──────────────────────────────────────────────────────────────────────────────────────

create type public.plan_status as enum ('active', 'completed', 'abandoned');
-- moved: still to do, on a different day from the one first planned (original_date keeps it).
create type public.plan_day_status as enum ('pending', 'done', 'missed', 'moved');

-- ─── plans ──────────────────────────────────────────────────────────────────────────────────────

create table public.plans (
  -- Client-supplied ids, so plans made offline sync idempotently.
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  name text not null
    constraint plans_name_length check (char_length(btrim(name)) between 1 and 60),
  goal public.primary_goal not null,
  -- The questionnaire answers plus the engine seed (src/lib/plans/engine/input.ts).
  settings jsonb not null default '{}'::jsonb
    constraint plans_settings_object check (jsonb_typeof(settings) = 'object'),
  start_date date not null,
  end_date date not null,
  status public.plan_status not null default 'active',
  -- Set while paused; resuming moves the open days later by the days paused.
  paused_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint plans_dates check (end_date >= start_date and end_date - start_date <= 120)
);

-- One active plan per user.
create unique index plans_one_active on public.plans (user_id) where status = 'active';
create index plans_user on public.plans (user_id, start_date desc);

comment on table public.plans is
  'Training plans. Owner-only. Written whole through save_plan(); one active plan per user.';

-- ─── plan_weeks ─────────────────────────────────────────────────────────────────────────────────

create table public.plan_weeks (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans (id) on delete cascade,
  week smallint not null constraint plan_weeks_week_range check (week between 1 and 12),
  -- The Monday the week starts on.
  starts_on date not null,
  -- The lighter last week of 6- and 8-week plans.
  deload boolean not null default false,
  constraint plan_weeks_unique unique (plan_id, week)
);

comment on table public.plan_weeks is 'Weeks of a plan. Readable and writable with the plan.';

-- ─── plan_days ──────────────────────────────────────────────────────────────────────────────────

create table public.plan_days (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans (id) on delete cascade,
  week smallint not null constraint plan_days_week_range check (week between 1 and 12),
  date date not null,
  original_date date not null,
  -- Which session template (e.g. UPPER_A); shared by the days of every week.
  template_key text not null
    constraint plan_days_template_length check (char_length(template_key) between 1 and 20),
  label text not null
    constraint plan_days_label_length check (char_length(btrim(label)) between 1 and 60),
  routine_id uuid references public.routines (id) on delete set null,
  status public.plan_day_status not null default 'pending',
  created_at timestamptz not null default now()
);

create index plan_days_plan on public.plan_days (plan_id, date);
create index plan_days_routine on public.plan_days (routine_id) where routine_id is not null;

comment on table public.plan_days is
  'Scheduled sessions of a plan. Readable and writable with the plan; the routine must be the '
  'caller''s.';

-- ─── Triggers ───────────────────────────────────────────────────────────────────────────────────

create trigger plans_protect_columns
  before update on public.plans
  for each row execute function public.routine_owned_protect_columns();
create trigger plans_updated_at
  before update on public.plans
  for each row execute function public.set_updated_at();

-- ─── Row level security ─────────────────────────────────────────────────────────────────────────

alter table public.plans enable row level security;
alter table public.plan_weeks enable row level security;
alter table public.plan_days enable row level security;

create policy "plans: owner can read"
  on public.plans for select to authenticated
  using (user_id = (select auth.uid()));
create policy "plans: owner can insert"
  on public.plans for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "plans: owner can update"
  on public.plans for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "plans: owner can delete"
  on public.plans for delete to authenticated
  using (user_id = (select auth.uid()));

create function public.owns_plan(p_plan_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select exists (
    select 1 from public.plans p
    where p.id = p_plan_id and p.user_id = (select auth.uid())
  );
$$;

create policy "plan_weeks: owner can read"
  on public.plan_weeks for select to authenticated
  using (public.owns_plan(plan_id));
create policy "plan_weeks: owner can insert"
  on public.plan_weeks for insert to authenticated
  with check (public.owns_plan(plan_id));
create policy "plan_weeks: owner can update"
  on public.plan_weeks for update to authenticated
  using (public.owns_plan(plan_id))
  with check (public.owns_plan(plan_id));
create policy "plan_weeks: owner can delete"
  on public.plan_weeks for delete to authenticated
  using (public.owns_plan(plan_id));

create policy "plan_days: owner can read"
  on public.plan_days for select to authenticated
  using (public.owns_plan(plan_id));
create policy "plan_days: owner can insert"
  on public.plan_days for insert to authenticated
  with check (
    public.owns_plan(plan_id) and (routine_id is null or public.owns_routine(routine_id))
  );
create policy "plan_days: owner can update"
  on public.plan_days for update to authenticated
  using (public.owns_plan(plan_id))
  with check (
    public.owns_plan(plan_id) and (routine_id is null or public.owns_routine(routine_id))
  );
create policy "plan_days: owner can delete"
  on public.plan_days for delete to authenticated
  using (public.owns_plan(plan_id));

-- ─── save_plan ──────────────────────────────────────────────────────────────────────────────────

-- Saves a whole plan (snake_case JSON: the plan columns plus `weeks` and `days`) in one
-- transaction: upserts with the client's ids, deletes weeks and days no longer present, and returns
-- the new updated_at. Saving an active plan ends any other active plan of the caller (abandoned),
-- so a new plan made offline never trips the one-active rule. Runs as the caller: RLS applies.
create function public.save_plan(p jsonb)
returns timestamptz
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid := (p ->> 'id')::uuid;
  v_status public.plan_status := coalesce((p ->> 'status')::public.plan_status, 'active');
  v_weeks jsonb := coalesce(p -> 'weeks', '[]'::jsonb);
  v_days jsonb := coalesce(p -> 'days', '[]'::jsonb);
  v_updated timestamptz;
begin
  if v_uid is null then
    raise exception 'Sign in to save plans.' using errcode = '42501';
  end if;
  if v_id is null then
    raise exception 'A plan needs an id.' using errcode = '22023';
  end if;
  if jsonb_typeof(v_weeks) <> 'array' or jsonb_array_length(v_weeks) > 12 then
    raise exception '12 weeks per plan at most.' using errcode = '22023';
  end if;
  if jsonb_typeof(v_days) <> 'array' or jsonb_array_length(v_days) > 100 then
    raise exception '100 sessions per plan at most.' using errcode = '22023';
  end if;

  if v_status = 'active' then
    update public.plans
    set status = 'abandoned'
    where user_id = v_uid and status = 'active' and id <> v_id;
  end if;

  insert into public.plans as pl (
    id, user_id, name, goal, settings, start_date, end_date, status, paused_at
  )
  values (
    v_id,
    v_uid,
    p ->> 'name',
    (p ->> 'goal')::public.primary_goal,
    coalesce(p -> 'settings', '{}'::jsonb),
    (p ->> 'start_date')::date,
    (p ->> 'end_date')::date,
    v_status,
    (p ->> 'paused_at')::timestamptz
  )
  on conflict (id) do update set
    name = excluded.name,
    goal = excluded.goal,
    settings = excluded.settings,
    start_date = excluded.start_date,
    end_date = excluded.end_date,
    status = excluded.status,
    paused_at = excluded.paused_at,
    -- Bumps updated_at through the trigger even when only children change.
    updated_at = now()
  returning pl.updated_at into v_updated;

  delete from public.plan_weeks w
  where w.plan_id = v_id
    and w.id not in (select (x ->> 'id')::uuid from jsonb_array_elements(v_weeks) x);

  insert into public.plan_weeks as w (id, plan_id, week, starts_on, deload)
  select
    (x ->> 'id')::uuid,
    v_id,
    (x ->> 'week')::smallint,
    (x ->> 'starts_on')::date,
    coalesce((x ->> 'deload')::boolean, false)
  from jsonb_array_elements(v_weeks) x
  on conflict (id) do update set
    plan_id = excluded.plan_id,
    week = excluded.week,
    starts_on = excluded.starts_on,
    deload = excluded.deload;

  delete from public.plan_days d
  where d.plan_id = v_id
    and d.id not in (select (x ->> 'id')::uuid from jsonb_array_elements(v_days) x);

  insert into public.plan_days as d (
    id, plan_id, week, date, original_date, template_key, label, routine_id, status
  )
  select
    (x ->> 'id')::uuid,
    v_id,
    (x ->> 'week')::smallint,
    (x ->> 'date')::date,
    coalesce((x ->> 'original_date')::date, (x ->> 'date')::date),
    x ->> 'template_key',
    x ->> 'label',
    (x ->> 'routine_id')::uuid,
    coalesce((x ->> 'status')::public.plan_day_status, 'pending')
  from jsonb_array_elements(v_days) x
  on conflict (id) do update set
    plan_id = excluded.plan_id,
    week = excluded.week,
    date = excluded.date,
    original_date = excluded.original_date,
    template_key = excluded.template_key,
    label = excluded.label,
    routine_id = excluded.routine_id,
    -- A day the server already marked done (a workout arrived first) stays done.
    status = case when d.status = 'done' then d.status else excluded.status end;

  return v_updated;
end;
$$;

-- ─── Workouts → plan days ───────────────────────────────────────────────────────────────────────

-- workouts.plan_day_id has no foreign key: a workout logged offline can reach the server before
-- its plan does. A plan day that belongs to someone else is dropped before the row is written.
create function public.workouts_check_plan_day()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.plan_day_id is not null and exists (
    select 1 from public.plan_days d
    join public.plans p on p.id = d.plan_id
    where d.id = new.plan_day_id and p.user_id <> new.user_id
  ) then
    new.plan_day_id := null;
  end if;
  return new;
end;
$$;

create trigger workouts_check_plan_day
  before insert or update of plan_day_id on public.workouts
  for each row execute function public.workouts_check_plan_day();

-- A completed workout marks its plan day done.
create function public.workouts_mark_plan_day()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'completed' and new.plan_day_id is not null then
    update public.plan_days d
    set status = 'done'
    from public.plans p
    where d.id = new.plan_day_id and p.id = d.plan_id and p.user_id = new.user_id
      and d.status <> 'done';
  end if;
  return null;
end;
$$;

create trigger workouts_mark_plan_day
  after insert or update of status, plan_day_id on public.workouts
  for each row execute function public.workouts_mark_plan_day();

-- ─── Grants ─────────────────────────────────────────────────────────────────────────────────────

revoke all on public.plans, public.plan_weeks, public.plan_days from anon, authenticated;
grant select, insert, update, delete on public.plans, public.plan_weeks, public.plan_days
  to authenticated;

revoke execute on function public.save_plan(jsonb) from public, anon;
grant execute on function public.save_plan(jsonb) to authenticated;
revoke execute on function public.owns_plan(uuid) from public, anon;
grant execute on function public.owns_plan(uuid) to authenticated;
revoke execute on function public.workouts_check_plan_day(), public.workouts_mark_plan_day()
  from public, anon, authenticated;
