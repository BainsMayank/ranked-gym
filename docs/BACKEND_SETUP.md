# Backend setup

Updated 2026-10-10 (project integrity audit).

The 2026-10-10 hosted dry run reports all 15 repository migrations deployed. The local suite passes
607 assertions in 12 files. A hosted test run lost its SSL connection during the rank tests and then
failed DNS resolution; a full hosted pass remains unconfirmed. See [INTEGRITY_AUDIT.md](INTEGRITY_AUDIT.md)
for current evidence. The deployment instructions below also apply when future migrations are added.

## Phase 7 status

The gaps an earlier audit found are closed:

- **Leagues backend:** `*_leagues.sql` covers tables, LP, the hourly pg_cron cycle, custom leagues and challenges, with 64 pgTAP assertions in `11_leagues`.
- **Rank tab reads:** `*_rank_tab.sql`, tested in `09_rank_tab`.
- **Tooling:** `pnpm dev:seed` builds league history, and `pnpm leagues:simulate` fast-forwards weeks.
- **App:** every Rank sub-tab reads real data. The mocks are gone.

What's still open is deployment and device checks, below and in PROGRESS.md.

## Deploy the existing backend to the hosted project

Run these one at a time from the Ranked Gym project directory. Continue only after each command succeeds. The project recorded in this repository is `chknynsewbmgranibjqs`.

```sh
rtk proxy pnpm exec supabase login
rtk proxy pnpm exec supabase link --project-ref chknynsewbmgranibjqs
rtk proxy pnpm exec supabase db push --dry-run
rtk proxy pnpm db:push
rtk proxy pnpm db:test:remote
rtk proxy pnpm db:types:remote
```

The first login is the developer's Supabase account, used to administer the backend. It is separate from signing into Ranked Gym. Enter any requested database password in the terminal prompt.

The dry run lists pending migrations. Push only when it lists changes you intend to deploy. The
remote test runs the SQL/RLS suite. Type generation reads the selected database and replaces the
generated file atomically only after generation and formatting succeed; a failed CLI command
preserves existing types. `pnpm db:types:check` compares committed types with local Supabase.

The earlier 2026-10-09 audit lacked a CLI access token. The 2026-10-10 session could connect and run
the read-only dry run. No hosted migration push or database reset was performed during this audit.

## Connect the app and verify sync

The existing `.env` points at the hosted project. Ensure `SUPABASE_URL` and `SUPABASE_ANON_KEY` match that project's API settings; the app reads them through `app.config.ts`. The service-role key must not be used in the app.

Stop the existing Expo process before restarting. Normal local preview:

```sh
rtk proxy pnpm start --clear
```

To test an authenticated server session instead:

```sh
rtk proxy env EXPO_PUBLIC_DEV_AUTH_BYPASS=false pnpm start --clear
```

Complete the app's email sign-in and onboarding. The hosted Auth settings still need the Phase 1 configuration in PROGRESS.md: six-digit OTP, the supplied email template, allowed app redirect URLs and working email delivery. Google provider setup is needed only for Google sign-in.

Log a short workout, finish/save it, let the sync indicator drain, and confirm the matching `workouts` row and sets belong to that app user in Supabase. Reopen the app and confirm it appears once in History; then compare Home metrics and goals with the saved session. Check three values by hand. Rank results use the server engine; confirm any queued recomputation has completed before comparing them.

Account-free preview saves workouts/goals/weigh-ins locally and does not create a server identity. It does not prove hosted sync or authoritative rank/league data. A developer Supabase login alone does not sign the app in.

## Local backend

For local SQL work, with the local Docker environment running:

```sh
rtk proxy pnpm db:start
rtk proxy pnpm exec supabase migration up --local
rtk proxy pnpm db:test
rtk proxy pnpm db:types
```

Use `http://127.0.0.1:54321` and the local anon key for an iOS simulator against this stack; hosted and local databases contain separate data. Change the app environment and restart Expo together when switching targets.

`pnpm dev:seed` (about 5 minutes) loads 50 fake lifters and `demo@fake.test` into the LOCAL database as onboarded accounts:

- each has their full training history, scored in date order, so they have rank history, records and rank-ups
- it then rebuilds league history: one finished season, the current one, and an open week everyone active is placed in

It replaces the previous seed accounts and rebuilds all local league rows.

`pnpm leagues:simulate --weeks N` fast-forwards: it trains the seeded lifters through the open week, closes it with `league_run_cycle`, and prints each group's top three, promotions and demotions, plus season rewards when a season ends. Simulated weeks run ahead of today; run `pnpm dev:seed` again to come back.

To see it in the app, start Expo with the local stack and real sign-in:

```sh
rtk proxy env EXPO_PUBLIC_DEV_AUTH_BYPASS=false SUPABASE_URL=http://127.0.0.1:54321 SUPABASE_ANON_KEY=<local anon key> pnpm start --clear
```

Then sign in as `demo@fake.test`; the code arrives in Mailpit at http://127.0.0.1:54324. A database reset is unnecessary for deploying pending migrations, and it erases the seed.
