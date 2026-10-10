-- Phase 8. All analytics execute with the caller's RLS; completion is checked on the server.
alter table public.user_settings add column recovery_speed text not null default 'normal'
  check (recovery_speed in ('slower', 'normal', 'faster'));

create function public.recovery_half_life(p public.muscle) returns double precision
language sql immutable set search_path = '' as $$
  select case when p in ('quads','glutes','adductors','abductors') then 60
    when p in ('hamstrings','lower_back') then 48
    when p in ('upper_chest','mid_lower_chest','lats','upper_back') then 36
    when p in ('front_delts','side_delts','rear_delts','traps','calves') then 30 else 24 end::double precision;
$$;

create view public.home_working_sets with (security_invoker = true) as
select w.user_id, w.id workout_id, we.exercise_id, s.id set_id,
  w.started_at, coalesce(s.completed_at, w.ended_at, w.started_at) at,
  s.weight_kg, s.reps, s.rir, s.rpe,
  case when s.weight_mode in ('absolute','bodyweight') then coalesce(s.weight_kg * s.reps,0) else 0 end volume_kg,
  s.weight_mode
from public.workouts w join public.workout_exercises we on we.workout_id=w.id
join public.workout_sets s on s.workout_exercise_id=we.id
join public.exercises e on e.id=we.exercise_id
where w.status='completed' and s.completed and not s.failed and s.set_type<>'warmup'
  and e.category in ('strength','calisthenics');
revoke all on public.home_working_sets from public, anon;
grant select on public.home_working_sets to authenticated;

create function public.training_streak(p_now timestamptz, p_zone text) returns integer
language sql stable security invoker set search_path = '' as $$
  with dates as (select distinct (started_at at time zone p_zone)::date d
    from public.workouts where user_id=auth.uid() and status='completed'
      and started_at<=p_now), anchor as (
    select max(d) d from dates where d >= (p_now at time zone p_zone)::date-1
  ), numbered as (select dates.d, row_number() over(order by dates.d desc)::integer n
    from dates, anchor where dates.d<=anchor.d)
  select count(*)::integer from numbered, anchor where numbered.d=anchor.d-(numbered.n-1);
$$;

create function public.get_home_analytics(p_start timestamptz, p_end timestamptz,
  p_zone text default 'Asia/Kolkata') returns jsonb
language plpgsql stable security invoker set search_path = '' as $$
declare v_now timestamptz := now(); v_speed double precision; v_days double precision;
begin
  if auth.uid() is null then raise insufficient_privilege; end if;
  if p_end<=p_start or p_end-p_start>interval '366 days' then
    raise exception 'Choose a range of 1 to 366 days' using errcode='22023'; end if;
  perform now() at time zone p_zone;
  v_days := extract(epoch from p_end-p_start)/86400;
  select case recovery_speed when 'slower' then 1.25 when 'faster' then 0.75 else 1 end
    into v_speed from public.user_settings where user_id=auth.uid();
  return jsonb_build_object('asOf',v_now,'start',p_start,'end',p_end,'zone',p_zone,
    'speed',coalesce((select recovery_speed from public.user_settings where user_id=auth.uid()),'normal'),
    'streak',public.training_streak(v_now,p_zone),
    'periods', (select jsonb_agg(to_jsonb(t) order by t.period) from (
      select period, count(w.id)::integer sessions, coalesce(sum(w.total_volume_kg),0) volume,
        coalesce(sum(w.duration_sec),0) duration, sum(w.calories_est) calories,
        count(w.id) filter(where w.calories_est is null)::integer missing_calories
      from (values (0,p_start,p_end),(1,p_start-(p_end-p_start),p_start)) r(period,a,b)
      left join public.workouts w on w.user_id=auth.uid() and w.status='completed'
        and w.started_at>=r.a and w.started_at<r.b group by period) t),
    'daily', (select coalesce(jsonb_agg(to_jsonb(t) order by t.day),'[]'::jsonb) from (
      select d.day::date::text as "day", count(w.id)::integer sessions,
        coalesce(sum(w.total_volume_kg),0) volume,coalesce(sum(w.duration_sec),0) duration
      from generate_series((p_start at time zone p_zone)::date::timestamp,
        ((p_end-interval '1 microsecond') at time zone p_zone)::date::timestamp,interval '1 day') d(day)
      left join public.workouts w on w.user_id=auth.uid() and w.status='completed'
        and (w.started_at at time zone p_zone)::date=d.day::date
        and w.started_at>=p_start and w.started_at<p_end group by d.day) t),
    'muscles',(select coalesce(jsonb_agg(to_jsonb(t) order by t.sets desc),'[]'::jsonb) from (
      select m.muscle, sum(case m.role when 'primary' then 1 else 0.5 end) sets,
        sum(s.volume_kg*case m.role when 'primary' then 1 else 0.5 end) volume
      from public.home_working_sets s join public.exercise_muscles m on m.exercise_id=s.exercise_id
      where s.user_id=auth.uid() and s.started_at>=p_start and s.started_at<p_end
        and m.role<>'stabiliser' group by m.muscle) t),
    'fatigue',(select coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) from (
      select m.muscle, max(s.at) last_trained,
        sum(m.weight * greatest(0.5,least(1.5,1+(2-coalesce(s.rir,10-s.rpe,2))*0.15)) *
          power(0.5,extract(epoch from v_now-s.at)/3600 /
            (public.recovery_half_life(m.muscle)*coalesce(v_speed,1)))) fatigue
      from public.home_working_sets s join public.exercise_muscles m on m.exercise_id=s.exercise_id
      where s.user_id=auth.uid() and s.at<=v_now and m.role<>'stabiliser'
      group by m.muscle) t),
    'bodyweight',(select coalesce(jsonb_agg(to_jsonb(t) order by t.at),'[]'::jsonb) from (
      select logged_at at, weight_kg kg from public.bodyweight_logs
      where user_id=auth.uid() and logged_at>=p_start-interval '7 days' and logged_at<p_end) t),
    'records',(select coalesce(jsonb_agg(to_jsonb(t) order by t.at desc),'[]'::jsonb) from (
      select p.id,p.achieved_at at,e.name,p.kind,p.value,p.previous_value,p.workout_id
      from public.personal_records p join public.exercises e on e.id=p.exercise_id
      where p.user_id=auth.uid() and p.previous_value is not null
        and p.achieved_at>=p_start and p.achieved_at<p_end) t),
    'previous_records',(select count(*) from public.personal_records p where p.user_id=auth.uid()
      and p.previous_value is not null and p.achieved_at>=p_start-(p_end-p_start) and p.achieved_at<p_start),
    'rankups',(select coalesce(jsonb_agg(to_jsonb(t) order by t.at desc),'[]'::jsonb) from (
      select e.id,coalesce(w.started_at,e.created_at) at,e.key name,e.to_tier tier,
        e.to_division division,e.workout_id
      from public.rank_events e left join public.workouts w on w.id=e.workout_id
      where e.user_id=auth.uid() and e.kind='rank_up' and e.scope in ('lift','overall')
        and coalesce(w.started_at,e.created_at)>=p_start and coalesce(w.started_at,e.created_at)<p_end) t));
