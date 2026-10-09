-- Phase 6: the rank engine, personal records and rank history. Rules in docs/RANK_SYSTEM.md;
-- tables in docs/SCHEMA.md. Everything here is server-trusted: clients read their own ranks and
-- records but never write them.
--
-- - Standards, thresholds and settings live in tables, so ranks can be rebalanced with a migration
--   (`pnpm standards:build`) instead of an app update. Changing them queues every user for a
--   recompute, processed by pg_cron.
-- - rank_recompute_user() rebuilds one user's ranks and records from their sets. It's deterministic,
--   so edits and deletes are handled by simply running it again. save_workout() runs it when a
--   workout completes (or a finished one is edited) and returns the rewards to the app.
-- - The TypeScript mirror in src/lib/game/engine follows the same rules; a generated pgTAP test
--   (08_rank_distribution) checks the two agree on 50 fake lifters.

create extension if not exists pg_cron with schema pg_catalog;

-- ─── Types ──────────────────────────────────────────────────────────────────────────────────────

create type public.rank_tier as enum
  ('iron', 'bronze', 'silver', 'gold', 'platinum', 'diamond', 'master', 'champion');
create type public.rank_scope as enum
  ('lift', 'muscle', 'region', 'overall', 'weightlifting', 'calisthenics');
create type public.rank_discipline as enum ('weightlifting', 'calisthenics');
create type public.standard_metric as enum ('e1rm_ratio', 'reps', 'hold_seconds');
create type public.rank_status as enum ('ranked', 'placement');
create type public.rank_event_kind as enum ('placed', 'rank_up', 'rank_down');
create type public.pr_kind as enum
  ('e1rm', 'weight', 'reps_at_weight', 'set_volume', 'session_volume', 'hold');
create type public.rank_flag_reason as enum
  ('reps_over_limit', 'e1rm_over_limit', 'hold_over_limit');
create type public.rank_flag_status as enum ('pending', 'approved', 'rejected');

-- ─── Configuration (written only by migrations) ─────────────────────────────────────────────────

create table public.rank_settings (
  id boolean primary key default true constraint rank_settings_single check (id),
  -- 0 until the first standards migration runs.
  active_standards_version integer not null default 0,
  window_days integer not null default 180 check (window_days between 1 and 3650),
  inactive_days integer not null default 60 check (inactive_days between 1 and 3650),
  placement_lifts integer not null default 5 check (placement_lifts between 1 and 50),
  placement_regions integer not null default 4 check (placement_regions between 1 and 6),
  discipline_min_lifts integer not null default 3 check (discipline_min_lifts between 1 and 50),
  bw_window_days integer not null default 30 check (bw_window_days between 1 and 365),
  max_score numeric(6, 2) not null default 1000 check (max_score > 0),
  updated_at timestamptz not null default now()
);
insert into public.rank_settings default values;

comment on table public.rank_settings is
  'One row of rank engine settings. Any change queues every lifter for a recompute.';

create table public.rank_thresholds (
  version integer not null,
  tier public.rank_tier not null,
  -- 3 (lowest) … 1; null only for Champion.
  division smallint check (division between 1 and 3),
  min_score numeric(6, 2) not null check (min_score >= 0),
  primary key (version, min_score),
  constraint rank_thresholds_division_present check ((tier = 'champion') = (division is null)),
  constraint rank_thresholds_unique unique nulls not distinct (version, tier, division)
);

comment on table public.rank_thresholds is
  'Where each tier and division starts on the 0–1000 Rank Score, per standards version.';

create table public.rank_region_weights (
  region public.muscle_region primary key,
  weight numeric(4, 3) not null check (weight >= 0 and weight <= 1)
);

create table public.strength_age_brackets (
  min_age smallint primary key check (min_age >= 0),
  -- Inclusive; null for the last bracket.
  max_age smallint check (max_age >= min_age),
  factor numeric(4, 3) not null check (factor > 0 and factor < 3)
);

comment on table public.strength_age_brackets is
  'Age multipliers on the measured value (e1RM, reps, seconds). 18–34 is 1.';

create table public.rank_lifts (
  rank_key text primary key,
  name text not null,
  discipline public.rank_discipline not null,
  -- Guardrails: sets beyond these are flagged for review instead of scoring.
  max_ratio numeric(4, 2) check (max_ratio > 0),
  max_reps integer check (max_reps > 0),
  max_hold_sec integer check (max_hold_sec > 0)
);

comment on table public.rank_lifts is
  'Every rank key: its discipline and the limits that flag impossible-looking sets.';

-- Skill progressions (tuck front lever …) that rank into their parent skill.
create table public.rank_variants (
  slug text primary key,
  rank_key text not null references public.rank_lifts (rank_key) on delete cascade
);

create table public.strength_standards (
  id bigint generated always as identity primary key,
  version integer not null,
  rank_key text not null,
  -- '' for the lift itself; the progression's slug for a skill variant.
  variant text not null default '',
  sex public.sex_for_standards not null
    constraint strength_standards_sex check (sex <> 'unspecified'),
  bw_min numeric(5, 1) not null,
  bw_max numeric(5, 1) not null,
  metric public.standard_metric not null,
  anchor_scores numeric[] not null,
  anchor_values numeric[] not null,
  max_score numeric(6, 2) not null default 1000,
  constraint strength_standards_band check (bw_min < bw_max),
  constraint strength_standards_anchors check (
    cardinality(anchor_scores) between 1 and 12
    and cardinality(anchor_scores) = cardinality(anchor_values)
  ),
  constraint strength_standards_unique unique (version, rank_key, variant, metric, sex, bw_min)
);

create index strength_standards_lookup
  on public.strength_standards (version, rank_key, variant, metric, sex, bw_min);

comment on table public.strength_standards is
  'The metric value needed at each Rank Score anchor, per lift, sex and bodyweight band.';

-- ─── Per-user results (written only by the engine) ──────────────────────────────────────────────

create table public.ranks_current (
  user_id uuid not null references public.profiles (id) on delete cascade,
  scope public.rank_scope not null,
  -- Rank key, muscle, region, or the scope name for overall and disciplines.
  key text not null,
  score numeric(6, 2),
  tier public.rank_tier,
  division smallint,
  status public.rank_status not null,
  best_set_id uuid references public.workout_sets (id) on delete set null,
  last_set_at timestamptz,
  -- Placement progress for overall and disciplines.
  details jsonb,
  standards_version integer not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, scope, key)
);

comment on table public.ranks_current is 'Each lifter''s ranks right now. Owner can read.';

create table public.rank_snapshots (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  scope public.rank_scope not null,
  key text not null,
  score numeric(6, 2) not null,
  tier public.rank_tier not null,
  division smallint,
  standards_version integer not null,
  taken_at timestamptz not null default now()
);

