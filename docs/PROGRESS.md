# Progress

Status key: `[x]` done · `[~]` in progress · `[ ]` not started.
Update this file at the end of every session (see CLAUDE.md → Session protocol).

## Phases

- [~] **0 · Foundation**: project, tooling, provisional theme and base components, navigation shell, docs
- [x] **0B · Design system**: final visual identity, restyled base components, game layer ready for rank art and avatars (see `MOBILE-DESIGN.md`)
- [~] **1 · Backend, auth, onboarding**: Supabase project and schema, RLS, auth, profile creation, onboarding flow
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
- [x] Provisional theme (kept simple and replaceable for Phase 0B): tokens (dark-first + light, 8 rank colours, spacing, type, radius, shadows), NativeWind mapping, ThemeProvider, theme store, replacement guide in `src/theme/README.md`
- [x] Base components: Screen, Text, Button, Card, IconButton, Icon, Chip, Input, NumberStepper, Sheet, EmptyState, Skeleton, Avatar, RankBadge, ProgressBar, SegmentedControl, TopTabs (+ PlaceholderScreen)
- [x] `/dev/components` gallery (dev builds only; Profile → Component gallery)
- [x] Navigation: 5 bottom tabs; swipeable top tabs (Home, Rank, Friends); Workout single screen; Profile settings stack
- [x] ESLint (expo + prettier + no-hard-coded-colours rule), Prettier, TypeScript, Jest + RNTL, `pnpm check`
- [x] `.env.example`, Supabase client (`getSupabase()`), Drizzle client (no schema yet)
- [x] Verified in Expo Go on the iOS simulator (all tabs, sub-tabs, swipe, gallery, light/dark, sheet)
- [x] **User**: run on a physical phone via Expo Go (`pnpm start`, scan QR) and confirm
- [x] Visual identity (#21) settled in Phase 0B
- [ ] **User**: review PRODUCT_SPEC.md Open decisions #12 (auth methods) and #13 (age/consent) before Phase 1 starts

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
