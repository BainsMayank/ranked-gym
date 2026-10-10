/// <reference types="node" />
/**
 * `pnpm social:acceptance`: Phase 9's "done when", checked end to end against the LOCAL stack
 * through the same REST and RPC API the app uses, signed in as the three acceptance accounts that
 * `pnpm dev:seed` creates (devSocial.ts):
 *
 *   A (@social_a, public profile) and B (@social_b) are friends; C (@social_c) is a stranger.
 *
 * 1. Friends see each other's posts (friends-only and public) in the Feed.
 * 2. Strangers see only public posts in Discover, and can't fetch a friends-only post at all.
 * 3. Copying a workout produces a routine the copier owns and can edit.
 * 4. Blocking hides everything both ways.
 *
 * It cleans up after itself (posts, routine, block). Local only: never point it at a hosted project.
 */
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { runSql } from './devSeed.ts';
import { SOCIAL_ACCOUNTS, SOCIAL_IDS } from './devSocial.ts';

type Client = SupabaseClient;
type Row = Record<string, unknown>;

function localEnv(): Record<string, string> {
  const out = execFileSync('npx', ['supabase', 'status', '-o', 'env'], { encoding: 'utf8' });
  return Object.fromEntries(
    out
      .split('\n')
      .map((l) => /^([A-Z_]+)="?([^"]*)"?$/.exec(l.trim()))
      .filter((m): m is RegExpExecArray => m !== null)
      .map((m) => [m[1] ?? '', m[2] ?? '']),
  );
}

const env = localEnv();
const url = env.API_URL ?? '';
if (!/^http:\/\/(127\.0\.0\.1|localhost)/.test(url)) {
  throw new Error(`Refusing to run against ${url || 'an unknown API'}: local stack only.`);
}
const admin = createClient(url, env.SERVICE_ROLE_KEY ?? '', { auth: { persistSession: false } });

async function signIn(email: string): Promise<Client> {
  const link = await admin.auth.admin.generateLink({ type: 'magiclink', email });
  if (link.error) throw link.error;
  const client = createClient(url, env.ANON_KEY ?? '', { auth: { persistSession: false } });
  const { error } = await client.auth.verifyOtp({
    email,
    token: link.data.properties.email_otp,
    type: 'email',
  });
  if (error) throw error;
  return client;
}

let failures = 0;
function check(ok: boolean, what: string) {
  console.log(`${ok ? '✓' : '✗'} ${what}`);
  if (!ok) failures++;
}

async function rpc<T = unknown>(c: Client, fn: string, args: Row = {}): Promise<T> {
  const { data, error } = await c.rpc(fn, args);
  if (error) throw new Error(`${fn}: ${error.message}`);
  return data as T;
}

const ids = (posts: Row[]) => posts.map((p) => String(p.id));
const feed = async (c: Client) =>
  (await rpc<{ posts: Row[] }>(c, 'get_feed', { p_limit: 50 })).posts;

/** Every Discover page (at most 20), as the app pages through them. */
async function discoverAll(c: Client): Promise<Row[]> {
  const seen: Row[] = [];
  let asOf: string | null = null;
  for (let page = 0; page < 20; page++) {
    const res: { posts: Row[]; as_of: string; done: boolean } = await rpc(c, 'get_discover', {
      p_exclude: ids(seen),
      p_as_of: asOf ?? undefined,
      p_limit: 50,
    });
    asOf = res.as_of;
    seen.push(...res.posts);
    if (res.done) break;
  }
  return seen;
}

