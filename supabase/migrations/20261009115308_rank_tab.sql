-- Phase 7: read functions for the Rank tab (progression chart, rank-ups by day, records, lift
-- detail, percentile). Rules in docs/RANK_SYSTEM.md; nothing here writes. Every function except
-- get_lift_percentile runs as the caller, so RLS keeps each lifter to their own rows.

-- Rank history for one scope since a date: snapshots (plus the last one before the range, so a
-- chart starts at its left edge) and the events that mark rank-up days.
create function public.get_rank_history(p_scope public.rank_scope, p_key text, p_since timestamptz)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with mine as (
    select s.* from public.rank_snapshots s
    where s.user_id = (select auth.uid()) and s.scope = p_scope and s.key = p_key
  ), ranged as (
    select * from mine where taken_at >= p_since
    union all
    (select * from mine where taken_at < p_since order by taken_at desc limit 1)
  )
  select jsonb_build_object(
    'snapshots', coalesce((
      select jsonb_agg(jsonb_build_object('at', r.taken_at, 'score', r.score, 'tier', r.tier,
        'division', r.division) order by r.taken_at, r.id)
      from ranged r), '[]'::jsonb),
    'events', coalesce((
      select jsonb_agg(jsonb_build_object('at', coalesce(w.started_at, e.created_at),
        'kind', e.kind, 'from_tier', e.from_tier, 'from_division', e.from_division,
        'to_tier', e.to_tier, 'to_division', e.to_division, 'score', e.score)
        order by coalesce(w.started_at, e.created_at))
      from public.rank_events e
      left join public.workouts w on w.id = e.workout_id
      where e.user_id = (select auth.uid()) and e.scope = p_scope and e.key = p_key
        and coalesce(w.started_at, e.created_at) >= p_since), '[]'::jsonb)
  );
$$;

-- Every rank event since a date, timed by the workout that caused it (not when it synced), so
-- "rank-ups by weekday" reflects when you trained.
create function public.get_rank_events(p_since timestamptz)
returns table (
  scope public.rank_scope,
  key text,
  kind public.rank_event_kind,
  from_tier public.rank_tier,
  from_division smallint,
  to_tier public.rank_tier,
  to_division smallint,
  score numeric,
  at timestamptz,
  workout_id uuid
)
language sql
stable
security invoker
set search_path = ''
as $$
  select e.scope, e.key, e.kind, e.from_tier, e.from_division, e.to_tier, e.to_division, e.score,
    coalesce(w.started_at, e.created_at), e.workout_id
  from public.rank_events e
  left join public.workouts w on w.id = e.workout_id
  where e.user_id = (select auth.uid())
    and coalesce(w.started_at, e.created_at) >= p_since
  order by 9;
$$;

-- The caller's record history (every record and baseline) with the exercise and set behind it.
create function public.get_personal_records()
returns table (
  exercise_id uuid,
  exercise_name text,
  rank_key text,
  log_type public.exercise_log_type,
  kind public.pr_kind,
  weight_kg numeric,
  value numeric,
  previous_value numeric,
  achieved_at timestamptz,
  workout_id uuid,
  workout_name text,
  set_reps integer,
  set_weight_kg numeric,
  set_duration_sec integer,
  set_weight_mode public.weight_mode
)
language sql
stable
security invoker
set search_path = ''
as $$
  select p.exercise_id, x.name, coalesce(x.rank_key, rv.rank_key), x.log_type, p.kind,
    p.weight_kg, p.value, p.previous_value, p.achieved_at, p.workout_id, w.name,
    s.reps::integer, s.weight_kg, s.duration_sec, s.weight_mode
  from public.personal_records p
  join public.exercises x on x.id = p.exercise_id
  left join public.rank_variants rv on rv.slug = x.slug and x.created_by is null
  join public.workouts w on w.id = p.workout_id
  left join public.workout_sets s on s.id = p.workout_set_id
  where p.user_id = (select auth.uid())
  order by x.name, p.kind, p.achieved_at;
