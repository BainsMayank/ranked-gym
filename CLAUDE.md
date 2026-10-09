# Ranked Gym — engineering guide

> **Ranked Gym** (placeholder name) is a social, ranked gym and self-improvement app for Android and iOS. Every lift earns you a rank from Iron to Champion. You compete with friends, your college and your city, and train together. The launch audience is college students in India; after that, everyone.

## Session protocol (mandatory)

1. **Before planning anything**, read this file, [docs/PRODUCT_SPEC.md](docs/PRODUCT_SPEC.md) and [docs/PROGRESS.md](docs/PROGRESS.md). Before touching the database, read [docs/SCHEMA.md](docs/SCHEMA.md).
2. Work on the phase marked in progress in PROGRESS.md unless the user says otherwise. If something in the spec is ambiguous, check **Open decisions** in PRODUCT_SPEC.md and ask before choosing.
3. Run `pnpm check` before declaring work done. It must pass.
4. **At the end of every session**, update docs/PROGRESS.md: tick finished items, add a session-log entry (what was built, decisions made, follow-ups) and mark the next phase in progress. Record new decisions in PRODUCT_SPEC.md, and move resolved open decisions out of that list.

## Stack (do not deviate without asking the user)

| Concern              | Choice                                                                                                                                                      |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| App                  | Expo SDK 57, React Native 0.86, React 19.2, TypeScript (strict)                                                                                             |
| Routing              | Expo Router 57 (file-based, `app/`). Top sub-tabs use `expo-router/js-top-tabs`, bottom tabs use `expo-router/js-tabs`                                      |
| Styling              | NativeWind 4 (Tailwind 3). Tokens live in `src/theme`                                                                                                       |
| Server state         | TanStack Query 5 (`src/lib/queryClient.ts`, `networkMode: 'offlineFirst'`)                                                                                  |
| Client state         | Zustand 5                                                                                                                                                   |
| Local DB             | expo-sqlite + Drizzle ORM (`src/lib/db`), plus drizzle-kit for migrations                                                                                   |
| Backend              | Supabase (`@supabase/supabase-js`). Postgres, Auth, Storage, Edge Functions                                                                                 |
| Charts               | Victory Native (+ `@shopify/react-native-skia`). **Not installed yet**: add it in Phase 7 with `npx expo install victory-native @shopify/react-native-skia` |
| Graphics             | react-native-svg                                                                                                                                            |
| Animation / gestures | Reanimated 4 (+ react-native-worklets), react-native-gesture-handler                                                                                        |
| Tests                | Jest (`jest-expo` preset) + React Native Testing Library 14                                                                                                 |
| Package manager      | **pnpm** (v12). `nodeLinker: hoisted` in `pnpm-workspace.yaml` is required by Expo                                                                          |

