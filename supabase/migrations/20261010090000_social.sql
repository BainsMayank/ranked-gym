-- Phase 9: the social graph (friends, follows, blocks), posts, Respect, comments, reports,
-- in-app notifications, the Feed and Discover reads. Rules: PRODUCT_SPEC §10I, ranking:
-- docs/DISCOVER_RANKING.md, schema: docs/SCHEMA.md → Social.
--
-- Visibility is decided only here. A post is visible when the viewer is its author, or when
-- neither has blocked the other and the more restrictive of the post's and the author's profile
-- visibility allows it (public: everyone signed in; friends: accepted friends; private: nobody).

-- ─── Types ──────────────────────────────────────────────────────────────────────────────────────

create type public.friendship_status as enum ('pending', 'accepted', 'declined');
create type public.post_type as enum (
  'workout', 'text', 'photo', 'pr', 'rank_up', 'goal', 'league_result');
create type public.milestone_post_mode as enum ('auto', 'ask', 'never');
create type public.report_reason as enum (
  'spam', 'harassment', 'hate', 'nudity', 'violence', 'self_harm', 'false_info', 'other');
create type public.notification_kind as enum (
  'respect', 'comment', 'reply', 'mention', 'friend_request', 'friend_accepted', 'follow');

alter table public.user_settings
  add column milestone_posts public.milestone_post_mode not null default 'ask';

-- ─── Graph ──────────────────────────────────────────────────────────────────────────────────────

create table public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles (id) on delete cascade,
  addressee_id uuid not null references public.profiles (id) on delete cascade,
  status public.friendship_status not null default 'pending',
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  constraint friendships_not_self check (requester_id <> addressee_id)
);

-- One row per pair, whoever asked.
create unique index friendships_pair on public.friendships (
  least(requester_id, addressee_id), greatest(requester_id, addressee_id));
create index friendships_addressee on public.friendships (addressee_id, status);
create index friendships_requester on public.friendships (requester_id, status);

comment on table public.friendships is
  'Friend requests and friendships (mutual once accepted). Either side can read; RPC writes only.';

create table public.follows (
  follower_id uuid not null references public.profiles (id) on delete cascade,
  followee_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followee_id),
  constraint follows_not_self check (follower_id <> followee_id)
);

create index follows_followee on public.follows (followee_id);

comment on table public.follows is
  'One-way follows of public profiles. Either side can read; RPC writes only.';

create table public.blocks (
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint blocks_not_self check (blocker_id <> blocked_id)
);

create index blocks_blocked on public.blocks (blocked_id);

comment on table public.blocks is 'Who blocked whom. Only the blocker can read; RPC writes only.';

-- ─── Visibility helpers ─────────────────────────────────────────────────────────────────────────

create function public.visibility_rank(v public.profile_visibility)
returns integer
language sql
immutable
set search_path = ''
as $$
  select case v when 'public' then 2 when 'friends' then 1 else 0 end;
$$;

