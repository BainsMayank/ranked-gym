# Ranked Gym — engineering guide

> **Ranked Gym** (placeholder name) is a social, ranked gym and self-improvement app for Android and iOS. Every lift earns you a rank from Iron to Champion. You compete with friends, your college and your city, and train together. The launch audience is college students in India; after that, everyone.

## Session protocol (mandatory)

1. **Before planning anything**, read this file, [docs/PRODUCT_SPEC.md](docs/PRODUCT_SPEC.md) and [docs/PROGRESS.md](docs/PROGRESS.md).
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

Approved additions to the stack: `react-native-tab-view` and `react-native-pager-view` (needed by swipeable top tabs), `expo-system-ui`, and `expo-font` (a peer dependency of `@expo/vector-icons`).

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
  (tabs)/workout/        Single scrolling screen: My Plan, New Workout, Routines
  (tabs)/rank/           Top tabs: index (My Ranks), body-map, leagues, analysis, records
  (tabs)/friends/        Top tabs: index (Friends), leaderboards, invite
  (tabs)/profile/        Stack: index, settings/index, settings/[section]
  dev/components.tsx     Component gallery (redirects home when !__DEV__)
src/
  components/            Shared, feature-agnostic UI (barrel: '@/components')
    navigation/          TopTabsNavigator (swipeable route tabs using our TopTabs bar)
  features/<feature>/    Everything for one feature: screens/, components/, hooks/, api/, store.ts, types.ts
  lib/                   supabase.ts, queryClient.ts, db/ (Drizzle client + schema), utils/
  theme/                 tokens.ts (single source of truth), ThemeProvider, themeStore
  types/                 Global/ambient types
supabase/                migrations/, functions/ (Edge Functions), seed.sql
docs/                    PRODUCT_SPEC.md, PROGRESS.md
```

- Import with the `@/` alias (maps to `src/`).
- Route files never hold logic: `export default SomeScreen` imported from `@/features/...`.
- A component used by two or more features moves to `src/components`. Otherwise it stays in its feature folder.
- Tests sit next to the code in `__tests__/` folders, named `*.test.ts(x)`.

## Coding rules

- **Strict types, no `any`** (ESLint error). Prefer `unknown` plus narrowing, discriminated unions and `as const` arrays with derived union types.
- **Small components**: one component per file, about 150 lines at most. Split when it grows.
- **Feature folders**: no cross-feature deep imports. Share through `src/components` or `src/lib`.
- **Server-trusted calculations live in Postgres (SQL functions, RLS, triggers) or Supabase Edge Functions.** This covers ranks, XP, levels, leaderboards, league results, streak stakes, referral rewards and anti-cheat. The client may _preview_ a value, but the server is the source of truth and never accepts a client-computed rank or score.
- **Local-first workout logging**: an active workout writes to SQLite (Drizzle) first and syncs to Supabase in the background through a queue. Logging must work fully offline.
- **Accessibility**: every touchable has `accessibilityRole` and an `accessibilityLabel`. `IconButton` makes the label a required prop. Custom controls need `accessibilityState` and `accessibilityValue`. Touch targets should be at least 44pt (use `hitSlop` when visually smaller). Respect reduced motion (`useReducedMotion`).
- **No hard-coded colours outside `src/theme`**. This is enforced by ESLint (`no-restricted-syntax`). It bans hex/rgb literals, Tailwind palette classes (`bg-red-500`, `text-white`) and arbitrary colours (`bg-[#…]`). Use theme classes or `useTheme().colors` / `rankColors`.
- UI copy is short, friendly and in Indian English. Units default to kg.
- Don't commit secrets. `.env` is git-ignored, and only `.env.example` is committed.

## Theme and design system

- `src/theme/tokens.ts` defines the colour tokens `background, surface, surfaceRaised, border, text, textMuted, primary, onPrimary, success, warning, danger, onDanger, scrim` for **dark** (default, dark-first) and **light**. It also defines `rankColors` (iron, bronze, silver, gold, platinum, diamond, master, champion; each has base, highlight and on), `spacing` (4pt: xxs 2 … xxxl 48), `typography` (display, title, heading, subheading, body, label, caption), `radius` and `shadows`.
- Tailwind classes map to those tokens through CSS variables that `ThemeProvider` sets, so one class works in both schemes. Examples: `bg-background`, `bg-surface`, `bg-surface-raised`, `border-border`, `text-text`, `text-text-muted`, `bg-primary`, `text-on-primary`, `bg-rank-gold`, `text-rank-diamond-highlight`, `p-lg`, `gap-sm`, `rounded-md`, `text-heading`. Numeric spacing is also available (`p-4` = 16px, because `inlineRem` is 16).
- Use `useTheme()` for raw values (icon colours, SVG, navigator options, Reanimated styles). NativeWind `className` doesn't style Reanimated `Animated.View`, so pass theme values through `style` there.
- Use `useThemeStore` for the mode: `dark | light | system`, default `dark`. Persistence is planned for Phase 11.
- Use Reanimated shared values via `.get()` and `.set()`, not `.value`. The React Compiler lint rules flag `.value` mutation.
- Base components (`@/components`): Screen, Text, Button, Card, IconButton, Icon, Chip, Input, NumberStepper, Sheet, EmptyState, Skeleton, Avatar, RankBadge, ProgressBar, SegmentedControl, TopTabs and PlaceholderScreen. See them all at `/dev/components` (Profile → Component gallery in dev builds).

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
```

Environment: copy `.env.example` to `.env` and fill in `SUPABASE_URL` and `SUPABASE_ANON_KEY`. `app.config.ts` exposes them as `extra`, and `src/lib/supabase.ts` reads them through `expo-constants`. `getSupabase()` throws a clear error if they're missing. The rest of the app boots without them.

## Git

- **Never add Claude/AI attribution** (no `Co-Authored-By: Claude`, no "Generated with Claude Code") to any commit or PR in this project.
- The user makes commits. Only commit when explicitly asked.
