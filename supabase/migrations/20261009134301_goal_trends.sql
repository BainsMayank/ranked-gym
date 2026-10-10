-- Trend observations are aggregated in Postgres, never downloaded set-by-set.
create function public.goal_observations(g public.goals) returns jsonb
language plpgsql stable security invoker set search_path='' as $$
declare points jsonb;
begin
  if g.user_id is distinct from auth.uid() then raise insufficient_privilege; end if;
  case g.type
  when 'bodyweight' then
    select jsonb_agg(to_jsonb(t) order by t.at) into points from (
      select distinct on (logged_at::date) logged_at at,weight_kg value from public.bodyweight_logs
      where user_id=g.user_id and logged_at>=now()-interval '8 weeks' and logged_at<=now()
      order by logged_at::date,logged_at desc) t;
  when 'rank' then
    select jsonb_agg(to_jsonb(t) order by t.at) into points from (
      select taken_at at,score value from public.rank_snapshots where user_id=g.user_id
        and scope::text=g.target->>'scope' and key=g.target->>'key'
        and taken_at>=now()-interval '8 weeks' order by taken_at desc limit 60) t;
  when 'lift' then
    select jsonb_agg(to_jsonb(t) order by t.at) into points from (
      select min(started_at) at,max(weight_kg) value from public.home_working_sets
      where user_id=g.user_id and exercise_id=(g.target->>'exercise_id')::uuid
        and reps>=(g.target->>'reps')::integer and weight_mode in ('absolute','bodyweight')
        and started_at>=now()-interval '8 weeks' group by workout_id) t;
  when 'monthly_volume' then
    select jsonb_agg(to_jsonb(t) order by t.at) into points from (
      select started_at at,sum(total_volume_kg) over(order by started_at,id) value from public.workouts
      where user_id=g.user_id and status='completed' and started_at>=date_trunc('month',now())
        and started_at<=now()) t;
  when 'weekly_workouts' then
    select jsonb_agg(to_jsonb(t) order by t.at) into points from (
      select date_trunc('week',started_at) at,count(*) value from public.workouts
      where user_id=g.user_id and status='completed' and started_at>=now()-interval '8 weeks'
        and started_at<date_trunc('week',now()) group by date_trunc('week',started_at)) t;
  else points:='[]';
  end case;
  return coalesce(points,'[]');
end;
$$;
revoke execute on function public.goal_observations(public.goals) from public,anon,authenticated;

create or replace function public.save_goal(p_id uuid, p_type text, p_target jsonb, p_deadline date default null,
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
  if p_type='bodyweight' and not exists(select 1 from public.bodyweight_logs where user_id=v_uid and logged_at<=now()) then
    raise exception 'Log your current bodyweight first' using errcode='22023'; end if;
  if p_type='rank' and ((p_target->>'scope'='overall' and p_target->>'key'<>'overall')
    or (p_target->>'scope'='lift' and not exists(select 1 from public.rank_lifts where rank_key=p_target->>'key'))) then
    raise exception 'Choose a ranked lift' using errcode='22023'; end if;
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

create or replace function public.get_goals(p_zone text default 'Asia/Kolkata') returns jsonb
language plpgsql security definer set search_path='' as $$
declare g public.goals; v numeric; t numeric; done boolean; out_rows jsonb:='[]';
begin
  if auth.uid() is null then raise insufficient_privilege; end if;
  perform now() at time zone p_zone;
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

