-- Phase 7: weekly leagues, 8-week seasons, custom leagues and challenges. Rules in
-- docs/RANK_SYSTEM.md §18; tables in docs/SCHEMA.md.
--
-- - League Points (LP) reward effort and relative improvement only (workouts, planned sessions,
--   PRs, rank-ups, beating your own baseline, score gains), never absolute strength, so an Iron
--   lifter can win their group. LP are computed on read from workouts and the rank engine's
--   history, so edits and deletes correct themselves; a week's final LP are frozen at close.
-- - league_run_cycle(p_now) closes finished weeks (promotion and demotion), finishes seasons
--   (rewards), opens the week containing p_now (placement into groups of ~30 by overall rank) and
--   closes finished custom leagues. Idempotent; pg_cron runs it hourly, so the Monday 00:00 IST
--   reset happens within the hour even after downtime. Tests and `pnpm leagues:simulate` call it
--   with a fast-forwarded p_now.
-- - Clients never write league tables; they read through RPCs and change membership through
--   create/join/leave functions. `community_id` lets a league belong to a community (Phase 12B).

-- ─── Types ──────────────────────────────────────────────────────────────────────────────────────

create type public.league_division as enum ('rookie', 'contender', 'elite', 'legend');
create type public.league_kind as enum ('ranked', 'custom', 'community');
create type public.league_scoring as enum ('lp', 'volume', 'lift_improvement', 'attendance');
create type public.league_outcome as enum ('promoted', 'stayed', 'demoted');
create type public.league_status as enum ('open', 'closed');
create type public.challenge_kind as enum ('most_reps', 'lift_frequency', 'workouts');

-- ─── Tables ─────────────────────────────────────────────────────────────────────────────────────

create table public.league_seasons (
  id integer generated always as identity primary key,
  number integer not null unique check (number > 0),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status public.league_status not null default 'open',
  constraint league_seasons_span check (ends_at > starts_at)
);

comment on table public.league_seasons is 'Seasons of 8 weekly leagues. Readable by signed-in users.';

create table public.league_weeks (
  id bigint generated always as identity primary key,
  season_id integer not null references public.league_seasons (id) on delete cascade,
  week_no smallint not null check (week_no between 1 and 8),
  -- Monday 00:00 IST to the next Monday 00:00 IST.
  starts_at timestamptz not null unique,
  ends_at timestamptz not null,
  status public.league_status not null default 'open',
  closed_at timestamptz,
  unique (season_id, week_no)
);

comment on table public.league_weeks is 'One row per league week (Monday to Monday, IST).';

create table public.leagues (
  id uuid primary key default gen_random_uuid(),
  kind public.league_kind not null,
  -- Ranked weekly groups: the week, the division and the group number within it.
  week_id bigint references public.league_weeks (id) on delete cascade,
  division public.league_division,
  group_no smallint check (group_no > 0),
  name text not null constraint leagues_name_length check (char_length(btrim(name)) between 1 and 40),
  owner_id uuid references public.profiles (id) on delete cascade,
  -- A college, hostel or society (Phase 12B). No foreign key until communities exist.
  community_id uuid,
  scoring public.league_scoring not null default 'lp',
  scoring_rank_key text references public.rank_lifts (rank_key),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  invite_code text unique constraint leagues_invite_code check (invite_code ~ '^[A-Z2-9]{8}$'),
  max_members integer not null default 50 check (max_members between 2 and 100),
  status public.league_status not null default 'open',
  created_at timestamptz not null default now(),
  constraint leagues_span check (ends_at > starts_at),
  constraint leagues_ranked_shape check (
    (kind = 'ranked') = (week_id is not null and division is not null and group_no is not null)),
  constraint leagues_custom_shape check (
    kind <> 'custom' or (owner_id is not null and invite_code is not null)),
  constraint leagues_lift_scoring check ((scoring = 'lift_improvement') = (scoring_rank_key is not null))
);

create index leagues_week on public.leagues (week_id, division);
create index leagues_community on public.leagues (community_id) where community_id is not null;

comment on table public.leagues is
  'Weekly ranked groups, custom friend leagues and (Phase 12B) community leagues. Members can read.';

