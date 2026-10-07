# Progress

Status key: `[x]` done · `[~]` in progress · `[ ]` not started.
Update this file at the end of every session (see CLAUDE.md → Session protocol).

## Phases

- [~] **0 · Foundation**: project, tooling, provisional theme and base components, navigation shell, docs
- [x] **0B · Design system**: final visual identity, restyled base components, game layer ready for rank art and avatars (see `MOBILE-DESIGN.md`)
- [~] **1 · Backend, auth, onboarding**: built and verified locally; waiting on the hosted project + real-phone check (see Phase 1 below)
- [x] **2 · Exercise library**: exercises, muscles taxonomy, equipment, search, local cache
- [~] **3 · Routine builder** (next): routines, set types, supersets, targets, RIR/RPE, rest timers, notes, reorder
- [ ] **4 · Workout logging**: local-first logging (SQLite + Drizzle), sync queue, rest timer, PR detection, empty and random workouts
- [ ] **5 · Plan generator**: goal, level, equipment, length and schedule → multi-week plan
- [ ] **6 · Rank engine**: server-side rank calculation (Postgres / Edge Functions), divisions, history
- [ ] **7 · Rank tab**: My Ranks, Body Map, Leagues, Analysis, Records (+ Victory Native charts)
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
