# Progress

Status key: `[x]` done · `[~]` in progress · `[ ]` not started.
Update this file at the end of every session (see CLAUDE.md → Session protocol).

## Phases

- [~] **0 · Foundation**: project, tooling, design system, navigation shell, docs
- [ ] **1 · Backend, auth, onboarding**: Supabase project and schema, RLS, auth, profile creation, onboarding flow
- [ ] **2 · Exercise library**: exercises, muscles taxonomy, equipment, search, local cache
- [ ] **3 · Routine builder**: routines, set types, supersets, targets, RIR/RPE, rest timers, notes, reorder
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
- [x] Design system: tokens (dark-first + light, 8 rank colours, spacing, type, radius, shadows), NativeWind mapping, ThemeProvider, theme store
- [x] Base components: Screen, Text, Button, Card, IconButton, Icon, Chip, Input, NumberStepper, Sheet, EmptyState, Skeleton, Avatar, RankBadge, ProgressBar, SegmentedControl, TopTabs (+ PlaceholderScreen)
- [x] `/dev/components` gallery (dev builds only; Profile → Component gallery)
- [x] Navigation: 5 bottom tabs; swipeable top tabs (Home, Rank, Friends); Workout single screen; Profile settings stack
- [x] ESLint (expo + prettier + no-hard-coded-colours rule), Prettier, TypeScript, Jest + RNTL, `pnpm check`
- [x] `.env.example`, Supabase client (`getSupabase()`), Drizzle client (no schema yet)
- [x] Verified in Expo Go on the iOS simulator (all tabs, sub-tabs, swipe, gallery, light/dark, sheet)
- [ ] **User**: run on a physical phone via Expo Go (`pnpm start`, scan QR) and confirm
- [ ] **User**: review PRODUCT_SPEC.md Open decisions (#12 auth methods and #13 age/consent are needed for Phase 1)

## Session log

### Session 1 — 2026-10-05 — Phase 0 Foundation

**Built**

- Scaffolded the Expo SDK 57 app (RN 0.86, React 19.2, TS 6). pnpm 12 with `nodeLinker: hoisted` and approved builds for esbuild and unrs-resolver.
- Theme system in `src/theme`, with tokens as the single source of truth. Tailwind semantic colours resolve to CSS variables that ThemeProvider sets through NativeWind `vars()`. Dark is the default, with a light variant.
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

**Gotchas found**

- Expo Router 56+ forbids `@react-navigation/*` imports. Use the `expo-router/*` entry points.
- `app.config.ts` must import tokens with the `.ts` extension (`allowImportingTsExtensions` is on).
- RNTL 14 `render` and `userEvent` are async.
- NativeWind `className` doesn't style Reanimated `Animated.View`. Use theme values in `style`.
- Reanimated: use `.get()` and `.set()`, since React Compiler lint rules flag `.value` writes.

**Next (Phase 1)**

- Resolve Open decisions #12 (auth methods) and #13 (age/consent).
- Create the Supabase project, schema and RLS, plus auth screens and onboarding.
- Persist theme and units preferences.