create index rank_snapshots_history on public.rank_snapshots (user_id, scope, key, taken_at);

comment on table public.rank_snapshots is
  'Rank history: a row whenever a score changes (by 0.1 or more). Owner can read.';

create table public.rank_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  scope public.rank_scope not null,
  key text not null,
  kind public.rank_event_kind not null,
  from_tier public.rank_tier,
  from_division smallint,
  to_tier public.rank_tier not null,
  to_division smallint,
  score numeric(6, 2) not null,
  -- The workout whose save caused it (null for background recomputes).
  workout_id uuid references public.workouts (id) on delete set null,
  created_at timestamptz not null default now()
);

create index rank_events_user on public.rank_events (user_id, created_at desc);
create index rank_events_workout on public.rank_events (workout_id);

comment on table public.rank_events is 'First ranks, rank-ups and rank-downs. Owner can read.';

create table public.personal_records (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id) on delete cascade,
  kind public.pr_kind not null,
  -- The load for reps_at_weight (0 = bodyweight); null for the other kinds.
  weight_kg numeric(6, 2),
  value numeric(10, 2) not null,
  -- The record it beat; null for a baseline (the first time), which isn't celebrated.
  previous_value numeric(10, 2),
  workout_id uuid not null references public.workouts (id) on delete cascade,
  -- Null for session volume.
  workout_set_id uuid references public.workout_sets (id) on delete cascade,
  achieved_at timestamptz not null
);

create index personal_records_exercise on public.personal_records (user_id, exercise_id, kind);
create index personal_records_workout on public.personal_records (workout_id);

comment on table public.personal_records is
  'Record history per exercise (every record and baseline, in order). Rebuilt by the engine.';