create table public.league_members (
  league_id uuid not null references public.leagues (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  -- Overall Rank Score at placement (0 before placement); groups hold similar scores.
  seed_score numeric(6, 2) not null default 0,
  -- Frozen when the league closes.
  final_points integer,
  final_position integer,
  outcome public.league_outcome,
  -- When the member saw their result (the Monday results sheet).
  result_seen_at timestamptz,
  primary key (league_id, user_id)
);

create index league_members_user on public.league_members (user_id);

comment on table public.league_members is 'Who is in each league, with frozen results. Members can read.';

create table public.league_standing (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  division public.league_division not null default 'rookie',
  updated_at timestamptz not null default now()
);

comment on table public.league_standing is 'Each lifter''s current league division. Owner can read.';

create table public.league_challenges (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.leagues (id) on delete cascade,
  kind public.challenge_kind not null,
  title text not null constraint league_challenges_title check (char_length(btrim(title)) between 1 and 60),
  rank_key text references public.rank_lifts (rank_key),
  -- lift_frequency and workouts: the count to reach. most_reps: none (most wins).
  target integer check (target between 1 and 1000),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint league_challenges_shape check (
    (kind = 'workouts' or rank_key is not null) and (kind = 'most_reps' or target is not null))
);

create index league_challenges_league on public.league_challenges (league_id);

create table public.season_rewards (
  user_id uuid not null references public.profiles (id) on delete cascade,
  season_id integer not null references public.league_seasons (id) on delete cascade,
  best_division public.league_division not null,
  badge_key text not null,
  frame_key text,
  granted_at timestamptz not null default now(),
  primary key (user_id, season_id)
);

comment on table public.season_rewards is 'Season badges and avatar frames. Owner can read.';

-- ─── Time ───────────────────────────────────────────────────────────────────────────────────────

-- Monday 00:00 IST of the week containing p_at.
create function public.league_week_start(p_at timestamptz)
returns timestamptz
language sql
stable
set search_path = ''
as $$
  select date_trunc('week', p_at at time zone 'Asia/Kolkata') at time zone 'Asia/Kolkata';
$$;

-- The clock the league reads (standings, countdowns, joins): now(), unless a test or the league
-- simulator sets `app.league_now` for its own session to look at a fast-forwarded week. Results
-- never depend on it: the cycle takes its own p_now and freezes final points.
create function public.league_now()
returns timestamptz
language sql
stable
set search_path = ''
as $$
  select coalesce(nullif(current_setting('app.league_now', true), '')::timestamptz, now());
$$;

-- ─── League Points ──────────────────────────────────────────────────────────────────────────────

-- Completed workouts in a window with at least 4 completed working sets (warm-ups and failed sets
-- don't count), with their IST day.
create function public.league_qualifying_workouts(p_user uuid, p_from timestamptz, p_to timestamptz)
returns table (workout_id uuid, started_at timestamptz, ist_day date, plan_day_id uuid, sets bigint)
language sql
stable
set search_path = ''
as $$
  select w.id, w.started_at, (w.started_at at time zone 'Asia/Kolkata')::date, w.plan_day_id,
    count(s.id)
  from public.workouts w
  join public.workout_exercises we on we.workout_id = w.id
  join public.workout_sets s on s.workout_exercise_id = we.id
  where w.user_id = p_user and w.status = 'completed'
    and w.started_at >= p_from and w.started_at < p_to
    and s.completed and not s.failed and s.set_type <> 'warmup'
  group by w.id
  having count(s.id) >= 4;
$$;

-- LP for one lifter over one week-long window, by source (RANK_SYSTEM.md §18).
create function public.league_lp_breakdown(p_user uuid, p_from timestamptz, p_to timestamptz)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  v_days integer;
  v_planned integer;
  v_prs integer;
  v_ups integer;
  v_sets numeric;
  v_baseline numeric;
  v_workouts integer;
  v_gain numeric;
  r jsonb;
begin
  select count(distinct q.ist_day), count(*), coalesce(sum(q.sets), 0)
  into v_days, v_workouts, v_sets
  from public.league_qualifying_workouts(p_user, p_from, p_to) q;

  -- Planned sessions done within a day of their planned date (one per day).
  select count(distinct q.ist_day) into v_planned
  from public.league_qualifying_workouts(p_user, p_from, p_to) q
  join public.plan_days d on d.id = q.plan_day_id
  join public.plans p on p.id = d.plan_id and p.user_id = p_user
  where abs(q.ist_day - d.date) <= 1;

  select count(*) into v_prs from public.personal_records pr
  where pr.user_id = p_user and pr.previous_value is not null
    and pr.achieved_at >= p_from and pr.achieved_at < p_to;

  select count(*) into v_ups
  from public.rank_events e
  left join public.workouts w on w.id = e.workout_id
  where e.user_id = p_user and e.scope = 'lift' and e.kind in ('rank_up', 'placed')
    and coalesce(w.started_at, e.created_at) >= p_from
    and coalesce(w.started_at, e.created_at) < p_to;

  -- Beat your baseline: this week's working sets vs your own 4-week weekly average.
  select coalesce(sum(q.sets), 0) / 4.0 into v_baseline
  from public.league_qualifying_workouts(p_user, p_from - interval '28 days', p_from) q;

  -- Strength gain: positive lift-score changes this week on lifts you already had.
  select coalesce(sum(greatest(0, a.score - b.score)), 0) into v_gain
  from (
    select distinct on (s.key) s.key, s.score from public.rank_snapshots s
    where s.user_id = p_user and s.scope = 'lift' and s.taken_at < p_to
    order by s.key, s.taken_at desc, s.id desc
  ) a
  join (
    select distinct on (s.key) s.key, s.score from public.rank_snapshots s
    where s.user_id = p_user and s.scope = 'lift' and s.taken_at < p_from
    order by s.key, s.taken_at desc, s.id desc
  ) b on b.key = a.key;

  r := jsonb_build_object(
    'workouts', 40 * v_days,
    'planned', 15 * v_planned,
    'prs', 10 * least(v_prs, 6),
    'rank_ups', 30 * least(v_ups, 3),
    'baseline', case
      when v_baseline > 0 and v_sets >= 1.1 * v_baseline then 50
      when v_baseline = 0 and v_workouts >= 2 then 50
      else 0 end,
    'strength', least(60, round(2 * v_gain)::integer),
    'counts', jsonb_build_object('days', v_days, 'planned', v_planned, 'prs', v_prs,
      'rank_ups', v_ups, 'sets', v_sets, 'baseline_sets', round(v_baseline, 1),
      'score_gain', round(v_gain, 1))
  );
  return r || jsonb_build_object('total',
    (r ->> 'workouts')::integer + (r ->> 'planned')::integer + (r ->> 'prs')::integer
    + (r ->> 'rank_ups')::integer + (r ->> 'baseline')::integer + (r ->> 'strength')::integer);
end;
$$;

create function public.league_lp(p_user uuid, p_from timestamptz, p_to timestamptz)
returns integer
language sql
stable
set search_path = ''
as $$
  select (public.league_lp_breakdown(p_user, p_from, p_to) ->> 'total')::integer;
$$;

-- A member's points in a league up to p_to (or the league's end), by its scoring.
create function public.league_member_points(p_league public.leagues, p_user uuid, p_to timestamptz)
returns integer
language plpgsql
stable
set search_path = ''
as $$
declare
  v_to timestamptz := least(coalesce(p_to, p_league.ends_at), p_league.ends_at);
  v_points numeric := 0;
  v_week timestamptz;
  v_start numeric;
  v_end numeric;
begin
  if v_to <= p_league.starts_at then
    return 0;
  end if;
  case p_league.scoring
    when 'lp' then
      -- Weekly caps apply per IST week inside the league's window.
      v_week := public.league_week_start(p_league.starts_at);
      while v_week < v_to loop
        v_points := v_points + public.league_lp(p_user, greatest(v_week, p_league.starts_at),
          least(v_week + interval '7 days', v_to));
        v_week := v_week + interval '7 days';
      end loop;
    when 'attendance' then
      select count(distinct q.ist_day) into v_points
      from public.league_qualifying_workouts(p_user, p_league.starts_at, v_to) q;
    when 'volume' then
      select coalesce(sum(case
          when s.weight_mode = 'absolute' then s.weight_kg * s.reps
          when s.weight_mode = 'bodyweight' then greatest(0, coalesce(s.weight_kg, 0)) * s.reps
          else 0 end), 0)
      into v_points
      from public.workouts w
      join public.workout_exercises we on we.workout_id = w.id
      join public.workout_sets s on s.workout_exercise_id = we.id
      where w.user_id = p_user and w.status = 'completed'
        and w.started_at >= p_league.starts_at and w.started_at < v_to
        and s.completed and not s.failed and s.set_type <> 'warmup';
    when 'lift_improvement' then
      -- Rank Score gained on the chosen lift: from your score at the start (or your first score in
      -- the league, for a lift you hadn't ranked yet) to your latest.
      select s.score into v_start from public.rank_snapshots s
      where s.user_id = p_user and s.scope = 'lift' and s.key = p_league.scoring_rank_key
        and s.taken_at < p_league.starts_at
      order by s.taken_at desc, s.id desc limit 1;
      if v_start is null then
        select s.score into v_start from public.rank_snapshots s
        where s.user_id = p_user and s.scope = 'lift' and s.key = p_league.scoring_rank_key
          and s.taken_at >= p_league.starts_at and s.taken_at < v_to
        order by s.taken_at, s.id limit 1;
      end if;
      select s.score into v_end from public.rank_snapshots s
      where s.user_id = p_user and s.scope = 'lift' and s.key = p_league.scoring_rank_key
        and s.taken_at < v_to
      order by s.taken_at desc, s.id desc limit 1;
      v_points := greatest(0, coalesce(v_end - v_start, 0));
  end case;
  return round(v_points)::integer;
end;
$$;

-- Ordered standings of a league: points so far (or the frozen result), ties to whoever trained
-- first (the earlier last qualifying workout), then by join time.
create function public.league_ranking(p_league uuid, p_to timestamptz)
returns table (user_id uuid, points integer, last_at timestamptz, place integer)
language sql
stable
set search_path = ''
as $$
  with l as (select * from public.leagues where id = p_league),
  pts as (
    select m.user_id, m.joined_at,
      case when l.status = 'closed' and m.final_points is not null then m.final_points
        else public.league_member_points(l, m.user_id, p_to) end as points,
      (select max(w.started_at) from public.workouts w
        where w.user_id = m.user_id and w.status = 'completed'
          and w.started_at >= l.starts_at and w.started_at < least(l.ends_at, p_to)) as last_at
    from public.league_members m cross join l
    where m.league_id = l.id
  )
  select p.user_id, p.points, p.last_at,
    (row_number() over (order by p.points desc, p.last_at asc nulls last, p.joined_at, p.user_id))::integer
  from pts p;
$$;

-- How many promote and demote in a group of n (top and bottom 20%, rounded).
create function public.league_zone_size(p_members integer)
returns integer
language sql
immutable
set search_path = ''
as $$
  select floor(p_members * 0.2 + 0.5)::integer;
$$;

-- ─── The weekly cycle ───────────────────────────────────────────────────────────────────────────

-- Overall Rank Score as of a moment (0 before placement).
create function public.league_seed_score(p_user uuid, p_at timestamptz)
returns numeric
language sql
stable
set search_path = ''
as $$
  select coalesce((
    select s.score from public.rank_snapshots s
    where s.user_id = p_user and s.scope = 'overall' and s.taken_at <= p_at
    order by s.taken_at desc, s.id desc limit 1), 0);
$$;

-- Two challenges per week from a fixed pool, picked by week.
create function public.league_add_challenges(p_league uuid, p_pick integer)
returns void
language plpgsql
set search_path = ''
as $$
declare
  l public.leagues;
begin
  select * into l from public.leagues where id = p_league;
  insert into public.league_challenges (league_id, kind, title, rank_key, target, starts_at, ends_at)
  select l.id, c.kind::public.challenge_kind, c.title, c.rank_key, c.target, l.starts_at, l.ends_at
  from (values
    (0, 'most_reps', 'Most pull-ups this week', 'pullUp', null::integer),
    (1, 'lift_frequency', 'Squat 4 times in 7 days', 'backSquat', 4),
    (2, 'workouts', 'Five workouts this week', null, 5),
    (3, 'most_reps', 'Most push-ups this week', 'pushUp', null),
    (4, 'lift_frequency', 'Bench 3 times this week', 'benchPress', 3),
    (5, 'lift_frequency', 'Deadlift twice this week', 'deadlift', 2)
  ) c(n, kind, title, rank_key, target)
  where c.n in ((2 * p_pick) % 6, (2 * p_pick + 1) % 6);
end;
$$;

create function public.league_close_league(p_league uuid, p_at timestamptz)
returns void
language plpgsql
set search_path = ''
as $$
declare
  l public.leagues;
  v_n integer;
  v_zone integer;
begin
  select * into l from public.leagues where id = p_league for update;
  if l.status = 'closed' then
    return;
  end if;
  select count(*) into v_n from public.league_members where league_id = l.id;
  v_zone := public.league_zone_size(v_n);

  update public.league_members m set
    final_points = r.points,
    final_position = r.place,
    outcome = case
      when l.kind <> 'ranked' then null
      when r.place <= v_zone and r.points > 0 and l.division <> 'legend' then 'promoted'
      when r.place > v_n - v_zone and l.division <> 'rookie' then 'demoted'
      else 'stayed' end::public.league_outcome
  from public.league_ranking(l.id, l.ends_at) r
  where m.league_id = l.id and m.user_id = r.user_id;

  if l.kind = 'ranked' then
    insert into public.league_standing (user_id, division, updated_at)
    select m.user_id,
      (enum_range(null::public.league_division))[
        array_position(enum_range(null::public.league_division), l.division)
        + case m.outcome when 'promoted' then 1 when 'demoted' then -1 else 0 end],
      p_at
    from public.league_members m where m.league_id = l.id
    on conflict (user_id) do update set division = excluded.division, updated_at = excluded.updated_at;
  end if;

  update public.leagues set status = 'closed' where id = l.id;
end;
$$;

-- Places one lifter into this week's group for their division with the closest seed score and
-- room (≤ 35); opens a new group when every one is full. Returns the league id.
create function public.league_place(p_user uuid, p_week public.league_weeks, p_at timestamptz)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_division public.league_division;
  v_seed numeric := public.league_seed_score(p_user, p_at);
  v_league uuid;
  v_group smallint;
  v_season integer;
begin
  select l.id into v_league from public.leagues l
  join public.league_members m on m.league_id = l.id
  where l.week_id = p_week.id and m.user_id = p_user;
  if found then
    return v_league;
  end if;

  insert into public.league_standing (user_id) values (p_user) on conflict do nothing;
  select division into v_division from public.league_standing where user_id = p_user;

  select l.id into v_league
  from public.leagues l
  left join public.league_members m on m.league_id = l.id
  where l.week_id = p_week.id and l.division = v_division
  group by l.id
  having count(m.user_id) < 35
  order by abs(coalesce(avg(m.seed_score), 0) - v_seed), l.group_no
  limit 1;

  if v_league is null then
    select coalesce(max(group_no), 0) + 1 into v_group from public.leagues
    where week_id = p_week.id and division = v_division;
    insert into public.leagues (kind, week_id, division, group_no, name, starts_at, ends_at, max_members)
    values ('ranked', p_week.id, v_division, v_group, initcap(v_division::text) || ' league',
      p_week.starts_at, p_week.ends_at, 35)
    returning id into v_league;
    select number into v_season from public.league_seasons where id = p_week.season_id;
    perform public.league_add_challenges(v_league, v_season * 8 + p_week.week_no);
  end if;

  insert into public.league_members (league_id, user_id, joined_at, seed_score)
  values (v_league, p_user, p_at, v_seed);
  return v_league;
end;
$$;

-- Opens the week containing p_now: season, week row and placement of everyone active in the last
-- 14 days into near-equal groups of up to 30, ordered by overall score within each division.
create function public.league_open_week(p_now timestamptz)
returns bigint
language plpgsql
set search_path = ''
-- Quiet the "temp table does not exist" notice from the drop below.
set client_min_messages = warning
as $$
declare
  v_start timestamptz := public.league_week_start(p_now);
  v_season public.league_seasons;
  v_week public.league_weeks;
  v_division public.league_division;
  v_n integer;
  v_groups integer;
  g integer;
  v_league uuid;
begin
  select * into v_week from public.league_weeks where starts_at = v_start;
  if found then
    return v_week.id;
  end if;

  select * into v_season from public.league_seasons
  where starts_at <= v_start and ends_at > v_start
  order by number desc limit 1;
  if not found then
    insert into public.league_seasons (number, starts_at, ends_at)
    values ((select coalesce(max(number), 0) + 1 from public.league_seasons), v_start,
      v_start + interval '56 days')
    returning * into v_season;
  end if;

  insert into public.league_weeks (season_id, week_no, starts_at, ends_at)
  values (v_season.id, (extract(epoch from v_start - v_season.starts_at) / 604800)::integer + 1,
    v_start, v_start + interval '7 days')
  returning * into v_week;

  drop table if exists pg_temp.lg_eligible;
  create temp table lg_eligible on commit drop as
  select p.id as user_id, coalesce(st.division, 'rookie') as division,
    public.league_seed_score(p.id, p_now) as seed
  from public.profiles p
  left join public.league_standing st on st.user_id = p.id
  where p.onboarded_at is not null
    and exists (select 1 from public.workouts w
      where w.user_id = p.id and w.status = 'completed'
        and w.started_at >= p_now - interval '14 days' and w.started_at < p_now);

  insert into public.league_standing (user_id)
  select user_id from pg_temp.lg_eligible on conflict do nothing;

  foreach v_division in array enum_range(null::public.league_division) loop
    select count(*) into v_n from pg_temp.lg_eligible where division = v_division;
    continue when v_n = 0;
    v_groups := ceil(v_n / 30.0);
    for g in 1..v_groups loop
      insert into public.leagues (kind, week_id, division, group_no, name, starts_at, ends_at, max_members)
      values ('ranked', v_week.id, v_division, g, initcap(v_division::text) || ' league',
        v_week.starts_at, v_week.ends_at, 35)
      returning id into v_league;
      perform public.league_add_challenges(v_league, v_season.number * 8 + v_week.week_no);
    end loop;
    insert into public.league_members (league_id, user_id, joined_at, seed_score)
    select l.id, e.user_id, p_now, e.seed
    from (
      select e.*, (row_number() over (order by e.seed desc, e.user_id) - 1) as i
      from pg_temp.lg_eligible e where e.division = v_division
    ) e
    join public.leagues l on l.week_id = v_week.id and l.division = v_division
      and l.group_no = floor(e.i * v_groups / v_n) + 1;
  end loop;
  return v_week.id;
end;
$$;

-- The whole cycle. Returns what it did.
create function public.league_run_cycle(p_now timestamptz default now())
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  w record;
  s record;
  lg record;
  v_closed integer := 0;
  v_seasons integer := 0;
  v_custom integer := 0;
  v_week bigint;
begin
  perform pg_advisory_xact_lock(hashtextextended('league-cycle', 0));

  -- 1. Close finished weeks: final standings, promotion and demotion.
  for w in select * from public.league_weeks where status = 'open' and ends_at <= p_now
    order by starts_at loop
    for lg in select id from public.leagues where week_id = w.id and status = 'open' loop
      perform public.league_close_league(lg.id, w.ends_at);
    end loop;
    update public.league_weeks set status = 'closed', closed_at = p_now where id = w.id;
    v_closed := v_closed + 1;
  end loop;

  -- 2. Finish seasons whose last week is over: a badge for the best division reached, and an
  -- avatar frame for Elite and Legend.
  for s in select * from public.league_seasons where status = 'open' and ends_at <= p_now loop
    insert into public.season_rewards (user_id, season_id, best_division, badge_key, frame_key)
    select x.user_id, s.id, x.best,
      format('season-%s-%s', s.number, x.best),
      case when x.best in ('elite', 'legend') then format('season-%s', x.best) end
    from (
      select m.user_id, max(l.division) as best
      from public.league_members m
      join public.leagues l on l.id = m.league_id
      join public.league_weeks wk on wk.id = l.week_id
      where wk.season_id = s.id
      group by m.user_id
    ) x
    on conflict (user_id, season_id) do nothing;
    update public.league_seasons set status = 'closed' where id = s.id;
    v_seasons := v_seasons + 1;
  end loop;

  -- 3. Open the week containing p_now.
  v_week := public.league_open_week(p_now);

  -- 4. Close finished custom leagues.
  for lg in select id, ends_at from public.leagues
    where kind <> 'ranked' and status = 'open' and ends_at <= p_now loop
    perform public.league_close_league(lg.id, lg.ends_at);
    v_custom := v_custom + 1;
  end loop;

  return jsonb_build_object('closed_weeks', v_closed, 'closed_seasons', v_seasons,
    'open_week', v_week, 'closed_custom', v_custom);
end;
$$;

-- A first workout mid-week joins this week's league straight away.
create function public.league_join_on_workout()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_week public.league_weeks;
begin
  if new.status <> 'completed' or (tg_op = 'UPDATE' and old.status = 'completed') then
    return null;
  end if;
  select * into v_week from public.league_weeks
  where status = 'open' and starts_at <= new.started_at and ends_at > new.started_at;
  if not found then
    return null;
  end if;
  if not exists (select 1 from public.profiles where id = new.user_id and onboarded_at is not null) then
    return null;
  end if;
  perform public.league_place(new.user_id, v_week, coalesce(new.ended_at, new.started_at));
  return null;
end;
$$;

create trigger workouts_league_join
  after insert or update of status on public.workouts
  for each row execute function public.league_join_on_workout();

-- ─── Client reads ───────────────────────────────────────────────────────────────────────────────

create function public.is_league_member(p_league uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.league_members
    where league_id = p_league and user_id = (select auth.uid()));
$$;

-- Standings of a league the caller belongs to: name, avatar, points, position and zone.
create function public.get_league_standings(p_league uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  l public.leagues;
  v_n integer;
  v_zone integer;
begin
  if not public.is_league_member(p_league) then
    return null;
  end if;
  select * into l from public.leagues where id = p_league;
  select count(*) into v_n from public.league_members where league_id = l.id;
  v_zone := case when l.kind = 'ranked' then public.league_zone_size(v_n) else 0 end;
  return jsonb_build_object(
    'league_id', l.id, 'kind', l.kind, 'name', l.name, 'division', l.division,
    'scoring', l.scoring, 'scoring_rank_key', l.scoring_rank_key, 'status', l.status,
    'starts_at', l.starts_at, 'ends_at', l.ends_at, 'invite_code',
    case when l.kind = 'custom' then l.invite_code end,
    'is_owner', l.owner_id = (select auth.uid()),
    'members', v_n,
    'promote', case when l.division = 'legend' then 0 else v_zone end,
    'demote', case when l.division = 'rookie' then 0 else v_zone end,
    'rows', coalesce((
      select jsonb_agg(jsonb_build_object(
          'position', r.place, 'user_id', r.user_id, 'points', r.points,
          'display_name', coalesce(p.display_name, p.username, 'Lifter'),
          'username', p.username, 'avatar_url', p.avatar_url,
          'is_you', r.user_id = (select auth.uid()),
          'outcome', m.outcome,
          'zone', case
            when l.kind <> 'ranked' then null
            when r.place <= v_zone and l.division <> 'legend' then 'promotion'
            when r.place > v_n - v_zone and l.division <> 'rookie' then 'demotion'
          end)
        order by r.place)
      from public.league_ranking(l.id, public.league_now()) r
      join public.profiles p on p.id = r.user_id
      join public.league_members m on m.league_id = l.id and m.user_id = r.user_id
    ), '[]'::jsonb)
  );
end;
$$;

-- One challenge's value for one lifter.
create function public.league_challenge_value(c public.league_challenges, p_user uuid)
returns integer
language sql
stable
set search_path = ''
as $$
  select case c.kind
    when 'workouts' then (
      select count(distinct q.ist_day)::integer
      from public.league_qualifying_workouts(p_user, c.starts_at, c.ends_at) q)
    when 'most_reps' then (
      select coalesce(sum(s.reps), 0)::integer
      from public.workouts w
      join public.workout_exercises we on we.workout_id = w.id
      join public.workout_sets s on s.workout_exercise_id = we.id
      join public.exercises x on x.id = we.exercise_id
      where w.user_id = p_user and w.status = 'completed' and x.rank_key = c.rank_key
        and w.started_at >= c.starts_at and w.started_at < c.ends_at
        and s.completed and not s.failed and s.set_type <> 'warmup')
    when 'lift_frequency' then (
      select count(distinct (w.started_at at time zone 'Asia/Kolkata')::date)::integer
      from public.workouts w
      join public.workout_exercises we on we.workout_id = w.id
      join public.workout_sets s on s.workout_exercise_id = we.id
      join public.exercises x on x.id = we.exercise_id
      where w.user_id = p_user and w.status = 'completed' and x.rank_key = c.rank_key
        and w.started_at >= c.starts_at and w.started_at < c.ends_at
        and s.completed and not s.failed and s.set_type <> 'warmup')
  end;
$$;

create function public.get_league_challenges(p_league uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  c public.league_challenges;
  v_item jsonb;
  v_out jsonb := '[]'::jsonb;
begin
  if not public.is_league_member(p_league) then
    return null;
  end if;
  for c in select * from public.league_challenges where league_id = p_league
    order by created_at, title loop
    with vals as (
      select m.user_id, public.league_challenge_value(c, m.user_id) as value
      from public.league_members m where m.league_id = p_league
    )
    select jsonb_build_object(
      'id', c.id, 'kind', c.kind, 'title', c.title, 'rank_key', c.rank_key,
      'target', c.target, 'starts_at', c.starts_at, 'ends_at', c.ends_at,
      'mine', coalesce((select v.value from vals v where v.user_id = (select auth.uid())), 0),
      'completed_by', (select count(*) from vals v
        where c.target is not null and v.value >= c.target),
      'leaders', (
        select coalesce(jsonb_agg(jsonb_build_object('display_name', t.name, 'value', t.value,
          'is_you', t.user_id = (select auth.uid())) order by t.value desc, t.name), '[]'::jsonb)
        from (
          select v.user_id, v.value, coalesce(p.display_name, p.username, 'Lifter') as name
          from vals v join public.profiles p on p.id = v.user_id
          where v.value > 0
          order by v.value desc, name
          limit 3
        ) t))
    into v_item;
    v_out := v_out || jsonb_build_array(v_item);
  end loop;
  return v_out;
end;
$$;

-- The Leagues tab in one call: season and week, my division, my current group and LP
-- breakdown, an unseen result, and my open custom leagues.
create function public.get_league_home()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_week public.league_weeks;
  v_season public.league_seasons;
  v_league public.leagues;
  v_mine record;
  v_n integer;
  v_result jsonb;
begin
  if v_uid is null then
    return null;
  end if;
  select * into v_week from public.league_weeks where status = 'open'
  order by starts_at desc limit 1;
  if found then
    select * into v_season from public.league_seasons where id = v_week.season_id;
    select l.* into v_league from public.leagues l
    join public.league_members m on m.league_id = l.id and m.user_id = v_uid
    where l.week_id = v_week.id;
  end if;

  if v_league.id is not null then
    select count(*) into v_n from public.league_members where league_id = v_league.id;
    select r.place, r.points into v_mine from public.league_ranking(v_league.id, public.league_now()) r
    where r.user_id = v_uid;
  end if;

  -- The latest closed ranked week I played and haven't seen the result of.
  select jsonb_build_object('league_id', l.id, 'week_id', l.week_id, 'week_no', wk.week_no,
      'season_number', ss.number, 'division', l.division, 'position', m.final_position,
      'points', m.final_points, 'outcome', m.outcome,
      'members', (select count(*) from public.league_members x where x.league_id = l.id),
      'new_division', st.division)
  into v_result
  from public.league_members m
  join public.leagues l on l.id = m.league_id and l.kind = 'ranked' and l.status = 'closed'
  join public.league_weeks wk on wk.id = l.week_id
  join public.league_seasons ss on ss.id = wk.season_id
  left join public.league_standing st on st.user_id = m.user_id
  where m.user_id = v_uid and m.result_seen_at is null
  order by wk.starts_at desc limit 1;

  return jsonb_build_object(
    'season', case when v_season.id is null then null else jsonb_build_object(
      'id', v_season.id, 'number', v_season.number, 'starts_at', v_season.starts_at,
      'ends_at', v_season.ends_at) end,
    'week', case when v_week.id is null then null else jsonb_build_object(
      'id', v_week.id, 'week_no', v_week.week_no, 'starts_at', v_week.starts_at,
      'ends_at', v_week.ends_at) end,
    'division', coalesce((select division from public.league_standing where user_id = v_uid),
      'rookie'),
    'league', case when v_league.id is null then null else jsonb_build_object(
      'id', v_league.id, 'name', v_league.name, 'division', v_league.division,
      'members', v_n, 'position', v_mine.place, 'points', v_mine.points,
      'promote', case when v_league.division = 'legend' then 0 else public.league_zone_size(v_n) end,
      'demote', case when v_league.division = 'rookie' then 0 else public.league_zone_size(v_n) end) end,
    'breakdown', case when v_week.id is null then null
      else public.league_lp_breakdown(v_uid, v_week.starts_at, least(public.league_now(), v_week.ends_at)) end,
    'result', v_result,
    'custom', coalesce((
      select jsonb_agg(jsonb_build_object('id', l.id, 'name', l.name, 'scoring', l.scoring,
          'scoring_rank_key', l.scoring_rank_key, 'ends_at', l.ends_at,
          'members', (select count(*) from public.league_members x where x.league_id = l.id),
          'position', (select r.place from public.league_ranking(l.id, public.league_now()) r
            where r.user_id = v_uid))
        order by l.ends_at)
      from public.leagues l
      join public.league_members m on m.league_id = l.id and m.user_id = v_uid
      where l.kind = 'custom' and l.status = 'open'), '[]'::jsonb)
  );
end;
$$;

-- My finished leagues, newest first.
create function public.get_league_history()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
      'league_id', l.id, 'kind', l.kind, 'name', l.name, 'division', l.division,
      'scoring', l.scoring, 'season_id', wk.season_id, 'season_number', ss.number,
      'week_no', wk.week_no, 'starts_at', l.starts_at, 'ends_at', l.ends_at,
      'position', m.final_position, 'points', m.final_points, 'outcome', m.outcome,
      'members', (select count(*) from public.league_members x where x.league_id = l.id))
    order by l.ends_at desc), '[]'::jsonb)
  from public.league_members m
  join public.leagues l on l.id = m.league_id and l.status = 'closed'
  left join public.league_weeks wk on wk.id = l.week_id
  left join public.league_seasons ss on ss.id = wk.season_id
  where m.user_id = (select auth.uid());
$$;

-- A season in review for the caller.
create function public.get_season_recap(p_season integer)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with s as (select * from public.league_seasons where id = p_season),
  mine as (
    select l.division, wk.week_no, m.final_position, m.final_points, m.outcome,
      (select count(*) from public.league_members x where x.league_id = l.id) as members
    from public.league_members m
    join public.leagues l on l.id = m.league_id and l.kind = 'ranked'
    join public.league_weeks wk on wk.id = l.week_id
    where wk.season_id = p_season and m.user_id = (select auth.uid())
  )
  select jsonb_build_object(
    'season', (select jsonb_build_object('id', s.id, 'number', s.number, 'starts_at', s.starts_at,
      'ends_at', s.ends_at, 'status', s.status) from s),
    'weeks_played', (select count(*) from mine),
    'total_points', (select coalesce(sum(final_points), 0) from mine),
    'best_finish', (select min(final_position) from mine),
    'promotions', (select count(*) from mine where outcome = 'promoted'),
    'demotions', (select count(*) from mine where outcome = 'demoted'),
    'best_division', (select max(division) from mine),
    'weeks', coalesce((select jsonb_agg(jsonb_build_object('week_no', week_no, 'division', division,
      'position', final_position, 'points', final_points, 'outcome', outcome, 'members', members)
      order by week_no) from mine), '[]'::jsonb),
    'workouts', (select count(*) from public.workouts w, s
      where w.user_id = (select auth.uid()) and w.status = 'completed'
        and w.started_at >= s.starts_at and w.started_at < s.ends_at),
    'prs', (select count(*) from public.personal_records p, s
      where p.user_id = (select auth.uid()) and p.previous_value is not null
        and p.achieved_at >= s.starts_at and p.achieved_at < s.ends_at),
    'rank_ups', (select count(*) from public.rank_events e
      left join public.workouts w on w.id = e.workout_id, s
      where e.user_id = (select auth.uid()) and e.scope = 'lift' and e.kind = 'rank_up'
        and coalesce(w.started_at, e.created_at) >= s.starts_at
        and coalesce(w.started_at, e.created_at) < s.ends_at),
    'reward', (select jsonb_build_object('best_division', r.best_division, 'badge_key', r.badge_key,
      'frame_key', r.frame_key) from public.season_rewards r
      where r.season_id = p_season and r.user_id = (select auth.uid()))
  );
$$;

-- ─── Client writes: custom leagues and challenges ───────────────────────────────────────────────

create function public.create_custom_league(
  p_name text,
  p_weeks integer,
  p_scoring public.league_scoring,
  p_rank_key text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_code text;
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'Sign in first' using errcode = '42501';
  end if;
  if p_weeks is null or p_weeks not between 1 and 8 then
    raise exception 'A league runs 1 to 8 weeks' using errcode = '22023';
  end if;
  if (p_scoring = 'lift_improvement') <> (p_rank_key is not null) then
    raise exception 'Pick a lift for lift-improvement leagues (and only then)' using errcode = '22023';
  end if;
  if (select count(*) from public.leagues where owner_id = v_uid and status = 'open') >= 5 then
    raise exception 'You can run 5 leagues at a time' using errcode = '22023';
  end if;
  loop
    select string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 1 + floor(random() * 32)::integer, 1), '')
    into v_code from generate_series(1, 8);
    exit when not exists (select 1 from public.leagues where invite_code = v_code);
  end loop;
  insert into public.leagues (kind, name, owner_id, scoring, scoring_rank_key, starts_at, ends_at,
    invite_code, max_members)
  values ('custom', btrim(p_name), v_uid, p_scoring, p_rank_key, public.league_now(),
    public.league_now() + p_weeks * interval '7 days', v_code, 50)
  returning id into v_id;
  insert into public.league_members (league_id, user_id, seed_score)
  values (v_id, v_uid, public.league_seed_score(v_uid, public.league_now()));
  return jsonb_build_object('id', v_id, 'invite_code', v_code);