end;
$$;

create function public.valid_goal_target(p_type text, t jsonb) returns boolean
language plpgsql immutable set search_path = '' as $$
begin
  if jsonb_typeof(t)<>'object' or length(coalesce(t->>'title','')) not between 1 and 80 then return false; end if;
  return case p_type
    when 'lift' then (t->>'exercise_id')::uuid is not null and (t->>'weight_kg')::numeric>0
      and (t->>'reps')::integer between 1 and 500
    when 'rank' then t->>'scope' in ('overall','lift') and length(t->>'key')>0
      and (t->>'score')::numeric between 0 and 1000
    when 'bodyweight' then (t->>'kg')::numeric between 20 and 400
    when 'weekly_workouts' then (t->>'value')::integer between 1 and 14
    when 'streak' then (t->>'value')::integer between 1 and 366
    when 'monthly_volume' then (t->>'value')::numeric>0
    when 'custom' then jsonb_typeof(t->'checked')='boolean' else false end;
exception when others then return false;
end;
$$;

create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  type text not null,
  target jsonb not null,
  start_value numeric not null default 0,
  deadline date,
  status text not null default 'active' check(status in ('active','achieved','archived')),
  auto_post boolean not null default false,
  achieved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (coalesce(public.valid_goal_target(type,target),false))
);
create index goals_owner on public.goals(user_id,status);
alter table public.goals enable row level security;
create policy goals_select on public.goals for select to authenticated using(user_id=auth.uid());
revoke all on public.goals from anon,authenticated;
grant select on public.goals to authenticated;