Approved additions to the stack: `react-native-tab-view` and `react-native-pager-view` (needed by swipeable top tabs), `expo-system-ui`, `expo-font` (a peer dependency of `@expo/vector-icons`), `expo-blur` (glass tab bar), `@expo-google-fonts/instrument-sans` (brand font), `expo-auth-session` + `expo-web-browser` + `expo-crypto` (Google sign-in), `expo-secure-store` (sessions), `zod` (form validation), `supabase` (CLI, dev dependency), `babel-plugin-inline-import` (dev; lets Drizzle's local `.sql` migrations be imported), `@types/node` (dev; types for the Node seed generator), `@shopify/flash-list` (long lists), `expo-haptics` (haptics vocabulary in `src/lib/haptics.ts`), `expo-keep-awake` (logging screen), `expo-notifications` (local rest-timer notifications only), `expo-network` (sync on reconnect), `expo-image-picker` + `expo-file-system` (workout photo).

### Expo changes fast: don't trust memory

APIs move between SDKs. SDK 56+ removed `@react-navigation/*` imports, for example: use `expo-router/react-navigation`, `expo-router/js-tabs` and `expo-router/js-top-tabs`. Before using an Expo or RN API you're not sure of, fetch the versioned docs (`https://docs.expo.dev/versions/v57.0.0/`) or `https://docs.expo.dev/llms.txt`.

- **Always** add packages with `npx expo install <pkg>` (it picks SDK-compatible versions). Use `-- -D` for dev deps.
- pnpm 12 blocks dependency build scripts. If an install fails with `ERR_PNPM_IGNORED_BUILDS`, check the package and approve it with `pnpm approve-builds <pkg>` (this writes to `allowBuilds` in `pnpm-workspace.yaml`).
- Must run in **Expo Go**. Only use libraries bundled in Expo Go until we deliberately move to dev builds. Never hand-edit `ios/` or `android/` (they're generated and git-ignored).
- ESLint is pinned to **v9**: `eslint-plugin-react` (used by `eslint-config-expo`) crashes on ESLint 10.
- RNTL 14: `render` and `userEvent` are **async**. Use `await render(...)` and `await user.press(...)`.

## Folder conventions

```
app/                     Routes only (thin files that render a feature screen). Expo Router.
  _layout.tsx            Providers: GestureHandler, SafeArea, QueryClient, ThemeProvider, nav theme
  index.tsx              Redirects to /home
  (tabs)/_layout.tsx     Bottom tabs: Home, Workout, Rank, Friends, Profile (this order)
  (tabs)/home/           Top tabs: index (For You), feed, discover
  (tabs)/workout/        Hub: My Plan, New Workout, Routines
  (tabs)/rank/           Top tabs: index (Ranks), body-map (Body), leagues, analysis, records
  (tabs)/friends/        Stack: index (hub with invite), leaderboards
  (tabs)/profile/        Stack: index, edit, settings/index, settings/[section]
  plan/                  new (questionnaire), preview, index (overview: calendar, volume), why, day/[id] (session: start, swap, move, regenerate, skip)
  routine/[id].tsx       Routine editor (full screen; id 'new' creates one)
  routines/              reorder (drag routines across folders), templates (starter routines)
  session/               Live workout: index (logging, slides up), finish (summary), rewards (PRs + rank changes after Save)
  workout/generate.tsx   Random workout generator (live preview, reroll)
  workouts/              History (index), [id]/index (detail, deep-linkable), [id]/edit (edit a finished workout)
  exercises/             Library (index), picker (pick, slides up), detail ([id]), create/edit custom (new, ?id= / ?name=)
  (auth)/                Signed-out stack: welcome, sign-in/email, sign-in/code
  onboarding/            8 onboarding steps (name … privacy); ready.tsx is the "You're in" screen after it
  auth/callback.tsx      Google OAuth return deep link (redirects to the gate)
  dev/components.tsx     Component gallery (redirects home when !__DEV__)
src/
  components/            Shared, feature-agnostic UI (barrel: '@/components')
    navigation/          TopTabsNavigator (swipeable route tabs using our TopTabs bar), GlassTabBarBackground
    game/                Game layer UI: RankBadge, DivisionLadder, RankGlow, artRegistry (final art slots)
  features/<feature>/    Everything for one feature: screens/, components/, hooks/, api/, store.ts, types.ts
  lib/                   supabase.ts (typed client), queryClient.ts, units.ts, db/ (Drizzle client, schema, ensureDb migrations), utils/
    exercises/           Exercise library: taxonomy (muscles, regions, enums), types, search, SQLite repository, sync, hooks, useExercisePicker
    routines/            Routine model shared by Phases 3–5: taxonomy, types, set rules, duration, warm-ups, summary, parse, validate, templates, SQLite repository, Supabase api, sync, hooks
    workouts/            Workout model: types, 1RM, plates, calories, summary, session building, set flow, deviation, generator/, SQLite repository + queries, Supabase api, sync, hooks, prefs, photo
    plans/               Plan generator: engine/ (pure: splits, schedule, selection, fitter, progression, deload, calendar, explanation; see docs/PLAN_ENGINE.md), SQLite repository, Supabase api, sync, hooks, edits (swap/regenerate scope), start (planned session → logger)
    sync/                Outbox (sync_queue), runner (backoff, retry timer, reconnect), status store; entities register push handlers
    auth/                Session storage (SecureStore), auth store, bootstrap, gate (useAuthGate), signOut
    profile/             Option lists, zod field schemas, useProfile / useUpdateProfile, bodyweight, username check
    forms/               useZodForm (text forms validated by zod)
    game/                Rank model shared by features (divisions III–I, labels, ordering), rankKeys, engine/ (TypeScript mirror of the Postgres rank engine; see docs/RANK_SYSTEM.md)
    ranks/               Server rank results: parsers, api, hooks (useWorkoutRewards, useRanks, useRankPredictions), display formatting
  theme/                 tokens.ts (single source of truth), displayColor (Expo Go fix), ThemeProvider, themeStore
  types/                 Global/ambient types; database.ts is generated (pnpm db:types), never hand-edited
supabase/                config.toml, migrations/, tests/database/ (pgTAP), templates/ (auth emails), functions/, seed.sql,
                         seed/ (official exercise library, strength standards and 50 fake lifters: source + validate + build → generated migrations/tests)
drizzle/                 Generated local SQLite migrations (pnpm db:local:generate), never hand-edited
docs/                    PRODUCT_SPEC.md, PROGRESS.md, SCHEMA.md, RANK_SYSTEM.md, PLAN_ENGINE.md, CREDITS.md, design/ (references, system-preview.html)
MOBILE-DESIGN.md         Approved design system: rules, risks, game layer
```

- Import with the `@/` alias (maps to `src/`).
- Route files never hold logic: `export default SomeScreen` imported from `@/features/...`.
- A component used by two or more features moves to `src/components`. Otherwise it stays in its feature folder.
- Tests sit next to the code in `__tests__/` folders, named `*.test.ts(x)`.

## Coding rules

- **Strict types, no `any`** (ESLint error). Prefer `unknown` plus narrowing, discriminated unions and `as const` arrays with derived union types.
- **Small components**: one component per file, about 150 lines at most. Split when it grows.
- **Feature folders**: no cross-feature deep imports. Share through `src/components` or `src/lib`.
- **Database changes only through migrations** (`supabase migration new <name>`), never the dashboard. Every table gets RLS with explicit per-command policies and narrowed grants, plus pgTAP tests proving another user can't read or change it. After a migration: `pnpm db:reset`, `pnpm db:test`, `pnpm db:types`, and update docs/SCHEMA.md.
- **Server-trusted calculations live in Postgres (SQL functions, RLS, triggers) or Supabase Edge Functions.** This covers ranks, XP, levels, leaderboards, league results, streak stakes, referral rewards and anti-cheat. The client may _preview_ a value, but the server is the source of truth and never accepts a client-computed rank or score.
- **Local-first workout logging**: an active workout writes to SQLite (Drizzle) first and syncs to Supabase in the background through a queue. Logging must work fully offline.
- **Accessibility**: every touchable has `accessibilityRole` and an `accessibilityLabel`. `IconButton` makes the label a required prop. Custom controls need `accessibilityState` and `accessibilityValue`. Touch targets should be at least 44pt (use `hitSlop` when visually smaller). Respect reduced motion (`useReducedMotion`).
- **No hard-coded colours outside `src/theme`**. This is enforced by ESLint (`no-restricted-syntax`). It bans hex/rgb literals, Tailwind palette classes (`bg-red-500`, `text-white`) and arbitrary colours (`bg-[#…]`). Use theme classes or `useTheme().colors` / `rankColors`.
- UI copy is short, friendly and in Indian English. Units default to kg.
- Don't commit secrets. `.env` is git-ignored, and only `.env.example` is committed.

## Theme and design system

> **Read [MOBILE-DESIGN.md](MOBILE-DESIGN.md) before any UI work.** It holds the approved system (Phase 0B), its rules and the game layer. [src/theme/README.md](src/theme/README.md) explains how to change values. Change token _values_ freely; don't rename token _keys_ or bake visual values into components without updating both files.

- **Calm chrome, loud rewards**: chrome is near-black neutrals plus one orange signal colour (`primary`). Saturated colour is only for game objects (`rankColors`, `rarityColors`).
- `src/theme/tokens.ts` defines the colour tokens `background, surface, surfaceRaised, border, edge, text, textMuted, primary, onPrimary, success, warning, streak, danger, onDanger, scrim` for **dark** (default) and **light**. It also defines `rankColors` and `rarityColors` (base, highlight, on), `spacing` (4pt: xxs 2 … xxxl 48), `typography` (hero, display, title, heading, subheading, body, label, caption, overline), `fontFamilies` (Instrument Sans), `radius` (sm 6, md 12, lg 20, xl 28), `shadows`, `motion` and `glass`.
- **Import colours from `@/theme`, never from `tokens.ts` directly.** `@/theme` corrects for Expo Go on iOS reading hex as Display P3 (`src/theme/displayColor.ts`).
- Tailwind classes map to the tokens through CSS variables that `ThemeProvider` sets, so one class works in both schemes. Examples: `bg-background`, `bg-surface`, `border-edge`, `text-text`, `text-text-muted`, `bg-primary`, `p-lg`, `gap-sm`, `rounded-md`, `text-heading`. Numeric spacing also works (`p-4` = 16px). For rank colours use `rankColors` in `style` (the static `bg-rank-*` classes skip the Expo Go correction).
- Use `<Text variant tone numeric>`. It applies the font family per weight, so never set `fontWeight` or `fontFamily` by hand. Use `numeric` for changing numbers (tabular figures).
- Use `useTheme()` for raw values (icon colours, SVG, navigator options, Reanimated styles). NativeWind `className` doesn't style Reanimated `Animated.View`, so pass theme values through `style` there.
- New touchables use `PressableScale` (spring press feedback, reduced-motion aware).
- Use `useThemeStore` for the mode: `dark | light | system`, default `dark`. Persistence is planned for Phase 11.
- Use Reanimated shared values via `.get()` and `.set()`, not `.value`. The React Compiler lint rules flag `.value` mutation.
- Screens inside the tabs must use `Screen` (or pad by `useTabBarInset()`), because the glass tab bar (and the workout mini bar above it) float over content.
- **Game layer**: rank model in `src/lib/game` (`rankLabel`, `compareRanks`, `rankFromServer`, divisions III–I, Champion undivided). How ranks are earned is specified in [docs/RANK_SYSTEM.md](docs/RANK_SYSTEM.md). Final rank art and avatar frames are registered in `src/components/game/artRegistry.ts`, never hard-coded in screens.
- **Ranks**: computed only in Postgres (`rank_recompute_user`, run by `save_workout` and pg_cron jobs); read them through `@/lib/ranks` (`useWorkoutRewards`, `useRanks`, `useRankPredictions`). `src/lib/game/engine` mirrors the SQL rules in TypeScript for tests, previews and the fake-user check: change both together, then `pnpm ranks:fake` (the generated `08_rank_distribution` test fails if they disagree). Rebalance standards in `supabase/seed/standards.ts` + `pnpm standards:build` (bump `STANDARDS_VERSION`); never edit the generated migration. Engine files must stay free of RN and `@/` imports (Node runs them) and import siblings with `.ts` extensions.
- Base components (`@/components`): Screen (title, `onBack`, pinned `footer`), SyncStatus (sync cloud), Text, Button (primary, accent, secondary, outline, ghost, destructive), Card, IconButton, Icon, Chip, Tag, Input, SelectField, NumberStepper, Sheet, EmptyState, Skeleton, Avatar, ProgressBar, SegmentedControl, TopTabs (segmented), SectionHeader, Stat, ListGroup + ListItem, BarChart, PressableScale, OptionCard (radio tile; `wide` for rows), StepProgress, PlaceholderScreen. `Screen` takes `avoidKeyboard` for forms. Game components: RankBadge, RankTag, HexEmblem, DivisionLadder, RankGlow, LeaderboardRow, BadgeTile, StreakChip. See them at `/dev/components` (Profile → Component gallery in dev builds).
- **Exercises**: take muscle keys, equipment and log types from `@/lib/exercises` (never free-text muscle names). Pick exercises with `useExercisePicker()` (`await pick({ multiple: true })`), read the library with `useExercises()` / `useExercise(id)` (local SQLite, works offline). The official library changes only through `supabase/seed/` + `pnpm exercises:build`.
- **Routines**: read and write through `@/lib/routines` hooks (local SQLite first; every write queues a push). Set-type rules live in `setRules.ts` (warm-ups never count); never re-derive them in screens. The editor (`src/features/workout/editor`) keeps its working copy in a Zustand store: apply edits with `editRoutine(action)` so each is one undo step and supersets stay valid.
- **Workouts**: the live session is a Zustand store per session (`src/features/workout/session/store.ts`; `activeSession` for the workout in progress, `createSessionStore('edit')` for editing history). Edit it with the pure actions in `session/actions.ts` via `store.getState().apply(...)`; tick through `tickSet` (controller) so rest, superset focus and haptics stay consistent. Persistence, rest timers and notifications live in `session/controller.ts`; never write workout rows from screens. Start sessions with `useStartWorkout()` (one in progress at a time). Server totals (duration, volume, calories) and `is_pr` come from Postgres; the client only previews.
- **Plans**: generate with `generatePlan()` from `@/lib/plans` (pure; same answers + seed = same plan) and lay out dates with `schedulePlan()`; rules live in docs/PLAN_ENGINE.md, never in screens. Save through `useCreatePlan` / `useSavePlan` (one local transaction, queued); edit routines through `editRoutineForDay` (scope `day` forks a copy, `every` edits the shared routine and its deload copy). Start planned sessions with `useStartWorkout()({ kind: 'planDay', planDayId })`, which applies progression; finishing marks the day done. Plan routines (`source = 'plan'`) stay out of the Routines list. Engine changes show up in the 10 profile snapshots: review the diff.
- **Mock data**: until each backend phase lands, screens read typed placeholder data from `src/features/<feature>/mocks.ts`. Replace a mocks file with real queries (TanStack Query / Drizzle) without changing the screens.

## Commands

```bash
pnpm install          # install deps
pnpm start            # Expo dev server (scan QR with Expo Go); add --tunnel if phone isn't on same Wi-Fi
pnpm ios / android    # open in simulator / emulator
pnpm typecheck        # tsc --noEmit
pnpm lint             # eslint (expo flat config + prettier + colour rule)
pnpm format           # prettier --write (format:check to verify)
pnpm test             # jest
pnpm check            # typecheck + lint + format:check + test (must pass before done)
pnpm expo:doctor      # expo-doctor (plain `pnpm doctor` is pnpm's own command)
pnpm db:start         # local Supabase in Docker incl. Storage (Colima: `colima start` first); db:stop to stop
pnpm db:reset         # rebuild the local DB from migrations + seed
pnpm db:test          # pgTAP tests in supabase/tests/database (RLS proofs); db:test:remote runs them on the linked project
pnpm db:types         # regenerate src/types/database.ts from the local DB (db:types:remote for the linked project)
pnpm db:push          # apply migrations to the linked hosted project
pnpm exercises:build  # validate supabase/seed/exercises.ts and write the library migration
pnpm standards:build  # validate supabase/seed/standards.ts and write the strength standards migration
pnpm ranks:fake       # regenerate the 50-fake-lifter parity test (08_rank_distribution) after engine/standards changes
pnpm db:local:generate # new local SQLite migration in drizzle/ after changing src/lib/db/schema.ts
```

Environment: copy `.env.example` to `.env` and fill in `SUPABASE_URL` and `SUPABASE_ANON_KEY`. `app.config.ts` exposes them as `extra`, and `src/lib/supabase.ts` reads them through `expo-constants`. `getSupabase()` throws a clear error if they're missing. Without them the Welcome screen says so and, in dev, offers "Preview the app on mock data". For the simulator you can point `.env` at the local stack (`http://127.0.0.1:54321` + the anon key from `supabase status`); emailed codes then land in Mailpit at http://127.0.0.1:54324. A real phone needs the hosted project.

Auth: email one-time code + Google (browser flow, works in Expo Go). The root layout's `Stack.Protected` groups (auth / onboarding / app) follow `useAuthGate()`; don't navigate around them. New signed-in screens go inside the app group in `app/_layout.tsx`.

## Git

- **Never add Claude/AI attribution** (no `Co-Authored-By: Claude`, no "Generated with Claude Code") to any commit or PR in this project.
- The user makes commits. Only commit when explicitly asked.
