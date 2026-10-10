# Progress

Status key: `[x]` done · `[~]` in progress · `[ ]` not started.
Update this file at the end of every session (see CLAUDE.md → Session protocol).

## Phases

- [x] **0 · Foundation**: project, tooling, theme/base components, navigation, docs and repeatable integrity checks (audit 2026-10-10)
- [x] **0B · Design system**: final visual identity, restyled base components, game layer ready for rank art and avatars (see `MOBILE-DESIGN.md`)
- [~] **1 · Backend, auth, onboarding**: built and verified locally; waiting on the hosted project + real-phone check (see Phase 1 below)
- [x] **2 · Exercise library**: exercises, muscles taxonomy, equipment, search, local cache
- [x] **3 · Routine builder**: routines, set types, supersets, targets, RIR/RPE, rest timers, notes, reorder (Android check left; see Phase 3 below)
- [x] **4 · Workout logging**: local-first logging, sync engine, rest timer, keypad, plates, random workouts, finish summary, history (user phone checks left; see Phase 4 below)
- [x] **5 · Plan generator**: questionnaire → rules-based multi-week plan, My Plan card, overview, edits, planned sessions in the logger (user steps left; see Phase 5 below)
- [x] **6 · Rank engine**: Postgres rank engine, standards tables, PRs, rank history, predictions, rewards on the workout summary (user steps left; see Phase 6 below)
- [x] **7 · Rank tab**: My Ranks, Body Map, Analysis, Records on server data; weekly leagues, seasons, custom leagues and challenges; dev seed and league simulator (user steps left; see Phase 7 below)
- [~] **8 · Home For You**: implemented and verified locally; real-workout acceptance and hosted verification remain (league standing now wired)
- [~] **9 · Feed and Discover**: social graph, posts, Respect, comments, copy workout, Discover ranking, notifications; built and verified locally (Android performance and hosted verification left; see Phase 9 below)
- [ ] **10 · Friends and leaderboards** (next): search, invite and referrals, friend, regional and global boards (friends and requests landed in Phase 9)
- [ ] **11 · Profile, XP, customisation**: XP and levels, badges, customisation, settings, units, export, delete account
- [ ] **12 · Streaks, stakes, notifications**: streaks, stakes among friends, accountability pods, push notifications
- [ ] **12B · Communities and battles**: college, hostel, society and gym communities; inter-community battles
- [ ] **13 · Anti-cheat and moderation**: verification for high ranks, outlier detection, reporting, moderation tools
- [ ] **14 · Polish, offline, performance, testing**: offline hardening, low-end Android performance, a11y audit, test coverage
- [ ] **15 · Launch**: final name and branding, store assets, EAS builds, privacy policy, release

## Phase 0 · Foundation (done; integrity audit 2026-10-10)

