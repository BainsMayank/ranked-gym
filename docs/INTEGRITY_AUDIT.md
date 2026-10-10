# Project integrity audit — 2026-10-10

Scope: current working tree, including the substantial pre-existing uncommitted work. No commits,
hosted migration deployment, database resets or development reseeding were performed.

## Fixed

- **Incomplete sync listings could erase local history.** Supabase limits table responses to 1,000
  rows. Workout/routine/plan/folder version reads previously treated one response as the complete
  remote list, so omitted records could be removed from SQLite. Shared pagination now collects
  every page, honors smaller server caps, and rejects incomplete/count-changing results. Exercise
  library reads paginate too. Regression cases cover 1,203 rows, a 200-row cap and later-page failures.
- **Account-free preview could run the outbox.** Local save handlers checked backend configuration,
  but the runner itself did not require a session. It now requires an account, checks account and
  batch identity between pushes, and cancels retry timers when its network watcher stops.
- **Account cleanup raced new sessions.** Sign-out previously published the next auth state before
  several independent cleanup promises finished. Cleanup is now sequenced before the next session,
  handles direct account switches, clears loaded workout/editor drafts, and settles pending saves
  and pushes. Old-account pulls reject before applying data. Regression tests also cover a delayed
  initial session overwriting a newer auth event and session-restoration failure.
- **Private persisted caches survived sign-out.** Feed, caught-up marker, bodyweight, training
  settings and onboarding caches now clear together with the account's insights. Other accounts
  and account-free development data remain separate.
- **Exercise caches confused backend projects.** Local and hosted libraries can share a version
  while containing different generated IDs. The cache now records its backend URL and refreshes
  on a project change or when upgrading an older cache without a recorded source.
- **Failed type generation could truncate the schema file.** Shell redirection previously emptied
  `src/types/database.ts` before the Supabase CLI ran. The generator now validates and formats the
  output before atomic replacement and supports a read-only drift check. Types were regenerated
  from the verified local database using the installed CLI.
- **Missing repeatable foundation checks.** `pnpm check` now includes local-reference and SQLite
  integrity checks. A GitHub Actions workflow defines app validation/native export and fresh local
  database/migration/type validation. CI itself has not been executed on GitHub in this session.
- **Native and React dependency inconsistencies.** Updated six packages to the recommended Expo SDK 57 patches, removing duplicate `expo-constants`. React DOM is pinned to React 19.2.3, Metro config to React Native 0.86.3, and test-renderer to the release with a compatible reconciler. Peer validation now runs in `pnpm check`.
- **Redundant legacy dashboard code.** Removed four unreferenced mock Home cards and their sole
  mock-data module. Kept the Friends/Profile fixtures that still support unfinished later phases.
- **Setup drift.** Added the root README, pinned pnpm 12.9.1, stated Node's minimum version, aligned
  the package version with Expo's 0.1.0, removed the redundant migration-directory `.gitkeep`, and
  corrected the backend deployment notes.

## Verification

Final `pnpm check` passed: **67 suites, 629 tests, 20 snapshots**, plus integrity, peer dependencies, typecheck, lint and formatting. The final integrity scan covered **3,430 imports/assets, 46 document links, 122 navigation links, 15 server migrations and 6 SQLite migrations**.

| Check                             | Result                                                                                                    |
| --------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Initial `pnpm check`              | Passed: 63 suites, 613 tests, 20 snapshots; types/lint/format passed                                      |
| Focused new regression tests      | Passed before the final full check; includes pagination, runner, auth bootstrap and backend cache changes |
| Local `pnpm db:test`              | Passed: 607 assertions in 12 files                                                                        |
| Local migration history           | All 15 repository migrations recorded in order                                                            |
| Local public-table RLS            | No public tables without RLS found                                                                        |
| Privileged function configuration | No public security-definer functions without a pinned search path found                                   |
| SQLite                            | All 6 migrations replayed in memory and compared against snapshots/source                                 |
| Local references                  | Imports/assets, static router navigation and relative Markdown links checked                              |
| Expo Doctor                       | Final online check passed all 21 checks after compatible patch updates                                    |
| Peer dependencies                 | No issues after React DOM/Metro/test-renderer alignment                                                   |
| Android/iOS production export     | Both final native bundles compiled after code/dependency fixes                                            |
| Hosted migration dry run          | Up to date: no pending migrations                                                                         |
| First hosted pgTAP run            | Incomplete: SSL EOF during `07_ranks`, followed by DNS failures; 272 assertions ran                       |
| Hosted pgTAP retry                | Blocked by direct-database hostname address/DNS resolution; no assertions ran                             |
| Failed type-generation simulation | Passed: partial stdout plus CLI failure preserved existing types                                          |