-- Minimal achievement posts; general feed/publishing remains Phase 9.
create table public.goal_posts (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null unique references public.goals(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  visibility public.profile_visibility not null default 'private',
  created_at timestamptz not null default now()
);
alter table public.goal_posts enable row level security;
create policy goal_posts_select on public.goal_posts for select to authenticated using(
  user_id=auth.uid() or visibility='public' or (visibility='friends' and public.are_friends(user_id,auth.uid())));
revoke all on public.goal_posts from anon,authenticated;
grant select on public.goal_posts to authenticated;

create function public.goal_value(g public.goals, p_now timestamptz, p_zone text) returns numeric
language plpgsql stable security invoker set search_path = '' as $$
declare v numeric;
begin
  if g.user_id is distinct from auth.uid() then raise insufficient_privilege; end if;
  case g.type
    when 'lift' then select max(weight_kg) into v from public.home_working_sets
      where user_id=g.user_id and exercise_id=(g.target->>'exercise_id')::uuid
      and reps>=(g.target->>'reps')::integer and weight_mode in ('absolute','bodyweight');
    when 'rank' then select score into v from public.ranks_current where user_id=g.user_id
      and scope::text=g.target->>'scope' and key=g.target->>'key' and status='ranked';
    when 'bodyweight' then select weight_kg into v from public.bodyweight_logs
      where user_id=g.user_id and logged_at<=p_now order by logged_at desc limit 1;
    when 'weekly_workouts' then select count(*) into v from public.workouts where user_id=g.user_id
      and status='completed' and started_at<=p_now
      and (started_at at time zone p_zone)>=date_trunc('week',p_now at time zone p_zone);
    when 'streak' then v:=public.training_streak(p_now,p_zone);
    when 'monthly_volume' then select sum(total_volume_kg) into v from public.workouts
      where user_id=g.user_id and status='completed' and started_at<=p_now
      and (started_at at time zone p_zone)>=date_trunc('month',p_now at time zone p_zone);
    else v:=case when (g.target->>'checked')::boolean then 1 else 0 end;
  end case;
  return coalesce(v,case when g.type='bodyweight' then g.start_value else 0 end);
end;
$$;

create function public.goal_target_value(g public.goals) returns numeric
language sql immutable set search_path='' as $$
  select case g.type when 'lift' then (g.target->>'weight_kg')::numeric
    when 'rank' then (g.target->>'score')::numeric when 'bodyweight' then (g.target->>'kg')::numeric
    when 'custom' then 1 else (g.target->>'value')::numeric end;
$$;

create function public.save_goal(p_id uuid, p_type text, p_target jsonb, p_deadline date,
  p_auto_post boolean default false, p_archive boolean default false, p_zone text default 'Asia/Kolkata')
returns uuid language plpgsql security definer set search_path='' as $$
declare g public.goals; v_uid uuid:=auth.uid();
begin
  if v_uid is null then raise insufficient_privilege; end if;
  if not coalesce(public.valid_goal_target(p_type,p_target),false) then
    raise exception 'Check your goal target' using errcode='22023'; end if;
  if p_type='lift' and not public.can_use_exercise((p_target->>'exercise_id')::uuid) then raise insufficient_privilege; end if;
  if p_type='rank' and not exists(select 1 from public.rank_thresholds
    where version=(select active_standards_version from public.rank_settings)
      and min_score=(p_target->>'score')::numeric) then
    raise exception 'Choose a rank division' using errcode='22023'; end if;
  select * into g from public.goals where id=p_id for update;
  if found then
    if g.user_id<>v_uid then raise insufficient_privilege; end if;
    if g.status='achieved' and not p_archive then raise exception 'This goal is already achieved'; end if;
    update public.goals set type=p_type,target=p_target,deadline=p_deadline,auto_post=p_auto_post,
      status=case when p_archive then 'archived' else status end,updated_at=now() where id=p_id;
  else
    g.id:=p_id;g.user_id:=v_uid;g.type:=p_type;g.target:=p_target;g.start_value:=0;
    g.start_value:=public.goal_value(g,now(),p_zone);
    insert into public.goals(id,user_id,type,target,start_value,deadline,auto_post)
      values(p_id,v_uid,p_type,p_target,g.start_value,p_deadline,p_auto_post);
  end if;
  return p_id;
end;
$$;

create function public.get_goals(p_zone text default 'Asia/Kolkata') returns jsonb
language plpgsql security definer set search_path='' as $$
declare g public.goals; v numeric; t numeric; done boolean; out_rows jsonb:='[]';
begin
  if auth.uid() is null then raise insufficient_privilege; end if;
  perform now() at time zone p_zone;
  for g in select * from public.goals where user_id=auth.uid() order by created_at desc for update loop
    v:=public.goal_value(g,now(),p_zone);t:=public.goal_target_value(g);
    done:=case when g.type='bodyweight' and t<g.start_value then v<=t else v>=t end;
    if g.status='active' and done then
      update public.goals set status='achieved',achieved_at=now(),updated_at=now() where id=g.id returning * into g;
      if g.auto_post then
        insert into public.goal_posts(goal_id,user_id,title,visibility)
          select g.id,g.user_id,g.target->>'title',p.visibility from public.profiles p where p.id=g.user_id
          on conflict(goal_id) do nothing;
      end if;
    end if;
    out_rows:=out_rows||jsonb_build_array(to_jsonb(g)||jsonb_build_object('current_value',v,'target_value',t));
  end loop;
  return out_rows;
end;
$$;

revoke execute on function public.recovery_half_life(public.muscle),public.training_streak(timestamptz,text),
  public.get_home_analytics(timestamptz,timestamptz,text),public.valid_goal_target(text,jsonb),
  public.goal_value(public.goals,timestamptz,text),public.goal_target_value(public.goals),
  public.save_goal(uuid,text,jsonb,date,boolean,boolean,text),public.get_goals(text) from public,anon;
grant execute on function public.recovery_half_life(public.muscle),public.training_streak(timestamptz,text),
  public.get_home_analytics(timestamptz,timestamptz,text),public.valid_goal_target(text,jsonb),
  public.goal_value(public.goals,timestamptz,text),public.goal_target_value(public.goals),
  public.save_goal(uuid,text,jsonb,date,boolean,boolean,text),public.get_goals(text) to authenticated;
