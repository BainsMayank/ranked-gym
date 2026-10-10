-- Match goal trend calendar days to the requested timezone; retain record units.
create or replace function public.get_home_analytics(p_start timestamptz, p_end timestamptz,
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
      select p.id,p.achieved_at at,e.name,p.kind,p.value,p.previous_value,p.weight_kg,p.workout_id
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
      if g.auto_post then
        insert into public.goal_posts(goal_id,user_id,title,visibility)
          select g.id,g.user_id,g.target->>'title',p.visibility from public.profiles p where p.id=g.user_id
          on conflict(goal_id) do nothing;
      end if;
    end if;
    out_rows:=out_rows||jsonb_build_array(to_jsonb(g)||jsonb_build_object('current_value',v,'target_value',t,'observations',public.goal_observations(g)));
  end loop;
  return out_rows;
end;
$$;