- [x] Expo SDK 57 project (TypeScript strict, pnpm, Expo Router), folder layout
- [x] CLAUDE.md, docs/PRODUCT_SPEC.md (with Open decisions), docs/PROGRESS.md
- [x] Provisional theme (kept simple and replaceable for Phase 0B): tokens (dark-first + light, 8 rank colours, spacing, type, radius, shadows), NativeWind mapping, ThemeProvider, theme store, replacement guide in `src/theme/README.md`
- [x] Base components: Screen, Text, Button, Card, IconButton, Icon, Chip, Input, NumberStepper, Sheet, EmptyState, Skeleton, Avatar, RankBadge, ProgressBar, SegmentedControl, TopTabs (+ PlaceholderScreen)
- [x] `/dev/components` gallery (dev builds only; Profile → Component gallery)
- [x] Navigation: 5 bottom tabs; swipeable top tabs (Home, Rank, Friends); Workout single screen; Profile settings stack
- [x] ESLint (expo + prettier + no-hard-coded-colours rule), Prettier, TypeScript, Jest + RNTL, `pnpm check`
- [x] `.env.example`, Supabase client (`getSupabase()`), Drizzle client (no schema yet)
- [x] Verified in Expo Go on the iOS simulator (all tabs, sub-tabs, swipe, gallery, light/dark, sheet)
- [x] **User**: run on a physical phone via Expo Go (`pnpm start`, scan QR) and confirm
- [x] Visual identity (#21) settled in Phase 0B
- [x] **User**: Open decisions #12 (auth methods) and #13 (age/consent) settled at the start of Phase 1

## Phase 0B · Design system (done)

- [x] Palette: near-black neutrals + calm burnt-orange signal colour; muted status colours; metallic rank colours; rarity scale; new `edge` and `streak` tokens
- [x] Type: Instrument Sans (400/500/600) loaded before splash hides; `hero` and `overline` variants; `numeric` tabular figures
- [x] Shape lock (6/12/20/28), shadows, motion and glass tokens
- [x] Restyled base components (inverted primary button and selected states, borderless cards with lit edge, hairline tabs) + `PressableScale` press feedback
- [x] Glass bottom tab bar (iOS blur, Android fallback); `Screen` pads past it
- [x] Game layer: `src/lib/game` rank model, `RankBadge` with art registry, `DivisionLadder`, `RankGlow`, `Avatar` rings, levels and cosmetic frames
- [x] Expo Go (iOS) Display P3 colour correction
- [x] `MOBILE-DESIGN.md`, `src/theme/README.md`, gallery updated; verified in the iOS simulator (dark and light)
- [x] Original rank and weekly-league art generated and registered in Phase 7 artwork pass (2026-10-09)

## Phase 1 · Backend, auth, onboarding (verified locally; user steps left)

- [x] Local Supabase (Colima + Docker CLI via brew; Supabase CLI as a dev dependency) and `db:*` scripts
- [x] Migration: `profiles`, `bodyweight_logs`, `user_settings`, enums, signup trigger, under-13 trigger, `public_profile_cards`, `username_available()`, explicit RLS and narrowed grants (docs/SCHEMA.md)
- [x] pgTAP tests (47): schema, defaults, trigger, constraints and RLS (another user and anon can't read or change private data). Mutation-checked: a leaky policy fails 3 tests
- [x] Generated types in `src/types/database.ts` (`pnpm db:types`)
- [x] Auth: email one-time code, Google (expo-auth-session + expo-web-browser + PKCE), SecureStore sessions (chunked), foreground token refresh, sign-out, `Stack.Protected` gate
- [x] Username availability check (debounced RPC)
- [x] Onboarding: 8 steps with progress and back, saved per step (resumes after a restart), then "You're in" with "Create my plan" / "Start a workout"
- [x] Everything editable later: Profile → Edit profile; Settings → Units, Privacy, Account (sign out)
- [x] zod validation with inline errors, keyboard-aware forms, `useProfile()`, unit conversion (+ tests)
- [x] Verified in the iOS simulator against local Supabase: email sign-up, wrong code, onboarding (lb user, under-13 block, back/forward), kill and reopen still signed in, plan generator preselects the goal, Edit profile save, sign out
- [x] Hosted project `chknynsewbmgranibjqs` linked, migration pushed, types regenerated from it, and all 47 pgTAP tests pass against it (`pnpm db:test:remote`); `.env` points at it
- [ ] **User**: hosted Auth settings: Email OTP length 6; paste `supabase/templates/magic_link.html` into the Magic link and Confirm signup templates (subject `Your Ranked Gym code: {{ .Token }}`); Redirect URLs `exp://**` and `rankedgym://**`; custom SMTP (the built-in sender allows only a few emails an hour)
- [ ] **User**: Google Cloud OAuth client of type **Web application** with redirect URI `https://<ref>.supabase.co/auth/v1/callback`; put its client ID and secret in Supabase → Auth → Providers → Google
- [ ] **User**: put the hosted URL and anon key in `.env`, run `pnpm start`, and on a real phone: sign up with email and with Google, finish onboarding, kill and reopen (still signed in), sign out
- [ ] Android: check keyboard behaviour on a small phone (iOS verified; Android relies on the window resizing)

## Phase 2 · Exercise library (done)

- [x] Muscle taxonomy: 20 muscles in 6 regions + optional neck; DB enums mirrored by `src/lib/exercises/taxonomy.ts` (test keeps them in sync); keys double as body-map path ids
- [x] Migration `20261006130000_exercise_library.sql`: `exercises`, `exercise_muscles` (role + volume weight), `exercise_library_meta`, `save_custom_exercise()`, `region_of_muscle()`, explicit RLS and grants; custom exercises can never rank
- [x] Official library: 268 exercises (32 rankable) in `supabase/seed/exercises/`, validated and generated into `20261006160144_exercise_library_v1.sql` (`pnpm exercises:build`); seeds from a clean `db:reset`
- [x] Rank keys (`src/lib/game/rankKeys.ts`): free weight + calisthenics only; `rankedLifts` typed against them
- [x] pgTAP `03_exercises.test.sql` (43): seed integrity, RLS (another user and anon), RPC, anti-cheat checks. `pnpm db:test`: 90 pass
- [x] Jest: seed validation, taxonomy↔enum, rank keys, search ("bench", "rdl", "lat pull", "pec deck", typos, filters, usage). `pnpm check`: 76 pass
- [x] Local SQLite mirror (Drizzle + generated migrations, `ensureDb`), version-gated sync on launch, custom exercises refreshed, cleared on sign-out
- [x] UI: exercise library, picker (search, muscle/equipment/type filters, Recent / Most used / Your exercises, multi-select), detail (muscles, body-map slot, how-to, tips, mistakes, History/Records empty states), create/edit/delete custom exercise; routine builder and live session "Add exercise" open the picker; `SearchField` shared component
- [x] Verified in the iOS simulator against local Supabase: sync, offline search for all four queries with the stack stopped, filters, multi-select into a routine, Recent, detail tabs, custom create (validation, saved row checked in Postgres) and edit/delete entry points
- [x] Both migrations pushed to the hosted project (2026-10-07); `pnpm db:test:remote` passes all 90 tests there
- [ ] Choose an exercise media source (open decision #25)

## Phase 3 · Routine builder (done; Android check left)

- [x] Migration `20261007083445_routines.sql`: `routine_folders`, `routines`, `routine_exercises`, `routine_sets`, five enums, `user_settings.effort_metric`, `save_routine()` RPC, explicit RLS and grants (docs/SCHEMA.md)
- [x] pgTAP `04_routines.test.sql` (55): schema, every set check, Bob and anon can't read or change Alice's rows, no attaching to another user's folder or custom exercise, RPC round trip and replace, leading drop set rejected. `pnpm db:test`: 145 pass
- [x] Shared model `src/lib/routines`: set rules, duration estimate, warm-up generator, muscle summary, cell parsing, zod validation (mirrors the server), 10 starter routines, defaults
- [x] Local SQLite mirror + drafts + generic outbox (`src/lib/sync`); push on launch, foreground and save; pull of changed routines; sign-out clears it all
- [x] Workout hub: FlashList of routines grouped by folder, search (name or exercise), swipe and long-press actions (duplicate, move, archive, delete with Undo), archived section, new folder, starter routines
- [x] Routine editor: name, description, colour, folder; picker multi-add; exercise cards (equipment, muscles, rest chip, notes, menu: replace keeping sets, superset with next, remove from superset, duplicate, how-to, remove); long-press selection → Make superset; reorder mode; set table adapting to log type and RIR/RPE/both; set sheet (type, load mode, tempo); swipe to delete a set; Add set copies the last; warm-up generator; live summary + muscle sheet; autosave draft, Undo (10), unsaved-changes guard
- [x] Reorder routines (drag across folder headers moves folders) and Starter routines screens; Settings → Training (effort target, default rest)
- [x] Shared components: `ReorderList`, `Toast` (`showToast`, `ToastHost`); `Screen` `bleedBottom` + `useTabBarInset()`
- [x] Tests: `pnpm check` passes (165 Jest tests: model, editor actions and undo, exercise card, editor screen add/superset/reorder/guard)
- [x] Verified in the iOS simulator against local Supabase: built Leg Day (warm-ups to a 140 kg top set, back-offs at 85% of the top set, 6–8 and 8–10 ranges, RIR, leg extension + curl superset with round rest, custom rests); killed mid-edit and the draft restored; saved with Supabase stopped, restarted offline (routine intact), then the queue drained into Postgres; pull brought down a folder made on the server; drag into a folder synced; 12 × 5 stress routine scrolls cleanly; light mode
- [x] Migration pushed to the hosted project (2026-10-07); `pnpm db:test:remote` passes all 145 tests there; types regenerated from it
- [ ] Android: 12 exercises / 60 sets on the Pixel 6a emulator (Expo Go not installed there yet), keyboard and 360dp widths

### Design review leftovers (mobile-design-review, `design-baseline.json`)

Fixed: FINDING-001 (high) the default-rest setting was saved but unused; new exercises now use it. Open:

- [ ] FINDING-002 (medium) Hub Routines heading (reorder icon + New folder + New routine) may crowd at 360dp; consider an icon or overflow for New folder
- [x] FINDING-003 (medium) `Chip` target raised to 44pt including hitSlop in Phase 8
- [x] FINDING-004 (medium) Training settings changed offline wait silently (fixed in Phase 4)
- [ ] FINDING-005 (medium) `ReorderList` has no auto-scroll while dragging (Move up/down actions cover it for now)
- [ ] FINDING-006 (polish) swipe says "Copy", menu says "Duplicate"
- [ ] FINDING-007 (polish) warm-up and top-set badges are two close oranges
- [ ] FINDING-008 (polish) a starter routine marked "Added" can be added again
- [ ] FINDING-009 (polish) the "no colour" ban icon reads as "forbidden"

## Phase 4 · Workout logging (done; phone checks left)

- [x] Migration `20261007143344_workouts.sql`: `workouts`, `workout_exercises`, `workout_sets`, `workout_revisions`, `workout_status`, `save_workout()` (definer: idempotent upsert by client id, latest draft wins, completed workouts immutable except edits which keep a revision, server-computed duration, volume and calories), `set_workout_photo()`, private `workout-photos` bucket with per-user folders; clients only read and delete
- [x] pgTAP `05_workouts.test.sql` (49): replay and stale pushes change nothing, one row per id, completed immutable, edit keeps a revision, totals, `is_pr` not writable, limits, Bob and anon blocked (incl. reusing Alice's child ids), photos. `pnpm db:test`: 194 pass
- [x] Local SQLite tables (`drizzle/0002_workouts.sql`) with a unique index for one in-progress workout; runtime (rest timer) and photo file stored locally
- [x] Sync engine (`src/lib/sync`): delayed draft pushes (20 s), retry timer, stuck state after 8 failures, immediate retry when the connection returns (`expo-network`), status store + `SyncStatus` indicator; testable store interface. Workouts and photos registered; finished workouts pulled
- [x] Pure model (`src/lib/workouts`): e1RM (Epley; lower of Epley and Brzycki for 10-12; capped at 12), plate calculator, calories, summary, session building (routine targets, % loads, last time, in-session follow-on), set flow (rest + superset focus), routine deviation, random workout generator with reroll
- [x] Logging screen: editable name, elapsed clock, sync dot, Finish; set rows with last time (tap to copy), docked keypad (+/- 2.5 kg or 5 lb, plates, Next), tick with haptic, live e1RM, failed sets, add/replace/remove/reorder/superset/notes/rest per exercise; rest sheet (+/-15, skip) folding into a bar, local notification + vibration; keep awake
- [x] Mini bar over every tab while a workout is active; survives kill and restart (rest timer included)
- [x] Finish summary (duration, volume, sets, exercises, calorie estimate, muscles, records/rank placeholder, effort, notes, photo, visibility, update routine), discard; History list, detail, edit (revision) and delete; exercise detail History tab; Profile entry; Settings → Training: bar, plates, rest sound
- [x] Start from a routine, empty, generator (live preview, reroll one or all, save as routine) and hub quick presets
- [x] Tests: 298 Jest (sync engine offline/retry/duplicates, generator on the real library, 1RM, plates, calories, flow, deviation, keypad fields, logging screen: tick in ~36 ms incl. the rest sheet, rest, superset, keypad). `pnpm check` passes
- [x] Verified in the iOS simulator against local Supabase with the stack stopped ("airplane mode"): started a generated routine, logged sets with the keypad and plate calculator, rest sheet and bar, killed the app twice mid-workout (mini bar, elapsed time and rest restored), finished; restarted Supabase and the workout reached Postgres within seconds exactly once (1 workout, 2 exercises, 3 sets; a relaunch and pull added nothing); edited it from History (revision 1, volume recomputed, revision 0 kept)
- [ ] **User**: complete `pnpm db:test:remote` and device Storage checks; workout migration deployment confirmed by the 2026-10-10 dry run
- [ ] **User**: on a real phone in airplane mode: a full ~60-minute session, kill mid-workout, restart the phone, finish, turn the network on, check it in Supabase once; allow notifications and confirm the rest buzz with the phone locked; add a photo and confirm it uploads
- [ ] Android: logging at 360dp, back button on the logging, finish and edit screens, keypad, notification channel

### Design review leftovers (Phase 4, `design-baseline.json`)

Fixed: FINDING-010 (high) keyboard covered sheet inputs (base `Sheet` now avoids it), FINDING-011 (high) in-session weight follow-on, 012-017, 021-023, FINDING-025 (sign-out warns when changes haven't synced, offers a sync first) and Phase 3's FINDING-004. Open:

- [ ] FINDING-018 (medium) Generator needs a loading state while the library downloads on a first launch
- [ ] FINDING-020 (medium) Logging set row unverified at 360dp and 1.6x text
- [ ] FINDING-019 (polish) Optional setting: start rests in the bar instead of the sheet
- [ ] FINDING-024 (polish) History as cards (kept for now, matches routine cards)

## Phase 5 · Plan generator (done; user steps left)

- [x] Pure engine `src/lib/plans/engine` (docs/PLAN_ENGINE.md): split tables by days and goal, weekday placement with no back-to-back primary-muscle overlap (Sun → Mon included, fallback splits, upper/lower colouring as the last resort), goal profiles (strength top set + back-offs, hypertrophy, gain, fat loss/toned supersets + cardio finisher, curvier glute volume, calisthenics skill ladders, general), weekly volume by level with priority, maintain and minor roles, a time-budget fitter (routine duration estimate), curated exercise choices with kit/bar/avoid filters and A/B variety, linear/double/reps/hold progression, deload, calendar (start week, missed, shift, move, skip, pause/resume), plain-text "Why this plan"
- [x] Migration `20261008110117_plans.sql`: `plans` (one active per user), `plan_weeks`, `plan_days`, `save_plan()` (idempotent, ends the previous active plan, keeps done days done), triggers that drop a foreign `plan_day_id` and mark a plan day done when its workout completes, explicit RLS and grants (docs/SCHEMA.md)
- [x] pgTAP `06_plans.test.sql` (33): schema, replay, deletes, checks, foreign routine rejected, done marking survives a stale push, one active plan, Bob and anon blocked, Bob can't claim Alice's day. `pnpm db:test`: 227 pass
- [x] Local SQLite tables (`drizzle/0003_plans.sql`), repository, `plan` sync entity (rank 2, after routines), pull keeping local done days, sign-out clears plans; finishing a planned workout marks its day done in the same transaction
- [x] Questionnaire (7 screens, prefilled from onboarding, live split preview, skip, back), preview (sessions, weekly volume, why, start this week / next Monday, regenerate), overview (calendar, week sessions, sets per muscle, pause/resume, new, end), why screen, session screen (start, swap with scope, move with overlap warning, regenerate with scope, skip)
- [x] My Plan card (today + Start, rest day + next, week strip done/missed/upcoming, progress, missed → shift the week / skip, paused → resume, finished → next plan); Home "today" card from the plan; plan routines hidden from Routines and Reorder
- [x] Planned sessions open the Phase 4 logger with `planDayId`, week-1 "find your working weight" hints, progressed loads from last time, deload loads
- [x] Tests: 500 sampled profiles (overlap, time budget, ceilings and explained floors, equipment/bars/avoid, compound order, valid routines, deload ~60%, progression by level, A/B variety, determinism; floors and pattern coverage when time allows), 10 reference-profile snapshots + their explanations, schedule, calendar, progression, deload, start, edits, view, PlanCard and questionnaire screens. `pnpm check`: 378 Jest pass
- [x] Verified in the iOS simulator against local Supabase: created a 4-day plan (questionnaire → preview → start), overview calendar, swapped an exercise for this session only (only that day changed in Postgres), started today's session (blank week-1 weights and hint), finished it: day done on the card, calendar and Home, `plan_day_id` set and the day `done` in Postgres
- [ ] **User**: complete `pnpm db:test:remote`; plan migration deployment confirmed by the 2026-10-10 dry run
- [ ] **User**: on a real phone: create a plan, log a session offline, reconnect and check the plan and workout in Supabase; try a missed day (shift the week) and pause/resume across days
- [ ] Android: questionnaire, calendar and sheets at 360dp
- [ ] Check moving, regenerating and the missed-day flow in the simulator (covered by unit tests; not driven by hand this session)

## Phase 6 · Rank engine (done; user steps left)

- [x] Rules rewritten in docs/RANK_SYSTEM.md (plain English, every rule). The 2026-10-06 DOTS model was superseded at the brief's request (§16 lists the changes)
- [x] Migration `20261008180000_rank_engine.sql`:
  - config tables (`rank_settings`, `rank_thresholds`, `rank_region_weights`, `strength_age_brackets`, `rank_lifts`, `rank_variants`, `strength_standards`)
  - results (`ranks_current`, `rank_snapshots`, `rank_events`, `personal_records`, `rank_flags`, `workout_rewards`, `rank_jobs`)
  - pure SQL maths and `rank_recompute_user`
  - `save_workout` returns rewards
  - recompute triggers, pg_cron job runner
  - `get_ranks`, `get_rank_predictions`, `get_workout_rewards`
  - RLS: owner reads, engine-only writes
- [x] Standards v1 (`supabase/seed/standards.ts` + `standards/`, comment block per lift; `pnpm standards:build` → `20261008182133_strength_standards_v1.sql`): 21 weightlifting lifts from DOTS shares × 15 bodyweight bands, 7 calisthenics lifts (reps + weighted), 5 skills with 10 progressions, guardrails. Library v2 adds the `handstand` rank key
- [x] TypeScript mirror `src/lib/game/engine` (e1RM, interpolation, tiers, scoring, guardrails, aggregates, placement, window, records, predictions); `strength.ts` removed; divisions III–I in `src/lib/game/ranks.ts` and the game components; the logger's e1RM uses the engine formula
- [x] 50 fake lifters (`supabase/seed/fakeUsers.ts`, strength by training age from ExRx-style tables). Distribution: beginners Iron–Silver (20/20), 1–2 years Gold–Platinum (8/12), 3–5 years Platinum–Diamond, one Master. It prints in `pnpm test` and `pnpm db:test`
- [x] pgTAP:
  - `07_ranks.test.sql` (100): table-driven maths and scoring, rewards, PRs and baselines, history, edit and delete recomputes, guardrails, jobs, inactivity, predictions, weigh-in prompt, RLS
  - generated `08_rank_distribution.test.sql` (6): Postgres matches the TypeScript mirror on every score for 15,849 sets
  - `pnpm db:test`: 333 pass
- [x] App:
  - `src/lib/ranks` (parsers, api, hooks, formatting); local `workouts.rewards` column (`drizzle/0004_workout_rewards.sql`), stored by the workout sync
  - rewards screen (`/session/rewards`): waiting, badge reveal (Reanimated, haptic, reduced motion), PRs, rank changes, placement, weigh-in prompt, flagged note, offline copy
  - rewards on the workout detail screen
  - "Rather not say" copy explains the averaged standards
- [x] Tests: `pnpm check` passes (496 Jest, incl. 116 engine, 8 parsers/formatting, 6 rewards screen)
- [x] Verified in the iOS simulator against local Supabase (Expo started with the local URL in env; `.env` untouched):
  - seeded bench 60 × 5 (Silver I), then logged 72.5 × 5 in the app and saved
  - the summary revealed "Bench press ranked up · Gold II · Up from Silver I" with 3 PRs (e1RM 83.1 was 68.8, heaviest 72.5 was 60, set volume 362.5 was 300), arm/shoulder/chest region rank-ups and "Placement: 1/5 lifts"
  - Postgres has the matching records, baselines and `is_pr`; the History detail shows the same rewards
- [ ] **User**: complete `pnpm db:test:remote`; rank engine/library/standards migrations confirmed deployed by the 2026-10-10 dry run
- [ ] **User**: on a real phone, log a workout, check the reveal and haptic; turn on Reduce Motion and check the reveal is a plain fade (not driven in the simulator)
- [ ] Calibrate standards against OpenPowerlifting and beta data before launch (standards v2)

## Phase 7 · Rank tab and leagues (done; user steps left)

- [x] Read functions (`*_rank_tab.sql`): `get_rank_history`, `get_rank_events` (timed by the workout), `get_personal_records`, `get_lift_bests`, `get_lift_detail` and `get_lift_percentile`. The percentile is a definer function that returns a percentage only, and nothing below 20 lifters. pgTAP `09_rank_tab` (28)
- [x] Leagues (`*_leagues.sql`, RANK_SYSTEM.md §18):
  - IST weeks and 8-week seasons; Rookie, Contender, Elite and Legend
  - placement into groups of about 30 by overall score, and a mid-week first workout joins straight away
  - the LP formula: effort and relative progress only
  - top and bottom 20% move, with no promotion on 0 LP; season badges, and Elite and Legend frames
  - custom leagues (4 scorings, invite code and link, up to 5 per owner) and challenges (3 kinds, 2 a week per group)
  - `league_run_cycle(p_now)` on hourly pg_cron, idempotent; `league_now()` for tests and simulation; RLS so members read and nobody writes directly
  - pgTAP `11_leagues` (64), including "an Iron and a Diamond lifter with the same training earn the same LP"
- [x] `pnpm dev:seed`: 50 fake lifters plus `demo@fake.test` as onboarded local accounts (Mailpit sign-in), their history replayed through the engine in date order, and league history (one finished season, an open week with all 51 placed). `pnpm leagues:simulate --weeks N`: trains them through the open week, closes it and prints each group (verified over 4 weeks, through a season end with 51 rewards)
- [x] Client `src/lib/ranks`:
  - ladder and lift names, history, events, records, lift bests, detail and percentile hooks
  - `useServerReads` gating, so the signed-out dev preview shows a sign-in prompt instead of anon errors
  - pure helpers (muscle breakdown and weakest link, balance ratios, analysis buckets, chart series, record grouping), with tests
- [x] Client `src/lib/leagues`: types, parsers, api, hooks, countdown and a local results reminder that respects `notification_prefs.league_results` and never asks for permission. The workout sync invalidates leagues
- [x] My Ranks:
  - hero with placement notches, Inactive state and points to the next division
  - progression `LineChart` (Victory Native; 1M/3M/6M/1Y/All; any scope; tier bands; rank-up dots; caption)
  - every rankable lift, with best set and next target
  - lift detail (`/lift/[key]`: target loads and ETA, percentile, history chart, sets that counted, standards for you)
  - How ranks work sheet
- [x] Body Map: male or female outline (defaulting from the profile's standards), and a muscle sheet with the lifts behind it, their shares and the weakest link. `BodyMap` also replaces the exercise detail and workout summary placeholders
- [x] Analysis: Weightlifting vs Calisthenics with month deltas; the 5 closest rank-ups with loads at 1/3/5/8 and ETA; rank-ups by weekday and time of day; region donut and muscles by tier; strengths, weaknesses and balance ratios with suggestions. Every card has a teaching empty state
- [x] Records: grouped by exercise (ranked lifts first), current bests, expandable history with "was" values and baselines, kind and date filters, links to the workout, and Share as a Phase 9 toast. The exercise detail Records tab is filled from the same data
- [x] Leagues UI:
  - hero with a live countdown; standings with zones; LP breakdown; challenges; chat placeholder; friend leagues
  - Monday results sheet, which also clears older results
  - create (`/leagues/new`, with share invite), join (`/leagues/join?code=`), league detail (owner challenges, leave or delete), history, season recap with reward frame
  - Season tag in the Rank header
- [x] Home Today shows this week's league division and position (FINDING-038)
- [x] Removed the Rank mocks, the mock chart and Phase 12B clash card, and the interim SVG badges (Codex's raster art stays)
- [x] Tests: `pnpm check` passes (57 suites, 579 Jest), including 13 Rank-tab and Leagues screen tests and the lib tests. `pnpm db:test` passes 476 in 11 files
- [ ] **User**: complete `pnpm db:test:remote`; Rank tab/leagues migrations confirmed deployed by the 2026-10-10 dry run
- [ ] **User**: on a real phone (`EXPO_PUBLIC_DEV_AUTH_BYPASS=false`), sign in, check charts and pinch-zoom, and create and join a league from a second account
- [ ] Android: Victory and Skia chart performance on a low-end phone (open decision #20), and the 360dp layouts of the Leagues and lift detail screens
- [ ] Peak-rank badges (moved to the Phase 11 badges)

## Phase 8 · Home For You (implemented; acceptance follow-ups)

- [x] Read the required product, rank, schema and mobile design docs before planning; implementation plan in `docs/PHASE_8_PLAN.md`. Applied `mobile-taste` to each screen and `mobile-design-review` to all built/changed screens and flows.
- [x] For You: Today with planned-session/resume/generate actions, actual streak, four live destination previews in a 2×2 grid, recent records/rank-ups and a weekday-aligned weekly comparison.
- [x] Muscle Analysis: 7/30/90-day and validated custom ranges, reused Phase 7 `BodyMap`, sets/volume toggle, primary 1.0/secondary 0.5 weighting, ranked muscle list, PLAN_ENGINE weekly range bands, neglected-muscle callout and push/pull/legs distribution.
- [x] Recovery: documented exponential model in `docs/RECOVERY_MODEL.md`, RIR/RPE/default-RIR-2 effort, muscle-specific half-lives, clamped recovery, least-recovered ordering, ready chips, slower/normal/faster setting, minute/foreground decay from cached fatigue and clear estimate copy. Pure-function tests cover effort, elapsed time, speed, bounds and warm-up/failed-set exclusions.
- [x] Goals: all seven requested types, suggestions from rank predictions/current data, bodyweight-rate warning, progress rings, trend projection when enough observations exist, edit/archive, checkbox completion, reduced-motion-aware celebration and opt-in server feed post with once-only insertion.
- [x] Overview: 7/14/30/90-day comparison, volume/sessions/duration/average/records/calorie estimate/bodyweight trend, daily volume bars, duration line, training calendar, weigh-in and calendar-based 7-day average lines, Log bodyweight sheet and virtualised full records list linking to workouts.
- [x] Postgres views/RPCs aggregate authenticated data with owner RLS; generated database types. SQLite-backed query snapshots render immediately and refresh in the background; workout writes/sync invalidate them. Cold offline states have an actionable message instead of indefinite skeletons.
- [x] Preserved the existing **account-free development preview**. Home and all four destinations read actual device SQLite workouts; local goals, weigh-ins and recovery speed persist. No server rank or feed post is fabricated. Production authentication remains required.
- [x] Three additive migrations applied to local Supabase with `migration up --local`; no database reset or user-data deletion. Automatic approval review rejected the initially requested reset because it could erase data, so the non-destructive migration path was used instead.
- [x] Validation: final `pnpm check` passes TypeScript, ESLint, formatting and **54 Jest suites / 561 tests / 20 snapshots**; local pgTAP passes **412 assertions in 10 files**, including 51 Phase 8 assertions. SQLite integration tests execute real aggregate SQL; screen tests cover entry routes, measure/speed controls, goal completion, validation, offline state and weigh-in entry.
- [x] Account-free iOS walkthrough: fresh Home launch, Workout tab, Muscle Analysis/map/Back, Recovery and speed persistence, create/complete/celebrate/archive goal, Overview/charts and Log bodyweight form. The synthetic walkthrough goal was archived; no synthetic bodyweight was saved.

### Arithmetic spot-checks (test workouts, not the user's workouts)

The user confirmed they have **no account**. The current simulator has no completed workouts, so the original acceptance condition against their own logged data is still unchecked. The SQLite fixture uses three completed 50 kg × 10 bench sets; warm-ups, failed, unticked and draft sets are excluded:

1. Chest working sets: `3 × 1.0 = 3`.
2. Triceps weighted volume: `3 × 50 × 10 × 0.5 = 750 kg` (1.5 weighted sets).
3. Triceps after one hour at RIR 2 / normal speed: fatigue `1.5 × 0.5^(1/24) = 1.4573`; recovery `100 × (1 − 1.4573/10) = 85.43%`. Further elapsed hours increase recovery without another workout.

The same fixture's authoritative total workout volume is 1,500 kg. Muscle totals overlap and must never be summed to derive workout volume; the server tests deliberately use a separate authoritative total to catch that error.

### Acceptance and design follow-ups

- [ ] Spot-check three numbers against the user's own newly logged workouts when available; verify hourly recovery over a real session and goal completion from those workouts. Fixture results do not fulfil this acceptance item.
- [ ] Complete remote RLS/RPC verification. The 2026-10-10 hosted dry run confirms all migrations are deployed; the remote suite was interrupted by SSL/DNS failures. `.env` was not redirected. Local migration/type checks passed.
  - 2026-10-09 audit: hosted dry run returned `AccessTokenRequiredError`; Supabase CLI login is required. Concrete deployment/sync instructions are in `docs/BACKEND_SETUP.md`.
- [x] **FINDING-038 (medium):** Today shows the league division and position from `get_league_home` (Phase 7 completion session).
- [ ] **FINDING-029 (medium, inherited):** BodyMap chest/delt/hip partitions remain schematic; exact named rows accompany them.
- [ ] **FINDING-039 (medium):** Replace validated YYYY-MM-DD custom-range/deadline inputs with a platform date picker when the stack supports it.
- [ ] **FINDING-040 (medium):** The existing labelled sample Feed stories/social actions await Phase 9 and retain older press feedback. The real goal milestone strip is distinct.
- [ ] **FINDING-041 (polish):** Check the requested 2×2 previews at maximum font scale and narrow Android widths.
- [ ] Android/back/keyboard/insets, native light mode, VoiceOver, long-list performance, direct deep-link startup and software-keyboard submit visibility. Edit goal and Feed received static review; they were not driven natively.
- [ ] Expo Go crashed natively during earlier editing/reloads (Hermes and permission-module startup stacks; no proven single root cause). After restarting Metro with a cleared cache, a fresh bundle opened Home and the subsequent detail walkthrough stayed open. **Fresh launch is verified; hot-reload stability is not yet established.** Restart guidance is in `docs/DEVELOPMENT.md`.

High findings 034–035 fixed; medium 036–037 and 042 fixed; prior shared-target findings 003/028 fixed. Remaining findings are listed above. Scoped review: **Design A (3.8), AI Slop A (3.95)**; full evidence in `docs/design/phase8/REVIEW.md` and `design-baseline.json`. Phase 7 findings 030–033 remain in their original scope. Phase 8 stays in progress until its acceptance dependencies are met. Phase 9 has since been implemented; see below.

## Phase 9 · Feed and Discover (built and verified locally; Android and hosted steps left)

- [x] Read CLAUDE.md, PRODUCT_SPEC, PROGRESS, SCHEMA and MOBILE-DESIGN before planning. Decided with the user: Friends hub requests and list go real now, `expo-image` + `expo-image-manipulator` approved, goal and experience are ranking signals only. Rules in PRODUCT_SPEC §10I; ranking in `docs/DISCOVER_RANKING.md`.
- [x] Migration `20261010090000_social.sql`:
  - friendships, follows, blocks; `are_friends` is real (was a stub); `is_blocked`, `can_view_profile`, `can_view_post_row`, `can_view_post`, `can_view_comment`
  - posts (workout, text, photo, pr, rank_up, goal, league_result) with the "more restrictive of post and profile visibility" rule, Respect (`post_likes`), comments with one level of replies, reports, notifications, `user_settings.milestone_posts`
  - workout posts kept by a trigger from the summary's visibility; milestones built only from the user's own server data; Phase 8 `goal_posts` moved into posts
  - `post-media` bucket and a workout-photo read policy, both following post visibility; Realtime publication for posts and notifications
  - read RPCs: `get_feed` (keyset), `get_post`, `get_user_posts`, `get_profile`, `get_discover` (scored, 2 per author per page), `get_people_suggestions`, `search_profiles`, friend requests, friends, notifications
  - `routines.source_label` for "Copied from @user" (SQLite `drizzle/0005`)
- [x] pgTAP `12_social` (131 assertions): visibility matrix (post × profile visibility × friend / follower / stranger / blocked / anon), a non-friend gets nothing for a friends-only post through the table, `get_post`, comments, Respect, reports, storage and the workout photo; counters, one-level replies, notifications only when visible, block cleanup both ways, Discover never shows private / friends-only / blocked and caps authors. `pnpm db:test`: **607 pass in 12 files**. `supabase db diff` against a fresh shadow database: no schema changes (the migration files match the local database).
- [x] `src/lib/social`: parsers, RPC API, TanStack hooks (infinite Feed / Discover / profile posts / notifications), optimistic Respect and comments (`patchPost`), batched signed URLs, mentions, caught-up marker, Realtime (new-posts pill, bell). `src/lib/photos/compressPhoto` re-encodes at 1600 px (EXIF and GPS stripped); workout photos use it too.
- [x] Screens (`src/features/social`): Feed (composer prompt, caught-up divider, new-posts pill, offline notice), Discover (people search, 6 filters, "People to train with", reason overlines), post detail (workout breakdown, threaded comments, pinned reply box, mention autocomplete), composer (4 photos, workout or PR attachment, visibility with profile-cap note, edit mode, discard confirm), Copy workout (rename, keep or blank weights, save or open the builder), user profile (Add friend / Accept / Requested / Friends, Follow, Block), notifications (requests answered in place). Milestone cards for records, rank-ups, goals and league results.
- [x] Wiring: bell with unread count on Home; Rewards "Share" prompts (Ask me); Records and league results Share; Settings → Privacy → Share milestones; goal share toggle hidden when "Never"; Finish explains what each visibility posts; routine editor shows "Copied from @user"; Friends hub requests, sent and friends are real.
- [x] Dev seed: friendships, follows, text posts, respects and comments around demo, plus **social.a / social.b / social.c@fake.test** (A and B friends, C a public stranger). `pnpm social:acceptance` signs in as all three over the real API and passes **27 checks**: friends see each other's friends-only and public posts; C sees only public posts in Discover and gets nothing for A's friends-only post (table read, `get_post`, Respect); B copies A's workout into a routine B owns and can edit; after A blocks C, neither sees the other's posts, profile, search or Discover entries, and C can't follow or request; Realtime tells B about A's new post and never tells C.
- [x] iOS simulator against the local stack (demo account): Feed, post detail, comment with @mention (notification created in Postgres), mention autocomplete, Discover, notifications, profile Add friend, composer (text post, discard confirm, two-photo post), copy workout → builder with credit, Friends hub, light mode. **EXIF**: a test photo tagged with Delhi GPS coordinates was posted from the picker; both stored JPEGs have no GPS block.
- [x] `pnpm check`: TypeScript, ESLint, Prettier and **62 Jest suites / 612 tests** (parsers, mentions, caught-up, optimistic cache, Feed / post detail / composer / copy screens).
- [x] Feed query timing on the seeded demo account: first page 20 posts in ~70 ms, Discover ~12 ms, people suggestions ~6 ms.
- [ ] **Android performance (open)**: the Pixel 6a emulator exists but Expo Go isn't installed on it (installing it needs a download). Scrolling 100 posts smoothly on a mid-range Android is **not verified**. The feed uses FlashList v2 with item types, memoised rows, `expo-image` with recycling keys and one batched signed-URL request per screen.
- [ ] **User**: complete `pnpm db:test:remote` and real-device social checks. Social migration deployment was confirmed by the 2026-10-10 dry run; remote tests remain incomplete because of SSL/DNS failures. The migration adds the tables to Realtime.
- [ ] **User**: on a real phone, three accounts (or social.a/b/c on the local stack): post with photos and check they arrive without location, Respect and comment offline (rollback toast), the new-posts pill.
- [x] Simulator cache caveat: the 2026-10-10 audit added backend identity to the exercise cache, forcing a refresh across local/hosted projects even at matching library versions. Sign out before changing backend configuration; account data remains device-wide.

### Design review (mobile-design-review, `design-baseline.json`)

Scoped to Phase 9 screens; static grep pass (no em dashes, emoji, hex colours or JS-thread animation; every `Alert.alert` is a destructive confirmation) plus the live simulator pass above. Trunk Test PASS on all eight screens, including deep-linked post, copy, profile and notifications. **Design A (3.95), AI Slop A.**

Fixed in this session: FINDING-043 (high) Friends hub add-friend cards collapsed to slivers (pre-existing `flex-1` on a pressable `Card`), FINDING-047 (high) copy → builder opened "Routine not found", FINDING-048 (high) copy preview left out every exercise when device ids differed, FINDING-044 / 045 / 046 / 049 / 050 (medium: post layout, loud comment actions, orange row actions and counts, "1 reps", misleading profile empty state). Open:

- [ ] FINDING-051 (medium, tell 13) Post detail renders up to 300 comments in a ScrollView; move to FlashList with the post as header.
- [ ] FINDING-052 (polish) Group repeated respects in notifications ("Aarav and 4 others").
- [ ] FINDING-053 (polish) The whole post body is one pressable, so long posts scale on press and the photo pager sits inside it.
- [ ] FINDING-054 (polish) Editing a photo post can remove photos but not add new ones.
- [ ] FINDING-055 (polish) Real avatar images in lists untested (seed accounts use initials).
- [ ] Unverified: Android scroll performance, 1.3x / 1.6x font scale, the new-posts pill and live bell on screen (Realtime delivery itself is verified by the acceptance script), VoiceOver, Android keyboard on the comment box and composer.

## Session log

### Session 1 — 2026-10-05 — Phase 0 Foundation

**Built**

- Scaffolded the Expo SDK 57 app (RN 0.86, React 19.2, TS 6). pnpm 12 with `nodeLinker: hoisted` and approved builds for esbuild and unrs-resolver.
- Provisional theme in `src/theme`, with tokens as the single source of truth so Phase 0B can swap the look without touching components. Tailwind semantic colours resolve to CSS variables that ThemeProvider sets through NativeWind `vars()`. Dark is the default, with a light variant.
- 17 base components plus TopTabsNavigator, which wraps `expo-router/js-top-tabs` and uses our TopTabs bar.
- All routes and placeholder screens, each naming its future content and phase.
- Tooling: `pnpm check` runs typecheck, lint, format:check and test (8 tests passing).

**Decisions**

- App name placeholder "Ranked Gym" (slug `ranked-gym`, scheme `rankedgym`, bundle id `com.rankedgym.app`).
- Swipeable top tabs use `expo-router/js-top-tabs`, which needs react-native-tab-view and react-native-pager-view (approved).
- Sheet is built in-house (Modal + Reanimated + gesture-handler), not @gorhom/bottom-sheet.
- Victory Native and Skia are deferred to Phase 7.
- ESLint is pinned to v9 (eslint-plugin-react breaks on v10).
- No Claude/AI attribution in any commit. The user commits from now on.
- Plan is about 18 sessions: Phase 0B (Design system) was added between 0 and 1. The Phase 0 theme is deliberately provisional.

**Gotchas found**

- Expo Router 56+ forbids `@react-navigation/*` imports. Use the `expo-router/*` entry points.
- `app.config.ts` must import tokens with the `.ts` extension (`allowImportingTsExtensions` is on).
- RNTL 14 `render` and `userEvent` are async.
- NativeWind `className` doesn't style Reanimated `Animated.View`. Use theme values in `style`.
- Reanimated: use `.get()` and `.set()`, since React Compiler lint rules flag `.value` writes.

**Next (Phase 0B, Design system)**

- Settle the visual identity (Open decision #21): palette, typography (custom font?), radius and shadow style, and rank badge art.
- Follow `src/theme/README.md`: replace token values, restyle the base components, and check every screen in `/dev/components` in dark and light.

**Then (Phase 1)**

- Resolve Open decisions #12 (auth methods) and #13 (age/consent).
- Create the Supabase project, schema and RLS, plus auth screens and onboarding.
- Persist theme and units preferences.

### Session 2 — 2026-10-06 — Phase 0B Design system

**Built**

- Final tokens in `src/theme/tokens.ts`: palette (dark + light), metallic `rankColors`, `rarityColors`, Instrument Sans `fontFamilies` and type scale, radius lock, shadows, `motion`, `glass`. New colour tokens `edge` and `streak`.
- `src/theme/displayColor.ts`: Expo Go on iOS reads hex as Display P3 (measured `#F2662F` rendering as `#FF5A0B`), so `@/theme` exports corrected colours there only.
- Restyled Text, Button (+ `accent` variant), IconButton, Card, Chip, SegmentedControl, TopTabs and ProgressBar. New `PressableScale`.
- Glass tab bar (`GlassTabBarBackground`, `expo-blur`), absolute tab bar, `Screen` pads by `BottomTabBarHeightContext`.
- Game layer: `src/lib/game/ranks.ts` (divisions, labels, ordinal/compare), `src/components/game/` (RankBadge + art registry, PlaceholderRankArt, DivisionLadder, RankGlow), Avatar `ring` / `level` / `frameId`.
- `MOBILE-DESIGN.md` (design record), `docs/design/system-preview.html` (HTML specimen), gallery `GameSection`. Jest now mocks react-native-worklets for Reanimated 4. `pnpm check`: 15 tests passing.

**Decisions**

- Layouts from the Claude Design mockups, styling from the references. "Calm chrome, loud rewards": one orange signal colour; saturated colour only on game objects.
- Instrument Sans for everything (the condensed Big Shoulders display face and the neon lime were rejected as too loud and too "AI").
- The primary button is inverted (white on dark); orange `accent` is for game moments.
- Glass only on the bottom tab bar; Android gets a near-opaque surface instead of blur.
- Approved additions: `expo-blur`, `@expo-google-fonts/instrument-sans`.

**Follow-ups**

- User to supply rank badge art; register it in `artRegistry.ts`.
- When moving to dev builds, confirm colours render as sRGB (no P3 correction needed) and drop the correction if so.
- Glass on the top sub-tab strip was deferred (each page would need its own scroll inset).
- Add `expo-haptics` in Phase 4 with the haptics vocabulary from MOBILE-DESIGN.md.
- `ListRow` (profile) is still card-styled; regroup with hairlines when Profile is built (Phase 11).

**Next (Phase 1, Backend, auth, onboarding)**

- Resolve Open decisions #12 (auth methods) and #13 (age/consent) first.
- Create the Supabase project, schema and RLS, plus auth screens and onboarding.

### Session 2 (cont.) — 2026-10-06 — App layout from the mockups

**Built**

- Every screen from the 15 mockups in `docs/design/mockups/`, restyled to the design system, on typed mock data (`src/features/<feature>/mocks.ts`):
  - Home: For You (today's session, muscle volume, recovery, goals, 14-day overview), Feed (stories, workout and media posts, streak activity), Discover (search, filters, partners, communities, open challenge); header streak chip and notifications.
  - Workout: hub (plan week strip, start options, routine folders), Create plan (`/plan/new`), Routine builder (`/routine/[id]`, supersets, set types), Live session (`/session`, rest timer, set log with done toggles).
  - Rank: Ranks (hero with emblem, ladder and glow, tier strip, disciplines, progression chart, lift ranks), Body (front/back SVG body map coloured by muscle rank, muscle grid), Leagues (league hero, standings with zones, college clash, events), Analysis (predictions, rank-ups by weekday, region donut, tier mix, strength balance), Records (no mockup).
  - Friends: hub (invite card, add options, standings summary, requests, friends) and Leaderboards (scope, filters, podium, standings, pinned You row).
  - Profile: header with ringed avatar and level, level/XP, stats, badges, customise, settings list. Welcome (sign up) screen at `/welcome`.
- New shared components: SectionHeader, Stat, Tag, SelectField, ListGroup, ListItem, BarChart; game: HexEmblem, RankTag, StreakChip, LeaderboardRow, BadgeTile. TopTabs became a segmented control; Screen gained `onBack`, `subtitle` and a pinned `footer`; Button gained `outline`; ProgressBar gained `neutral`.
- Placeholder rank art is now the mockups' hexagon emblem (chevrons count up through divisions).
- Verified every screen in the iOS simulator; `pnpm check` passes (17 tests).

**Decisions**

- Navigation follows the mockups: Friends is a hub with Leaderboards pushed (Invite merged into the hub); Rank sub-tabs are Ranks, Body, Leagues, Analysis and Records; Create plan, Routine builder and Live session open full screen without the tab bar; Profile carries the settings list.
- Differences from the mockups are recorded in MOBILE-DESIGN.md ("Layout from the mockups").

**Follow-ups**

- Buttons are wired for navigation only; actions (join, accept, save, generate) land with their phases.
- Replace each `mocks.ts` with real data in its phase; screens shouldn't need restructuring.
- Charts are simple Views/SVG; move to Victory Native in Phase 7 if richer interaction is needed.
- The Feed tab's "+ Post" lives in the story row; a header action per sub-tab isn't supported by TopTabsNavigator yet.

### Session 3 — 2026-10-06 — Rank system design

**Built**

- `docs/RANK_SYSTEM.md`: the full rank system. Strength Score on the DOTS scale, tier floors calibrated to real strength standards, kg-per-rank tables (men 60/75/90 kg, women 55/70 kg), overall, muscle and discipline ranks, rank keeping, anti-stagnation and anti-cheat hooks.
- `src/lib/game/strength.ts`: reference implementation (DOTS, Epley e1RM capped at 12 reps, lift shares, bodyweight-ratio standards for pull-ups/chin-ups/dips, ladder, `rankForScore`, `loadForScore` for predictions, record fade, overall score), exported from `@/lib/game`. Tests pin the calibration: common standards land on the intended tiers and world-record lifts are Champion.
- Rank, Friends, Profile and Home mocks re-derived from the model for a 72 kg man (overall Platinum III, SS 319). "Power score" renamed "Strength score" (SS) on the Rank and Leaderboards screens.

**Decisions**

- Kept the 8 tiers and names (the Gen Z rename was dropped). Iron to Diamond keep 4 divisions; Master and Champion have none and are absolute thresholds, not percentiles (percentiles mean little with a small user base).
- Pound for pound via DOTS with men's and women's standards; no age adjustment at launch.
- Strength rank measures strength only. Effort is rewarded by XP and leagues, which never use absolute strength.
- Sets are scored at bodyweight on the day; records fade after a year (−1%/month, floor 75%); peak rank is kept.
- Only free-weight and bodyweight lifts rank; machines earn XP, volume and records.
- Resolved Open decisions #2, #3 and #4. #13 now also covers how onboarding asks for strength standards.

**Follow-ups**

- Calibrate lift shares and bodyweight ratios against OpenPowerlifting and beta data before launch (Phase 6).
- Write the calisthenics rep and skill tables (Phase 6).
- Mirror `strength.ts` in Postgres for the rank engine, with the same test cases (Phase 6).
- Onboarding (Phase 1) needs bodyweight and the standards choice; weigh-ins need a home (profile or logging).

**Next (Phase 1, Backend, auth, onboarding)**: unchanged; resolve #12 and #13 first.

### Session 4 — 2026-10-06 — Phase 1 Backend, auth, onboarding

**Built**

- Supabase: `config.toml` (redirect URLs, 6-digit OTP, code email template, Google provider off locally), migration `20261006120000_profiles_settings_bodyweight.sql`, pgTAP tests in `supabase/tests/database/`, generated `src/types/database.ts`. Scripts `db:start|stop|reset|test|types|types:remote|push`.
- `src/lib`: `units.ts`; `auth/` (chunked SecureStore storage, auth store, `useAuthBootstrap`, `useAuthGate`, `signOut`); `profile/` (options, zod schemas, `useProfile`, `useUpdateProfile`, bodyweight hooks, `useUsernameAvailability`, `suggestUsername`, offline onboarded cache); `forms/useZodForm`; `useDebouncedValue`. Typed Supabase client with PKCE.
- Auth feature: Welcome (Google + email; Apple removed; dev preview when .env is missing), email and code screens (CodeInput, resend cooldown, friendly errors), Google flow, `app/auth/callback`.
- Profile feature: onboarding (8 step screens, `OnboardingLayout`, per-step save that skips unchanged values, no duplicate weigh-ins on back/forward), `ReadyScreen`, `EditProfileScreen` (sections, live username check, bodyweight logger), Units / Privacy / Account settings, real identity in the profile header and settings list.
- Shared: `OptionCard` (+ `wide`) and `StepProgress` moved to `src/components`; plan goals moved to `@/lib/profile` and Create plan preselects the profile goal; `Screen` `avoidKeyboard`.
- `pnpm check` passes (54 tests). `pnpm db:test` passes (47).

**Decisions**

- See PRODUCT_SPEC.md §10B. Hosted Supabase for phones + local Docker for development. Apple sign-in deferred (#23). Minimum age 13; 13–17 consent open (#13). "Rather not say" ranks on men's standards. Visibility default `friends`; identity always visible to signed-in users.
- Google uses Supabase's web OAuth in a browser sheet, not the native Google SDK (not in Expo Go).
- Sessions are chunked across SecureStore keys (sessions exceed the ~2 KB limit) rather than adding an encryption library.
- The gate caches "onboarded" per user in expo-sqlite kv-store so the app opens offline.
- Approved additions: expo-auth-session, expo-web-browser, expo-crypto, expo-secure-store, zod, supabase (CLI).

**Follow-ups**

- User steps in the Phase 1 checklist (hosted project, Google client, real-phone test).
- Sync `user_settings.theme` with the theme store, and use `rest_timer_default_sec` / plates in Phase 4 / 11.
- Age brackets (#22) for leaderboards; country picker (#24).
- `public_profile_cards` and `are_friends()` get real friendships in Phase 10.
- In the simulator, a tap right after typing sometimes didn't register; check on a real phone that the footer button responds on the first tap with the keyboard open.

**Next (Phase 2, Exercise library)**: resolve open decision #15 (source, licensing, media, muscle taxonomy) first.

### Session 5 — 2026-10-06/07 — Phase 2 Exercise library

**Built**

- Taxonomy, rank keys, schema, generated library migration, pgTAP tests, local SQLite mirror, sync, search and UI as listed under Phase 2 above.
- `supabase/seed/`: `define.ts` (seed shape + defaults), `exercises/*.ts` (data by region), `validate.ts` (shared checks), `build.ts` (Node 26 runs it natively; writes the migration). The generated SQL is deterministic.
- `src/lib/exercises/` (shared model: taxonomy, types, api, repository, sync, search, hooks, picker) and `src/features/exercises/` (screens, browser, filters, form); routes under `app/exercises/`.

**Decisions** (PRODUCT_SPEC.md §10C)

- Machines stay unranked (kept the session-3 decision over the Phase 2 brief); 32 rank keys, standards for 15 of them land in Phase 6.
- The official library ships as a generated migration per version, so production gets it through `db:push`.
- free-exercise-db (Unlicense) used as a reference only; no images (licence unclear). New open decision #25 for media.
- Search is in-memory over the SQLite copy (no fuzzy-search dependency). The picker is a route resolved through `useExercisePicker()`.
- Custom exercises need a connection until the Phase 4 sync queue; they're private and never rank.
- Approved additions: `babel-plugin-inline-import` (Drizzle migrations), `@types/node` (seed generator types).

**Follow-ups**

- Move rank/home mocks and the body map from the 13 coarse muscle ids to the new keys (Phase 7/8).
- Archive (not delete) exercises dropped from a future library version; deleting custom exercises should become archiving once routines and logs reference them (Phase 3/4).
- Offline custom-exercise creation through the Phase 4 sync queue; a Settings toggle to show the neck.
- Carries log distance and time but not the load; add a weighted-carry log type if people ask.
- Routine builder rows for library exercises could open the detail screen (Phase 3, with the stored routine model).
- Couldn't run a mutation check on the new RLS tests (loosening a policy in the local DB was blocked by the permission classifier); the 43 tests do cover reads and writes by another user and anon.

**Next (Phase 3, Routine builder)**: persist routines (Supabase + local), set types, supersets, targets, RIR/RPE, rest timers, notes, reorder; reuse `useExercisePicker`.

### Session 6 — 2026-10-07 — Phase 3 Routine builder

**Built**

- Everything in the Phase 3 checklist above: schema + RLS + RPC + pgTAP, the shared routine model, local mirror and outbox sync, hub, editor, reorder and starter screens, Training settings, `ReorderList` and `Toast`.
- Retired the routine mocks (the mock live session keeps its own until Phase 4). `SetTypeBadge` and `SetCell` now take the real set types; cells commit on blur as one undo step.

**Decisions** (PRODUCT_SPEC.md §10D)

- Routine colour = a rank hue as a small mark; starter routines bundled in the app; reorder via an in-house reorder mode; explicit Save with autosaved drafts.
- `@shopify/flash-list` and `expo-haptics` approved (haptics pulled forward from Phase 4).
- Whole-routine sync through `save_routine()`; pending local changes win, otherwise last push wins; deletions detected by comparing id lists (no tombstones).

**Gotchas found**

- Inputs must commit `e.nativeEvent.text` on end-editing: React state can lag when typing and blur land together (a typed 85% was lost before this).
- RNTL 14: `fireEvent` is async too (`await fireEvent(...)`), or later renders in the same file come back empty.
- FlashList 2.0.2's own `jestSetup` swaps in a `RecyclerView` export that doesn't exist; `jest.setup.ts` mocks only its layout measuring.
- A `flex-1` Card inside a FlashList header collapses; put the flex on a plain wrapper View.
- Supabase errors are plain objects, not `Error`s (`String(e)` gives `[object Object]`).
- Official exercise ids are random per database (the upsert keeps them stable per database). A device that synced its library from one Supabase project can't push routines to another until its library is re-downloaded: clear `exercise_library_version` in local `meta` when switching a dev device between local and hosted. Fixed ids derived from the slug would remove this; worth doing before more projects exist.

**Follow-ups**

- Design review leftovers above; Android check (Expo Go isn't on the Pixel_6a emulator yet).
- Phase 4 starts sessions from routines (`useRoutineDoc` + `src/lib/routines` set rules), feeds `exercise_usage` from logged sets, and registers workouts with `src/lib/sync`.
- Deleting a custom exercise that a routine uses fails on the server (FK restrict); show "remove it from N routines first" in the custom-exercise flow.

**Next (Phase 4, Workout logging)**: local-first sessions from a routine or empty, sync queue entities, rest timer, PR detection, random workout.

### Session 7 — 2026-10-07/08 — Phase 4 Workout logging

**Built**

- Everything in the Phase 4 checklist above. New: `src/lib/workouts` (model, repository, queries, api, sync, hooks, prefs, photo), `src/features/workout/session` (store per session, controller, keypad fields, components), `finish/`, `generate/`, `history/`, screens Logging, Finish, Generate, History, Workout detail, Edit workout; routes `app/session/{index,finish}`, `app/workout/generate`, `app/workouts/{index,[id]/index,[id]/edit}`. Retired the mock live session and its components.
- Shared: `SyncStatus`, `useBottomAccessory` (the mini bar's height joins `useTabBarInset()`), keyboard-aware `Sheet`; `normaliseSupersets` and `fixLeadingDrop` are generic so logged workouts reuse them.

**Decisions** (PRODUCT_SPEC.md §10E)

- Writes go only through `save_workout()` (security definer); clients can read and delete. Completed workouts change only by explicit edit, kept as revisions.
- Duration, volume and calories are server values; the client previews the same maths.
- e1RM: lower of Epley and Brzycki for 10-12 reps. Calories: MET x bodyweight x hours (open decision #9 resolved).
- Photos: private bucket, uploaded through the outbox after the workout. Local Supabase now runs Storage (`db:start`).
- Approved additions: expo-keep-awake, expo-notifications (local only), expo-network, expo-image-picker, expo-file-system.

**Gotchas found**

- Jest fake timers also fake `performance.now()`: pass `doNotFake: ['performance']` to time anything.
- RNTL 14: end tests with `await act(async () => ...)`; a synchronous `act` in `afterEach` made every later render in the file come back null.
- zsh doesn't split `$VAR` into words; run multi-path greps under `bash -c`.
- Editing a store module under Fast Refresh resets it (dev only); SQLite brings the workout back on relaunch.

**Follow-ups**

- User phone checks and `db:push` above; Android pass.
- Phase 6 fills `is_pr` and the records/rank slot on the finish screen.
- Resume an in-progress workout on another device (drafts already reach the server).
- Offline custom-exercise creation through the outbox (Phase 2 follow-up still open).
- Limit the first history pull on a new device (it downloads every finished workout).

**Next (Phase 5, Plan generator)**: resolve open decision #16 (rules-based templates vs algorithm, progression model) first; plans write `source = 'plan'` routines and `plan_day_id` on workouts.

### Session 8 — 2026-10-08 — Sign-out guard (FINDING-025)

**Built**

- `confirmSignOut()` (`src/lib/auth`): Settings → Account checks the outbox first. Empty: signs out as before. Otherwise a destructive alert ("3 unsynced changes", "2 workouts and 1 routine are saved only on this phone…") with Try to sync first (pushes everything, re-checks, signs out if it all went, asks again with the new count if not), Sign out anyway, Cancel.
- `pendingSummary()` and `summarisePending()` (`src/lib/sync`): outbox counted by kind (a workout and its photo are one change). `flushNow()` in the runner also pushes held-back drafts (`QueueStore.retryNow(now, includeDelayed)`).
- Tests: `confirmSignOut.test.ts` (no prompt when empty, warn copy, cancel, sync then sign out, failed sync re-asks) and a runner test for `flushNow`. 306 Jest, `pnpm check` passes.

**Follow-ups**

- Onboarding's "Not you? Sign out" still signs out directly (no workouts or routines can exist before onboarding finishes).

### Session 9 — 2026-10-08 — Phase 5 Plan generator

**Built**

- Everything in the Phase 5 checklist above. New: `src/lib/plans` (engine, repository, api, sync, hooks, edits, start), `src/features/workout/plan` (draft store, questions, sheets, calendar, volume bars, view model, actions), screens Create plan (rewritten), Preview, Overview, Why, Session; routes `app/plan/{preview,index,why,day/[id]}`; docs/PLAN_ENGINE.md.
- Phase 4 touch points: `PlanSource.planDayId`, `useStartWorkout({ kind: 'planDay' })`, finishing marks the plan day done and refreshes plan queries; the generator's technical-move list is exported as `TECHNICAL_SLUGS`; the sign-out warning counts plans.

**Decisions** (PRODUCT_SPEC.md §10F)

- Engine and data in `src/lib/plans` (the brief asked for `src/features/plans/engine`; moved to lib so the Workout hub, logger and sync can use it without cross-feature imports). Plan UI lives in the Workout feature.
- One routine per session type plus a deload copy, shared across weeks; edits ask "just this session" (fork) or "every week".
- Time wins over volume; shortfalls are explained. Mon–Sun weeks with a this-week/next-Monday start.
- Volume counting: 1 set for the main muscle, 0.5 for other primaries, library weight for helpers; front delts as press helpers don't count towards shoulders (they crowded out chest work at a beginner's 10-set ceiling).
- `plan_weeks` added (the brief's output listed it); pausing is `plans.paused_at`; `moved` days keep `original_date`. `workouts.plan_day_id` stays without a foreign key (offline order); triggers handle ownership and done marking.
- Resolved open decision #16 (rules-based; linear for beginners, double progression otherwise).

**Gotchas found**

- A device whose exercise library came from another Supabase project pushes routines with exercise ids the server doesn't have (RLS error on `routine_exercises`). Clearing `exercise_library_version` in local `meta` re-downloads it (the Phase 3 gotcha again; slug-derived ids would end it).
- iOS can't open a second modal while one is closing: the swap sheet asks the scope inside itself instead of opening a second sheet.
- Plan writes queue routines; `registerPlanSync()` now registers routine sync too, so a plan screen opened from a link (before the tabs mount) still pushes them first.
- The simulator drops very short synthetic taps; Expo bound to IPv6 only with `--host localhost` (use the LAN address).
- Typed routes only update when the dev server runs; start it once after adding route files.

**Follow-ups**

- User steps above; Android pass.
- Deleting a finished planned workout leaves its day `done` (no foreign key to undo it).
- A swapped-in exercise from the library keeps the slot's sets; it isn't re-fitted to the time budget.
- Plan routines edited in the routine builder aren't blocked (they're hidden from the list, but a deep link would open them).
- Week-1 volume shows as a part week; consider showing the full-week plan volume next to it.
- Phase 6 (rank engine) can read planned vs done sessions for adherence XP later (Phase 11).

**Next (Phase 6, Rank engine)**: mirror `src/lib/game/strength.ts` in Postgres, compute lift, muscle, overall and discipline ranks from logged sets, fill `is_pr`, and the records/rank slot on the finish screen.

### Session 10 — 2026-10-08/09 — Phase 6 Rank engine

**Built**

- Everything in the Phase 6 checklist above. New: `src/lib/game/engine/`, `src/lib/ranks/`, `src/features/workout/rewards/`, `RewardsScreen` + `app/session/rewards.tsx`, `supabase/seed/{standards.ts,standards/,buildStandards.ts,fakeUsers.ts,buildFakeUsers.ts}`, migrations (rank engine, library v2, standards v1), pgTAP 07 and 08. Retired `strength.ts` and `RewardsPlaceholder`.

**Decisions** (PRODUCT_SPEC.md §10G)

- Followed the brief over the 2026-10-06 model (confirmed with the user): 0–1000 Rank Score from a standards table, III–I divisions (Master too), 1–10 rep e1RM (mean of Epley and Brzycki), region-weighted overall with placement, "rather not say" = average of both curves.
- The 180-day window counts back from the latest set of each lift, not today, so "no score loss while inactive" holds. Inactive after 60 days.
- Age factors: under 16 ×1.15, 16–17 ×1.06, 18–34 ×1, 35–39 ×1.02, 40–49 ×1.08, 50–59 ×1.18, 60+ ×1.32 (open decision #22 narrowed to leaderboard brackets).
- Machines stay unranked; pull-ups, chin-ups and dips are Calisthenics.
- Postgres only (no Edge Function): scoring runs inside `save_workout` (a failure queues a job, never blocks a save); deletes, weigh-ins, profile changes and new standards go through `rank_jobs` + pg_cron.
- Standards anchors were eased after the fake-user check: the 2026-10-06 floors put most 1–2 year lifters in Silver.
- First time on an exercise is a baseline, not a PR; records rebuilt in full on every recompute.
- Anchors double as tier floors; piecewise-linear interpolation (exactly invertible for predictions); bodyweight bands blended between centres.

**Gotchas found**

- Temp tables are never auto-analyzed, and freshly inserted rows have no stats either: one recompute took 60–130 s on unanalyzed data (a quadratic `is_pr` update) and 30 ms after fixing it (`analyze` on the engine's temp tables, a narrower update).
- Generated migrations take the current UTC time, which can sort before a hand-written one named later in the day: check the order after `standards:build` and `exercises:build`.
- Metro resolves the engine's `.ts`-extension imports fine (the app bundles and runs in Expo Go).
- Expo Go's floating gear can cover header buttons (Finish); drag it away in the simulator.
- An env var set when starting Expo overrides `.env`, which is handy for pointing the simulator at local Supabase without editing `.env`.

**Follow-ups**

- User steps above (`db:push`, phone check).
- Phase 7 reads `get_ranks`, `rank_snapshots` (progression chart), `rank_events` (rank-ups by weekday), `personal_records` (Records tab) and `get_rank_predictions` (Analysis), and replaces `src/features/rank/mocks.ts`. Peak-rank badge from the history.
- Phase 13: review tools for `rank_flags`, video verification for Master and Champion, outlier checks.
- XP (`xp_placeholder`) in Phase 11.

**Next (Phase 7, Rank tab)**: My Ranks, Body Map, Leagues (open decision #6 first), Analysis, Records on real data; add Victory Native + Skia.

### Session 11 — 2026-10-09 — Phase 7 artwork and licensed anatomy

**Scope completed**

- Eight original transparent rank masters (Iron through Champion), plus four distinct weekly-league emblems (Rookie, Contender, Elite, Legend). Central registry, reusable `LeagueBadge`, accessible labels, live SVG division pips; no divisions on Champion. Existing theme palette used for art direction; no product colours or fonts added.
- Replaced provisional Rank body shapes with MIT-licensed male/female front/back contours from `react-native-body-highlighter`. Full licence, pinned revision, import script and canonical mapping notes in `assets/body/`. All 20 canonical muscles represented, optional neck neutral by default. The shared generic `BodyMap` supports values/colour scale, selection, press callbacks and zoom for Home/recovery reuse.
- Body Map reads actual ranks through the existing TanStack Query hook. Added skeleton, retry, unranked teaching copy, legend, cosmetic outline toggle, grouped accessible muscle rows and rank sheet. Corrected female cropping and reversed right glute/abductor fragment order after rendering.
- Repaired the incomplete overview/discipline prop integration, reduced long hero labels to the existing display token, and removed mock tier-strip highlighting. Explicit preview labels now distinguish unfinished progression/lifts/analysis/leagues from queried ranks. Removed dead league event buttons and Phase 12B community mock from the Phase 7 Leagues screen; standings consistently say LP.
- Review board: `docs/design/artwork/preview.html`; contact sheet: `emblems-review.png`; anatomy board: `anatomy-review.svg`; generation brief: `PROMPTS.md`. Provenance in `docs/CREDITS.md`. Root design rules updated and `docs/MOBILE-DESIGN.md` links to them.

**Design review**

Applied `mobile-taste` and `mobile-design-review` to My Ranks, Body Map, Leagues, Analysis and changed shared art. Static + rendered asset review; native authenticated screens were not reached. High findings 026–027 fixed. Full evidence and mechanical score calculation in `docs/design/artwork/REVIEW.md`; prior Phase 4 baseline retained in `design-baseline.json`.

Remaining findings (all medium): 028 base segmented controls are 40pt; 029 chest/deltoid partitions and hip abductors are schematic; 030 full-resolution masters need production sizing/memory checks; 031 several Phase 7 sections are still labelled examples; 032 muscle contributing lifts/weakest-link sheet content remains; 033 sample progression chart needs real data, three-division semantics and token label sizing.

**Validation**

- Focused artwork/anatomy tests: 13 passing (all tiers/divisions, both canonical maps, fragment fill/press behavior, chart accessibility). Full `pnpm check` passed: TypeScript, ESLint, formatting, 49 Jest suites / 526 tests / 20 snapshots. Existing workout-editor gesture worklet warnings remain in Jest output; no failed checks.
- All masters verified as transparent RGBA, 1254 × 1254. Dark/light contact sheets and all four anatomy contours visually inspected. No generated masters edited after generation.
- Not verified: authenticated native screens, pinch/pan, VoiceOver, large text, Android, low-end bitmap decoding/scroll performance. The simulator was signed out; local browser file previews were blocked by browser policy, so inspection used rendered asset boards.

**Phase 7 remains in progress**

This pass completes design assets and anatomy integration, not the original full Phase 7 brief. Continue the existing dirty Phase 7 work: wire progression/lift detail/analysis/records to real queries; contributing-lift/weakest-link details; weekly LP formula and scheduler, promotion/demotion/results, custom leagues, challenges, seasons/rewards/recap, create/join/history/chat placeholder. The `leagues:simulate` script currently references an absent `simulateLeagues.ts`; a seeded 50-user weekly-cycle simulation is **not yet verified or complete**. No backend migrations or league scoring were changed in this artwork pass.

### Session 12 — 2026-10-09 — Phase 8 Home For You

**Built and verified**

- Implemented the four insights destinations, Home summaries, persistent goals, recovery model/settings, weigh-in flow and opt-in goal milestones. Added owner-protected Postgres aggregate/goal functions, device cache and tests. Details and arithmetic checks are in the Phase 8 checklist above.
- Reused the Phase 7 BodyMap, existing fonts/theme tokens and base components; extended shared controls for guidance bands, accessible targets, refresh and reduced motion. Updated PRODUCT_SPEC, SCHEMA, RECOVERY_MODEL, MOBILE-DESIGN and the design-review baseline. Existing dirty Phase 7 work was preserved; no commit was created.

**Preview correction and startup investigation**

- The user clarified there is no account. My initial sign-in-only insights state removed the existing development preview entry points; corrected it to actual SQLite data and device-only goals/weigh-ins/settings. No sign-in is needed to open the current development preview.
- Investigated the reported failure to open, including the earlier ExpoAsset error and native Expo Go crash reports. Restarted the existing Metro server with a cleared cache, connected Expo Go to the fresh bundle, and verified Home and detail navigation. Two native crash reports from earlier editing remain diagnostic evidence; this is not a claim that every hot reload is stable.
- Native goal creation, completion, one celebration and archive were exercised. UI checks used an empty account-free device; database/SQLite arithmetic uses isolated test fixtures, never presented as the user’s logged workouts.

**Next**

- Finish Phase 8 acceptance with real logged workouts, hosted migrations and the Phase 7 league standing dependency. Carry the explicit design/device follow-ups above. Local migrations were applied without a reset; the reset was rejected by automatic approval review for data-loss risk.

### Session 13 — 2026-10-09 — Phase 7 handoff and backend audit

- Read the previous “Build rank tab and leagues UI” chat. That pass completed badges/licensed anatomy and explicitly left the full leagues backend pending. Confirmed the original Phase 7 requirement was larger than the completed artwork scope.
- Confirmed implementation gaps in files: mock Leagues/Records and progression/analysis sections, empty league seed, absent league simulation script and absent league backend migration/Edge Function. These are missing engineering work, not a consequence of the user forgetting a sync command.
- Checked the installed CLI's deployment/login/link commands. A hosted `db push --dry-run` stopped at `AccessTokenRequiredError`; no hosted data changed. Added `docs/BACKEND_SETUP.md` with the exact deployment, app sign-in/sync verification and local migration commands, plus the missing-feature limitations. No app code changed in this audit.

### Session 14 — 2026-10-09 — Phase 7 completion (after the Codex pass)

**Audit of the uncommitted tree**

Codex's work while the earlier chat was paused:

- Phase 7 art: raster rank masters, league emblems and licensed anatomy in `BodyMap`.
- Most of Phase 8.
- Phase 7 data wiring was left unfinished. There was no leagues backend, and `leagues:simulate` pointed at a missing script.

Inconsistencies found and fixed:

- dead interim SVG badges
- Rank mocks still imported, and the mock chart left in place
- a "League standing unavailable" chip on Home
- MOBILE-DESIGN still said IV → I
- BACKEND_SETUP still described Phase 7 as missing
- test 09's percentile cohort broke once the dev seed existed (it now uses a lift the seed never trains)

**Built**: everything in the Phase 7 checklist above.

**Decisions** (PRODUCT_SPEC.md §10H; with the user at the start of the phase):

- pg_cron and SQL instead of an Edge Function.
- Results in the app plus a local reminder.
- Auto-placement for anyone active in the last 14 days.
- The whole phase built in milestones.
- LP never uses absolute strength.
- The volume scoring of custom leagues is the one opt-in exception.

**Gotchas**:

- `position` is reserved in Postgres (`returns table(... position ...)` fails); the ranking column is `place`.
- STABLE plpgsql can't create temp tables at runtime.
- In plpgsql a record variable named like a table alias makes columns ambiguous.
- Thousands of engine runs in one DO block exhaust the lock table: commit per workout.
- Fake-user ids from different scripts must not share a hash namespace.
- `league_now()` (a GUC) is how a test looks at a future week, since `now()` is fixed per transaction.
- Never `db:reset` to iterate on league SQL (it wipes the seed): tear down the league objects and run `supabase migration up --local`, or `create or replace` the function.
- RNTL 14 has no `UNSAFE_` queries: give SVG paths a testID.
- Jest mock factories may only touch `mock*` variables.
- Expo typed routes regenerate only while Metro runs.

**Follow-ups**:

- The user steps above (`db:push`, phone checks, Android chart performance).
- Peak-rank badges move to Phase 11.
- Push notifications for results arrive in Phase 12.
- Community leagues and battles arrive in Phase 12B (`community_id` is ready).
- Smaller production derivatives of the 1254px rank PNGs (12 MB of art in the bundle; Codex finding 030).

**Next**: finish Phase 8 acceptance (real logged workouts, hosted migrations), then Phase 9.

### Session 15 — 2026-10-10 — Phase 9 Feed and Discover

**Built**: everything in the Phase 9 checklist above, planned first (plan approved by the user) and built in milestones: social SQL and pgTAP, read RPCs and the ranking doc, `src/lib/social`, Feed and post detail, composer and milestone sharing, Discover / profile / Friends hub, notifications and Realtime, copy workout, dev seed and the acceptance script, then a simulator walkthrough and design review.

**Decisions** (PRODUCT_SPEC §10I): with the user: Friends requests and list real now; `expo-image` and `expo-image-manipulator` approved; goal and experience never printed on cards. Derived from existing rules: the more restrictive of post and profile visibility wins; a private workout gets no post; milestone sharing defaults to "Ask me"; reports are stored and reviewed in Phase 13.

**Gotchas**:

- A trigger on `workouts` fires before `save_workout` writes the sets; the summary is rebuilt when `refresh_workout_totals` updates the row and again when `workout_rewards` is written.
- `personal_records` ids are rebuilt on every recompute, so milestone keys are content-based.
- Realtime `postgres_changes` delivers nothing until the socket carries the user's token: call `realtime.setAuth(session.access_token)` before subscribing (`subscribeAs` in `lib/social/hooks.ts`).
- `db:start` used to exclude Realtime; it now runs locally.
- pgTAP runs against the live local database, so assertions about "everything visible" must be scoped to the test's own rows once the dev seed has public posts.
- `flex-1` on a pressable `Card` collapses its height (PressableScale's wrapper is a column); put `flex-1` on a wrapping View.
- The routine editor treated a never-saved routine with a draft as "not found"; it now opens it as a new routine (needed by Copy → builder).
- Expo typed routes regenerate only while Metro runs; start it briefly after adding routes.

**Follow-ups**: the open checklist items and design findings above; Phase 10 (search, invites, leaderboards) builds on `search_profiles`, `get_friends` and the graph RPCs.

**Next**: Phase 10. Phase 8 and Phase 9 keep their user and device steps open.

### Session 16 — 2026-10-10 — Project integrity audit and hardening

- Audited the current working tree while preserving the pre-existing changes. Full findings and
  remaining risks: [INTEGRITY_AUDIT.md](INTEGRITY_AUDIT.md).
- Fixed truncated sync listings, unauthenticated preview pushes, retry cancellation, stale pulls,
  sign-out/account-switch cleanup ordering, leftover private caches and in-memory workout drafts.
- Exercise caches now record backend identity. Database types generate atomically, with a drift
  check and a verified failure-preservation case. Removed the unreferenced legacy Home mock cards.
- Added root setup documentation, integrity/SQLite replay checks and GitHub CI. Aligned package/app
  versions and pinned pnpm. Upgraded the six compatible Expo patches Doctor recommended and aligned
  React DOM, Metro config and test-renderer peers; peer validation now runs in `pnpm check`.
- Local database suite: 607 assertions across 12 files passed. All 15 local migrations are recorded;
  all public tables have RLS and all public security-definer functions pin their search path.
- Hosted dry run: every migration deployed, no push required. First remote test run lost its SSL
  connection during rank tests after 272 assertions; retry could not resolve a usable direct
  database address. Hosted types were read into a temporary file; no migration push/reset occurred.
- Expo Doctor: 21/21 checks pass. Both final Android and iOS production bundles export successfully.
  Generated local types match. Six transitive dependency advisories remain (2 high, 4 moderate);
  upstream fixes/compatibility review and native-device acceptance remain open.
- Final `pnpm check` passed: 67 suites, 629 tests, 20 snapshots, typecheck, lint, formatting, peer checks and integrity checks. CI is defined but has not run on GitHub.
- Foundation is complete. Phases 8/9 retain their acceptance follow-ups; Phase 10 is next feature work
  and was not started by this audit.

### Session 17 — 2026-10-10 — GitHub checkpoint and exercise-picker diagnosis

- Prepared the current project for a GitHub checkpoint, excluding ignored environment files and
  local backend credentials.
- Traced the empty-workout exercise picker to the account-free development bypass: no session
  means `useExerciseLibrarySync` is disabled, so a fresh device has no exercises in SQLite.
- Confirmed the configured hosted backend rejects an anonymous library-version read with HTTP
  401 / Postgres 42501 (permission denied). Being online alone cannot download the library.
- Documented the existing workaround in DEVELOPMENT.md: restart with the auth bypass disabled,
  sign in and download once; the official library remains available from the device cache.
- Follow-up: the library empty state should explain the sign-in requirement; supporting first-run
  account-free exercises would require a separate preview-data or public-library access decision.
- Phase 10 remains next feature work; this session does not change backend access policies.
- Verification: `pnpm check` passed (67 suites, 629 tests, 20 snapshots, plus types, lint,
  formatting, peer dependencies and integrity). No matching private-key/token patterns or files
  over 50 MB were found in the files prepared for this checkpoint.
