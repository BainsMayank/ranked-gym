/// <reference types="node" />
/**
 * `pnpm dev:seed`: puts the 50 fake lifters (plus demo@fake.test) into the LOCAL database as real,
 * onboarded accounts with their full training history, scored by the rank engine in date order,
 * so every Rank sub-tab has data. Then it runs the weekly league cycle for each past Monday, so
 * leagues have history, a finished season and an open week.
 *
 * Sign in as any of them with the emailed code (Mailpit, http://127.0.0.1:54324):
 * demo@fake.test, lifter01@fake.test … lifter50@fake.test, and the Phase 9 acceptance accounts
 * social.a / social.b / social.c@fake.test (devSocial.ts).
 *
 * Idempotent: it removes the previous dev-seed accounts first. Local only, never `db:push`ed.
 */
import {
  DEMO_ID,
  DEV_PREFIX,
  devPeople,
  replaySql,
  runSql,
  seedWorkouts,
  sqlText,
  workoutRows,
} from './devSeed.ts';
import { makeDemoUser, makeFakeUsers } from './fakeUsers.ts';
import { leagueHistorySql, leagueSummarySql } from './devLeagues.ts';
import { socialAccountsSql, socialActivitySql } from './devSocial.ts';

const now = new Date();
const people = devPeople(makeFakeUsers(), makeDemoUser(DEMO_ID));

const EXPERIENCE = {
  beginner: 'beginner',
  novice: 'beginner',
  intermediate: 'intermediate',
  advanced: 'advanced',
  elite: 'advanced',
} as const;

const accounts = people
  .map((p) => {
    const meta = JSON.stringify({ provider: 'email', providers: ['email'] });
    return `  (${sqlText(p.id)}::uuid, ${sqlText(p.email)}, ${sqlText(meta)}::jsonb)`;
  })
  .join(',\n');

const profiles = people
  .map((p, i) => {
    const birthYear = now.getUTCFullYear() - p.user.age;
    const goal = p.user.style === 'calisthenics' ? 'calisthenics' : i % 2 ? 'muscle' : 'stronger';
    return `  (${sqlText(p.id)}::uuid, ${sqlText(p.username)}, ${sqlText(p.displayName)}, ${sqlText(p.user.sex)}, ${birthYear}, ${sqlText(EXPERIENCE[p.user.level])}, ${sqlText(goal)}, ${sqlText(p.city)}, ${sqlText(p.college)}, ${150 + (p.user.bodyweightKg % 40)})`;
  })
  .join(',\n');

const weighIns = people
  .flatMap((p) =>
    p.user.bodyweights.map(
      ([daysAgo, kg]) => `  (${sqlText(p.id)}::uuid, ${kg}, now() - ${daysAgo} * interval '1 day')`,
    ),
  )
  .join(',\n');

const workouts = people.flatMap((p) => seedWorkouts(p, now));

const sql = `
\\set QUIET on
-- Remove the previous dev seed (profiles, workouts, ranks and league rows cascade).
delete from auth.users where id::text like '${DEV_PREFIX}%';
delete from public.rank_jobs where user_id::text like '${DEV_PREFIX}%';

insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change,
  email_change_token_new, recovery_token)
select '00000000-0000-0000-0000-000000000000', a.id, 'authenticated', 'authenticated', a.email, '',
  now() - interval '300 days', a.meta, '{}'::jsonb, now() - interval '300 days', now(), '', '', '', ''
from (values
${accounts}
) a(id, email, meta);

insert into auth.identities (id, user_id, provider_id, identity_data, provider, created_at, updated_at)
select gen_random_uuid(), u.id, u.id::text,
  jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true), 'email', now(), now()
from auth.users u where u.id::text like '${DEV_PREFIX}%';

update public.profiles p set
  username = v.username, display_name = v.display_name,
  sex_for_standards = v.sex::public.sex_for_standards, birth_year = v.birth_year::smallint,
  experience_level = v.experience::public.experience_level, primary_goal = v.goal::public.primary_goal,
  city = v.city, college = v.college, height_cm = v.height, visibility = 'public',
  onboarded_at = now() - interval '300 days'
from (values
${profiles}
) v(id, username, display_name, sex, birth_year, experience, goal, city, college, height)
where p.id = v.id;

insert into public.bodyweight_logs (user_id, weight_kg, logged_at) values
${weighIns};

${replaySql(workoutRows(workouts))}

${leagueHistorySql(now)}

-- Phase 9: the three acceptance accounts and social activity around demo.
${socialAccountsSql()}
${socialActivitySql(people[0]?.username ?? 'demo')}
`;

const started = Date.now();
console.log(
  `Seeding ${people.length} lifters and ${workouts.length} workouts into the local database…`,
);
runSql(sql);
const summary = runSql(`
select format('%s %s', coalesce(c.tier::text, 'unplaced'), count(*))
from public.profiles p
left join public.ranks_current c on c.user_id = p.id and c.scope = 'overall' and c.status = 'ranked'
where p.id::text like '${DEV_PREFIX}%'
group by c.tier order by min(coalesce(array_position(enum_range(null::public.rank_tier), c.tier), 99));
`);
console.log(`Overall ranks: ${summary.trim().split('\n').join(', ')}`);
console.log(runSql(leagueSummarySql()).trim());
console.log(`Done in ${Math.round((Date.now() - started) / 1000)} s.`);
console.log(
  'Sign in as demo@fake.test (or lifter01…50@fake.test); codes land in Mailpit: http://127.0.0.1:54324',
);