$$;

-- The set behind each ranked lift: what it was, its e1RM and its multiple of the bodyweight that
-- day (the weigh-in the engine used: closest within the bodyweight window).
create function public.get_lift_bests()
returns table (
  rank_key text,
  exercise_name text,
  log_type public.exercise_log_type,
  weight_kg numeric,
  reps integer,
  duration_sec integer,
  e1rm numeric,
  bodyweight_kg numeric,
  achieved_at timestamptz
)
language sql
stable
security invoker
set search_path = ''
as $$
  select c.key, x.name, x.log_type, s.weight_kg, s.reps::integer, s.duration_sec,
    round(case
      when x.log_type = 'weight_reps' then public.rank_e1rm(s.weight_kg, s.reps::integer)
      when x.log_type in ('bodyweight_reps', 'weighted_bodyweight') and bw.weight_kg is not null
        then public.rank_e1rm(bw.weight_kg + greatest(0, coalesce(s.weight_kg, 0)), s.reps::integer)
    end, 1),
    bw.weight_kg, t.at
  from public.ranks_current c
  join public.workout_sets s on s.id = c.best_set_id
  join public.workout_exercises we on we.id = s.workout_exercise_id
  join public.workouts w on w.id = we.workout_id
  join public.exercises x on x.id = we.exercise_id
  cross join lateral (select coalesce(s.completed_at, w.ended_at, w.started_at) as at) t
  cross join public.rank_settings st
  left join lateral (
    select b.weight_kg from public.bodyweight_logs b
    where b.user_id = c.user_id
      and b.logged_at between t.at - make_interval(days => st.bw_window_days)
        and t.at + make_interval(days => st.bw_window_days)
    order by abs(extract(epoch from b.logged_at - t.at)), b.logged_at desc
    limit 1
  ) bw on true
  where c.user_id = (select auth.uid()) and c.scope = 'lift';
$$;

-- One lift in detail: the current rank, every set in the 180-day window with its score, the best
-- result per session (all time) and the standard at the caller's bodyweight, sex and age.
create function public.get_lift_detail(p_rank_key text)
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
  v_rank public.ranks_current;
  v_lift public.rank_lifts;
  v_standards jsonb := '[]'::jsonb;
  v_metric public.standard_metric;
  s record;
