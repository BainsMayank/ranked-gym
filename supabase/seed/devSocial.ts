/// <reference types="node" />
/**
 * Social data for the local dev seed (Phase 9): friendships, follows, a few posts, respects,
 * comments and requests around demo@fake.test, plus three acceptance accounts:
 *
 *   social.a@fake.test  @social_a  public profile, friends with B, has workouts
 *   social.b@fake.test  @social_b  friends profile, friends with A
 *   social.c@fake.test  @social_c  public profile, a stranger to both
 *
 * Writes go through the same RPCs the app uses (acting as each user), so triggers, counters and
 * notifications behave exactly as in production. Local only.
 */
import { DEMO_ID, devId, sqlText } from './devSeed.ts';

export const SOCIAL_IDS = { a: devId(0xa1), b: devId(0xa2), c: devId(0xa3) } as const;

export const SOCIAL_ACCOUNTS = [
  {
    id: SOCIAL_IDS.a,
    email: 'social.a@fake.test',
    username: 'social_a',
    name: 'Asha Kapoor',
    visibility: 'public',
  },
  {
    id: SOCIAL_IDS.b,
    email: 'social.b@fake.test',
    username: 'social_b',
    name: 'Bilal Mirza',
    visibility: 'friends',
  },
  {
    id: SOCIAL_IDS.c,
    email: 'social.c@fake.test',
    username: 'social_c',
    name: 'Chitra Nair',
    visibility: 'public',
  },
] as const;

/** A deterministic uuid per label, inside the dev-seed id range. */
const sid = (n: number) => devId(0xb0000 + n);

/** Creates the three acceptance accounts, onboarded, each with one finished workout. */
export function socialAccountsSql(): string {
  const accounts = SOCIAL_ACCOUNTS.map(
    (a) =>
      `  (${sqlText(a.id)}::uuid, ${sqlText(a.email)}, ${sqlText(a.username)}, ${sqlText(a.name)}, ${sqlText(a.visibility)})`,
  ).join(',\n');
  const workouts = SOCIAL_ACCOUNTS.map((a, i) => {
    const w = sid(100 + i);
    const e = sid(110 + i);
    return `
insert into public.workouts (id, user_id, name, started_at, ended_at, status, client_updated_at, visibility, total_volume_kg, duration_sec)
values (${sqlText(w)}, ${sqlText(a.id)}, ${sqlText(['Leg day', 'Push day', 'Pull day'][i] ?? 'Workout')},
  now() - interval '${26 - i * 6} hours', now() - interval '${25 - i * 6} hours', 'completed', now(), 'friends', 0, 3600);
insert into public.workout_exercises (id, workout_id, exercise_id, sort_order)
select ${sqlText(e)}, ${sqlText(w)}, id, 0 from public.exercises where slug = ${sqlText(['barbell-back-squat', 'barbell-bench-press', 'barbell-deadlift'][i] ?? 'barbell-back-squat')};
insert into public.workout_sets (id, workout_exercise_id, sort_order, weight_kg, reps, completed, completed_at)
values ${[0, 1, 2]
      .map(
        (n) =>
          `(${sqlText(sid(130 + i * 10 + n))}, ${sqlText(e)}, ${n}, ${([100, 70, 140][i] ?? 100) + n * 5}, 5, true, now() - interval '${25 - i * 6} hours')`,
      )
      .join(', ')};
select public.refresh_workout_totals(${sqlText(w)});`;
  }).join('\n');
  return `
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change,
  email_change_token_new, recovery_token)
select '00000000-0000-0000-0000-000000000000', a.id, 'authenticated', 'authenticated', a.email, '',
  now() - interval '30 days', '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
  now() - interval '30 days', now(), '', '', '', ''
from (values
${accounts}
) a(id, email, username, name, vis);

insert into auth.identities (id, user_id, provider_id, identity_data, provider, created_at, updated_at)
select gen_random_uuid(), u.id, u.id::text,
  jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true), 'email', now(), now()
from auth.users u where u.email like 'social._@fake.test';

update public.profiles p set username = v.username, display_name = v.name, birth_year = 2004,
  experience_level = 'intermediate', primary_goal = 'stronger', city = 'Delhi', college = 'DTU',
  visibility = v.vis::public.profile_visibility, onboarded_at = now() - interval '30 days'
from (values
${accounts}
) v(id, email, username, name, vis)
where p.id = v.id;
${workouts}
`;
}

