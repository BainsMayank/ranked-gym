-- Phase 9: social graph, posts, engagement, notifications, feed and discover.
-- Cast: alice (friends profile), bob (friends; alice's friend), carol (public stranger),
-- dave (public; follows carol), eve (private; alice's friend), frank (public; blocked later).
begin;
set local role postgres;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select no_plan();

create function pg_temp.uid(n integer) returns uuid language sql immutable as $$
  select ('00000000-0000-4000-9000-' || lpad(n::text, 12, '0'))::uuid $$;
create function pg_temp.pid(n integer) returns uuid language sql immutable as $$
  select ('00000000-0000-4000-a000-' || lpad(n::text, 12, '0'))::uuid $$;
create function pg_temp.mkuser(n integer, vis public.profile_visibility, uname text) returns void
language sql as $$
  insert into auth.users (id, email) values (pg_temp.uid(n), uname || '@social.test');
  update public.profiles set username = uname, display_name = initcap(uname), birth_year = 2000,
    visibility = vis, onboarded_at = now(), college = 'DTU', city = 'Delhi'
  where id = pg_temp.uid(n);
$$;
create function pg_temp.as_user(n integer) returns void language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims',
    json_build_object('sub', pg_temp.uid(n), 'role', 'authenticated')::text, true);
end $$;
create function pg_temp.workout(n integer, w integer, vis public.profile_visibility,
  st public.workout_status default 'completed') returns void
language sql as $$
  insert into public.workouts (id, user_id, name, started_at, ended_at, status, client_updated_at, visibility)
  values (pg_temp.pid(1000 + w), pg_temp.uid(n), 'Workout ' || w, now() - interval '2 hours',
    case when st = 'completed' then now() - interval '1 hour' end, st, now(), vis);
$$;
grant execute on function pg_temp.uid(integer), pg_temp.pid(integer), pg_temp.as_user(integer)
  to authenticated;

select pg_temp.mkuser(1, 'friends', 'alice');
select pg_temp.mkuser(2, 'friends', 'bob');
select pg_temp.mkuser(3, 'public', 'carol');
select pg_temp.mkuser(4, 'public', 'dave');
select pg_temp.mkuser(5, 'private', 'eve');
select pg_temp.mkuser(6, 'public', 'frank');

-- ─── Schema ─────────────────────────────────────────────────────────────────────────────────────

select ok((select bool_and(relrowsecurity) from pg_class where oid in (
  'public.friendships'::regclass, 'public.follows'::regclass, 'public.blocks'::regclass,
  'public.posts'::regclass, 'public.post_likes'::regclass, 'public.comments'::regclass,
  'public.reports'::regclass, 'public.notifications'::regclass)), 'every social table has RLS');
select is((select milestone_posts::text from public.user_settings where user_id = pg_temp.uid(1)),
  'ask', 'milestone posts default to ask');

-- ─── Friends and follows ────────────────────────────────────────────────────────────────────────

select pg_temp.as_user(1);
select is(public.send_friend_request(pg_temp.uid(2)), 'pending', 'alice asks bob');
select ok(not public.are_friends(pg_temp.uid(1), pg_temp.uid(2)), 'a pending request is not a friendship');
select throws_ok($$insert into public.friendships (requester_id, addressee_id)
  values (pg_temp.uid(1), pg_temp.uid(3))$$, '42501', null, 'friendships are written only by RPCs');
select throws_ok($$select public.send_friend_request(pg_temp.uid(1))$$, '22023', null,
  'no requests to yourself');

select pg_temp.as_user(2);
select is(jsonb_array_length(public.get_friend_requests() -> 'incoming'), 1, 'bob sees the request');
select is((select count(*)::integer from public.notifications where kind = 'friend_request'), 1,
  'bob is notified of the request');
select is(public.send_friend_request(pg_temp.uid(1)), 'accepted',
  'asking someone who already asked you accepts');
select ok(public.are_friends(pg_temp.uid(1), pg_temp.uid(2))
  and public.are_friends(pg_temp.uid(2), pg_temp.uid(1)), 'friendship is mutual');

select pg_temp.as_user(5);
select is(public.send_friend_request(pg_temp.uid(1)), 'pending', 'eve asks alice');
select pg_temp.as_user(1);
select is(public.respond_friend_request(
  (select id from public.friendships where requester_id = pg_temp.uid(5)), true), 'accepted',
  'alice accepts eve');
select is((select count(*)::integer from public.notifications where kind = 'friend_accepted'), 1,
  'alice is told bob accepted, not about her own accept');

select pg_temp.as_user(4);
select is((select count(*)::integer from public.friendships), 0, 'dave cannot read others'' friendships');
select throws_ok($$select public.follow_user(pg_temp.uid(1))$$, '42501', null,
  'only public profiles can be followed');
select lives_ok($$select public.follow_user(pg_temp.uid(3))$$, 'dave follows carol');
select lives_ok($$select public.follow_user(pg_temp.uid(3))$$, 'following twice is a no-op');
select pg_temp.as_user(3);
select is((select count(*)::integer from public.notifications where kind = 'follow'), 1,
  'carol is notified once');

-- ─── Posts and visibility ───────────────────────────────────────────────────────────────────────

select pg_temp.as_user(1);
select is(public.create_post(jsonb_build_object('id', pg_temp.pid(1), 'body', 'Leg day done',
  'visibility', 'friends')), pg_temp.pid(1), 'alice posts to friends');
select is(public.create_post(jsonb_build_object('id', pg_temp.pid(1), 'body', 'Replay')), pg_temp.pid(1),
  'replaying a post id returns it');
select lives_ok($$select public.create_post(jsonb_build_object('id', pg_temp.pid(2),
  'body', 'Public, but my profile is friends-only @bob', 'visibility', 'public'))$$, 'alice posts public');
select lives_ok($$select public.create_post(jsonb_build_object('id', pg_temp.pid(3),
  'body', 'Just for me', 'visibility', 'private'))$$, 'alice posts privately');
select throws_ok($$select public.create_post(jsonb_build_object('id', pg_temp.pid(9), 'body', repeat('x', 1001)))$$,
  '22023', null, 'posts are 1000 characters at most');
select throws_ok($$select public.create_post(jsonb_build_object('id', pg_temp.pid(9), 'body', ' '))$$,
  '22023', null, 'empty posts are rejected');
select throws_ok($$insert into public.posts (author_id, type, body) values (auth.uid(), 'text', 'x')$$,
  '42501', null, 'posts are written only by RPCs');

select pg_temp.as_user(2);
select is((select count(*)::integer from public.notifications where kind = 'mention'), 1,
  'bob is notified of the mention');
select throws_ok($$select public.create_post(jsonb_build_object('id', pg_temp.pid(1), 'body', 'Steal'))$$,
  '42501', null, 'another author''s post id is refused');

select pg_temp.as_user(3);
select lives_ok($$select public.create_post(jsonb_build_object('id', pg_temp.pid(31),
  'body', 'Morning run', 'visibility', 'public'))$$, 'carol posts public');
select lives_ok($$select public.create_post(jsonb_build_object('id', pg_temp.pid(32),
  'body', 'Friends only', 'visibility', 'friends'))$$, 'carol posts to friends');

select pg_temp.as_user(5);
select lives_ok($$select public.create_post(jsonb_build_object('id', pg_temp.pid(51),
  'body', 'Hidden by my private profile', 'visibility', 'public'))$$, 'eve posts public');

-- The matrix: post visibility × profile visibility × relationship.
select pg_temp.as_user(2);
select is((select array_agg(id order by id) from public.posts where type = 'text'
  and id::text like '00000000-0000-4000-a000-%'),
  array[pg_temp.pid(1), pg_temp.pid(2), pg_temp.pid(31)],
  'bob (alice''s friend) sees her friends and public posts and carol''s public post');
select pg_temp.as_user(1);
select is((select array_agg(id order by id) from public.posts where type = 'text'
  and id::text like '00000000-0000-4000-a000-%'),
  array[pg_temp.pid(1), pg_temp.pid(2), pg_temp.pid(3), pg_temp.pid(31)],
  'alice sees her own posts; eve''s private profile caps her public post');
select pg_temp.as_user(3);
select is((select array_agg(id order by id) from public.posts where type = 'text'
  and id::text like '00000000-0000-4000-a000-%'),
  array[pg_temp.pid(31), pg_temp.pid(32)], 'carol (stranger to alice) sees only her own');
select pg_temp.as_user(4);
select is((select array_agg(id order by id) from public.posts where type = 'text'
  and id::text like '00000000-0000-4000-a000-%'),
  array[pg_temp.pid(31)], 'dave sees carol''s public post only');
select pg_temp.as_user(5);
select is((select array_agg(id order by id) from public.posts where type = 'text'
  and id::text like '00000000-0000-4000-a000-%'),
  array[pg_temp.pid(1), pg_temp.pid(2), pg_temp.pid(31), pg_temp.pid(51)],
  'eve (alice''s friend) sees alice''s shared posts and her own');

-- A non-friend can't fetch a friends-only post through any API.
select pg_temp.as_user(3);
select is((select count(*)::integer from public.posts where id = pg_temp.pid(1)), 0,
  'non-friend: table read returns nothing');
select is(public.get_post(pg_temp.pid(1)), null, 'non-friend: get_post returns null');
select is(public.get_post(pg_temp.pid(2)), null,
  'non-friend: a public post on a friends-only profile is still hidden');
select ok(not public.can_view_post(pg_temp.uid(3), pg_temp.pid(1)), 'can_view_post agrees');
select throws_ok($$insert into public.post_likes (post_id) values (pg_temp.pid(1))$$, '42501', null,
  'non-friend: cannot give respect');
select throws_ok($$select public.add_comment(gen_random_uuid(), pg_temp.pid(1), 'hi')$$, '42501', null,
  'non-friend: cannot comment');
select throws_ok($$select public.report_content('spam', pg_temp.pid(1))$$, '42501', null,
  'non-friend: cannot report what they cannot see');
select is(jsonb_array_length(public.get_user_posts(pg_temp.uid(1)) -> 'posts'), 0,
  'non-friend: alice''s profile lists no posts');
select is((public.get_profile('alice') ->> 'can_view')::boolean, false, 'non-friend: profile details hidden');
select is(public.get_profile('alice') ->> 'bio', null, 'non-friend: no bio');

set local role postgres;
set local role anon;
select set_config('request.jwt.claims', '{"role": "anon"}', true);
select throws_ok($$select * from public.posts$$, '42501', null, 'anon cannot read posts');
select throws_ok($$select public.get_feed()$$, '42501', null, 'anon cannot call get_feed');

-- ─── Photos ─────────────────────────────────────────────────────────────────────────────────────

set local role postgres;
insert into storage.objects (bucket_id, name, owner)
values ('post-media', pg_temp.uid(1) || '/' || pg_temp.pid(4) || '/0.jpg', pg_temp.uid(1)),
  ('workout-photos', pg_temp.uid(1) || '/' || pg_temp.pid(1001) || '.jpg', pg_temp.uid(1));
select pg_temp.workout(1, 1, 'friends');
update public.workouts set photo_path = pg_temp.uid(1) || '/' || pg_temp.pid(1001) || '.jpg'
where id = pg_temp.pid(1001);

select pg_temp.as_user(1);
select throws_ok($$select public.create_post(jsonb_build_object('id', pg_temp.pid(5),
  'media', jsonb_build_array(jsonb_build_object('path', pg_temp.uid(2) || '/' || pg_temp.pid(5) || '/0.jpg'))))$$,
  '22023', null, 'photos must be your own uploads for this post');
select lives_ok($$select public.create_post(jsonb_build_object('id', pg_temp.pid(4), 'visibility', 'friends',
  'media', jsonb_build_array(jsonb_build_object('path', pg_temp.uid(1) || '/' || pg_temp.pid(4) || '/0.jpg',
  'w', 1200, 'h', 1500))))$$, 'alice posts a photo');
select is((select type::text from public.posts where id = pg_temp.pid(4)), 'photo', 'it is a photo post');

select pg_temp.as_user(2);
select is((select count(*)::integer from storage.objects where bucket_id in ('post-media', 'workout-photos')
  and name like pg_temp.uid(1)::text || '/%'),
  2, 'friend can read the post photo and the workout photo');
select pg_temp.as_user(3);
select is((select count(*)::integer from storage.objects where bucket_id in ('post-media', 'workout-photos')
  and name like pg_temp.uid(1)::text || '/%'),
  0, 'non-friend can read neither photo');

-- ─── Workout posts ──────────────────────────────────────────────────────────────────────────────

set local role postgres;
select is((select visibility::text from public.posts where workout_id = pg_temp.pid(1001)), 'friends',
  'a finished workout posts with its visibility');
select ok((select workout_summary ? 'exercises' from public.posts where workout_id = pg_temp.pid(1001)),
  'the post carries a workout summary');
select pg_temp.workout(1, 2, 'private');
select is((select count(*)::integer from public.posts where workout_id = pg_temp.pid(1002)), 0,
  'a private workout has no post');
select pg_temp.workout(1, 3, 'public', 'in_progress');
select is((select count(*)::integer from public.posts where workout_id = pg_temp.pid(1003)), 0,
  'a draft has no post');
update public.workouts set visibility = 'public' where id = pg_temp.pid(1002);
select is((select count(*)::integer from public.posts where workout_id = pg_temp.pid(1002)), 1,
  'making a workout visible creates its post');
update public.workouts set visibility = 'private' where id = pg_temp.pid(1002);
select is((select count(*)::integer from public.posts where workout_id = pg_temp.pid(1002)), 0,
  'making it private removes the post');
select pg_temp.workout(3, 31, 'public');
select pg_temp.workout(4, 41, 'public');
select pg_temp.workout(6, 61, 'public');

select pg_temp.as_user(1);
select throws_ok($$select public.create_post(jsonb_build_object('id', pg_temp.pid(6), 'body', 'x',
  'attach', jsonb_build_object('workout_id', pg_temp.pid(1031))))$$, '42501', null,
  'you can only attach your own workouts');
select lives_ok($$select public.create_post(jsonb_build_object('id', pg_temp.pid(6), 'body', 'Look at this',
  'attach', jsonb_build_object('workout_id', pg_temp.pid(1001))))$$, 'attach your own workout');

-- ─── Feed ───────────────────────────────────────────────────────────────────────────────────────

select pg_temp.as_user(2);
select ok((select bool_and(p ->> 'id' in (pg_temp.pid(1)::text, pg_temp.pid(2)::text, pg_temp.pid(4)::text,
    pg_temp.pid(6)::text, pg_temp.pid(1001)::text) or (p ->> 'workout_id') = pg_temp.pid(1001)::text)
  from jsonb_array_elements(public.get_feed() -> 'posts') p), 'bob''s feed is alice''s shared posts only');
select ok(not exists (select 1 from jsonb_array_elements(public.get_feed() -> 'posts') p
  where p ->> 'id' in (pg_temp.pid(3)::text, pg_temp.pid(31)::text)),
  'no private posts and no strangers in the feed');
select is(jsonb_array_length(public.get_feed() -> 'posts'), 5, 'bob sees five posts');
select is(jsonb_array_length(public.get_feed(
    (public.get_feed(null, null, 2) -> 'next' ->> 'at')::timestamptz,
    (public.get_feed(null, null, 2) -> 'next' ->> 'id')::uuid, 10) -> 'posts'), 3,
  'the next page continues without repeats');
select pg_temp.as_user(4);
select ok(exists (select 1 from jsonb_array_elements(public.get_feed() -> 'posts') p
  where p ->> 'id' = pg_temp.pid(31)::text), 'dave''s feed has carol''s public post (follow)');
select ok(not exists (select 1 from jsonb_array_elements(public.get_feed() -> 'posts') p
  where p ->> 'id' = pg_temp.pid(32)::text), 'but not her friends-only post');

-- ─── Respect and comments ───────────────────────────────────────────────────────────────────────

select pg_temp.as_user(2);
insert into public.post_likes (post_id) values (pg_temp.pid(1));
select throws_ok($$insert into public.post_likes (post_id) values (pg_temp.pid(1))$$, '23505', null,
  'respect is given once');
select throws_ok($$update public.posts set like_count = 99 where id = pg_temp.pid(1)$$, '42501', null,
  'clients cannot write counters');
select is((public.get_post(pg_temp.pid(1)) ->> 'respects')::integer, 1, 'respect counted');
select is((public.get_post(pg_temp.pid(1)) ->> 'respected')::boolean, true, 'respected by me');
select lives_ok($$select public.add_comment(pg_temp.pid(101), pg_temp.pid(1), 'Strong! @carol @eve')$$,
  'bob comments');
select pg_temp.as_user(5);
select lives_ok($$select public.add_comment(pg_temp.pid(102), pg_temp.pid(1), 'Agreed', pg_temp.pid(101))$$,
  'eve replies');
select throws_ok($$select public.add_comment(pg_temp.pid(103), pg_temp.pid(1), 'Deeper', pg_temp.pid(102))$$,
  '22023', null, 'only one level of replies');
select pg_temp.as_user(1);
select is((select array_agg(kind::text order by kind) from public.notifications), array[
  'respect', 'comment', 'comment', 'friend_request', 'friend_accepted'],
  'alice: respect, two comments, eve''s request and bob''s acceptance');
select pg_temp.as_user(2);
select is((select count(*)::integer from public.notifications where kind = 'reply'), 1,
  'bob is notified of the reply');
select pg_temp.as_user(3);
select is((select count(*)::integer from public.notifications where kind = 'mention'), 0,
  'carol is not told about a mention on a post she cannot see');
select is((select count(*)::integer from public.comments where post_id = pg_temp.pid(1)), 0,
  'non-friend: comments are hidden');
select throws_ok($$select public.delete_comment(pg_temp.pid(101))$$, '42501', null,
  'cannot delete someone else''s comment');
select pg_temp.as_user(2);
delete from public.post_likes where post_id = pg_temp.pid(1);
select lives_ok($$select public.delete_comment(pg_temp.pid(101))$$, 'bob deletes his comment');
select is((select count(*)::integer from public.comments where id = pg_temp.pid(101) and deleted_at is not null),
  1, 'a comment with replies stays as a placeholder');
select is((select like_count || '/' || comment_count from public.posts where id = pg_temp.pid(1)), '0/1',
  'counters follow respect taken back and the deleted comment');
select pg_temp.as_user(1);
select is((select count(*)::integer from public.notifications where kind = 'respect'), 0,
  'taking respect back removes its notification');
select lives_ok($$select public.delete_comment(pg_temp.pid(102))$$, 'the post author can delete a reply');

-- ─── Reports and notifications ──────────────────────────────────────────────────────────────────

select pg_temp.as_user(2);
select lives_ok($$select public.report_content('spam', pg_temp.pid(1), null, 'testing')$$, 'bob reports');
select lives_ok($$select public.report_content('spam', pg_temp.pid(1))$$, 'reporting twice is a no-op');
select is((select count(*)::integer from public.reports), 1, 'bob reads his report');
select throws_ok($$insert into public.reports (post_id, reason, status)
  values (pg_temp.pid(2), 'spam', 'dismissed')$$, '42501', null, 'reporters cannot set the status');
select pg_temp.as_user(1);
select is((select count(*)::integer from public.reports), 0, 'alice cannot read reports about her');
select is(public.get_unread_notification_count(), 3, 'alice has three unread (the deleted reply took its notice)');
select is(public.mark_notifications_read(), 3, 'mark all read');
select throws_ok($$update public.notifications set kind = 'follow'$$, '42501', null,
  'only read_at can change');
select pg_temp.as_user(2);
select is((select count(*)::integer from public.notifications where user_id = pg_temp.uid(1)), 0,
  'bob cannot read alice''s notifications');

-- ─── Milestones ─────────────────────────────────────────────────────────────────────────────────

select pg_temp.as_user(1);
select throws_ok($$select public.create_milestone_post('pr', '{}'::jsonb)$$, '22023', null,
  'nothing to share without a record');
select throws_ok($$select public.create_milestone_post('text', '{}'::jsonb)$$, '22023', null,
  'only records, rank-ups and league results');
set local role postgres;
insert into public.personal_records (user_id, exercise_id, kind, value, previous_value, workout_id, achieved_at)
select pg_temp.uid(1), id, 'e1rm', 100, 90, pg_temp.pid(1001), now() from public.exercises
where slug = 'barbell-bench-press';
select pg_temp.as_user(1);
select is(public.create_milestone_post('pr', jsonb_build_object('workout_id', pg_temp.pid(1001),
    'exercise_id', (select id from public.exercises where slug = 'barbell-bench-press'), 'kind', 'e1rm')),
  public.create_milestone_post('pr', jsonb_build_object('workout_id', pg_temp.pid(1001),
    'exercise_id', (select id from public.exercises where slug = 'barbell-bench-press'), 'kind', 'e1rm')),
  'sharing a record twice gives one post');
select is((select (data ->> 'value')::numeric from public.posts where type = 'pr'), 100::numeric,
  'the server builds the record from its own data');

-- ─── Discover ───────────────────────────────────────────────────────────────────────────────────

select pg_temp.as_user(4);
select lives_ok($$select public.create_post(jsonb_build_object('id', pg_temp.pid(40 + n),
  'body', 'Dave ' || n, 'visibility', 'public')) from generate_series(1, 4) n$$, 'dave posts four times');
select pg_temp.as_user(2);
select ok(not exists (select 1 from jsonb_array_elements(public.get_discover() -> 'posts') p
  where p -> 'author' ->> 'id' in (pg_temp.uid(1)::text, pg_temp.uid(5)::text, pg_temp.uid(2)::text)),
  'discover never shows friends, private profiles or me');
select ok(not exists (select 1 from jsonb_array_elements(public.get_discover() -> 'posts') p
  where p ->> 'visibility' <> 'public'), 'discover shows public posts only');
select ok(not exists (select 1 from jsonb_array_elements(public.get_discover() -> 'posts') p
  where p ->> 'id' = pg_temp.pid(32)::text), 'carol''s friends-only post never appears');
select ok((select max(c) <= 2 from (select count(*) c from jsonb_array_elements(
    public.get_discover('{}', '{}', null, 4) -> 'posts') p group by p -> 'author' ->> 'id') t),
  'at most two posts per author per page');
select is((select count(*)::integer from (
    select p ->> 'id' from jsonb_array_elements(public.get_discover('{}', '{}', null, 4) -> 'posts') p
    intersect
    select p ->> 'id' from jsonb_array_elements(public.get_discover('{}',
      (select array_agg((p ->> 'id')::uuid) from jsonb_array_elements(
        public.get_discover('{}', '{}', null, 4) -> 'posts') p), null, 50) -> 'posts') p) t), 0,
  'the next page never repeats');
select is((select count(*)::integer from jsonb_array_elements(public.get_discover('{}', '{}', null, 50) -> 'posts') p
  where p -> 'author' ->> 'id' = pg_temp.uid(4)::text), 2, 'dave''s other posts wait for later pages');
select throws_ok($$select public.get_discover(array['nope'])$$, '22023', null, 'unknown filters are refused');
select ok(jsonb_array_length(public.get_discover(array['college', 'city']) -> 'posts') > 0,
  'college and city filters keep same-college posts');
select ok(not exists (select 1 from jsonb_array_elements(public.get_people_suggestions()) s
  where s ->> 'id' in (pg_temp.uid(1)::text, pg_temp.uid(5)::text)),
  'suggestions skip friends and private profiles');
select ok(exists (select 1 from jsonb_array_elements(public.get_people_suggestions()) s
  where s ->> 'id' = pg_temp.uid(3)::text), 'suggestions include an active public stranger');

-- ─── Blocks ─────────────────────────────────────────────────────────────────────────────────────

select pg_temp.as_user(6);
select lives_ok($$select public.follow_user(pg_temp.uid(3))$$, 'frank follows carol');
select lives_ok($$select public.create_post(jsonb_build_object('id', pg_temp.pid(61),
  'body', 'Frank here', 'visibility', 'public'))$$, 'frank posts');
select lives_ok($$select public.add_comment(pg_temp.pid(601), pg_temp.pid(31), 'Nice run')$$,
  'frank comments on carol''s post');
select pg_temp.as_user(3);
select lives_ok($$select public.block_user(pg_temp.uid(6))$$, 'carol blocks frank');
select is((select count(*)::integer from public.follows where follower_id = pg_temp.uid(6)), 0,
  'the follow is gone');
select is((select count(*)::integer from public.posts where author_id = pg_temp.uid(6)), 0,
  'carol no longer sees frank''s posts');
select is((select count(*)::integer from public.comments where author_id = pg_temp.uid(6)), 0,
  'or his comments');
select is(public.get_profile('frank') -> 'relationship' ->> 'blocked', 'true', 'carol sees she blocked him');
select pg_temp.as_user(6);
select is((select count(*)::integer from public.posts where author_id = pg_temp.uid(3)), 0,
  'frank no longer sees carol''s public posts');
select is(public.get_profile('carol'), null, 'carol''s profile is gone for frank');
select is((select count(*)::integer from public.public_profile_cards where id = pg_temp.uid(3)), 0,
  'and her profile card');
select is(jsonb_array_length(public.search_profiles('car')), 0, 'and search');
select ok(not exists (select 1 from jsonb_array_elements(public.get_discover() -> 'posts') p
  where p -> 'author' ->> 'id' = pg_temp.uid(3)::text), 'and discover');
select throws_ok($$select public.send_friend_request(pg_temp.uid(3))$$, '42501', null,
  'frank cannot send carol a request');
select throws_ok($$select public.follow_user(pg_temp.uid(3))$$, '42501', null, 'or follow her again');
select throws_ok($$insert into public.post_likes (post_id) values (pg_temp.pid(31))$$, '42501', null,
  'or give respect');
select is((select count(*)::integer from public.blocks), 0, 'frank cannot see that he is blocked');

select pg_temp.as_user(1);
select lives_ok($$select public.block_user(pg_temp.uid(5))$$, 'alice blocks her friend eve');
select ok(not public.are_friends(pg_temp.uid(1), pg_temp.uid(5)), 'the friendship ends');
select pg_temp.as_user(5);
select is((select count(*)::integer from public.posts where author_id = pg_temp.uid(1)), 0,
  'eve no longer sees alice''s friends posts');
select pg_temp.as_user(1);
select lives_ok($$select public.unblock_user(pg_temp.uid(5))$$, 'unblocking works');
select ok(not public.are_friends(pg_temp.uid(1), pg_temp.uid(5)), 'but the friendship stays ended');

-- ─── Routines copy credit ───────────────────────────────────────────────────────────────────────

select pg_temp.as_user(2);
select lives_ok($$select public.save_routine(jsonb_build_object('id', pg_temp.pid(901), 'name', 'Copied',
  'source', 'copied', 'source_ref', pg_temp.pid(1001)::text, 'source_label', '@alice'))$$,
  'a copied routine saves its credit');
select is((select source_label from public.routines where id = pg_temp.pid(901)), '@alice', 'credit stored');

select * from finish();
rollback;