begin
  if v_uid is null then
    return null;
  end if;
  select * into v_lift from public.rank_lifts l where l.rank_key = p_rank_key;
  if not found then
    return null;
  end if;
  select * into v_set from public.rank_settings;
  v_version := v_set.active_standards_version;
  select p.sex_for_standards, public.rank_age_factor(p.birth_year) into v_sex, v_age
  from public.profiles p where p.id = v_uid;
  select b.weight_kg into v_bw from public.bodyweight_logs b
  where b.user_id = v_uid order by b.logged_at desc limit 1;
  select * into v_rank from public.ranks_current c
  where c.user_id = v_uid and c.scope = 'lift' and c.key = p_rank_key;

  -- The standard at today's bodyweight: what each tier needs, in the lift's own unit.
  foreach v_metric in array array['e1rm_ratio', 'reps', 'hold_seconds']::public.standard_metric[] loop
    select * into s from public.rank_standard_at(v_version, p_rank_key, '', v_metric, v_sex,
      case when v_metric = 'e1rm_ratio' then v_bw else coalesce(v_bw, 0) end);
    if s.scores is null or (v_metric = 'e1rm_ratio' and v_bw is null) then
      continue;
    end if;
    v_standards := v_standards || jsonb_build_array(jsonb_build_object(
      'metric', v_metric,
      'anchors', (
        select jsonb_agg(jsonb_build_object('score', a.score, 'tier', t.tier,
          'value', round(case when v_metric = 'e1rm_ratio' then a.val * v_bw / v_age
            else a.val / v_age end, 1)) order by a.i)
        from unnest(s.scores, s.vals) with ordinality as a(score, val, i)
        cross join lateral public.rank_tier_for(a.score, v_version) t
      )));
  end loop;

  return jsonb_build_object(
    'rank_key', p_rank_key,
    'name', v_lift.name,
    'discipline', v_lift.discipline,
    'bodyweight_kg', v_bw,
    'rank', case when v_rank.key is null then null else jsonb_build_object(
      'score', v_rank.score, 'tier', v_rank.tier, 'division', v_rank.division,
      'best_set_id', v_rank.best_set_id, 'last_set_at', v_rank.last_set_at) end,
    'standards', v_standards,
    'sets', coalesce((
      select jsonb_agg(to_jsonb(x) order by x.score desc nulls last, x.at desc)
      from (
        select ws.id as set_id, w.id as workout_id, w.name as workout_name, t.at,
          ex.name as exercise_name, coalesce(rv.slug, '') as variant, ws.weight_mode,
          ws.weight_kg, ws.reps, ws.duration_sec,
          round(public.rank_e1rm(case when ex.log_type = 'weight_reps' then ws.weight_kg end,
            ws.reps::integer), 1) as e1rm,
          round(sc.score, 2) as score,
          ws.id = v_rank.best_set_id as is_best
        from public.workouts w
        join public.workout_exercises we on we.workout_id = w.id
        join public.workout_sets ws on ws.workout_exercise_id = we.id
        join public.exercises ex on ex.id = we.exercise_id
        left join public.rank_variants rv on rv.slug = ex.slug and ex.created_by is null
        cross join lateral (select coalesce(ws.completed_at, w.ended_at, w.started_at) as at) t
        cross join lateral public.rank_set_score(v_version, coalesce(ex.rank_key, rv.rank_key),
          coalesce(rv.slug, ''), ex.log_type, ws.weight_mode, ws.weight_kg, ws.reps::integer,
          ws.duration_sec, (
            select b.weight_kg from public.bodyweight_logs b
            where b.user_id = v_uid
              and b.logged_at between t.at - make_interval(days => v_set.bw_window_days)
                and t.at + make_interval(days => v_set.bw_window_days)
            order by abs(extract(epoch from b.logged_at - t.at)), b.logged_at desc
            limit 1),
          v_sex, v_age, v_set.max_score) sc
        where w.user_id = v_uid and w.status = 'completed'
          and coalesce(ex.rank_key, rv.rank_key) = p_rank_key
          and ws.completed and not ws.failed and ws.set_type <> 'warmup'
          and v_rank.last_set_at is not null
          and t.at between v_rank.last_set_at - make_interval(days => v_set.window_days)
            and v_rank.last_set_at
          and not exists (select 1 from public.rank_flags f
            where f.workout_set_id = ws.id and f.status <> 'approved')
        order by sc.score desc nulls last, t.at desc
        limit 60
      ) x
    ), '[]'::jsonb),
    'sessions', coalesce((
      select jsonb_agg(jsonb_build_object('at', b.at, 'workout_id', b.workout_id,
        'e1rm', b.e1rm, 'reps', b.reps, 'seconds', b.seconds, 'added_kg', b.added_kg)
        order by b.at)
      from (
        select w.id as workout_id, min(w.started_at) as at,
          round(max(public.rank_e1rm(ws.weight_kg, ws.reps::integer))
            filter (where ex.log_type = 'weight_reps' and ws.weight_mode = 'absolute'), 1) as e1rm,
          max(ws.reps) filter (where ex.log_type in ('bodyweight_reps', 'weighted_bodyweight')) as reps,
          max(ws.duration_sec) filter (where ex.log_type = 'duration') as seconds,
          max(ws.weight_kg) filter (where ex.log_type in ('bodyweight_reps', 'weighted_bodyweight')
            and ws.weight_mode = 'bodyweight') as added_kg
        from public.workouts w
        join public.workout_exercises we on we.workout_id = w.id
        join public.workout_sets ws on ws.workout_exercise_id = we.id
        join public.exercises ex on ex.id = we.exercise_id
        left join public.rank_variants rv on rv.slug = ex.slug and ex.created_by is null
        where w.user_id = v_uid and w.status = 'completed'
          and coalesce(ex.rank_key, rv.rank_key) = p_rank_key
          and ws.completed and not ws.failed and ws.set_type <> 'warmup'
          and ws.weight_mode <> 'assisted'
        group by w.id
      ) b
    ), '[]'::jsonb)
  );
