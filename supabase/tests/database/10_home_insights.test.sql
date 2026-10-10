begin;
set local role postgres;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select no_plan();
insert into auth.users(id,email) values
 ('11111111-1111-1111-1111-111111111111','alice@test.dev'),
 ('22222222-2222-2222-2222-222222222222','bob@test.dev');
insert into public.workouts(id,user_id,name,started_at,ended_at,status,client_updated_at,duration_sec,total_volume_kg)
values ('aaaaaaaa-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','Bench',now()-interval '2 hours',now()-interval '1 hour','completed',now(),3600,1000),
 ('bbbbbbbb-0000-0000-0000-000000000001','22222222-2222-2222-2222-222222222222','Bob',now()-interval '2 hours',now()-interval '1 hour','completed',now(),3600,9000);
insert into public.workout_exercises(id,workout_id,exercise_id)
select 'aaaaaaaa-0000-0000-0000-000000000002','aaaaaaaa-0000-0000-0000-000000000001',id from public.exercises where slug='barbell-bench-press';
-- Primary chest and secondary triceps. Three valid sets, warm-up, missed and unticked.
insert into public.workout_sets(id,workout_exercise_id,weight_kg,reps,completed,set_type,failed,completed_at,rir)
select ('aaaaaaaa-0000-0000-0000-'||lpad(n::text,12,'0'))::uuid,'aaaaaaaa-0000-0000-0000-000000000002',
  50,10,n<>16,case when n=14 then 'warmup'::public.set_type else 'working'::public.set_type end,n=15,now()-interval '1 hour',2
from generate_series(11,16) n;
select ok((select bool_and(relrowsecurity) from pg_class where oid in ('public.goals'::regclass,'public.posts'::regclass)),'goal tables have RLS');
select is(public.recovery_half_life('biceps'),24::double precision,'small muscle half-life');
select is(public.recovery_half_life('quads'),60::double precision,'large muscle half-life');
select ok(not public.valid_goal_target('lift','{"title":"Bad","exercise_id":"x","weight_kg":50,"reps":5}'),'malformed lift rejected');
select ok(not coalesce(public.valid_goal_target('custom','{}'),false),'missing title rejected');

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}',true);
select is((select count(*)::int from public.home_working_sets),3,'only completed successful working sets are eligible');
select is((public.get_home_analytics(now()-interval '1 day',now(),'Asia/Kolkata')->'periods'->0->>'sessions')::integer,1,'only Alice session');
select is((public.get_home_analytics(now()-interval '1 day',now(),'Asia/Kolkata')->'periods'->0->>'volume')::numeric,1000::numeric,'overview uses server workout volume without overlapping muscles');
select is((select (r->>'sets')::numeric from jsonb_array_elements(public.get_home_analytics(now()-interval '1 day',now(),'Asia/Kolkata')->'muscles') r where r->>'muscle'='triceps'),1.5::numeric,'three secondary sets count 1.5');
select is((select (r->>'volume')::numeric from jsonb_array_elements(public.get_home_analytics(now()-interval '1 day',now(),'Asia/Kolkata')->'muscles') r where r->>'muscle'='triceps'),750::numeric,'three 50x10 secondary volumes are 750');
select ok(abs((select (r->>'fatigue')::double precision from jsonb_array_elements(public.get_home_analytics(now()-interval '1 day',now(),'Asia/Kolkata')->'fatigue') r where r->>'muscle'='triceps')-1.5*power(0.5,1.0/24))<0.000001,'SQL exponential decay matches hand calculation');
select throws_ok($$select public.get_home_analytics(now(),now()-interval '1 day','UTC')$$,'22023',null,'reversed range rejected');
select lives_ok($$select public.save_goal('aaaaaaaa-0000-0000-0000-000000000003','custom','{"title":"Stretch after class","checked":false}')$$,'goal without deadline saves');
select lives_ok($$select public.save_goal('aaaaaaaa-0000-0000-0000-000000000003','custom','{"title":"Stretch after class","checked":false}')$$,'save replay is idempotent');
select is((select count(*)::int from public.goals),1,'one goal after replay');
select throws_ok($$update public.goals set status='achieved'$$,'42501',null,'clients cannot forge goal achievement');
select lives_ok($$select public.save_goal('aaaaaaaa-0000-0000-0000-000000000003','custom','{"title":"Stretch after class","checked":true}',null,true)$$,'custom checkbox completes via validated input');
select lives_ok($$select public.get_goals()$$,'server evaluates completion');
select is((select status from public.goals limit 1),'achieved','completion persisted');
select is((select count(*)::int from public.posts where type='goal'),1,'opt-in achievement post created');
select lives_ok($$select public.get_goals()$$,'completion retry safe');
select is((select count(*)::int from public.posts where type='goal'),1,'post is exactly once');
select throws_ok($$insert into public.posts(author_id,type,goal_id,data) values(auth.uid(),'goal','aaaaaaaa-0000-0000-0000-000000000003','{"title":"Forged"}')$$,'42501',null,'clients cannot forge posts');
select throws_ok($$select public.save_goal('aaaaaaaa-0000-0000-0000-000000000004','bodyweight','{"title":"Reach 70 kg","kg":70}')$$,'22023',null,'bodyweight needs an initial weigh-in');
select lives_ok($$select public.save_goal('aaaaaaaa-0000-0000-0000-000000000005','weekly_workouts','{"title":"Train once","value":1}')$$,'frequency goal saves');
select lives_ok($$select public.get_goals()$$,'frequency evaluates');
select is((select status from public.goals where type='weekly_workouts'),'achieved','frequency goal is reached');
select lives_ok($$select public.save_goal('aaaaaaaa-0000-0000-0000-000000000006','rank','{"title":"Reach Iron","scope":"overall","key":"overall","score":0}')$$,'Iron target saves');
select lives_ok($$select public.get_goals()$$,'unplaced rank evaluates');
select is((select status from public.goals where type='rank'),'active','unplaced is not an achieved Iron rank');
select lives_ok($$select public.save_goal('aaaaaaaa-0000-0000-0000-000000000007','streak','{"title":"Train three days","value":3}')$$,'streak goal saves');
select lives_ok($$select public.save_goal('aaaaaaaa-0000-0000-0000-000000000008','monthly_volume','{"title":"Lift 2000 kg","value":2000}')$$,'monthly volume goal saves');
select lives_ok($$select public.save_goal('aaaaaaaa-0000-0000-0000-000000000008','monthly_volume','{"title":"Lift 2000 kg","value":2000}',null,false,true)$$,'archive saves');
select is((select status from public.goals where type='monthly_volume'),'archived','archive persists');
select throws_ok($$select public.save_goal('aaaaaaaa-0000-0000-0000-000000000009','weekly_workouts','{"title":"Bad","value":50}')$$,'22023',null,'unreasonable frequency input rejected');