/** Runs one statement as a signed-in user, the way the app would. */
const as = (user: string, statement: string) => `
select set_config('request.jwt.claims', json_build_object('sub', ${sqlText(user)}, 'role', 'authenticated')::text, false);
set role authenticated;
${statement};
reset role;`;

/** Friendships, follows, posts, respects and comments. Run after the workouts are replayed. */
export function socialActivitySql(friendUsername: string): string {
  const lifter = (n: number) => devId(n);
  const steps: string[] = [];
  // Demo's friends (accepted) and the people demo follows (public profiles).
  for (let n = 1; n <= 8; n++) {
    steps.push(as(DEMO_ID, `select public.send_friend_request(${sqlText(lifter(n))})`));
    steps.push(as(lifter(n), `select public.send_friend_request(${sqlText(DEMO_ID)})`));
  }
  for (let n = 9; n <= 14; n++)
    steps.push(as(DEMO_ID, `select public.follow_user(${sqlText(lifter(n))})`));
  // Waiting requests both ways, and a couple of followers.
  steps.push(as(lifter(15), `select public.send_friend_request(${sqlText(DEMO_ID)})`));
  steps.push(as(DEMO_ID, `select public.send_friend_request(${sqlText(lifter(16))})`));
  for (const n of [17, 18])
    steps.push(as(lifter(n), `select public.follow_user(${sqlText(DEMO_ID)})`));

  // Acceptance accounts: A and B are friends; C is a stranger.
  steps.push(as(SOCIAL_IDS.a, `select public.send_friend_request(${sqlText(SOCIAL_IDS.b)})`));
  steps.push(as(SOCIAL_IDS.b, `select public.send_friend_request(${sqlText(SOCIAL_IDS.a)})`));

  // A few text posts from friends, one mentioning @demo.
  const posts: [number, string, string][] = [
    [1, 'Hostel gym was packed at 7 pm again. Anyone up for 6 am squats tomorrow?', 'friends'],
    [
      2,
      'First clean muscle-up after three months of band work. Thanks @demo for the cues!',
      'public',
    ],
    [3, 'Deload week. Feels strange to leave reps in the tank.', 'friends'],
    [9, 'College fest is over, back to the plan. Bench day.', 'public'],
  ];
  posts.forEach(([n, body, vis], i) =>
    steps.push(
      as(
        lifter(n),
        `select public.create_post(jsonb_build_object('id', ${sqlText(sid(i))}, 'body', ${sqlText(body)}, 'visibility', ${sqlText(vis)}))`,
      ),
    ),
  );

  // Respect and comments on demo's latest workout post, so demo has notifications.
  const demoPost = `(select id from public.posts where author_id = ${sqlText(DEMO_ID)} and type = 'workout' order by created_at desc limit 1)`;
  for (let n = 1; n <= 5; n++) {
    steps.push(as(lifter(n), `insert into public.post_likes (post_id) select ${demoPost}`));
  }
  steps.push(
    as(
      lifter(1),
      `select public.add_comment(${sqlText(sid(50))}, ${demoPost}, 'Solid session. What was the top set?')`,
    ),
  );
  steps.push(
    as(
      DEMO_ID,
      `select public.add_comment(${sqlText(sid(51))}, ${demoPost}, '@${friendUsername} 3 sets, last one felt heavy.', ${sqlText(sid(50))})`,
    ),
  );
  return steps.join('\n');
}