end;
$$;

create function public.join_league(p_code text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  l public.leagues;
begin
  if v_uid is null then
    raise exception 'Sign in first' using errcode = '42501';
  end if;
  select * into l from public.leagues
  where invite_code = upper(btrim(p_code)) and kind = 'custom' for update;
  if not found then
    raise exception 'No league with that code' using errcode = 'P0002';
  end if;
  if l.status = 'closed' or l.ends_at <= public.league_now() then
    raise exception 'That league has finished' using errcode = '22023';
  end if;
  if exists (select 1 from public.league_members where league_id = l.id and user_id = v_uid) then
    return l.id;
  end if;
  if (select count(*) from public.league_members where league_id = l.id) >= l.max_members then
    raise exception 'That league is full' using errcode = '22023';
  end if;
  insert into public.league_members (league_id, user_id, seed_score)
  values (l.id, v_uid, public.league_seed_score(v_uid, public.league_now()));
  return l.id;
end;
$$;

-- Leave a custom league. The owner leaving ends it for everyone.
create function public.leave_league(p_league uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  l public.leagues;
begin
  select * into l from public.leagues where id = p_league;
  if not found or l.kind <> 'custom' then
    raise exception 'Only custom leagues can be left' using errcode = '22023';
  end if;
  if l.owner_id = v_uid then
    delete from public.leagues where id = l.id;
  else
    delete from public.league_members where league_id = l.id and user_id = v_uid;
  end if;
end;
$$;

create function public.create_league_challenge(
  p_league uuid,
  p_kind public.challenge_kind,
  p_title text,
  p_rank_key text default null,
  p_target integer default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  l public.leagues;
  v_id uuid;
begin
  select * into l from public.leagues where id = p_league;
  if not found or l.kind <> 'custom' or l.owner_id is distinct from (select auth.uid()) then
    raise exception 'Only the league''s creator can add challenges' using errcode = '42501';
  end if;
  if l.status = 'closed' then
    raise exception 'That league has finished' using errcode = '22023';
  end if;
  if (select count(*) from public.league_challenges where league_id = l.id) >= 10 then
    raise exception 'A league can have 10 challenges' using errcode = '22023';
  end if;
  insert into public.league_challenges (league_id, kind, title, rank_key, target, starts_at,
    ends_at, created_by)
  values (l.id, p_kind, btrim(p_title), p_rank_key, p_target, public.league_now(), l.ends_at,
    (select auth.uid()))
  returning id into v_id;
  return v_id;
end;
$$;

create function public.mark_league_result_seen(p_league uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  -- Seeing the latest result clears older unseen ones too (one sheet, not a backlog).
  update public.league_members m set result_seen_at = now()
  from public.leagues l
  where l.id = m.league_id and m.user_id = (select auth.uid()) and m.result_seen_at is null
    and l.status = 'closed'
    and l.ends_at <= (select x.ends_at from public.leagues x where x.id = p_league);
$$;

-- ─── Row level security and grants ──────────────────────────────────────────────────────────────

alter table public.league_seasons enable row level security;
alter table public.league_weeks enable row level security;
alter table public.leagues enable row level security;
alter table public.league_members enable row level security;
alter table public.league_standing enable row level security;
alter table public.league_challenges enable row level security;
alter table public.season_rewards enable row level security;

create policy "league_seasons: signed-in users can read"
  on public.league_seasons for select to authenticated using (true);
create policy "league_weeks: signed-in users can read"
  on public.league_weeks for select to authenticated using (true);
create policy "leagues: members can read"
  on public.leagues for select to authenticated using (public.is_league_member(id));
create policy "league_members: members can read"
  on public.league_members for select to authenticated using (public.is_league_member(league_id));
create policy "league_standing: owner can read"
  on public.league_standing for select to authenticated using (user_id = (select auth.uid()));
create policy "league_challenges: members can read"
  on public.league_challenges for select to authenticated
  using (public.is_league_member(league_id));
create policy "season_rewards: owner can read"
  on public.season_rewards for select to authenticated using (user_id = (select auth.uid()));

revoke all on public.league_seasons, public.league_weeks, public.leagues, public.league_members,
  public.league_standing, public.league_challenges, public.season_rewards from anon, authenticated;
grant select on public.league_seasons, public.league_weeks, public.leagues, public.league_members,
  public.league_standing, public.league_challenges, public.season_rewards to authenticated;

-- Engine internals: not callable by clients.
revoke execute on function
  public.league_qualifying_workouts(uuid, timestamptz, timestamptz),
  public.league_lp_breakdown(uuid, timestamptz, timestamptz),
  public.league_lp(uuid, timestamptz, timestamptz),
  public.league_member_points(public.leagues, uuid, timestamptz),
  public.league_ranking(uuid, timestamptz),
  public.league_seed_score(uuid, timestamptz),
  public.league_add_challenges(uuid, integer),
  public.league_close_league(uuid, timestamptz),
  public.league_place(uuid, public.league_weeks, timestamptz),
  public.league_open_week(timestamptz),
  public.league_run_cycle(timestamptz),
  public.league_join_on_workout(),
  public.league_challenge_value(public.league_challenges, uuid)
  from public, anon, authenticated;

revoke execute on function
  public.league_now(),
  public.is_league_member(uuid),
  public.get_league_standings(uuid),
  public.get_league_challenges(uuid),
  public.get_league_home(),
  public.get_league_history(),
  public.get_season_recap(integer),
  public.create_custom_league(text, integer, public.league_scoring, text),
  public.join_league(text),
  public.leave_league(uuid),
  public.create_league_challenge(uuid, public.challenge_kind, text, text, integer),
  public.mark_league_result_seen(uuid)
  from public, anon;
grant execute on function
  public.league_now(),
  public.is_league_member(uuid),
  public.get_league_standings(uuid),
  public.get_league_challenges(uuid),
  public.get_league_home(),
  public.get_league_history(),
  public.get_season_recap(integer),
  public.create_custom_league(text, integer, public.league_scoring, text),
  public.join_league(text),
  public.leave_league(uuid),
  public.create_league_challenge(uuid, public.challenge_kind, text, text, integer),
  public.mark_league_result_seen(uuid)
  to authenticated;

-- ─── Schedule ───────────────────────────────────────────────────────────────────────────────────

-- Hourly and idempotent: the Monday 00:00 IST reset runs at 00:05 IST, and a missed run catches up.
select cron.schedule('league-weekly-cycle', '35 * * * *', 'select public.league_run_cycle()');