create table public.rank_flags (
  workout_set_id uuid primary key references public.workout_sets (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  reason public.rank_flag_reason not null,
  -- Pending and rejected sets don't rank; approved ones do (review tools: Phase 13).
  status public.rank_flag_status not null default 'pending',
  created_at timestamptz not null default now()
);

create index rank_flags_user on public.rank_flags (user_id);

comment on table public.rank_flags is
  'Sets that look impossible, held back from ranks and records until reviewed. Owner can read.';

create table public.workout_rewards (
  workout_id uuid primary key references public.workouts (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  rewards jsonb not null,
  updated_at timestamptz not null default now()
);

comment on table public.workout_rewards is
  'What a workout earned (records, rank changes) as returned by save_workout. Owner can read.';

-- No foreign key: jobs are queued from triggers that may run while the profile is being deleted.
create table public.rank_jobs (
  user_id uuid primary key,
  reason text not null,
  queued_at timestamptz not null default now()
);

comment on table public.rank_jobs is 'Users waiting for a background recompute (pg_cron).';

-- ─── Pure maths (mirrored by src/lib/game/engine) ───────────────────────────────────────────────

-- e1RM ÷ load for a set of this many reps: the average of Epley and Brzycki (1 for a single).
create function public.rank_rep_factor(p_reps integer)
returns numeric
language sql
immutable
set search_path = ''
as $$
  select case when p_reps = 1 then 1::numeric
    else ((1 + p_reps / 30.0) + 36.0 / (37 - p_reps)) / 2 end;
$$;

-- Rank e1RM: 1 rep = the load; 2–10 reps = mean of Epley and Brzycki; otherwise null.
create function public.rank_e1rm(p_load numeric, p_reps integer)
returns numeric
language sql
immutable
set search_path = ''
as $$
  select case
    when p_load is null or p_reps is null or p_load <= 0 or p_reps < 1 or p_reps > 10 then null
    else p_load * public.rank_rep_factor(p_reps)
  end;
$$;

-- Piecewise-linear through (0, 0) and each (x, y); extends the last slope past the end.
create function public.rank_interp(p_x numeric, p_xs numeric[], p_ys numeric[])
returns numeric
language plpgsql
immutable
set search_path = ''
as $$
declare
  n integer := coalesce(cardinality(p_xs), 0);
  x0 numeric := 0;
  y0 numeric := 0;
  i integer;
begin
  if n = 0 or n <> coalesce(cardinality(p_ys), 0) then
    return 0;
  end if;
  if p_x is null or p_x <= 0 then
    return 0;
  end if;
  for i in 1..n loop
    if p_x <= p_xs[i] then
      return y0 + (p_x - x0) * (p_ys[i] - y0) / (p_xs[i] - x0);
    end if;
    if i < n then
      x0 := p_xs[i];
      y0 := p_ys[i];
    end if;
  end loop;
  return p_ys[n] + (p_x - p_xs[n]) * (p_ys[n] - y0) / (p_xs[n] - x0);
end;
$$;

-- Position on the ladder: Iron III = 0, +1 per division, Champion = 21.
create function public.rank_ordinal(p_tier public.rank_tier, p_division smallint)
returns integer
language sql
immutable
set search_path = ''
as $$
  select (array_position(enum_range(null::public.rank_tier), p_tier) - 1) * 3
    + case when p_tier = 'champion' or p_division is null then 0 else 3 - p_division end;
$$;

-- Tier and division for a score under a standards version's thresholds.
create function public.rank_tier_for(
  p_score numeric,
  p_version integer,
  out tier public.rank_tier,
  out division smallint
)
language sql
stable
set search_path = ''
as $$
  select t.tier, t.division
  from public.rank_thresholds t
  where t.version = p_version and t.min_score <= p_score
  order by t.min_score desc
  limit 1;
$$;

-- Age multiplier from a birth year (1 when unknown). Age = this year − birth year.
create function public.rank_age_factor(p_birth_year smallint)
returns numeric
language sql
stable
set search_path = ''
as $$
  select coalesce((
    select b.factor from public.strength_age_brackets b
    where p_birth_year is not null
      and extract(year from now() at time zone 'utc')::integer - p_birth_year >= b.min_age
      and (b.max_age is null
        or extract(year from now() at time zone 'utc')::integer - p_birth_year <= b.max_age)
    order by b.min_age desc
    limit 1
  ), 1::numeric);
$$;

-- A standard resolved for one lifter: anchor values at their bodyweight, blended between band
-- centres; "rather not say" averages the men's and women's values. Nulls when there's no standard.
create function public.rank_standard_at(
  p_version integer,
  p_key text,
  p_variant text,
  p_metric public.standard_metric,
  p_sex public.sex_for_standards,
  p_bw numeric,
  out scores numeric[],
  out vals numeric[],
  out max_score numeric
)
language plpgsql
stable
set search_path = ''
as $$
declare
  v_sexes public.sex_for_standards[] := case when p_sex = 'unspecified'
    then array['male', 'female']::public.sex_for_standards[] else array[p_sex] end;
  v_sex public.sex_for_standards;
  v_sum numeric[];
  v_vals numeric[];
  v_prev numeric[];
  v_prev_centre numeric;
  v_centre numeric;
  r record;
begin
  foreach v_sex in array v_sexes loop
    v_vals := null;
    v_prev := null;
    for r in
      select s.anchor_scores, s.anchor_values, s.max_score, s.bw_min, s.bw_max
      from public.strength_standards s
      where s.version = p_version and s.rank_key = p_key and s.variant = p_variant
        and s.metric = p_metric and s.sex = v_sex
      order by s.bw_min
    loop
      if scores is null then
        scores := r.anchor_scores;
        max_score := r.max_score;
      end if;
      v_centre := (r.bw_min + r.bw_max) / 2;
      if p_bw <= v_centre then
        if v_prev is null then
          v_vals := r.anchor_values;
        else
          select array_agg(a + (b - a) * (p_bw - v_prev_centre) / (v_centre - v_prev_centre)
                           order by i)
          into v_vals
          from unnest(v_prev, r.anchor_values) with ordinality as u(a, b, i);
        end if;
        exit;
      end if;
      v_prev := r.anchor_values;
      v_prev_centre := v_centre;
    end loop;
    v_vals := coalesce(v_vals, v_prev);
    if v_vals is null then
      scores := null;
      vals := null;
      max_score := null;
      return;
    end if;
    if v_sum is null then
      v_sum := v_vals;
    else
      select array_agg(a + b order by i) into v_sum
      from unnest(v_sum, v_vals) with ordinality as u(a, b, i);
    end if;
  end loop;
  select array_agg(a / cardinality(v_sexes) order by i) into vals
  from unnest(v_sum) with ordinality as u(a, i);
end;
$$;

-- Rank Score for an (age-adjusted) value, capped at the row's and the ladder's maximum.
create function public.rank_metric_score(
  p_scores numeric[],
  p_vals numeric[],
  p_max_score numeric,
  p_value numeric,
  p_cap numeric
)
returns numeric
language sql
immutable
set search_path = ''
as $$
  select least(greatest(public.rank_interp(p_value, p_vals, p_scores), 0),
               least(p_max_score, p_cap));
$$;

-- Rank Score of one set (null when it can't rank) and whether a weigh-in would let it rank.
create function public.rank_set_score(
  p_version integer,
  p_key text,
  p_variant text,
  p_log_type public.exercise_log_type,
  p_weight_mode public.weight_mode,
  p_weight numeric,
  p_reps integer,
  p_duration integer,
  p_bw numeric,
  p_sex public.sex_for_standards,
  p_age_factor numeric,
  p_cap numeric,
  out score numeric,
  out needs_bw boolean
)
language plpgsql
stable
set search_path = ''
as $$
declare
  v_e1rm numeric;
  v_added numeric;
  v_reps_score numeric;
  v_ratio_score numeric;
  s record;
begin
  needs_bw := false;
  if p_key is null or p_weight_mode = 'assisted' or p_log_type = 'assisted_bodyweight' then
    return;
  end if;

  if p_log_type = 'weight_reps' then
    if p_weight_mode <> 'absolute' then
      return;
    end if;
    v_e1rm := public.rank_e1rm(p_weight, p_reps);
    if v_e1rm is null then
      return;
    end if;
    if p_bw is null then
      needs_bw := true;
      return;
    end if;
    select * into s from public.rank_standard_at(p_version, p_key, p_variant, 'e1rm_ratio', p_sex, p_bw);
    if s.scores is null then
      return;
    end if;
    score := public.rank_metric_score(s.scores, s.vals, s.max_score,
      v_e1rm * p_age_factor / p_bw, p_cap);
    return;
  end if;

  if p_log_type in ('bodyweight_reps', 'weighted_bodyweight') then
    v_added := greatest(0, coalesce(p_weight, 0));
    if coalesce(p_reps, 0) < 1 then
      return;
    end if;
    select * into s from public.rank_standard_at(p_version, p_key, p_variant, 'reps', p_sex,
      coalesce(p_bw, 0));
    if s.scores is not null then
      v_reps_score := public.rank_metric_score(s.scores, s.vals, s.max_score,
        p_reps * p_age_factor, p_cap);
    end if;
    if exists (
      select 1 from public.strength_standards x
      where x.version = p_version and x.rank_key = p_key and x.variant = p_variant
        and x.metric = 'e1rm_ratio'
    ) then
      if p_bw is null then
        needs_bw := v_added > 0;
      else
        v_e1rm := public.rank_e1rm(p_bw + v_added, p_reps);
        select * into s from public.rank_standard_at(p_version, p_key, p_variant, 'e1rm_ratio',
          p_sex, p_bw);
        if v_e1rm is not null and s.scores is not null then
          v_ratio_score := public.rank_metric_score(s.scores, s.vals, s.max_score,
            v_e1rm * p_age_factor / p_bw, p_cap);
        end if;
      end if;
    end if;
    score := greatest(v_reps_score, v_ratio_score);
    if score is not null then
      needs_bw := false;
    end if;
    return;
  end if;

  if p_log_type = 'duration' and coalesce(p_duration, 0) > 0 then
    select * into s from public.rank_standard_at(p_version, p_key, p_variant, 'hold_seconds',
      p_sex, 0);
    if s.scores is not null then
      score := public.rank_metric_score(s.scores, s.vals, s.max_score,
        p_duration * p_age_factor, p_cap);
    end if;
  end if;
end;
$$;

-- Why a set looks impossible (null when it looks fine). Mirrors guardrails.ts.
create function public.rank_flag_reason(
  p_log_type public.exercise_log_type,
  p_weight_mode public.weight_mode,
  p_weight numeric,
  p_reps integer,
  p_duration integer,
  p_bw numeric,
  p_max_ratio numeric,
  p_max_reps integer,
  p_max_hold integer
)
returns public.rank_flag_reason
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_bw_lift boolean := p_log_type in ('bodyweight_reps', 'weighted_bodyweight');
  v_system numeric;
  v_counts boolean;
begin
  if p_weight_mode = 'assisted' or p_log_type = 'assisted_bodyweight' then
    return null;
  end if;
  if coalesce(p_weight, 0) > 0 and coalesce(p_reps, 0) > 100 then
    return 'reps_over_limit';
  end if;
  if p_max_reps is not null and v_bw_lift and coalesce(p_reps, 0) > p_max_reps then
    return 'reps_over_limit';
  end if;
  if p_max_hold is not null and p_log_type = 'duration' and coalesce(p_duration, 0) > p_max_hold then
    return 'hold_over_limit';
  end if;
  if p_max_ratio is not null and p_bw is not null then
    v_system := case when v_bw_lift then p_bw + greatest(0, coalesce(p_weight, 0))
      else coalesce(p_weight, 0) end;
    v_counts := case when p_log_type = 'weight_reps' then p_weight_mode = 'absolute' else v_bw_lift end;
    -- Sets above 10 reps are judged as 10 reps (a lower bound on their e1RM).
    if v_counts and v_system > 0 and coalesce(p_reps, 0) >= 1
       and v_system * public.rank_rep_factor(least(p_reps, 10)) / p_bw > p_max_ratio then
      return 'e1rm_over_limit';
    end if;
  end if;
  return null;
end;
$$;

-- ─── Jobs ───────────────────────────────────────────────────────────────────────────────────────

create function public.rank_enqueue(p_user uuid, p_reason text)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.rank_jobs (user_id, reason) values (p_user, p_reason)
  on conflict (user_id) do update set reason = excluded.reason, queued_at = now();
$$;

-- ─── The engine ─────────────────────────────────────────────────────────────────────────────────

-- Rebuilds one user's ranks, history, records and flags from their completed sets. With a workout
-- id, rank events are tagged with it and the rewards for that workout are returned (and stored).
create function public.rank_recompute_user(p_user uuid, p_workout uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
-- Quiet the "temp table does not exist" notices from the drops below.
set client_min_messages = warning
as $$
declare
  v_set public.rank_settings;
  v_version integer;
  v_sex public.sex_for_standards;
  v_birth smallint;
  v_age numeric;
  v_window interval;
  v_bw_window interval;
  v_filter text;
  v_weighted numeric;
  v_lifts integer;
  v_regions integer;
  v_changes jsonb;
  v_rewards jsonb;
begin
  select p.sex_for_standards, p.birth_year into v_sex, v_birth
  from public.profiles p where p.id = p_user;
  if not found then
    return null;
  end if;
  perform pg_advisory_xact_lock(hashtextextended('rank:' || p_user::text, 0));

  select * into v_set from public.rank_settings;
  v_version := v_set.active_standards_version;
  v_age := public.rank_age_factor(v_birth);
  v_window := make_interval(days => v_set.window_days);
  v_bw_window := make_interval(days => v_set.bw_window_days);

  -- 1. Completed working sets with what the engine needs (warm-ups and failed sets never count).
  drop table if exists pg_temp.rk_sets;
  create temp table rk_sets on commit drop as
  select
    s.id as set_id,
    w.id as workout_id,
    we.exercise_id,
    coalesce(x.rank_key, rv.rank_key) as rank_key,
    coalesce(rv.slug, '') as variant,
    x.log_type,
    s.weight_mode,
    s.weight_kg,
    s.reps::integer as reps,
    s.duration_sec,
    t.at,
    we.sort_order * 1000 + s.sort_order as ord,
    (
      select b.weight_kg from public.bodyweight_logs b
      where b.user_id = p_user
        and b.logged_at between t.at - v_bw_window and t.at + v_bw_window
      order by abs(extract(epoch from b.logged_at - t.at)), b.logged_at desc
      limit 1
    ) as bw,
    false as flagged
  from public.workouts w
  join public.workout_exercises we on we.workout_id = w.id
  join public.workout_sets s on s.workout_exercise_id = we.id
  join public.exercises x on x.id = we.exercise_id
  left join public.rank_variants rv on rv.slug = x.slug and x.created_by is null
  cross join lateral (select coalesce(s.completed_at, w.ended_at, w.started_at) as at) t
  where w.user_id = p_user
    and w.status = 'completed'
    and s.completed
    and not s.failed
    and s.set_type <> 'warmup';
  -- Temp tables never get auto-analyzed; without stats the planner can pick quadratic joins.
  analyze pg_temp.rk_sets;

  -- 2. Guardrails: flag impossible-looking sets; pending and rejected flags hold sets back.
  insert into public.rank_flags (workout_set_id, user_id, reason)
  select f.set_id, p_user, f.reason
  from (
    select r.set_id, public.rank_flag_reason(r.log_type, r.weight_mode, r.weight_kg, r.reps,
      r.duration_sec, r.bw, l.max_ratio, l.max_reps, l.max_hold_sec) as reason
    from pg_temp.rk_sets r
    left join public.rank_lifts l on l.rank_key = r.rank_key
  ) f
  where f.reason is not null
  on conflict (workout_set_id) do update set reason = excluded.reason
    where public.rank_flags.status = 'pending';

  delete from public.rank_flags f
  where f.user_id = p_user and f.status = 'pending'
    and not exists (
      select 1 from pg_temp.rk_sets r
      left join public.rank_lifts l on l.rank_key = r.rank_key
      where r.set_id = f.workout_set_id
        and public.rank_flag_reason(r.log_type, r.weight_mode, r.weight_kg, r.reps,
          r.duration_sec, r.bw, l.max_ratio, l.max_reps, l.max_hold_sec) is not null
    );

  update pg_temp.rk_sets r set flagged = true
  from public.rank_flags f
  where f.workout_set_id = r.set_id and f.status <> 'approved';

  -- 3. Score every rankable set at its own bodyweight.
  drop table if exists pg_temp.rk_scored;
  create temp table rk_scored on commit drop as
  select r.set_id, r.workout_id, r.rank_key, r.at, round(sc.score, 2) as score, sc.needs_bw
  from pg_temp.rk_sets r
  cross join lateral public.rank_set_score(v_version, r.rank_key, r.variant, r.log_type,
    r.weight_mode, r.weight_kg, r.reps, r.duration_sec, r.bw, v_sex, v_age, v_set.max_score) sc
  where r.rank_key is not null and not r.flagged;
  analyze pg_temp.rk_scored;

  -- 4. Lift scores: the best set in the window ending at the lift's latest scored set.
  drop table if exists pg_temp.rk_lifts;
  create temp table rk_lifts on commit drop as
  with last as (
    select rank_key, max(at) as last_at from pg_temp.rk_scored
    where score is not null group by rank_key
  ), best as (
    select s.rank_key, s.score, s.set_id, l.last_at,
      row_number() over (partition by s.rank_key order by s.score desc, s.at) as rn
    from pg_temp.rk_scored s
    join last l on l.rank_key = s.rank_key
    where s.score is not null and s.at >= l.last_at - v_window
  )
  select b.rank_key, b.score, b.set_id as best_set_id, b.last_at, rl.discipline
  from best b
  join public.rank_lifts rl on rl.rank_key = b.rank_key
  where b.rn = 1;

  -- Muscles each lift trains (its library exercise; stabilisers don't count).
  drop table if exists pg_temp.rk_lift_muscles;
  create temp table rk_lift_muscles on commit drop as
  select l.rank_key, l.score, l.discipline, em.muscle, em.role, em.weight,
    public.region_of_muscle(em.muscle) as region
  from pg_temp.rk_lifts l
  join public.exercises x on x.rank_key = l.rank_key and x.created_by is null
  join public.exercise_muscles em on em.exercise_id = x.id
  where em.role in ('primary', 'secondary');

  -- 5. Ranks: lifts, muscles, regions, overall and disciplines.
  drop table if exists pg_temp.rk_new;
  create temp table rk_new (
    scope public.rank_scope,
    key text,
    score numeric,
    status public.rank_status,
    best_set_id uuid,
    last_set_at timestamptz,
    details jsonb
  ) on commit drop;

  insert into pg_temp.rk_new
  select 'lift', l.rank_key, l.score, 'ranked', l.best_set_id, l.last_at, null
  from pg_temp.rk_lifts l;

  foreach v_filter in array array['all', 'weightlifting', 'calisthenics'] loop
    drop table if exists pg_temp.rk_muscles;
    create temp table rk_muscles on commit drop as
    select lm.muscle, max(lm.region) as region,
      round(sum(lm.weight * lm.score) / sum(lm.weight), 2) as score
    from pg_temp.rk_lift_muscles lm
    where v_filter = 'all' or lm.discipline::text = v_filter
    group by lm.muscle
    having sum(lm.weight) > 0;

    drop table if exists pg_temp.rk_regions;
    create temp table rk_regions on commit drop as
    select m.region, round(avg(m.score), 2) as score
    from pg_temp.rk_muscles m
    where m.region is not null
    group by m.region;

    select round(sum(w.weight * r.score) / nullif(sum(w.weight), 0), 2) into v_weighted
    from pg_temp.rk_regions r
    join public.rank_region_weights w on w.region = r.region;

    select count(*) into v_lifts from pg_temp.rk_lifts l
    where v_filter = 'all' or l.discipline::text = v_filter;

    if v_filter = 'all' then
      insert into pg_temp.rk_new
      select 'muscle', m.muscle::text, m.score, 'ranked', null, null, null from pg_temp.rk_muscles m;
      insert into pg_temp.rk_new
      select 'region', r.region::text, r.score, 'ranked', null, null, null from pg_temp.rk_regions r;

      select count(distinct lm.region) into v_regions
      from pg_temp.rk_lift_muscles lm
      where lm.role = 'primary' and lm.region is not null;

      insert into pg_temp.rk_new values (
        'overall', 'overall',
        case when v_lifts >= v_set.placement_lifts and v_regions >= v_set.placement_regions
          then v_weighted end,
        case when v_lifts >= v_set.placement_lifts and v_regions >= v_set.placement_regions
          and v_weighted is not null then 'ranked' else 'placement' end::public.rank_status,
        null, null,
        jsonb_build_object('lifts', v_lifts, 'regions', v_regions,
          'need_lifts', v_set.placement_lifts, 'need_regions', v_set.placement_regions)
      );
    elsif v_lifts > 0 then
      insert into pg_temp.rk_new values (
        v_filter::public.rank_scope, v_filter,
        case when v_lifts >= v_set.discipline_min_lifts then v_weighted end,
        case when v_lifts >= v_set.discipline_min_lifts and v_weighted is not null
          then 'ranked' else 'placement' end::public.rank_status,
        null, null,
        jsonb_build_object('lifts', v_lifts, 'need_lifts', v_set.discipline_min_lifts)
      );
    end if;
  end loop;

  -- 6. History: events on tier or division changes, snapshots on score changes.
  drop table if exists pg_temp.rk_diff;
  create temp table rk_diff on commit drop as
  select n.*, t.tier, t.division, o.score as old_score, o.tier as old_tier,
    o.division as old_division
  from pg_temp.rk_new n
  left join lateral public.rank_tier_for(n.score, v_version) t on n.score is not null
  left join public.ranks_current o
    on o.user_id = p_user and o.scope = n.scope and o.key = n.key;

  with inserted as (
    insert into public.rank_events (user_id, scope, key, kind, from_tier, from_division,
      to_tier, to_division, score, workout_id)
    select p_user, d.scope, d.key,
      case
        when d.old_tier is null then 'placed'
        when public.rank_ordinal(d.tier, d.division)
          > public.rank_ordinal(d.old_tier, d.old_division) then 'rank_up'
        else 'rank_down'
      end::public.rank_event_kind,
      d.old_tier, d.old_division, d.tier, d.division, d.score, p_workout
    from pg_temp.rk_diff d
    where d.tier is not null
      and (d.old_tier is null
        or public.rank_ordinal(d.tier, d.division)
          <> public.rank_ordinal(d.old_tier, d.old_division))
    returning *
  )
  select coalesce(jsonb_agg(jsonb_build_object(
      'scope', i.scope, 'key', i.key, 'name', coalesce(rl.name, i.key), 'kind', i.kind,
      'from_tier', i.from_tier, 'from_division', i.from_division,
      'to_tier', i.to_tier, 'to_division', i.to_division, 'score', i.score)
    order by array_position(enum_range(null::public.rank_scope), i.scope), i.score desc), '[]')
  into v_changes
  from inserted i
  left join public.rank_lifts rl on i.scope = 'lift' and rl.rank_key = i.key;

  insert into public.rank_snapshots (user_id, scope, key, score, tier, division, standards_version)
  select p_user, d.scope, d.key, d.score, d.tier, d.division, v_version
  from pg_temp.rk_diff d
  where d.score is not null and d.tier is not null
    and (d.old_score is null or abs(d.score - d.old_score) >= 0.1);

  delete from public.ranks_current c
  where c.user_id = p_user
    and not exists (select 1 from pg_temp.rk_new n where n.scope = c.scope and n.key = c.key);

  insert into public.ranks_current as c (user_id, scope, key, score, tier, division, status,
    best_set_id, last_set_at, details, standards_version, updated_at)
  select p_user, d.scope, d.key, d.score, d.tier, d.division, d.status, d.best_set_id,
    d.last_set_at, d.details, v_version, now()
  from pg_temp.rk_diff d
  on conflict (user_id, scope, key) do update set
    score = excluded.score,
    tier = excluded.tier,
    division = excluded.division,
    status = excluded.status,
    best_set_id = excluded.best_set_id,
    last_set_at = excluded.last_set_at,
    details = excluded.details,
    standards_version = excluded.standards_version,
    updated_at = excluded.updated_at
  where (c.score, c.tier, c.division, c.status, c.best_set_id, c.last_set_at, c.details,
         c.standards_version)
    is distinct from (excluded.score, excluded.tier, excluded.division, excluded.status,
         excluded.best_set_id, excluded.last_set_at, excluded.details, excluded.standards_version);

  -- 7. Records: rebuilt in order. A value is a record when it beats every earlier one.
  delete from public.personal_records where user_id = p_user;

  insert into public.personal_records (user_id, exercise_id, kind, weight_kg, value,
    previous_value, workout_id, workout_set_id, achieved_at)
  with eligible as (
    select r.*,
      r.log_type not in ('duration', 'distance_duration')
        and r.weight_mode in ('absolute', 'bodyweight') and coalesce(r.reps, 0) >= 1 as loaded
    from pg_temp.rk_sets r
    where not r.flagged and r.weight_mode <> 'assisted' and r.log_type <> 'assisted_bodyweight'
  ), candidates as (
    select e.exercise_id, k.kind, k.weight_kg, k.value, e.workout_id, e.set_id, e.at, e.ord
    from eligible e
    cross join lateral (values
      ('e1rm'::public.pr_kind, null::numeric,
        case when e.log_type = 'weight_reps' and e.weight_mode = 'absolute' and e.loaded
          then round(public.rank_e1rm(e.weight_kg, e.reps), 2) end),
      ('weight', null,
        case when e.loaded and e.weight_kg > 0 then round(e.weight_kg, 2) end),
      ('set_volume', null,
        case when e.loaded and e.weight_kg > 0 then round(e.weight_kg * e.reps, 2) end),
      ('reps_at_weight', round(greatest(coalesce(e.weight_kg, 0), 0), 2),
        case when e.loaded then e.reps::numeric end),
      ('hold', null,
        case when e.log_type = 'duration' and coalesce(e.duration_sec, 0) > 0
          then e.duration_sec::numeric end)
    ) as k(kind, weight_kg, value)
    where k.value is not null
    union all
    select e.exercise_id, 'session_volume', null, round(sum(e.weight_kg * e.reps), 2),
      e.workout_id, null, max(e.at), (array_agg(e.ord order by e.at desc, e.ord desc))[1]
    from eligible e
    where e.loaded and e.weight_kg > 0
    group by e.workout_id, e.exercise_id
  ), ordered as (
    select c.*, max(c.value) over (
      partition by c.exercise_id, c.kind, c.weight_kg
      order by c.at, c.ord
      rows between unbounded preceding and 1 preceding
    ) as previous
    from candidates c
  )
  select p_user, o.exercise_id, o.kind, o.weight_kg, o.value, o.previous, o.workout_id,
    o.set_id, o.at
  from ordered o
  where o.previous is null or o.value > o.previous;

  -- is_pr: set on record sets, cleared everywhere else (a set edited into a warm-up included).
  drop table if exists pg_temp.rk_pr_sets;
  create temp table rk_pr_sets on commit drop as
  select distinct p.workout_set_id as set_id from public.personal_records p
  where p.user_id = p_user and p.previous_value is not null and p.workout_set_id is not null;

  update public.workout_sets s set is_pr = true
  from pg_temp.rk_pr_sets x
  where s.id = x.set_id and not s.is_pr;

  update public.workout_sets s set is_pr = false
  from public.workout_exercises we, public.workouts w
  where s.is_pr and we.id = s.workout_exercise_id and w.id = we.workout_id and w.user_id = p_user
    and not exists (select 1 from pg_temp.rk_pr_sets x where x.set_id = s.id);

  -- 8. Rewards for the workout that triggered this.
  if p_workout is null then
    return null;
  end if;

  select jsonb_build_object(
    'workout_id', p_workout,
    'standards_version', v_version,
    'prs', coalesce((
      select jsonb_agg(jsonb_build_object(
          'exercise_id', p.exercise_id, 'exercise_name', x.name, 'kind', p.kind,
          'weight_kg', p.weight_kg, 'value', p.value, 'previous_value', p.previous_value,
          'workout_set_id', p.workout_set_id)
        order by x.name, array_position(enum_range(null::public.pr_kind), p.kind), p.weight_kg)
      from public.personal_records p
      join public.exercises x on x.id = p.exercise_id
      where p.user_id = p_user and p.workout_id = p_workout and p.previous_value is not null
    ), '[]'::jsonb),
    'baselines', (
      select count(distinct p.exercise_id) from public.personal_records p
      where p.user_id = p_user and p.workout_id = p_workout and p.previous_value is null
        and not exists (
          select 1 from public.personal_records q
          where q.user_id = p_user and q.exercise_id = p.exercise_id
            and q.achieved_at < p.achieved_at
        )
    ),
    'rank_changes', v_changes,
    'placement', (
      select c.details || jsonb_build_object('placed', c.status = 'ranked')
      from public.ranks_current c
      where c.user_id = p_user and c.scope = 'overall'
    ),
    'needs_bodyweight', exists (
      select 1 from pg_temp.rk_scored s
      where s.workout_id = p_workout and s.needs_bw
    ),
    'flagged', (
      select count(*) from pg_temp.rk_sets r
      where r.workout_id = p_workout and r.flagged
    ),
    'xp_placeholder', null
  ) into v_rewards;

  insert into public.workout_rewards (workout_id, user_id, rewards)
  values (p_workout, p_user, v_rewards)
  on conflict (workout_id) do update set rewards = excluded.rewards, updated_at = now();

  return v_rewards;
end;
$$;

-- Runs queued recomputes (pg_cron, every minute). Returns how many it processed.
create function public.process_rank_jobs(p_max integer default 100)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid;
  v_count integer := 0;
begin
  for v_user in
    select j.user_id from public.rank_jobs j
    order by j.queued_at
    limit p_max
    for update skip locked
  loop
    delete from public.rank_jobs where user_id = v_user;
    begin
      perform public.rank_recompute_user(v_user);
    exception when others then
      raise warning 'rank recompute failed for %: %', v_user, sqlerrm;
    end;
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

-- ─── Triggers that queue recomputes ─────────────────────────────────────────────────────────────

create function public.rank_enqueue_workout_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.status = 'completed' then
    perform public.rank_enqueue(old.user_id, 'workout_deleted');
  end if;
  return null;
end;
$$;

create trigger workouts_rank_delete
  after delete on public.workouts
  for each row execute function public.rank_enqueue_workout_delete();

create function public.rank_enqueue_bodyweight()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.rank_enqueue(coalesce(new.user_id, old.user_id), 'bodyweight');
  return null;
end;
$$;

create trigger bodyweight_logs_rank
  after insert or update or delete on public.bodyweight_logs
  for each row execute function public.rank_enqueue_bodyweight();

create function public.rank_enqueue_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.rank_enqueue(new.id, 'profile');
  return null;
end;
$$;

create trigger profiles_rank_inputs
  after update of sex_for_standards, birth_year on public.profiles
  for each row
  when (old.sex_for_standards is distinct from new.sex_for_standards
    or old.birth_year is distinct from new.birth_year)
  execute function public.rank_enqueue_profile();

-- New standards (or settings): everyone who has logged a workout is recomputed.
create function public.rank_enqueue_everyone()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.rank_jobs (user_id, reason)
  select distinct w.user_id, 'standards' from public.workouts w where w.status = 'completed'
  on conflict (user_id) do update set reason = excluded.reason, queued_at = now();
  return null;
end;
$$;

create trigger rank_settings_changed
  after update on public.rank_settings
  for each statement execute function public.rank_enqueue_everyone();

-- ─── save_workout: score completed workouts and return the rewards ─────────────────────────────

create or replace function public.save_workout(p jsonb)
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
  v_rewards jsonb;
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

  -- Ranks and records (Phase 6). A scoring failure never blocks the save: the user is queued
  -- for a background recompute instead.
  if v_status = 'completed' then
    begin
      v_rewards := public.rank_recompute_user(v_uid, v_id);
    exception when others then
      perform public.rank_enqueue(v_uid, 'save_failed');
      v_rewards := null;
    end;
  end if;

  return jsonb_build_object('applied', true, 'revision', v_revision,
    'client_updated_at', v_client, 'status', v_status, 'rewards', v_rewards);
end;
$$;

-- ─── Client reads ───────────────────────────────────────────────────────────────────────────────

-- The rewards a workout earned (null until it has synced and been scored).
create function public.get_workout_rewards(p_workout uuid)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select r.rewards from public.workout_rewards r where r.workout_id = p_workout;
$$;

-- The caller's current ranks, with Inactive when nothing rankable was logged for inactive_days.
create function public.get_ranks()
returns table (
  scope public.rank_scope,
  key text,
  score numeric,
  tier public.rank_tier,
  division smallint,
  status public.rank_status,
  details jsonb,
  last_set_at timestamptz,
  inactive boolean
)
language sql
stable
security invoker
set search_path = ''
as $$
  with mine as (
    select * from public.ranks_current c where c.user_id = (select auth.uid())
  ), latest as (
    select max(m.last_set_at) as at from mine m where m.scope = 'lift'
  )
  select m.scope, m.key, m.score, m.tier, m.division, m.status, m.details, m.last_set_at,
    coalesce(l.at < now() - make_interval(days => s.inactive_days), false)
  from mine m
  cross join latest l
  cross join public.rank_settings s
  order by m.scope, m.score desc nulls last;
$$;

-- For each ranked lift: what the next division needs (weight at 1/3/5/8 reps at today's
-- bodyweight, reps, added load or seconds) and an ETA from the last 8 weeks' trend.
create function public.get_rank_predictions()
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_set public.rank_settings;
  v_version integer;
  v_sex public.sex_for_standards;
  v_age numeric;
  v_bw numeric;
  v_bw_at timestamptz;
  v_out jsonb := '[]'::jsonb;
  v_reps integer[] := array[1, 3, 5, 8];
  r record;
  nxt record;
  s record;
  v_item jsonb;
  v_target numeric;
  v_need numeric;
  v_slope numeric;
  v_now_value numeric;
  v_points integer;
  v_eta jsonb;
  v_discipline public.rank_discipline;
begin
  if v_uid is null then
    return '[]'::jsonb;
  end if;
  select * into v_set from public.rank_settings;
  v_version := v_set.active_standards_version;
  select p.sex_for_standards, public.rank_age_factor(p.birth_year) into v_sex, v_age
  from public.profiles p where p.id = v_uid;
  select b.weight_kg, b.logged_at into v_bw, v_bw_at from public.bodyweight_logs b
  where b.user_id = v_uid order by b.logged_at desc limit 1;

  for r in
    select c.key, c.score from public.ranks_current c
    where c.user_id = v_uid and c.scope = 'lift' and c.score is not null
    order by c.score desc
  loop
    select l.discipline into v_discipline from public.rank_lifts l where l.rank_key = r.key;
    select t.tier, t.division, t.min_score into nxt from public.rank_thresholds t
    where t.version = v_version and t.min_score > r.score
    order by t.min_score limit 1;
    v_item := jsonb_build_object('rank_key', r.key, 'score', r.score,
      'next_tier', nxt.tier, 'next_division', nxt.division, 'target_score', nxt.min_score);
    if nxt.min_score is null then
      v_out := v_out || jsonb_build_array(v_item || jsonb_build_object('eta',
        jsonb_build_object('status', 'at_top')));
      continue;
    end if;
    v_target := nxt.min_score;

    if v_discipline = 'weightlifting' then
      -- Trend of the best e1RM per session over the last 8 weeks.
      select regr_slope(b.e1rm, b.day), regr_intercept(b.e1rm, b.day), count(*)
      into v_slope, v_now_value, v_points
      from (
        select w.id, max(public.rank_e1rm(ws.weight_kg, ws.reps)) as e1rm,
          extract(epoch from min(w.started_at) - now()) / 86400 as day
        from public.workouts w
        join public.workout_exercises we on we.workout_id = w.id
        join public.exercises x on x.id = we.exercise_id and x.rank_key = r.key
        join public.workout_sets ws on ws.workout_exercise_id = we.id
        where w.user_id = v_uid and w.status = 'completed'
          and w.started_at >= now() - interval '56 days'
          and ws.completed and not ws.failed and ws.set_type <> 'warmup'
          and ws.weight_mode = 'absolute'
          and not exists (select 1 from public.rank_flags f
            where f.workout_set_id = ws.id and f.status <> 'approved')
        group by w.id
        having max(public.rank_e1rm(ws.weight_kg, ws.reps)) is not null
      ) b;

      if v_bw is null then
        v_item := v_item || jsonb_build_object('needs_bodyweight', true);
        v_need := null;
      else
        select * into s from public.rank_standard_at(v_version, r.key, '', 'e1rm_ratio', v_sex, v_bw);
        v_need := public.rank_interp(v_target, s.scores, s.vals) * v_bw / v_age;
        v_item := v_item || jsonb_build_object(
          'e1rm_kg', round(v_need, 1),
          'loads', (select jsonb_agg(jsonb_build_object('reps', n,
              'kg', round(ceil(v_need / public.rank_rep_factor(n) * 2 - 0.000000001) / 2, 1))
              order by n)
            from unnest(v_reps) n));
      end if;
    else
      -- Calisthenics trend: the best Rank Score per session.
      select regr_slope(b.score, b.day), regr_intercept(b.score, b.day), count(*)
      into v_slope, v_now_value, v_points
      from (
        select w.id, max(sc.score) as score,
          extract(epoch from min(w.started_at) - now()) / 86400 as day
        from public.workouts w
        join public.workout_exercises we on we.workout_id = w.id
        join public.exercises x on x.id = we.exercise_id
        left join public.rank_variants rv on rv.slug = x.slug and x.created_by is null
        join public.workout_sets ws on ws.workout_exercise_id = we.id
        cross join lateral public.rank_set_score(v_version, coalesce(x.rank_key, rv.rank_key),
          coalesce(rv.slug, ''), x.log_type, ws.weight_mode, ws.weight_kg, ws.reps,
          ws.duration_sec, v_bw, v_sex, v_age, v_set.max_score) sc
        where w.user_id = v_uid and w.status = 'completed'
          and coalesce(x.rank_key, rv.rank_key) = r.key
          and w.started_at >= now() - interval '56 days'
          and ws.completed and not ws.failed and ws.set_type <> 'warmup'
        group by w.id
        having max(sc.score) is not null
      ) b;
      v_need := v_target;

      select * into s from public.rank_standard_at(v_version, r.key, '', 'reps', v_sex, coalesce(v_bw, 0));
      if s.scores is not null then
        v_item := v_item || jsonb_build_object('reps',
          ceil(public.rank_interp(v_target, s.scores, s.vals) / v_age - 0.000000001));
      end if;
      if v_bw is not null then
        select * into s from public.rank_standard_at(v_version, r.key, '', 'e1rm_ratio', v_sex, v_bw);
        if s.scores is not null then
          v_item := v_item || jsonb_build_object('added_loads', (
            select jsonb_agg(jsonb_build_object('reps', n, 'kg', round(greatest(0,
                ceil((public.rank_interp(v_target, s.scores, s.vals) * v_bw / v_age
                  / public.rank_rep_factor(n) - v_bw) * 2 - 0.000000001) / 2), 1)) order by n)
            from unnest(v_reps) n));
        end if;
      end if;
      select * into s from public.rank_standard_at(v_version, r.key, '', 'hold_seconds', v_sex, 0);
      if s.scores is not null then
        v_item := v_item || jsonb_build_object('seconds',
          ceil(public.rank_interp(v_target, s.scores, s.vals) / v_age - 0.000000001));
      end if;
    end if;

    v_eta := case
      when coalesce(v_points, 0) < 4 or v_need is null then
        jsonb_build_object('status', 'need_more_sessions')
      when v_slope is null or v_slope <= 0 then jsonb_build_object('status', 'not_trending')
      else jsonb_build_object('status', 'ok',
        'days', greatest(0, ceil((v_need - v_now_value) / v_slope)))
    end;
    v_out := v_out || jsonb_build_array(v_item || jsonb_build_object('eta', v_eta,
      'bodyweight_kg', v_bw, 'bodyweight_stale',
        v_bw_at is not null and v_bw_at < now() - make_interval(days => v_set.bw_window_days)));
  end loop;
  return v_out;
end;
$$;

-- ─── Row level security and grants ──────────────────────────────────────────────────────────────

alter table public.rank_settings enable row level security;
alter table public.rank_thresholds enable row level security;
alter table public.rank_region_weights enable row level security;
alter table public.strength_age_brackets enable row level security;
alter table public.rank_lifts enable row level security;
alter table public.rank_variants enable row level security;
alter table public.strength_standards enable row level security;
alter table public.ranks_current enable row level security;
alter table public.rank_snapshots enable row level security;
alter table public.rank_events enable row level security;
alter table public.personal_records enable row level security;
alter table public.rank_flags enable row level security;
alter table public.workout_rewards enable row level security;
alter table public.rank_jobs enable row level security;

-- Configuration: everyone signed in can read it (the app explains standards); nobody writes it.
create policy "rank_settings: signed-in users can read"
  on public.rank_settings for select to authenticated using (true);
create policy "rank_thresholds: signed-in users can read"
  on public.rank_thresholds for select to authenticated using (true);
create policy "rank_region_weights: signed-in users can read"
  on public.rank_region_weights for select to authenticated using (true);
create policy "strength_age_brackets: signed-in users can read"
  on public.strength_age_brackets for select to authenticated using (true);
create policy "rank_lifts: signed-in users can read"
  on public.rank_lifts for select to authenticated using (true);
create policy "rank_variants: signed-in users can read"
  on public.rank_variants for select to authenticated using (true);
create policy "strength_standards: signed-in users can read"
  on public.strength_standards for select to authenticated using (true);

-- Results: owner reads only. Writes happen only inside the definer functions above.
create policy "ranks_current: owner can read"
  on public.ranks_current for select to authenticated using (user_id = (select auth.uid()));
create policy "rank_snapshots: owner can read"
  on public.rank_snapshots for select to authenticated using (user_id = (select auth.uid()));
create policy "rank_events: owner can read"
  on public.rank_events for select to authenticated using (user_id = (select auth.uid()));
create policy "personal_records: owner can read"
  on public.personal_records for select to authenticated using (user_id = (select auth.uid()));
create policy "rank_flags: owner can read"
  on public.rank_flags for select to authenticated using (user_id = (select auth.uid()));
create policy "workout_rewards: owner can read"
  on public.workout_rewards for select to authenticated using (user_id = (select auth.uid()));
-- rank_jobs: no policies; only the engine touches it.

revoke all on public.rank_settings, public.rank_thresholds, public.rank_region_weights,
  public.strength_age_brackets, public.rank_lifts, public.rank_variants,
  public.strength_standards, public.ranks_current, public.rank_snapshots, public.rank_events,
  public.personal_records, public.rank_flags, public.workout_rewards, public.rank_jobs
  from anon, authenticated;

grant select on public.rank_settings, public.rank_thresholds, public.rank_region_weights,
  public.strength_age_brackets, public.rank_lifts, public.rank_variants,
  public.strength_standards, public.ranks_current, public.rank_snapshots, public.rank_events,
  public.personal_records, public.rank_flags, public.workout_rewards
  to authenticated;

-- Pure helpers are harmless; the engine, queue and triggers are not callable by clients.
revoke execute on function
  public.rank_enqueue(uuid, text),
  public.rank_recompute_user(uuid, uuid),
  public.process_rank_jobs(integer),
  public.rank_enqueue_workout_delete(),
  public.rank_enqueue_bodyweight(),
  public.rank_enqueue_profile(),
  public.rank_enqueue_everyone()
  from public, anon, authenticated;

revoke execute on function public.get_workout_rewards(uuid), public.get_ranks(),
  public.get_rank_predictions() from public, anon;
grant execute on function public.get_workout_rewards(uuid), public.get_ranks(),
  public.get_rank_predictions() to authenticated;

-- ─── Background recomputes ──────────────────────────────────────────────────────────────────────

select cron.schedule('process-rank-jobs', '* * * * *', 'select public.process_rank_jobs(200)');