set local role postgres;
insert into public.bodyweight_logs(user_id,weight_kg) values('11111111-1111-1111-1111-111111111111',80);
set local role authenticated;
select lives_ok($$select public.save_goal('aaaaaaaa-0000-0000-0000-000000000010','bodyweight','{"title":"Reach 75 kg","kg":75}')$$,'bodyweight goal saves');
select is((select start_value from public.goals where type='bodyweight'),80::numeric,'bodyweight baseline is server-derived');
select lives_ok($$select public.save_goal('aaaaaaaa-0000-0000-0000-000000000011','lift',jsonb_build_object('title','Bench 50 x 10','exercise_id',(select id from public.exercises where slug='barbell-bench-press'),'weight_kg',50,'reps',10))$$,'lift goal saves');
select lives_ok($$select public.get_goals()$$,'lift goal evaluates');
select is((select status from public.goals where type='lift'),'achieved','lift must meet weight and reps in the same set');
select is((select count(*)::int from public.posts where type='goal'),1,'non-opted-in goals never post');

select set_config('request.jwt.claims','{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}',true);
select is((select count(*)::int from public.goals),0,'Bob cannot read Alice goals');
select is((select count(*)::int from public.posts where type='goal'),0,'Bob cannot read Alice friends-only post');
select is((public.get_home_analytics(now()-interval '1 day',now(),'UTC')->'periods'->0->>'volume')::numeric,9000::numeric,'Bob analytics contain only Bob');
select throws_ok($$select public.save_goal('aaaaaaaa-0000-0000-0000-000000000007','streak','{"title":"Stolen","value":3}')$$,'42501',null,'Bob cannot update Alice goal');
select throws_ok($$select public.save_goal('aaaaaaaa-0000-0000-0000-000000000007','streak','{"title":"Stolen","value":3}',null,false,true)$$,'42501',null,'Bob cannot archive Alice goal');
select is(public.get_goals(),'[]'::jsonb,'Bob cannot evaluate Alice goals');
set local role anon;
select throws_ok($$select * from public.goals$$,'42501',null,'anon cannot read goals');
select throws_ok($$select * from public.posts$$,'42501',null,'anon cannot read posts');
select throws_ok($$select public.get_goals()$$,'42501',null,'anon cannot execute goal evaluation');
select throws_ok($$select public.get_home_analytics(now()-interval '1 day',now(),'UTC')$$,'42501',null,'anon cannot execute analytics');
select * from finish();
rollback;