async function main() {
  const [a, b, c] = await Promise.all(SOCIAL_ACCOUNTS.map((x) => signIn(x.email)));
  if (!a || !b || !c) throw new Error('Sign-in failed');
  const friendsOnly = randomUUID();
  const publicPost = randomUUID();
  const strangerPost = randomUUID();
  const routineId = randomUUID();

  // Realtime: B (a friend) should hear about A's friends-only post; C (a stranger) should not.
  const heard = { b: new Set<string>(), c: new Set<string>() };
  const listen = (client: Client, into: Set<string>, name: string) =>
    new Promise<void>((resolve) => {
      void client.auth.getSession().then(({ data }) => {
        if (data.session) void client.realtime.setAuth(data.session.access_token);
      });
      client
        .channel(`acceptance:${name}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'posts' },
          (payload) => {
            into.add(String((payload.new as Row).id));
          },
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') resolve();
        });
    });
  await Promise.race([
    Promise.all([listen(b, heard.b, 'b'), listen(c, heard.c, 'c')]),
    new Promise((r) => setTimeout(r, 8000)),
  ]);

  try {
    console.log('\n1. Friends see each other’s posts');
    await rpc(a, 'create_post', {
      p: { id: friendsOnly, body: 'Acceptance: friends only', visibility: 'friends' },
    });
    await rpc(a, 'create_post', {
      p: { id: publicPost, body: 'Acceptance: public', visibility: 'public' },
    });
    const bFeed = await feed(b);
    check(ids(bFeed).includes(friendsOnly), 'B’s feed has A’s friends-only post');
    check(ids(bFeed).includes(publicPost), 'B’s feed has A’s public post');
    const aWorkout = bFeed.find(
      (p) => p.type === 'workout' && (p.author as Row).id === SOCIAL_IDS.a,
    );
    check(!!aWorkout, 'B’s feed has A’s finished workout');
    check(
      (await rpc(b, 'get_post', { p_id: friendsOnly })) !== null,
      'B can open A’s friends-only post',
    );
    for (let i = 0; i < 30 && !heard.b.has(friendsOnly); i++)
      await new Promise((r) => setTimeout(r, 200));
    check(heard.b.has(friendsOnly), 'Realtime tells B about A’s new post (the “New posts” pill)');
    check(!heard.c.has(friendsOnly), 'Realtime never tells C about it');

    console.log('\n2. Strangers see only public posts in Discover');
    const cDiscover = await discoverAll(c);
    check(cDiscover.length > 0, `C’s Discover has posts (${cDiscover.length})`);
    check(
      cDiscover.every((p) => p.visibility === 'public'),
      'every Discover post is public',
    );
    check(ids(cDiscover).includes(publicPost), 'C finds A’s public post in Discover');
    check(!ids(cDiscover).includes(friendsOnly), 'C never sees A’s friends-only post in Discover');
    check(!ids(await feed(c)).includes(friendsOnly), 'nor in C’s feed');
    const direct = await c.from('posts').select('id').eq('id', friendsOnly);
    check(
      !direct.error && direct.data.length === 0,
      'C gets no rows reading the posts table directly',
    );
    check(
      (await rpc(c, 'get_post', { p_id: friendsOnly })) === null,
      'get_post returns nothing for C',
    );
    const like = await c.from('post_likes').insert({ post_id: friendsOnly });
    check(!!like.error, 'C cannot give respect to it');

    console.log('\n3. Copying a workout makes an editable routine');
    const detail = await rpc<Row | null>(b, 'get_post', { p_id: String(aWorkout?.id) });
    const exercises = ((detail?.workout_detail as Row[] | undefined) ?? []).map((e) => ({
      id: randomUUID(),
      exercise_id: e.exercise_id,
      rest_seconds: 120,
      sets: ((e.sets as Row[]) ?? []).map((s) => ({
        id: randomUUID(),
        set_type: s.set_type,
        target_type: 'reps',
        reps: s.reps,
        weight_kg: s.weight_kg,
        weight_mode: s.weight_mode,
      })),
    }));
    check(exercises.length > 0, `B reads the workout’s exercises (${exercises.length})`);
    const payload = {
      id: routineId,
      name: 'Copied leg day',
      source: 'copied',
      source_ref: aWorkout?.id,
      source_label: '@social_a',
      exercises,
    };
    await rpc(b, 'save_routine', { p: payload });
    const saved = await b
      .from('routines')
      .select('name, source, source_label')
      .eq('id', routineId)
      .single();
    check(
      saved.data?.source === 'copied' && saved.data.source_label === '@social_a',
      'B owns a copied routine crediting @social_a',
    );
    await rpc(b, 'save_routine', { p: { ...payload, name: 'My leg day' } });
    const renamed = await b.from('routines').select('name').eq('id', routineId).single();
    check(renamed.data?.name === 'My leg day', 'B can edit it');
    const peek = await c.from('routines').select('id').eq('id', routineId);
    check((peek.data ?? []).length === 0, 'nobody else can read it');

    console.log('\n4. Blocking hides everything both ways');
    await rpc(c, 'create_post', {
      p: { id: strangerPost, body: 'Acceptance: C public', visibility: 'public' },
    });
    check(
      (await a.from('posts').select('id').eq('id', strangerPost)).data?.length === 1,
      'before: A can see C’s public post',
    );
    await rpc(a, 'block_user', { p_user: SOCIAL_IDS.c });
    check(
      (await rpc(c, 'get_profile', { p_username: 'social_a' })) === null,
      'C can’t open A’s profile',
    );
    check(
      ((await rpc<Row[]>(c, 'search_profiles', { p_query: 'social_a' })) ?? []).length === 0,
      'C can’t find A in search',
    );
    check(
      !(await discoverAll(c)).some((p) => (p.author as Row).id === SOCIAL_IDS.a),
      'A is gone from C’s Discover',
    );
    check(
      (await c.from('posts').select('id').eq('author_id', SOCIAL_IDS.a)).data?.length === 0,
      'C reads none of A’s posts',
    );
    check(
      (await a.from('posts').select('id').eq('author_id', SOCIAL_IDS.c)).data?.length === 0,
      'A reads none of C’s posts',
    );
    check(!ids(await discoverAll(a)).includes(strangerPost), 'C’s post is gone from A’s Discover');
    const follow = await c.rpc('follow_user', { p_user: SOCIAL_IDS.a });
    check(!!follow.error, 'C can’t follow A');
    const ask = await c.rpc('send_friend_request', { p_user: SOCIAL_IDS.a });
    check(!!ask.error, 'C can’t send A a friend request');
  } finally {
    await a.rpc('unblock_user', { p_user: SOCIAL_IDS.c });
    runSql(`
delete from public.posts where id in ('${friendsOnly}', '${publicPost}', '${strangerPost}');
delete from public.routines where id = '${routineId}';
`);
  }

  await Promise.all([a, b, c].map((x) => x.removeAllChannels()));
  console.log(
    failures === 0 ? '\nAll acceptance checks passed.' : `\n${failures} check(s) failed.`,
  );
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});