end;
$$;

-- Where the caller stands among lifters of the same standards sex and bodyweight band on one lift.
-- Runs with the owner's rights to read other lifters' scores, but returns only a percentage and
-- the cohort size, and nothing until at least 20 others are in the cohort.
create function public.get_lift_percentile(p_rank_key text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_min_cohort constant integer := 20;
  v_sex public.sex_for_standards;
  v_bw numeric;
  v_score numeric;
  v_bw_min numeric;
  v_bw_max numeric;
  v_cohort integer;
  v_below integer;
begin
  if v_uid is null then
    return null;
  end if;
  select p.sex_for_standards into v_sex from public.profiles p where p.id = v_uid;
  select b.weight_kg into v_bw from public.bodyweight_logs b
  where b.user_id = v_uid order by b.logged_at desc limit 1;
  select c.score into v_score from public.ranks_current c
  where c.user_id = v_uid and c.scope = 'lift' and c.key = p_rank_key and c.score is not null;
  if v_score is null or v_bw is null then
    return jsonb_build_object('percentile', null, 'cohort', 0, 'min_cohort', v_min_cohort,
      'sex', v_sex, 'bw_min', null, 'bw_max', null);
  end if;

  -- Bands come from the standards table ("rather not say" uses the men's bands).
  select s.bw_min, s.bw_max into v_bw_min, v_bw_max
  from public.strength_standards s
  where s.version = (select active_standards_version from public.rank_settings)
    and s.rank_key = p_rank_key and s.variant = ''
    and s.sex = case when v_sex = 'female' then 'female' else 'male' end::public.sex_for_standards
  order by (v_bw >= s.bw_min and v_bw < s.bw_max) desc, abs((s.bw_min + s.bw_max) / 2 - v_bw)
  limit 1;
  select count(*), count(*) filter (where c.score < v_score)
  into v_cohort, v_below
  from public.ranks_current c
  join public.profiles p on p.id = c.user_id
  cross join lateral (
    select b.weight_kg from public.bodyweight_logs b
    where b.user_id = c.user_id order by b.logged_at desc limit 1
  ) bw
  where c.scope = 'lift' and c.key = p_rank_key and c.score is not null
    and c.user_id <> v_uid
    and p.sex_for_standards = v_sex
    and (v_bw_min is null or (bw.weight_kg >= v_bw_min and bw.weight_kg < v_bw_max));

  return jsonb_build_object(
    'percentile', case when v_cohort >= v_min_cohort
      then round(100.0 * v_below / v_cohort) end,
    'cohort', v_cohort,
    'min_cohort', v_min_cohort,
    'sex', v_sex,
    'bw_min', v_bw_min,
    'bw_max', v_bw_max
  );
end;
$$;

revoke execute on function
  public.get_lift_bests(),
  public.get_rank_history(public.rank_scope, text, timestamptz),
  public.get_rank_events(timestamptz),
  public.get_personal_records(),
  public.get_lift_detail(text),
  public.get_lift_percentile(text)
  from public, anon;
grant execute on function
  public.get_lift_bests(),
  public.get_rank_history(public.rank_scope, text, timestamptz),
  public.get_rank_events(timestamptz),
  public.get_personal_records(),
  public.get_lift_detail(text),
  public.get_lift_percentile(text)
  to authenticated;