create or replace function public.are_friends(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select a is not null and b is not null and a <> b and exists (
    select 1 from public.friendships f
    where f.status = 'accepted'
      and least(f.requester_id, f.addressee_id) = least(a, b)
      and greatest(f.requester_id, f.addressee_id) = greatest(a, b));
$$;

-- Either direction.
create function public.is_blocked(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select a is not null and b is not null and exists (
    select 1 from public.blocks k
    where (k.blocker_id = a and k.blocked_id = b) or (k.blocker_id = b and k.blocked_id = a));
$$;

create or replace function public.can_view_profile_details(
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
    or (not public.is_blocked(owner, viewer) and (
      vis = 'public' or (vis = 'friends' and public.are_friends(owner, viewer)))));
$$;

-- Whether `viewer` may see `owner`'s profile details, rank and posts list.
create function public.can_view_profile(viewer uuid, owner uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = owner and p.onboarded_at is not null
      and public.can_view_profile_details(p.id, p.visibility, viewer));
$$;

-- The post rule, for callers that already hold the row.
create function public.can_view_post_row(
  viewer uuid,
  author uuid,
  vis public.profile_visibility
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select viewer is not null and (
    viewer = author
    or (not public.is_blocked(viewer, author) and exists (
      select 1 from public.profiles p
      where p.id = author and p.onboarded_at is not null
        and case least(public.visibility_rank(vis), public.visibility_rank(p.visibility))
          when 2 then true
          when 1 then public.are_friends(viewer, author)
          else false
        end)));
$$;

create function public.try_uuid(t text)
returns uuid
language sql
immutable
set search_path = ''
as $$
  select case
    when t ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then t::uuid
  end;
$$;

-- ─── Posts ──────────────────────────────────────────────────────────────────────────────────────

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles (id) on delete cascade,
  type public.post_type not null,
  -- The workout a workout post shows (one post per workout).
  workout_id uuid references public.workouts (id) on delete cascade,
  goal_id uuid references public.goals (id) on delete set null,
  body text constraint posts_body_length check (char_length(body) <= 1000),
  -- Up to four photos: [{path, w, h}] in the post-media bucket.
  media jsonb not null default '[]'::jsonb,
  -- Milestone details or an attachment snapshot, built by the server.
  data jsonb not null default '{}'::jsonb,
  -- Workout posts: stats, top exercises, records, rank-ups and muscles, kept by triggers.
  workout_summary jsonb,
  -- Content-based idempotency key for milestones (pr:…, rank:…, goal:…, league:…).
  milestone_key text constraint posts_milestone_key_length check (char_length(milestone_key) <= 200),
  visibility public.profile_visibility not null default 'friends',
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  like_count integer not null default 0 constraint posts_like_count check (like_count >= 0),
  comment_count integer not null default 0 constraint posts_comment_count check (comment_count >= 0),
  constraint posts_media_shape check (
    jsonb_typeof(media) = 'array' and jsonb_array_length(media) <= 4),
  constraint posts_data_shape check (jsonb_typeof(data) = 'object'),
  constraint posts_workout_shape check ((type = 'workout') = (workout_id is not null)),
  constraint posts_photo_shape check (type <> 'photo' or jsonb_array_length(media) >= 1)
);

create unique index posts_workout_once on public.posts (workout_id) where type = 'workout';
create unique index posts_milestone_once on public.posts (author_id, milestone_key)
  where milestone_key is not null;
create index posts_author_time on public.posts (author_id, created_at desc, id desc);
create index posts_public_recent on public.posts (created_at desc) where visibility = 'public';

comment on table public.posts is
  'Feed posts. Readable where can_view_post_row allows; authors can delete; RPC and trigger writes.';

create function public.can_view_post(viewer uuid, post uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.posts p
    where p.id = post and public.can_view_post_row(viewer, p.author_id, p.visibility));
$$;

create table public.post_likes (
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create index post_likes_user on public.post_likes (user_id, created_at desc);

comment on table public.post_likes is 'Respect given to posts. like_count is kept by a trigger.';

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  -- One level of replies: a parent is always a top-level comment on the same post.
  parent_id uuid references public.comments (id) on delete cascade,
  -- Null once deleted (a deleted comment with replies stays as a placeholder).
  body text constraint comments_body_length check (char_length(btrim(body)) between 1 and 500),
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  deleted_at timestamptz,
  constraint comments_deleted_shape check ((deleted_at is null) = (body is not null))
);

create index comments_post on public.comments (post_id, created_at);
create index comments_parent on public.comments (parent_id) where parent_id is not null;

comment on table public.comments is
  'Comments with one level of replies. Visible with the post, minus blocked authors. RPC writes.';

create function public.can_view_comment(viewer uuid, comment uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.comments c
    where c.id = comment and c.deleted_at is null
      and public.can_view_post(viewer, c.post_id)
      and not public.is_blocked(viewer, c.author_id));
$$;

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  post_id uuid references public.posts (id) on delete cascade,
  comment_id uuid references public.comments (id) on delete cascade,
  reason public.report_reason not null,
  details text constraint reports_details_length check (char_length(details) <= 500),
  -- Review tools arrive in Phase 13.
  status text not null default 'open' constraint reports_status check (
    status in ('open', 'reviewed', 'dismissed')),
  created_at timestamptz not null default now(),
  constraint reports_one_target check (num_nonnulls(post_id, comment_id) = 1)
);

create unique index reports_post_once on public.reports (reporter_id, post_id) where post_id is not null;
create unique index reports_comment_once on public.reports (reporter_id, comment_id)
  where comment_id is not null;

comment on table public.reports is 'Reports of posts and comments. Reporters read their own.';

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  actor_id uuid not null references public.profiles (id) on delete cascade,
  kind public.notification_kind not null,
  post_id uuid references public.posts (id) on delete cascade,
  comment_id uuid references public.comments (id) on delete cascade,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index notifications_user on public.notifications (user_id, created_at desc, id desc);
create index notifications_unread on public.notifications (user_id) where read_at is null;
create unique index notifications_respect_once on public.notifications (user_id, actor_id, post_id)
  where kind = 'respect';
create unique index notifications_follow_once on public.notifications (user_id, actor_id)
  where kind = 'follow';
create unique index notifications_request_once on public.notifications (user_id, actor_id)
  where kind = 'friend_request';

comment on table public.notifications is
  'In-app notifications. The recipient can read them and set read_at; triggers and RPCs write.';

-- Writes one notification unless it would cross a block or point at a post the recipient can't see.
create function public.social_notify(
  p_user uuid,
  p_actor uuid,
  p_kind public.notification_kind,
  p_post uuid default null,
  p_comment uuid default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_user is null or p_actor is null or p_user = p_actor or public.is_blocked(p_user, p_actor) then
    return;
  end if;
  if p_post is not null and not public.can_view_post(p_user, p_post) then
    return;
  end if;
  insert into public.notifications (user_id, actor_id, kind, post_id, comment_id)
  values (p_user, p_actor, p_kind, p_post, p_comment)
  on conflict do nothing;
end;
$$;

-- Usernames mentioned as @name (at most 10 per text).
create function public.social_mentions(p_text text)
returns uuid[]
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(array_agg(p.id), '{}')
  from (
    select distinct lower(m[1]) username
    from regexp_matches(coalesce(p_text, ''), '(?:^|[^a-zA-Z0-9_])@([a-zA-Z0-9_]{3,20})', 'g') m
    limit 10
  ) u
  join public.profiles p on p.username = u.username and p.onboarded_at is not null;
$$;

create function public.social_notify_mentions(
  p_actor uuid,
  p_post uuid,
  p_comment uuid,
  p_text text,
  p_skip uuid[] default '{}'
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid;
begin
  foreach v_user in array public.social_mentions(p_text) loop
    if not (v_user = any (p_skip)) then
      perform public.social_notify(v_user, p_actor, 'mention', p_post, p_comment);
    end if;
  end loop;
end;
$$;

-- ─── Workout posts ──────────────────────────────────────────────────────────────────────────────

-- What a workout post shows: totals, the first three exercises with their best set, records,
-- rank-ups and weighted muscle sets for the thumbnail (primary 1, secondary 0.5).
create function public.social_workout_summary(p_workout uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with w as (select * from public.workouts where id = p_workout),
  working as (
    select we.exercise_id, we.sort_order, e.name, e.log_type, e.category, s.weight_kg, s.reps,
      s.duration_sec, s.distance_m, s.weight_mode
    from public.workout_exercises we
    join public.workout_sets s on s.workout_exercise_id = we.id
    join public.exercises e on e.id = we.exercise_id
    where we.workout_id = p_workout and s.completed and not s.failed and s.set_type <> 'warmup'
  ),
  per_exercise as (
    select x.exercise_id, x.name, x.log_type, min(x.sort_order) sort_order, count(*)::integer sets
    from working x group by x.exercise_id, x.name, x.log_type
  ),
  best as (
    select distinct on (x.exercise_id) x.exercise_id, x.weight_kg, x.reps, x.duration_sec,
      x.distance_m, x.weight_mode
    from working x
    order by x.exercise_id, public.rank_e1rm(x.weight_kg, x.reps) desc nulls last,
      x.weight_kg desc nulls last, x.reps desc nulls last, x.duration_sec desc nulls last,
      x.distance_m desc nulls last
  ),
  prs as (
    select distinct pr.exercise_id from public.personal_records pr
    where pr.workout_id = p_workout and pr.previous_value is not null
  )
  select jsonb_build_object(
    'name', w.name,
    'started_at', w.started_at,
    'duration_sec', w.duration_sec,
    'volume_kg', w.total_volume_kg,
    'sets', (select count(*)::integer from working),
    'exercise_count', (select count(*)::integer from per_exercise),
    'photo_path', w.photo_path,
    'calisthenics', coalesce((select avg((x.category = 'calisthenics')::integer) >= 0.5 from working x), false),
    'records', (select count(*)::integer from public.personal_records pr
      where pr.workout_id = p_workout and pr.previous_value is not null),
    'exercises', coalesce((
      select jsonb_agg(jsonb_build_object(
        'exercise_id', pe.exercise_id, 'name', pe.name, 'log_type', pe.log_type, 'sets', pe.sets,
        'pr', exists (select 1 from prs where prs.exercise_id = pe.exercise_id),
        'best', jsonb_build_object('weight_kg', b.weight_kg, 'reps', b.reps,
          'duration_sec', b.duration_sec, 'distance_m', b.distance_m, 'weight_mode', b.weight_mode))
        order by pe.sort_order)
      from (select * from per_exercise order by sort_order limit 3) pe
      join best b on b.exercise_id = pe.exercise_id), '[]'::jsonb),
    'rank_ups', coalesce((
      select jsonb_agg(jsonb_build_object('scope', ev.scope, 'key', ev.key,
        'name', coalesce(rl.name, initcap(ev.key)), 'tier', ev.to_tier, 'division', ev.to_division)
        order by (ev.scope = 'overall') desc, public.rank_ordinal(ev.to_tier, ev.to_division) desc)
      from public.rank_events ev
      left join public.rank_lifts rl on ev.scope = 'lift' and rl.rank_key = ev.key
      where ev.workout_id = p_workout and ev.kind = 'rank_up' and ev.scope in ('lift', 'overall')),
      '[]'::jsonb),
    'muscles', coalesce((
      select jsonb_agg(jsonb_build_object('muscle', t.muscle, 'sets', t.sets) order by t.sets desc)
      from (
        select m.muscle, sum(case m.role when 'primary' then 1 else 0.5 end) sets
        from working x join public.exercise_muscles m on m.exercise_id = x.exercise_id
        where m.role <> 'stabiliser' and x.category in ('strength', 'calisthenics')
        group by m.muscle) t), '[]'::jsonb))
  from w;
$$;

-- Keeps a workout's post in step with it: completed and not private → upserted; otherwise removed.
create function public.social_sync_workout_post(p_workout uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  w public.workouts;
begin
  select * into w from public.workouts where id = p_workout;
  if w.id is null then
    return;
  end if;
  if w.status <> 'completed' or w.visibility = 'private' then
    delete from public.posts where workout_id = p_workout and type = 'workout';
    return;
  end if;
  insert into public.posts (author_id, type, workout_id, visibility, workout_summary, created_at)
  values (w.user_id, 'workout', w.id, w.visibility, public.social_workout_summary(w.id),
    coalesce(w.ended_at, w.started_at))
  on conflict (workout_id) where type = 'workout' do update set
    visibility = excluded.visibility,
    workout_summary = excluded.workout_summary;
end;
$$;

create function public.workouts_social_post()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Drafts never have a post; skip the work unless one might exist.
  if new.status = 'completed' or (tg_op = 'UPDATE' and old.status = 'completed') then
    perform public.social_sync_workout_post(new.id);
  end if;
  return null;
end;
$$;

-- Fires again after save_workout writes the sets and totals (refresh_workout_totals updates the row).
create trigger workouts_social_post
  after insert or update on public.workouts
  for each row execute function public.workouts_social_post();

-- ─── Milestones ─────────────────────────────────────────────────────────────────────────────────

-- Builds a milestone from the user's own server data, so a client can never fabricate one.
-- Returns {key, data} or null when there is nothing to share.
create function public.social_build_milestone(p_user uuid, p_kind public.post_type, p_ref jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v jsonb;
begin
  if p_kind = 'pr' then
    select jsonb_build_object(
      'key', 'pr:' || pr.workout_id || ':' || pr.exercise_id || ':' || pr.kind,
      'data', jsonb_build_object('workout_id', pr.workout_id, 'exercise_id', pr.exercise_id,
        'exercise_name', e.name, 'log_type', e.log_type, 'kind', pr.kind, 'value', pr.value,
        'previous_value', pr.previous_value, 'weight_kg', pr.weight_kg, 'achieved_at', pr.achieved_at))
    into v
    from public.personal_records pr
    join public.exercises e on e.id = pr.exercise_id
    where pr.user_id = p_user and pr.previous_value is not null
      and pr.workout_id = public.try_uuid(p_ref ->> 'workout_id')
      and pr.exercise_id = public.try_uuid(p_ref ->> 'exercise_id')
      and pr.kind::text = p_ref ->> 'kind'
    order by pr.value desc
    limit 1;
  elsif p_kind = 'rank_up' then
    select jsonb_build_object(
      'key', 'rank:' || ev.scope || ':' || ev.key || ':' || ev.to_tier || ':' || coalesce(ev.to_division, 0),
      'data', jsonb_build_object('scope', ev.scope, 'key', ev.key,
        'name', coalesce(rl.name, initcap(ev.key)), 'from_tier', ev.from_tier,
        'from_division', ev.from_division, 'tier', ev.to_tier, 'division', ev.to_division,
        'score', ev.score, 'workout_id', ev.workout_id))
    into v
    from public.rank_events ev
    left join public.rank_lifts rl on ev.scope = 'lift' and rl.rank_key = ev.key
    where ev.user_id = p_user and ev.kind = 'rank_up'
      and ev.scope::text = p_ref ->> 'scope' and ev.key = p_ref ->> 'key'
      and (p_ref ->> 'workout_id' is null or ev.workout_id = public.try_uuid(p_ref ->> 'workout_id'))
    order by ev.created_at desc
    limit 1;
  elsif p_kind = 'league_result' then
    select jsonb_build_object(
      'key', 'league:' || l.id,
      'data', jsonb_build_object('league_id', l.id, 'name', l.name, 'kind', l.kind,
        'division', l.division, 'place', m.final_position, 'points', m.final_points,
        'outcome', m.outcome, 'ended_at', l.ends_at))
    into v
    from public.league_members m
    join public.leagues l on l.id = m.league_id
    where m.user_id = p_user and m.league_id = public.try_uuid(p_ref ->> 'league_id')
      and m.final_position is not null;
  end if;
  return v;
end;
$$;

create function public.social_insert_milestone(
  p_user uuid,
  p_kind public.post_type,
  p_built jsonb,
  p_visibility public.profile_visibility
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  insert into public.posts (author_id, type, milestone_key, data, visibility)
  values (p_user, p_kind, p_built ->> 'key', p_built -> 'data', p_visibility)
  on conflict (author_id, milestone_key) where milestone_key is not null do nothing
  returning id into v_id;
  if v_id is null then
    select id into v_id from public.posts
    where author_id = p_user and milestone_key = p_built ->> 'key';
  end if;
  return v_id;
end;
$$;

-- With milestone_posts = 'auto', the first rewards of a workout post its best record and its
-- biggest rank-up. Later recomputes never post again.
create function public.workout_rewards_social()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_mode public.milestone_post_mode;
  v_vis public.profile_visibility;
  v_built jsonb;
  r record;
begin
  perform public.social_sync_workout_post(new.workout_id);
  if tg_op <> 'INSERT' then
    return null;
  end if;
  select s.milestone_posts, p.visibility into v_mode, v_vis
  from public.user_settings s join public.profiles p on p.id = s.user_id
  where s.user_id = new.user_id;
  if v_mode is distinct from 'auto' or v_vis = 'private' then
    return null;
  end if;

  select pr.workout_id, pr.exercise_id, pr.kind into r
  from public.personal_records pr
  where pr.workout_id = new.workout_id and pr.user_id = new.user_id and pr.previous_value is not null
  order by (pr.kind = 'e1rm') desc, (pr.kind = 'weight') desc,
    (pr.value - pr.previous_value) / nullif(pr.previous_value, 0) desc nulls last
  limit 1;
  if found then
    v_built := public.social_build_milestone(new.user_id, 'pr',
      jsonb_build_object('workout_id', r.workout_id, 'exercise_id', r.exercise_id, 'kind', r.kind));
    if v_built is not null then
      perform public.social_insert_milestone(new.user_id, 'pr', v_built, v_vis);
    end if;
  end if;

  select ev.scope, ev.key into r
  from public.rank_events ev
  where ev.workout_id = new.workout_id and ev.user_id = new.user_id and ev.kind = 'rank_up'
    and ev.scope in ('lift', 'overall')
  order by (ev.scope = 'overall') desc, public.rank_ordinal(ev.to_tier, ev.to_division) desc
  limit 1;
  if found then
    v_built := public.social_build_milestone(new.user_id, 'rank_up',
      jsonb_build_object('scope', r.scope, 'key', r.key, 'workout_id', new.workout_id));
    if v_built is not null then
      perform public.social_insert_milestone(new.user_id, 'rank_up', v_built, v_vis);
    end if;
  end if;
  return null;
end;
$$;

create trigger workout_rewards_social
  after insert or update on public.workout_rewards
  for each row execute function public.workout_rewards_social();

-- Phase 8 goal posts move into posts.
insert into public.posts (id, author_id, type, goal_id, milestone_key, data, visibility, created_at)
select gp.id, gp.user_id, 'goal', gp.goal_id, 'goal:' || gp.goal_id,
  jsonb_build_object('title', gp.title, 'goal_type', g.type), gp.visibility, gp.created_at
from public.goal_posts gp
left join public.goals g on g.id = gp.goal_id;

drop table public.goal_posts;

create or replace function public.get_goals(p_zone text default 'Asia/Kolkata') returns jsonb
language plpgsql security definer set search_path='' as $$
declare g public.goals; v numeric; t numeric; done boolean; out_rows jsonb:='[]';
begin
  if auth.uid() is null then raise insufficient_privilege; end if;
  perform now() at time zone p_zone;
  perform set_config('TimeZone',p_zone,true);
  for g in select * from public.goals where user_id=auth.uid() order by created_at desc for update loop
    v:=public.goal_value(g,now(),p_zone);t:=public.goal_target_value(g);
    done:=case when g.type='bodyweight' and t<g.start_value then v<=t else v>=t end;
    if g.type='rank' and not exists(select 1 from public.ranks_current where user_id=auth.uid()
      and scope::text=g.target->>'scope' and key=g.target->>'key' and status='ranked') then done:=false; end if;
    if g.status='active' and done then
      update public.goals set status='achieved',achieved_at=now(),updated_at=now() where id=g.id returning * into g;
      -- Phase 9: goal milestones are posts; the 'never' setting overrides a goal's own opt-in.
      if g.auto_post and coalesce((select s.milestone_posts from public.user_settings s
          where s.user_id=g.user_id),'ask')<>'never' then
        insert into public.posts(author_id,type,goal_id,milestone_key,data,visibility)
          select g.user_id,'goal',g.id,'goal:'||g.id,
            jsonb_build_object('title',g.target->>'title','goal_type',g.type),p.visibility
          from public.profiles p where p.id=g.user_id and p.visibility<>'private'
          on conflict (author_id, milestone_key) where milestone_key is not null do nothing;
      end if;
    end if;
    out_rows:=out_rows||jsonb_build_array(to_jsonb(g)||jsonb_build_object('current_value',v,'target_value',t,'observations',public.goal_observations(g)));
  end loop;
  return out_rows;
end;
$$;

-- ─── Counters and notifications ─────────────────────────────────────────────────────────────────

create function public.post_likes_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_author uuid;
begin
  if tg_op = 'INSERT' then
    update public.posts set like_count = like_count + 1 where id = new.post_id
    returning author_id into v_author;
    perform public.social_notify(v_author, new.user_id, 'respect', new.post_id);
  else
    update public.posts set like_count = greatest(like_count - 1, 0) where id = old.post_id
    returning author_id into v_author;
    delete from public.notifications
    where kind = 'respect' and post_id = old.post_id and actor_id = old.user_id;
  end if;
  return null;
end;
$$;

create trigger post_likes_count
  after insert or delete on public.post_likes
  for each row execute function public.post_likes_count();

create function public.comments_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.posts set comment_count = comment_count + 1 where id = new.post_id;
  elsif tg_op = 'UPDATE' then
    if old.deleted_at is null and new.deleted_at is not null then
      update public.posts set comment_count = greatest(comment_count - 1, 0) where id = new.post_id;
    end if;
  elsif old.deleted_at is null then
    update public.posts set comment_count = greatest(comment_count - 1, 0) where id = old.post_id;
  end if;
  return null;
end;
$$;

create trigger comments_count
  after insert or update of deleted_at or delete on public.comments
  for each row execute function public.comments_count();

create function public.social_protect_columns()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_table_name = 'posts' then
    new.id := old.id;
    new.author_id := old.author_id;
    new.created_at := old.created_at;
  elsif tg_table_name = 'comments' then
    new.id := old.id;
    new.post_id := old.post_id;
    new.author_id := old.author_id;
    new.parent_id := old.parent_id;
    new.created_at := old.created_at;
  end if;
  return new;
end;
$$;

create trigger posts_protect_columns
  before update on public.posts
  for each row execute function public.social_protect_columns();
create trigger comments_protect_columns
  before update on public.comments
  for each row execute function public.social_protect_columns();

-- ─── RLS ────────────────────────────────────────────────────────────────────────────────────────

alter table public.friendships enable row level security;
alter table public.follows enable row level security;
alter table public.blocks enable row level security;
alter table public.posts enable row level security;
alter table public.post_likes enable row level security;
alter table public.comments enable row level security;
alter table public.reports enable row level security;
alter table public.notifications enable row level security;

create policy "friendships: either side can read" on public.friendships
  for select to authenticated
  using ((select auth.uid()) in (requester_id, addressee_id));

create policy "follows: either side can read" on public.follows
  for select to authenticated
  using ((select auth.uid()) in (follower_id, followee_id));

create policy "blocks: blocker can read" on public.blocks
  for select to authenticated
  using ((select auth.uid()) = blocker_id);

create policy "posts: visible posts can be read" on public.posts
  for select to authenticated
  using (public.can_view_post_row((select auth.uid()), author_id, visibility));
create policy "posts: author can delete" on public.posts
  for delete to authenticated
  using ((select auth.uid()) = author_id);

create policy "post_likes: visible respects can be read" on public.post_likes
  for select to authenticated
  using (public.can_view_post((select auth.uid()), post_id)
    and not public.is_blocked((select auth.uid()), user_id));
create policy "post_likes: give respect to visible posts" on public.post_likes
  for insert to authenticated
  with check ((select auth.uid()) = user_id and public.can_view_post((select auth.uid()), post_id));
create policy "post_likes: take back your respect" on public.post_likes
  for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy "comments: visible comments can be read" on public.comments
  for select to authenticated
  using (public.can_view_post((select auth.uid()), post_id)
    and not public.is_blocked((select auth.uid()), author_id));

create policy "reports: reporter can read" on public.reports
  for select to authenticated
  using ((select auth.uid()) = reporter_id);
create policy "reports: report what you can see" on public.reports
  for insert to authenticated
  with check (
    (select auth.uid()) = reporter_id
    and status = 'open'
    and ((post_id is not null and public.can_view_post((select auth.uid()), post_id))
      or (comment_id is not null and public.can_view_comment((select auth.uid()), comment_id))));

create policy "notifications: recipient can read" on public.notifications
  for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "notifications: recipient can mark read" on public.notifications
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

revoke all on public.friendships, public.follows, public.blocks, public.posts, public.post_likes,
  public.comments, public.reports, public.notifications from anon, authenticated;
grant select on public.friendships, public.follows, public.blocks, public.comments to authenticated;
grant select, delete on public.posts to authenticated;
grant select, insert, delete on public.post_likes to authenticated;
grant select on public.reports to authenticated;
grant insert (post_id, comment_id, reason, details) on public.reports to authenticated;
grant select on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;

-- Profile cards hide blocked pairs entirely (same columns as before).
create or replace view public.public_profile_cards
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
  and p.onboarded_at is not null
  and not public.is_blocked(p.id, auth.uid());

-- ─── Storage ────────────────────────────────────────────────────────────────────────────────────

-- Post photos: <author id>/<post id>/<n>.jpg, readable wherever the post is.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('post-media', 'post-media', false, 5242880, array['image/jpeg'])
on conflict (id) do nothing;

create policy "post-media: visible posts can be read"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'post-media' and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or public.can_view_post((select auth.uid()), public.try_uuid((storage.foldername(name))[2]))));
create policy "post-media: owner can upload"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'post-media' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "post-media: owner can delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'post-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

create function public.can_view_workout_photo(viewer uuid, path text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.workouts w
    join public.posts p on p.workout_id = w.id and p.type = 'workout'
    where w.photo_path = path and public.can_view_post_row(viewer, p.author_id, p.visibility));
$$;

create policy "workout-photos: visible workout posts can be read"
  on storage.objects for select to authenticated
  using (bucket_id = 'workout-photos' and public.can_view_workout_photo((select auth.uid()), name));

-- ─── Realtime ───────────────────────────────────────────────────────────────────────────────────

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.posts, public.notifications;
  end if;
end;
$$;

-- ─── Graph RPCs ─────────────────────────────────────────────────────────────────────────────────

create function public.social_require_user()
returns uuid
language plpgsql
stable
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Sign in first.' using errcode = '42501';
  end if;
  return auth.uid();
end;
$$;

create function public.social_require_target(p_me uuid, p_user uuid)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if p_user is null or p_user = p_me then
    raise exception 'Choose someone else.' using errcode = '22023';
  end if;
  if public.is_blocked(p_me, p_user)
    or not exists (select 1 from public.profiles where id = p_user and onboarded_at is not null) then
    raise exception 'This person isn''t available.' using errcode = '42501';
  end if;
end;
$$;

-- Returns 'pending' or 'accepted'. A request to someone who already asked you accepts theirs.
-- A declined request can't be sent again for 30 days (it quietly stays pending for the sender).
create function public.send_friend_request(p_user uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := public.social_require_user();
  f public.friendships;
begin
  perform public.social_require_target(v_me, p_user);
  select * into f from public.friendships
  where least(requester_id, addressee_id) = least(v_me, p_user)
    and greatest(requester_id, addressee_id) = greatest(v_me, p_user)
  for update;

  if f.id is null then
    if (select count(*) from public.friendships
        where requester_id = v_me and status = 'pending') >= 100 then
      raise exception 'You have 100 requests waiting. Cancel some first.' using errcode = '22023';
    end if;
    insert into public.friendships (requester_id, addressee_id) values (v_me, p_user);
    perform public.social_notify(p_user, v_me, 'friend_request');
    return 'pending';
  elsif f.status = 'accepted' then
    return 'accepted';
  elsif f.status = 'pending' and f.requester_id = v_me then
    return 'pending';
  elsif f.status = 'pending' then
    update public.friendships set status = 'accepted', responded_at = now() where id = f.id;
    perform public.social_notify(p_user, v_me, 'friend_accepted');
    return 'accepted';
  elsif f.requester_id = v_me and f.responded_at > now() - interval '30 days' then
    return 'pending';
  else
    update public.friendships
    set requester_id = v_me, addressee_id = p_user, status = 'pending', created_at = now(),
      responded_at = null
    where id = f.id;
    delete from public.notifications
    where user_id = p_user and actor_id = v_me and kind = 'friend_request';
    perform public.social_notify(p_user, v_me, 'friend_request');
    return 'pending';
  end if;
end;
$$;

create function public.respond_friend_request(p_id uuid, p_accept boolean)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := public.social_require_user();
  f public.friendships;
begin
  update public.friendships
  set status = case when p_accept then 'accepted' else 'declined' end::public.friendship_status,
    responded_at = now()
  where id = p_id and addressee_id = v_me and status = 'pending'
  returning * into f;
  if f.id is null then
    raise exception 'That request is no longer waiting.' using errcode = '22023';
  end if;
  if p_accept then
    perform public.social_notify(f.requester_id, v_me, 'friend_accepted');
  end if;
  return f.status::text;
end;
$$;

create function public.cancel_friend_request(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := public.social_require_user();
  v_other uuid;
begin
  delete from public.friendships where id = p_id and requester_id = v_me and status = 'pending'
  returning addressee_id into v_other;
  delete from public.notifications
  where user_id = v_other and actor_id = v_me and kind = 'friend_request';
end;
$$;

create function public.remove_friend(p_user uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := public.social_require_user();
begin
  delete from public.friendships
  where status = 'accepted'
    and least(requester_id, addressee_id) = least(v_me, p_user)
    and greatest(requester_id, addressee_id) = greatest(v_me, p_user);
end;
$$;

-- Only public profiles can be followed.
create function public.follow_user(p_user uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := public.social_require_user();
begin
  perform public.social_require_target(v_me, p_user);
  if not exists (select 1 from public.profiles where id = p_user and visibility = 'public') then
    raise exception 'Only public profiles can be followed. Add them as a friend instead.'
      using errcode = '42501';
  end if;
  insert into public.follows (follower_id, followee_id) values (v_me, p_user)
  on conflict do nothing;
  if found then
    perform public.social_notify(p_user, v_me, 'follow');
  end if;
end;
$$;

create function public.unfollow_user(p_user uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.follows where follower_id = public.social_require_user() and followee_id = p_user;
end;
$$;

-- Blocking ends every link between the two people, both ways, and hides them from each other.
create function public.block_user(p_user uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := public.social_require_user();
begin
  if p_user is null or p_user = v_me then
    raise exception 'Choose someone else.' using errcode = '22023';
  end if;
  if not exists (select 1 from public.profiles where id = p_user) then
    raise exception 'This person isn''t available.' using errcode = '42501';
  end if;
  insert into public.blocks (blocker_id, blocked_id) values (v_me, p_user) on conflict do nothing;
  delete from public.friendships
  where least(requester_id, addressee_id) = least(v_me, p_user)
    and greatest(requester_id, addressee_id) = greatest(v_me, p_user);
  delete from public.follows
  where (follower_id = v_me and followee_id = p_user) or (follower_id = p_user and followee_id = v_me);
  delete from public.notifications
  where (user_id = v_me and actor_id = p_user) or (user_id = p_user and actor_id = v_me);
end;
$$;

create function public.unblock_user(p_user uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.blocks where blocker_id = public.social_require_user() and blocked_id = p_user;
end;
$$;

-- ─── Post RPCs ──────────────────────────────────────────────────────────────────────────────────

-- Media must be the caller's uploads for this post: [{path: '<uid>/<post id>/<n>.jpg', w, h}].
create function public.social_valid_media(p_user uuid, p_post uuid, p_media jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_out jsonb := '[]'::jsonb;
  m jsonb;
begin
  if p_media is null or jsonb_typeof(p_media) <> 'array' then
    return v_out;
  end if;
  if jsonb_array_length(p_media) > 4 then
    raise exception 'Four photos per post at most.' using errcode = '22023';
  end if;
  for m in select * from jsonb_array_elements(p_media) loop
    if coalesce(m ->> 'path', '') !~ ('^' || p_user || '/' || p_post || '/[0-9a-z_-]{1,40}\.jpg$')
      or not exists (select 1 from storage.objects o
        where o.bucket_id = 'post-media' and o.name = m ->> 'path') then
      raise exception 'A photo didn''t upload. Try again.' using errcode = '22023';
    end if;
    v_out := v_out || jsonb_build_array(jsonb_build_object('path', m ->> 'path',
      'w', greatest(1, least(10000, coalesce((m ->> 'w')::integer, 1))),
      'h', greatest(1, least(10000, coalesce((m ->> 'h')::integer, 1)))));
  end loop;
  return v_out;
end;
$$;

-- Text and photo posts. p: {id, body, media[], visibility, attach: {workout_id} | {pr: {…}}}.
-- Replaying the same id returns it unchanged.
create function public.create_post(p jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := public.social_require_user();
  v_id uuid := public.try_uuid(p ->> 'id');
  v_body text := nullif(btrim(coalesce(p ->> 'body', '')), '');
  v_vis public.profile_visibility;
  v_media jsonb;
  v_data jsonb := '{}'::jsonb;
  v_owner uuid;
  v_built jsonb;
  v_workout uuid := public.try_uuid(p -> 'attach' ->> 'workout_id');
begin
  if v_id is null then
    raise exception 'A post needs an id.' using errcode = '22023';
  end if;
  select author_id into v_owner from public.posts where id = v_id;
  if v_owner = v_me then
    return v_id;
  elsif v_owner is not null then
    raise exception 'That post id is taken.' using errcode = '42501';
  end if;
  if (select count(*) from public.posts where author_id = v_me and type in ('text', 'photo')
      and created_at > now() - interval '1 hour') >= 30 then
    raise exception 'That''s a lot of posts. Take a breather and try again later.' using errcode = '22023';
  end if;
  if char_length(coalesce(v_body, '')) > 1000 then
    raise exception 'Posts are 1000 characters at most.' using errcode = '22023';
  end if;
  v_vis := coalesce((p ->> 'visibility')::public.profile_visibility,
    (select visibility from public.profiles where id = v_me));
  v_media := public.social_valid_media(v_me, v_id, p -> 'media');

  if v_workout is not null then
    if not exists (select 1 from public.workouts
        where id = v_workout and user_id = v_me and status = 'completed') then
      raise exception 'You can only attach your own finished workouts.' using errcode = '42501';
    end if;
    v_data := jsonb_build_object('workout', public.social_workout_summary(v_workout)
      || jsonb_build_object('workout_id', v_workout));
  elsif p -> 'attach' -> 'pr' is not null then
    v_built := public.social_build_milestone(v_me, 'pr', p -> 'attach' -> 'pr');
    if v_built is null then
      raise exception 'That record wasn''t found.' using errcode = '22023';
    end if;
    v_data := jsonb_build_object('pr', v_built -> 'data');
  end if;
  if v_body is null and jsonb_array_length(v_media) = 0 and v_data = '{}'::jsonb then
    raise exception 'Write something or add a photo.' using errcode = '22023';
  end if;

  insert into public.posts (id, author_id, type, body, media, data, visibility)
  values (v_id, v_me, case when jsonb_array_length(v_media) > 0 then 'photo' else 'text' end::public.post_type,
    v_body, v_media, v_data, v_vis);
  perform public.social_notify_mentions(v_me, v_id, null, v_body);
  return v_id;
end;
$$;

-- Edits a caption, visibility or (photo posts) which photos stay. A workout post's visibility is
-- its workout's; choosing private removes the post.
create function public.edit_post(
  p_id uuid,
  p_body text,
  p_visibility public.profile_visibility default null,
  p_keep_media text[] default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := public.social_require_user();
  v_post public.posts;
  v_body text := nullif(btrim(coalesce(p_body, '')), '');
  v_media jsonb;
  v_old uuid[];
begin
  select * into v_post from public.posts where id = p_id and author_id = v_me for update;
  if v_post.id is null then
    raise exception 'You can only edit your own posts.' using errcode = '42501';
  end if;
  if char_length(coalesce(v_body, '')) > 1000 then
    raise exception 'Posts are 1000 characters at most.' using errcode = '22023';
  end if;
  v_media := case when p_keep_media is null then v_post.media else coalesce((
    select jsonb_agg(m) from jsonb_array_elements(v_post.media) m
    where m ->> 'path' = any (p_keep_media)), '[]'::jsonb) end;
  if v_post.type in ('text', 'photo') and v_body is null and jsonb_array_length(v_media) = 0
    and v_post.data = '{}'::jsonb then
    raise exception 'Write something or add a photo.' using errcode = '22023';
  end if;
  v_old := public.social_mentions(v_post.body);

  update public.posts set
    body = v_body,
    media = v_media,
    type = case when v_post.type in ('text', 'photo') then
      case when jsonb_array_length(v_media) > 0 then 'photo' else 'text' end::public.post_type
      else v_post.type end,
    visibility = case when v_post.type = 'workout' then visibility
      else coalesce(p_visibility, visibility) end,
    edited_at = case when v_body is distinct from v_post.body or v_media <> v_post.media
      then now() else edited_at end
  where id = p_id;
  if v_post.type = 'workout' and p_visibility is not null and p_visibility <> v_post.visibility then
    update public.workouts set visibility = p_visibility where id = v_post.workout_id;
  end if;
  perform public.social_notify_mentions(v_me, p_id, null, v_body, v_old);
end;
$$;

-- Shares a record, rank-up or league result. p_ref: {workout_id, exercise_id, kind} for a record,
-- {scope, key, workout_id?} for a rank-up, {league_id} for a league result.
create function public.create_milestone_post(
  p_kind public.post_type,
  p_ref jsonb,
  p_visibility public.profile_visibility default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := public.social_require_user();
  v_built jsonb;
begin
  if p_kind not in ('pr', 'rank_up', 'league_result') then
    raise exception 'Choose a record, rank-up or league result.' using errcode = '22023';
  end if;
  v_built := public.social_build_milestone(v_me, p_kind, p_ref);
  if v_built is null then
    raise exception 'There''s nothing to share there yet.' using errcode = '22023';
  end if;
  return public.social_insert_milestone(v_me, p_kind, v_built,
    coalesce(p_visibility, (select visibility from public.profiles where id = v_me)));
end;
$$;

-- ─── Comment RPCs ───────────────────────────────────────────────────────────────────────────────

create function public.add_comment(p_id uuid, p_post uuid, p_body text, p_parent uuid default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := public.social_require_user();
  v_body text := btrim(coalesce(p_body, ''));
  v_post public.posts;
  v_parent public.comments;
  v_owner uuid;
  v_skip uuid[] := '{}';
begin
  select author_id into v_owner from public.comments where id = p_id;
  if v_owner = v_me then
    return p_id;
  elsif v_owner is not null then
    raise exception 'That comment id is taken.' using errcode = '42501';
  end if;
  if char_length(v_body) not between 1 and 500 then
    raise exception 'Comments are 1 to 500 characters.' using errcode = '22023';
  end if;
  select * into v_post from public.posts where id = p_post;
  if v_post.id is null or not public.can_view_post_row(v_me, v_post.author_id, v_post.visibility) then
    raise exception 'This post isn''t available.' using errcode = '42501';
  end if;
  if public.is_blocked(v_me, v_post.author_id) then
    raise exception 'This post isn''t available.' using errcode = '42501';
  end if;
  if p_parent is not null then
    select * into v_parent from public.comments where id = p_parent;
    if v_parent.id is null or v_parent.post_id <> p_post or v_parent.parent_id is not null then
      raise exception 'You can only reply to a comment on this post.' using errcode = '22023';
    end if;
  end if;
  if (select count(*) from public.comments where author_id = v_me
      and created_at > now() - interval '1 minute') >= 10 then
    raise exception 'Slow down a little and try again.' using errcode = '22023';
  end if;

  insert into public.comments (id, post_id, author_id, parent_id, body)
  values (p_id, p_post, v_me, p_parent, v_body);

  if v_parent.id is not null then
    perform public.social_notify(v_parent.author_id, v_me, 'reply', p_post, p_id);
    v_skip := array[v_parent.author_id];
  end if;
  if not (v_post.author_id = any (v_skip)) then
    perform public.social_notify(v_post.author_id, v_me, 'comment', p_post, p_id);
  end if;
  perform public.social_notify_mentions(v_me, p_post, p_id, v_body,
    v_skip || v_post.author_id);
  return p_id;
end;
$$;

create function public.edit_comment(p_id uuid, p_body text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := public.social_require_user();
  v_body text := btrim(coalesce(p_body, ''));
begin
  if char_length(v_body) not between 1 and 500 then
    raise exception 'Comments are 1 to 500 characters.' using errcode = '22023';
  end if;
  update public.comments set body = v_body, edited_at = now()
  where id = p_id and author_id = v_me and deleted_at is null;
  if not found then
    raise exception 'You can only edit your own comments.' using errcode = '42501';
  end if;
end;
$$;

-- The comment's author or the post's author can delete it. One with replies stays as a placeholder.
create function public.delete_comment(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := public.social_require_user();
  c public.comments;
begin
  select c2.* into c from public.comments c2
  join public.posts p on p.id = c2.post_id
  where c2.id = p_id and (c2.author_id = v_me or p.author_id = v_me);
  if c.id is null then
    raise exception 'You can''t delete that comment.' using errcode = '42501';
  end if;
  if exists (select 1 from public.comments r where r.parent_id = p_id and r.deleted_at is null) then
    update public.comments set body = null, deleted_at = now() where id = p_id and deleted_at is null;
  else
    delete from public.comments where id = p_id;
  end if;
end;
$$;

-- ─── Reports and notifications ──────────────────────────────────────────────────────────────────

create function public.report_content(
  p_reason public.report_reason,
  p_post uuid default null,
  p_comment uuid default null,
  p_details text default null
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  perform public.social_require_user();
  insert into public.reports (post_id, comment_id, reason, details)
  values (p_post, p_comment, p_reason, nullif(btrim(coalesce(p_details, '')), ''))
  on conflict do nothing;
end;
$$;

create function public.mark_notifications_read(p_ids uuid[] default null)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_count integer;
begin
  update public.notifications set read_at = now()
  where user_id = public.social_require_user() and read_at is null
    and (p_ids is null or id = any (p_ids));
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- ─── Read helpers ───────────────────────────────────────────────────────────────────────────────

create function public.social_friends_of(p_user uuid)
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select case when f.requester_id = p_user then f.addressee_id else f.requester_id end
  from public.friendships f
  where f.status = 'accepted' and p_user in (f.requester_id, f.addressee_id);
$$;

create function public.social_mutual_friends(a uuid, b uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::integer from (
    select public.social_friends_of(a) intersect select public.social_friends_of(b)) m;
$$;

-- Distinct training days (IST) in the 28 days before p_at.
create function public.social_training_days(p_user uuid, p_at timestamptz)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(distinct (w.started_at at time zone 'Asia/Kolkata')::date)::integer
  from public.workouts w
  where w.user_id = p_user and w.status = 'completed'
    and w.started_at >= p_at - interval '28 days' and w.started_at < p_at;
$$;

-- Identity is visible to every signed-in user; the overall rank only where the profile is.
create function public.social_person_json(p_user uuid, p_viewer uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', p.id, 'username', p.username, 'display_name', p.display_name, 'avatar_url', p.avatar_url,
    'rank', case when public.can_view_profile(p_viewer, p.id) then (
      select jsonb_build_object('tier', rc.tier, 'division', rc.division)
      from public.ranks_current rc
      where rc.user_id = p.id and rc.scope = 'overall' and rc.key = 'overall' and rc.status = 'ranked')
    end)
  from public.profiles p
  where p.id = p_user;
$$;

-- One post as the app reads it. Callers check visibility first.
create function public.social_post_json(p_post uuid, p_viewer uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', p.id, 'type', p.type, 'author', public.social_person_json(p.author_id, p_viewer),
    'body', p.body, 'media', p.media, 'data', p.data, 'workout_id', p.workout_id,
    'workout', p.workout_summary, 'visibility', p.visibility, 'created_at', p.created_at,
    'edited_at', p.edited_at, 'respects', p.like_count, 'comments', p.comment_count,
    'respected', exists (select 1 from public.post_likes l where l.post_id = p.id and l.user_id = p_viewer),
    'mine', p.author_id = p_viewer)
  from public.posts p
  where p.id = p_post;
$$;

create function public.social_page(p_rows jsonb, p_limit integer)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select jsonb_build_object('posts', p_rows,
    'next', case when jsonb_array_length(p_rows) >= p_limit then jsonb_build_object(
      'at', p_rows -> -1 ->> 'created_at', 'id', p_rows -> -1 ->> 'id') end);
$$;

-- ─── Feed ───────────────────────────────────────────────────────────────────────────────────────

-- Me, my friends and the people I follow, newest first. Keyset pages on (created_at, id).
create function public.get_feed(
  p_before_at timestamptz default null,
  p_before_id uuid default null,
  p_limit integer default 20
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_me uuid := public.social_require_user();
  v_limit integer := greatest(1, least(coalesce(p_limit, 20), 50));
begin
  return public.social_page(coalesce((
    select jsonb_agg(public.social_post_json(x.id, v_me) order by x.created_at desc, x.id desc)
    from (
      select p.id, p.created_at
      from public.posts p
      join (
        select v_me uid, true close
        union all select f, true from public.social_friends_of(v_me) f
        union all select fo.followee_id, false from public.follows fo where fo.follower_id = v_me
      ) c on c.uid = p.author_id
      join public.profiles a on a.id = p.author_id
      where (p_before_at is null or (p.created_at, p.id) < (p_before_at, coalesce(p_before_id,
          'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid)))
        and (p.author_id = v_me or (a.onboarded_at is not null
          and not public.is_blocked(v_me, p.author_id)
          and least(public.visibility_rank(p.visibility), public.visibility_rank(a.visibility))
            >= case when public.are_friends(v_me, p.author_id) then 1 else 2 end))
      group by p.id, p.created_at
      order by p.created_at desc, p.id desc
      limit v_limit) x), '[]'::jsonb), v_limit);
end;
$$;

-- A post with its full workout breakdown and comments; null when the caller can't see it.
create function public.get_post(p_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_me uuid := public.social_require_user();
  p public.posts;
begin
  select * into p from public.posts where id = p_id;
  if p.id is null or not public.can_view_post_row(v_me, p.author_id, p.visibility) then
    return null;
  end if;
  return public.social_post_json(p.id, v_me) || jsonb_build_object(
    'workout_detail', case when p.type = 'workout' then coalesce((
      select jsonb_agg(jsonb_build_object(
        'exercise_id', we.exercise_id, 'name', e.name, 'log_type', e.log_type,
        'equipment', e.equipment, 'custom', e.created_by is not null,
        'superset_group', we.superset_group, 'rest_seconds', we.rest_seconds,
        'sets', coalesce((
          select jsonb_agg(jsonb_build_object('set_type', s.set_type, 'weight_mode', s.weight_mode,
            'weight_kg', s.weight_kg, 'reps', s.reps, 'duration_sec', s.duration_sec,
            'distance_m', s.distance_m, 'rir', s.rir, 'rpe', s.rpe, 'is_pr', s.is_pr,
            'failed', s.failed) order by s.sort_order)
          from public.workout_sets s
          where s.workout_exercise_id = we.id and s.completed), '[]'::jsonb))
        order by we.sort_order)
      from public.workout_exercises we
      join public.exercises e on e.id = we.exercise_id
      where we.workout_id = p.workout_id), '[]'::jsonb) end,
    'comment_list', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', c.id, 'parent_id', c.parent_id, 'body', c.body, 'created_at', c.created_at,
        'edited_at', c.edited_at, 'deleted', c.deleted_at is not null,
        'author', public.social_person_json(c.author_id, v_me),
        'mine', c.author_id = v_me, 'can_delete', c.author_id = v_me or p.author_id = v_me)
        order by c.created_at, c.id)
      from (
        select * from public.comments c0
        where c0.post_id = p.id and not public.is_blocked(v_me, c0.author_id)
        order by c0.created_at
        limit 300) c), '[]'::jsonb));
end;
$$;

create function public.get_user_posts(
  p_user uuid,
  p_before_at timestamptz default null,
  p_before_id uuid default null,
  p_limit integer default 20
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_me uuid := public.social_require_user();
  v_limit integer := greatest(1, least(coalesce(p_limit, 20), 50));
begin
  return public.social_page(coalesce((
    select jsonb_agg(public.social_post_json(x.id, v_me) order by x.created_at desc, x.id desc)
    from (
      select p.id, p.created_at from public.posts p
      where p.author_id = p_user
        and (p_before_at is null or (p.created_at, p.id) < (p_before_at, coalesce(p_before_id,
          'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid)))
        and public.can_view_post_row(v_me, p.author_id, p.visibility)
      order by p.created_at desc, p.id desc
      limit v_limit) x), '[]'::jsonb), v_limit);
end;
$$;

-- A profile by username with my relationship to it. Null if they blocked me.
create function public.get_profile(p_username text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_me uuid := public.social_require_user();
  pr public.profiles;
  f public.friendships;
  v_can boolean;
  v_blocked boolean;
begin
  select * into pr from public.profiles
  where username = lower(btrim(p_username)) and onboarded_at is not null;
  if pr.id is null or exists (select 1 from public.blocks where blocker_id = pr.id and blocked_id = v_me) then
    return null;
  end if;
  v_blocked := exists (select 1 from public.blocks where blocker_id = v_me and blocked_id = pr.id);
  v_can := public.can_view_profile(v_me, pr.id);
  select * into f from public.friendships
  where least(requester_id, addressee_id) = least(v_me, pr.id)
    and greatest(requester_id, addressee_id) = greatest(v_me, pr.id);
  return public.social_person_json(pr.id, v_me) || jsonb_build_object(
    'visibility', pr.visibility,
    'bio', case when v_can then pr.bio end,
    'city', case when v_can then pr.city end,
    'college', case when v_can then pr.college end,
    'can_view', v_can,
    'counts', case when v_can then jsonb_build_object(
      'friends', (select count(*) from public.social_friends_of(pr.id)),
      'followers', (select count(*) from public.follows where followee_id = pr.id),
      'following', (select count(*) from public.follows where follower_id = pr.id)) end,
    'mutual_friends', case when pr.id <> v_me then public.social_mutual_friends(v_me, pr.id) end,
    'relationship', jsonb_build_object(
      'me', pr.id = v_me,
      'friend', case
        when f.status = 'accepted' then 'friends'
        when f.status = 'pending' and f.requester_id = v_me then 'outgoing'
        when f.status = 'pending' then 'incoming'
        else 'none' end,
      'request_id', case when f.status = 'pending' then f.id end,
      'following', exists (select 1 from public.follows where follower_id = v_me and followee_id = pr.id),
      'follows_me', exists (select 1 from public.follows where follower_id = pr.id and followee_id = v_me),
      'blocked', v_blocked));
end;
$$;

-- ─── Discover ───────────────────────────────────────────────────────────────────────────────────

-- Public posts from strangers in the last 14 days, scored as in docs/DISCOVER_RANKING.md, at most
-- two per author per page. Pass back as_of and the ids already shown to page on.
create function public.get_discover(
  p_filters text[] default '{}',
  p_exclude uuid[] default '{}',
  p_as_of timestamptz default null,
  p_limit integer default 20
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_me uuid := public.social_require_user();
  v_as_of timestamptz := least(coalesce(p_as_of, now()), now());
  v_limit integer := greatest(1, least(coalesce(p_limit, 20), 50));
  v_filters text[] := coalesce(p_filters, '{}');
  me public.profiles;
  v_score numeric;
  v_days integer;
  v_counts jsonb := '{}'::jsonb;
  v_out jsonb := '[]'::jsonb;
  v_n integer := 0;
  v_c integer;
  r record;
begin
  if exists (select 1 from unnest(v_filters) f
      where f not in ('college', 'city', 'similar_rank', 'same_goal', 'calisthenics', 'beginners')) then
    raise exception 'Unknown filter.' using errcode = '22023';
  end if;
  select * into me from public.profiles where id = v_me;
  select rc.score into v_score from public.ranks_current rc
  where rc.user_id = v_me and rc.scope = 'overall' and rc.key = 'overall' and rc.status = 'ranked';
  v_days := public.social_training_days(v_me, v_as_of);

  for r in
    with circle as (
      select f id from public.social_friends_of(v_me) f
      union select fo.followee_id from public.follows fo where fo.follower_id = v_me
    ),
    cand as (
      select p.id, p.author_id, p.created_at, p.like_count, p.comment_count, p.workout_summary,
        a.college, a.city, a.primary_goal, a.experience_level
      from public.posts p
      join public.profiles a on a.id = p.author_id
      where p.visibility = 'public' and a.visibility = 'public' and a.onboarded_at is not null
        and p.created_at > v_as_of - interval '14 days' and p.created_at <= v_as_of
        and p.author_id <> v_me
        and p.author_id not in (select id from circle)
        and not public.is_blocked(v_me, p.author_id)
        and not (p.id = any (coalesce(p_exclude, '{}')))
    ),
    authors as (
      select a.author_id, rc.score, rc.tier,
        public.social_training_days(a.author_id, v_as_of) days,
        exists (select 1 from public.ranks_current x where x.user_id = a.author_id
          and x.scope = 'calisthenics' and x.status = 'ranked') calisthenics
      from (select distinct author_id from cand) a
      left join public.ranks_current rc on rc.user_id = a.author_id and rc.scope = 'overall'
        and rc.key = 'overall' and rc.status = 'ranked'
    ),
    scored as (
      select c.id, c.author_id,
        coalesce(lower(c.college) = lower(me.college), false) same_college,
        coalesce(lower(c.city) = lower(me.city), false) same_city,
        coalesce(abs(au.score - v_score) <= 150, false) similar_rank,
        power(0.5, extract(epoch from v_as_of - c.created_at) / 3600 / 36)
          * (1 + 0.5 * least(1, ln(1 + c.like_count + 2 * c.comment_count) / ln(51)))
          * (1
            + 0.30 * coalesce((lower(c.college) = lower(me.college))::integer, 0)
            + 0.20 * coalesce((lower(c.city) = lower(me.city))::integer, 0)
            + 0.20 * coalesce(greatest(0, 1 - abs(au.score - v_score) / 300.0), 0)
            + 0.15 * coalesce((c.primary_goal = me.primary_goal)::integer, 0)
            + 0.15 * greatest(0, 1 - abs(au.days - v_days) / 8.0)) score
      from cand c
      join authors au on au.author_id = c.author_id
      where (not 'college' = any (v_filters) or lower(c.college) = lower(me.college))
        and (not 'city' = any (v_filters) or lower(c.city) = lower(me.city))
        and (not 'similar_rank' = any (v_filters) or abs(au.score - v_score) <= 150)
        and (not 'same_goal' = any (v_filters) or c.primary_goal = me.primary_goal)
        and (not 'calisthenics' = any (v_filters) or au.calisthenics
          or coalesce((c.workout_summary ->> 'calisthenics')::boolean, false)
          or c.primary_goal = 'calisthenics')
        and (not 'beginners' = any (v_filters) or c.experience_level = 'beginner'
          or au.score is null or au.tier in ('iron', 'bronze'))
    )
    select * from scored order by score desc, id
  loop
    v_c := coalesce((v_counts ->> r.author_id::text)::integer, 0);
    continue when v_c >= 2;
    v_counts := v_counts || jsonb_build_object(r.author_id::text, v_c + 1);
    -- Reasons name only what the author shows publicly (never goal or experience).
    v_out := v_out || jsonb_build_array(public.social_post_json(r.id, v_me) || jsonb_build_object(
      'reasons', to_jsonb(array_remove(array[
        case when r.same_college then 'college' end,
        case when r.same_city and not r.same_college then 'city' end,
        case when r.similar_rank then 'similar_rank' end], null))));
    v_n := v_n + 1;
    exit when v_n >= v_limit;
  end loop;
  return jsonb_build_object('as_of', v_as_of, 'posts', v_out, 'done', v_n < v_limit);
end;
$$;

-- People to train with: public strangers I have no link to, by the Discover similarity plus
-- mutual friends.
create function public.get_people_suggestions(p_limit integer default 12)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_me uuid := public.social_require_user();
  me public.profiles;
  v_score numeric;
  v_days integer;
begin
  select * into me from public.profiles where id = v_me;
  select rc.score into v_score from public.ranks_current rc
  where rc.user_id = v_me and rc.scope = 'overall' and rc.key = 'overall' and rc.status = 'ranked';
  v_days := public.social_training_days(v_me, now());
  return coalesce((
    select jsonb_agg(t.card order by t.score desc, t.id)
    from (
      select a.id, public.social_person_json(a.id, v_me) || jsonb_build_object(
          'college', a.college, 'city', a.city, 'mutual_friends', s.mutual,
          'reasons', to_jsonb(array_remove(array[
            case when lower(a.college) = lower(me.college) then 'college' end,
            case when lower(a.city) = lower(me.city) and lower(a.college) is distinct from lower(me.college)
              then 'city' end,
            case when abs(rc.score - v_score) <= 150 then 'similar_rank' end,
            case when s.mutual > 0 then 'mutual' end], null))) card,
        (0.30 * coalesce((lower(a.college) = lower(me.college))::integer, 0)
          + 0.20 * coalesce((lower(a.city) = lower(me.city))::integer, 0)
          + 0.20 * coalesce(greatest(0, 1 - abs(rc.score - v_score) / 300.0), 0)
          + 0.15 * coalesce((a.primary_goal = me.primary_goal)::integer, 0)
          + 0.15 * greatest(0, 1 - abs(public.social_training_days(a.id, now()) - v_days) / 8.0)
          + least(0.3, 0.1 * s.mutual)) score
      from public.profiles a
      cross join lateral (select public.social_mutual_friends(v_me, a.id) mutual) s
      left join public.ranks_current rc on rc.user_id = a.id and rc.scope = 'overall'
        and rc.key = 'overall' and rc.status = 'ranked'
      where a.id <> v_me and a.visibility = 'public' and a.onboarded_at is not null
        and not public.is_blocked(v_me, a.id)
        and not exists (select 1 from public.friendships f
          where least(f.requester_id, f.addressee_id) = least(v_me, a.id)
            and greatest(f.requester_id, f.addressee_id) = greatest(v_me, a.id))
        and not exists (select 1 from public.follows fo where fo.follower_id = v_me and fo.followee_id = a.id)
        and exists (select 1 from public.workouts w where w.user_id = a.id and w.status = 'completed'
          and w.started_at > now() - interval '60 days')
      order by score desc, a.id
      limit greatest(1, least(coalesce(p_limit, 12), 30))) t), '[]'::jsonb);
end;
$$;

-- People by username prefix or name, friends first. For mentions and Discover search.
create function public.search_profiles(p_query text, p_limit integer default 8)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_me uuid := public.social_require_user();
  v_q text := lower(btrim(coalesce(p_query, '')));
begin
  v_q := ltrim(v_q, '@');
  if char_length(v_q) < 1 then
    return '[]'::jsonb;
  end if;
  return coalesce((
    select jsonb_agg(t.card order by t.friend desc, t.prefix desc, t.username)
    from (
      select p.username, public.are_friends(v_me, p.id) friend,
        left(p.username, char_length(v_q)) = v_q prefix,
        public.social_person_json(p.id, v_me)
          || jsonb_build_object('is_friend', public.are_friends(v_me, p.id)) card
      from public.profiles p
      where p.onboarded_at is not null and p.id <> v_me and not public.is_blocked(v_me, p.id)
        and (left(p.username, char_length(v_q)) = v_q
          or position(v_q in lower(coalesce(p.display_name, ''))) > 0)
      order by public.are_friends(v_me, p.id) desc, (left(p.username, char_length(v_q)) = v_q) desc,
        p.username
      limit greatest(1, least(coalesce(p_limit, 8), 20))) t), '[]'::jsonb);
end;
$$;

create function public.get_friend_requests()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_me uuid := public.social_require_user();
begin
  return jsonb_build_object(
    'incoming', coalesce((
      select jsonb_agg(jsonb_build_object('id', f.id, 'created_at', f.created_at,
        'user', public.social_person_json(f.requester_id, v_me),
        'mutual_friends', public.social_mutual_friends(v_me, f.requester_id)) order by f.created_at desc)
      from public.friendships f where f.addressee_id = v_me and f.status = 'pending'), '[]'::jsonb),
    'outgoing', coalesce((
      select jsonb_agg(jsonb_build_object('id', f.id, 'created_at', f.created_at,
        'user', public.social_person_json(f.addressee_id, v_me),
        'mutual_friends', public.social_mutual_friends(v_me, f.addressee_id)) order by f.created_at desc)
      from public.friendships f where f.requester_id = v_me and f.status in ('pending', 'declined')
        and (f.status = 'pending' or f.responded_at > now() - interval '30 days')), '[]'::jsonb));
end;
$$;

create function public.get_friends()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_me uuid := public.social_require_user();
begin
  return coalesce((
    select jsonb_agg(public.social_person_json(x.id, v_me) || jsonb_build_object('since', x.since)
      order by lower(coalesce(p.display_name, p.username)))
    from (
      select case when f.requester_id = v_me then f.addressee_id else f.requester_id end id,
        coalesce(f.responded_at, f.created_at) since
      from public.friendships f
      where f.status = 'accepted' and v_me in (f.requester_id, f.addressee_id)) x
    join public.profiles p on p.id = x.id), '[]'::jsonb);
end;
$$;

-- ─── Notifications ──────────────────────────────────────────────────────────────────────────────

create function public.get_notifications(
  p_before_at timestamptz default null,
  p_before_id uuid default null,
  p_limit integer default 30
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_me uuid := public.social_require_user();
  v_limit integer := greatest(1, least(coalesce(p_limit, 30), 50));
  v_rows jsonb;
begin
  select coalesce(jsonb_agg(x.item order by x.created_at desc, x.id desc), '[]'::jsonb) into v_rows
  from (
    select n.id, n.created_at, jsonb_build_object(
      'id', n.id, 'kind', n.kind, 'created_at', n.created_at, 'read', n.read_at is not null,
      'actor', public.social_person_json(n.actor_id, v_me),
      'post', case when n.post_id is not null then (
        select jsonb_build_object('id', p.id, 'type', p.type, 'preview', left(coalesce(
          p.body, p.workout_summary ->> 'name', p.data ->> 'title', p.data ->> 'exercise_name',
          p.data ->> 'name', ''), 80))
        from public.posts p where p.id = n.post_id) end,
      'comment', case when n.comment_id is not null then (
        select jsonb_build_object('id', c.id, 'preview', left(coalesce(c.body, ''), 80))
        from public.comments c where c.id = n.comment_id) end,
      'request', case when n.kind = 'friend_request' then (
        select jsonb_build_object('id', f.id, 'status', f.status)
        from public.friendships f
        where least(f.requester_id, f.addressee_id) = least(v_me, n.actor_id)
          and greatest(f.requester_id, f.addressee_id) = greatest(v_me, n.actor_id)) end) item
    from public.notifications n
    where n.user_id = v_me
      and (p_before_at is null or (n.created_at, n.id) < (p_before_at, coalesce(p_before_id,
        'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid)))
    order by n.created_at desc, n.id desc
    limit v_limit) x;
  return jsonb_build_object('items', v_rows,
    'next', case when jsonb_array_length(v_rows) >= v_limit then jsonb_build_object(
      'at', v_rows -> -1 ->> 'created_at', 'id', v_rows -> -1 ->> 'id') end);
end;
$$;

create function public.get_unread_notification_count()
returns integer
language sql
stable
security invoker
set search_path = ''
as $$
  select count(*)::integer from public.notifications
  where user_id = auth.uid() and read_at is null;
$$;

-- ─── Routines: copy credit ──────────────────────────────────────────────────────────────────────

alter table public.routines
  add column source_label text constraint routines_source_label_length check (char_length(source_label) <= 40);

comment on column public.routines.source_label is 'Credit for a copy, e.g. @aarav ("Copied from @aarav").';

-- save_routine as before, plus source_label.
create or replace function public.save_routine(p jsonb)
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
    source_label, sort_order, archived
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
    p ->> 'source_label',
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
    source_label = excluded.source_label,
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

-- ─── Grants ─────────────────────────────────────────────────────────────────────────────────────

-- Internal: triggers, builders and helpers only definer functions call.
revoke execute on function
  public.social_require_target(uuid, uuid),
  public.social_notify(uuid, uuid, public.notification_kind, uuid, uuid),
  public.social_mentions(text),
  public.social_notify_mentions(uuid, uuid, uuid, text, uuid[]),
  public.social_workout_summary(uuid),
  public.social_sync_workout_post(uuid),
  public.workouts_social_post(),
  public.social_build_milestone(uuid, public.post_type, jsonb),
  public.social_insert_milestone(uuid, public.post_type, jsonb, public.profile_visibility),
  public.workout_rewards_social(),
  public.post_likes_count(),
  public.comments_count(),
  public.social_protect_columns(),
  public.social_valid_media(uuid, uuid, jsonb),
  public.social_friends_of(uuid),
  public.social_mutual_friends(uuid, uuid),
  public.social_training_days(uuid, timestamptz),
  public.social_person_json(uuid, uuid),
  public.social_post_json(uuid, uuid),
  public.social_page(jsonb, integer)
from public, anon, authenticated;

-- Policy helpers (RLS and storage policies run them as the caller) and client RPCs.
revoke execute on function
  public.visibility_rank(public.profile_visibility),
  public.is_blocked(uuid, uuid),
  public.can_view_profile(uuid, uuid),
  public.can_view_post_row(uuid, uuid, public.profile_visibility),
  public.can_view_post(uuid, uuid),
  public.can_view_comment(uuid, uuid),
  public.can_view_workout_photo(uuid, text),
  public.try_uuid(text),
  public.social_require_user(),
  public.send_friend_request(uuid),
  public.respond_friend_request(uuid, boolean),
  public.cancel_friend_request(uuid),
  public.remove_friend(uuid),
  public.follow_user(uuid),
  public.unfollow_user(uuid),
  public.block_user(uuid),
  public.unblock_user(uuid),
  public.create_post(jsonb),
  public.edit_post(uuid, text, public.profile_visibility, text[]),
  public.create_milestone_post(public.post_type, jsonb, public.profile_visibility),
  public.add_comment(uuid, uuid, text, uuid),
  public.edit_comment(uuid, text),
  public.delete_comment(uuid),
  public.report_content(public.report_reason, uuid, uuid, text),
  public.mark_notifications_read(uuid[]),
  public.get_feed(timestamptz, uuid, integer),
  public.get_post(uuid),
  public.get_user_posts(uuid, timestamptz, uuid, integer),
  public.get_profile(text),
  public.get_discover(text[], uuid[], timestamptz, integer),
  public.get_people_suggestions(integer),
  public.search_profiles(text, integer),
  public.get_friend_requests(),
  public.get_friends(),
  public.get_notifications(timestamptz, uuid, integer),
  public.get_unread_notification_count()
from public, anon;

grant execute on function
  public.visibility_rank(public.profile_visibility),
  public.is_blocked(uuid, uuid),
  public.can_view_profile(uuid, uuid),
  public.can_view_post_row(uuid, uuid, public.profile_visibility),
  public.can_view_post(uuid, uuid),
  public.can_view_comment(uuid, uuid),
  public.can_view_workout_photo(uuid, text),
  public.try_uuid(text),
  public.social_require_user(),
  public.send_friend_request(uuid),
  public.respond_friend_request(uuid, boolean),
  public.cancel_friend_request(uuid),
  public.remove_friend(uuid),
  public.follow_user(uuid),
  public.unfollow_user(uuid),
  public.block_user(uuid),
  public.unblock_user(uuid),
  public.create_post(jsonb),
  public.edit_post(uuid, text, public.profile_visibility, text[]),
  public.create_milestone_post(public.post_type, jsonb, public.profile_visibility),
  public.add_comment(uuid, uuid, text, uuid),
  public.edit_comment(uuid, text),
  public.delete_comment(uuid),
  public.report_content(public.report_reason, uuid, uuid, text),
  public.mark_notifications_read(uuid[]),
  public.get_feed(timestamptz, uuid, integer),
  public.get_post(uuid),
  public.get_user_posts(uuid, timestamptz, uuid, integer),
  public.get_profile(text),
  public.get_discover(text[], uuid[], timestamptz, integer),
  public.get_people_suggestions(integer),
  public.search_profiles(text, integer),
  public.get_friend_requests(),
  public.get_friends(),
  public.get_notifications(timestamptz, uuid, integer),
  public.get_unread_notification_count()
to authenticated;

-- Existing workout posts (dev seed and earlier workouts): one post per completed, non-private workout.
select public.social_sync_workout_post(w.id)
from public.workouts w
where w.status = 'completed' and w.visibility <> 'private';
