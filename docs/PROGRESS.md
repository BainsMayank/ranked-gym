# Progress

Status key: `[x]` done · `[~]` in progress · `[ ]` not started.
Update this file at the end of every session (see CLAUDE.md → Session protocol).

## Phases

- [~] **0 · Foundation**: project, tooling, provisional theme and base components, navigation shell, docs
- [x] **0B · Design system**: final visual identity, restyled base components, game layer ready for rank art and avatars (see `MOBILE-DESIGN.md`)
- [~] **1 · Backend, auth, onboarding**: built and verified locally; waiting on the hosted project + real-phone check (see Phase 1 below)
- [x] **2 · Exercise library**: exercises, muscles taxonomy, equipment, search, local cache
- [x] **3 · Routine builder**: routines, set types, supersets, targets, RIR/RPE, rest timers, notes, reorder (Android check left; see Phase 3 below)
- [x] **4 · Workout logging**: local-first logging, sync engine, rest timer, keypad, plates, random workouts, finish summary, history (user phone checks left; see Phase 4 below)
- [x] **5 · Plan generator**: questionnaire → rules-based multi-week plan, My Plan card, overview, edits, planned sessions in the logger (user steps left; see Phase 5 below)
- [x] **6 · Rank engine**: Postgres rank engine, standards tables, PRs, rank history, predictions, rewards on the workout summary (user steps left; see Phase 6 below)
- [~] **7 · Rank tab** (next): My Ranks, Body Map, Leagues, Analysis, Records (+ Victory Native charts)
- [ ] **8 · Home For You**: muscle analysis, recovery, goals, overview
- [ ] **9 · Feed and Discover**: posts, published workouts, likes, comments, copy workout, discovery
- [ ] **10 · Friends and leaderboards**: friends, search, invite and referrals, friend, regional and global boards
- [ ] **11 · Profile, XP, customisation**: XP and levels, badges, customisation, settings, units, export, delete account
- [ ] **12 · Streaks, stakes, notifications**: streaks, stakes among friends, accountability pods, push notifications
- [ ] **12B · Communities and battles**: college, hostel, society and gym communities; inter-community battles
- [ ] **13 · Anti-cheat and moderation**: verification for high ranks, outlier detection, reporting, moderation tools
- [ ] **14 · Polish, offline, performance, testing**: offline hardening, low-end Android performance, a11y audit, test coverage
- [ ] **15 · Launch**: final name and branding, store assets, EAS builds, privacy policy, release

## Phase 0 · Foundation (in progress)

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
- [ ] **User**: supply final rank badge art (register it in `src/components/game/artRegistry.ts`)

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
- [ ] FINDING-003 (medium) `Chip` touch target is 40pt (32 + hitSlop 4); raise hitSlop to 6 in the base component
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
- [ ] **User**: `pnpm db:push` (workouts migration + storage bucket) and `pnpm db:test:remote`; hosted Storage must be enabled
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
- [ ] **User**: `pnpm db:push` (plans migration) and `pnpm db:test:remote`
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
- [ ] **User**: `pnpm db:push` (rank engine, library v2, standards v1; enables pg_cron on the hosted project) and `pnpm db:test:remote`
- [ ] **User**: on a real phone, log a workout, check the reveal and haptic; turn on Reduce Motion and check the reveal is a plain fade (not driven in the simulator)
- [ ] Calibrate standards against OpenPowerlifting and beta data before launch (standards v2)

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