Hosted/local generated types differ in generator metadata (PostgREST version hint, JSON nullability,
computed goal fields and empty-argument representation). Table and RPC availability agree; this is
not evidence of a missing migration. Hosted type output was read into a temporary file only.

Final full-check, Expo Doctor and hosted retry results are recorded in [PROGRESS.md](PROGRESS.md).
Build output is temporary and is not committed.

## Remaining risks and unfinished work

- **Dependency advisories:** the registry audit reports 2 high and 4 moderate transitive advisories.
  These were not silenced or resolved through unverified major-version overrides. Re-audit after
  upstream releases; test any compatible changes with `pnpm check`, Expo Doctor and native export.

  | Package in lockfile             | Severity | Advisory                                                                             | Fix information from registry                                                |
  | ------------------------------- | -------- | ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------- |
  | `node-forge` 1.4.0              | High     | [Signature verification](https://github.com/advisories/GHSA-86w9-cpqp-85rv)          | No patched version listed; Expo signing tooling dependency                   |
  | `braces` 3.0.3                  | High     | [Nested-pattern stack exhaustion](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) | No patched version listed; Metro/glob tooling dependency                     |
  | `uuid` 7.0.3                    | Moderate | [Buffer bounds](https://github.com/advisories/GHSA-w5hq-g745-h8pq)                   | Fix listed at 11.1.1+; major-version compatibility needs review              |
  | `decode-uri-component` 0.2.2    | Moderate | [Malformed URI decoding](https://github.com/advisories/GHSA-vcc3-ghjq-m6fr)          | Fix listed at 0.5.0+; used through Expo Router/query-string                  |
  | `sprintf-js` 1.0.3              | Moderate | [Unbounded precision](https://github.com/advisories/GHSA-hp3w-g68c-fv3c)             | No patched version listed; test/tooling path                                 |
  | `postcss-selector-parser` 6.1.4 | Moderate | [Selector parsing complexity](https://github.com/advisories/GHSA-rj75-hqrm-r3gf)     | Fix listed at 7.1.6+; NativeWind/Tailwind tooling compatibility needs review |

- **Device acceptance:** airplane-mode logging/restart/reconnect, real OAuth/email delivery, rest
  notifications, Android performance and accessibility remain separate acceptance checks.
- **Runtime and external links:** static file/navigation checks and bundling cannot prove deep-link
  handling on a physical device, signed-URL expiry, OAuth provider configuration or external-site
  availability. The component-gallery `invalid.example` image is an intentional fallback test.
- **Native test noise:** the existing Jest suite emits mixed-worklet warnings from gesture-handler.
  These were not suppressed; native gesture behavior still needs device validation.
- **Concurrent server edits:** exact counts detect changing list sizes, but REST pagination is not
  a database snapshot. Same-size concurrent replacements across pages remain a reconciliation risk;
  a future server snapshot/cursor RPC or deletion tombstones would provide stronger guarantees.
- **Project switching:** exercise cache identity is now checked. SQLite workouts/routines/plans and
  persisted auth are still device-wide, so sign out before switching the configured Supabase project.
- **Incomplete product phases:** Friends leaderboards/invites/referrals, Profile/XP/export/deletion,
  push/accountability and later phases remain on the roadmap. Their fixtures are not real server data.

The audit verifies concrete invariants and fixes reproducible failures. It does not certify the
entire app as free of bugs or ready for release.
