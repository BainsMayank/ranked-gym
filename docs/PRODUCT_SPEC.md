# Ranked Gym — Product Spec

> Working name: **Ranked Gym** (placeholder; see Open decisions).
> Status: living document. Update it whenever a decision is made, and keep **Open decisions** current.

## 1. Vision

A social, ranked gym and self-improvement app for Android and iOS. Every set you log feeds a strength rank (Iron to Champion) for each lift, each muscle and overall. You compete with friends, your college and your city, keep each other accountable, and grow together.

**Audience**: college students in India first (hostels, college gyms, societies), then everyone.

**Core loop**: log a workout (works offline) → server recalculates ranks, XP and streaks → see progress (rank-ups, records, body map) → share and compete (feed, leaderboards, leagues, battles) → come back tomorrow (streaks, stakes, pods).

## 2. Navigation

Five bottom tabs, in this order:

| Tab     | Structure                      | Sub-sections                                                                                                        |
| ------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| Home    | Top tabs                       | For You · Feed · Discover                                                                                           |
| Workout | Hub + full-screen flows        | Hub (My Plan · New Workout · Routines); Create plan, Routine builder and Live session open full screen (no tab bar) |
| Rank    | Top tabs                       | Ranks · Body · Leagues · Analysis · Records                                                                         |
| Friends | Hub + pushed screen            | Hub (invite, add friends, standings, requests, friends) → Leaderboards                                              |
| Profile | Single screen + settings stack | Profile (level, stats, badges, customise, settings list) → Settings sections                                        |

Outside the tabs: **Welcome** (sign up / log in: Google or an emailed code) and **onboarding** (8 steps, then a "You're in" screen). An auth gate shows signed-out users only the auth screens, and signed-in users onboarding until it's finished.

Layouts follow the Claude Design mockups in `docs/design/mockups/` (decided 2026-10-06), restyled to the design system in [MOBILE-DESIGN.md](../MOBILE-DESIGN.md). Records has no mockup and keeps the same list language.

## 3. Home tab

### 3.1 For You (personal dashboard)

- **Muscle analysis**: which muscles you trained most over a selectable period (for example 7, 14 or 30 days, or custom), using sets and volume per muscle.
- **Recovery**: estimated recovery % per muscle, based on recent training load and time since it was last trained.
- **Goals**: add and track personal goals (for example "Bench 100 kg", "Train 4×/week", "Reach 70 kg bodyweight"), with progress.
- **Overview** for the last 7, 14 or 30 days:
  - total volume
  - total duration
  - records set
  - calories burned (estimate)
  - bodyweight trend

### 3.2 Feed

- Posts and published workouts from friends.
- Like and comment.
- **Copy a workout** into my routines.

### 3.3 Discover

- Content from people I don't know yet, to find training partners and grow together. It should lean towards the same college, city or gym and a similar level.

## 4. Workout tab

One scrolling screen with three sections.

### 4.1 My Plan (plan generator)

The user picks:

- **Goal**: get stronger, build muscle, lose fat, gain weight, get toned, glute and lower-body focus ("curvier"), general fitness, calisthenics.
- **Experience level** (for example beginner, intermediate, advanced).
- **Equipment** available (for example full gym, dumbbells only, home or bodyweight, college gym).
- **Session length**.
- **Schedule**: either a number of days per week, or specific weekdays.

The app generates a **multi-week plan**, shows today's session, and tracks adherence.

### 4.2 New Workout

- **Start an empty workout** (freestyle logging).
- **Generate a random workout** from chosen muscles, time available and equipment.

### 4.3 Routines (routine builder)

A full builder for routines such as "Leg Day":

- Add exercises from the exercise library, and reorder them (drag).
- Per set:
  - **set type**: warm-up, working, top set, back-off, drop set, failure
  - **target**: reps, a rep range, duration or distance
  - **target weight**
  - **RIR** and **RPE**
- **Supersets**: group exercises.
- **Rest timer** for each exercise.
- **Notes**, per routine and per exercise.

### 4.4 Workout logging (cross-cutting with 4.1–4.3)

- Local-first: logging works fully offline and syncs later.
- Prefills from the routine and from last session's numbers. Rest timer, PR detection and a finish summary.

## 5. Rank tab

### 5.1 My Ranks

- Overall rank.
- Per-lift ranks.
- Rank progression over time (chart).

### 5.2 Body Map

- Front and back body views, with each muscle coloured by its rank (rank colour palette).

### 5.3 Leagues

- Weekly and seasonal competitions (grouped by similar level; promotion and relegation to be decided).

### 5.4 Analysis

- Weightlifting rank vs calisthenics rank.
- Prediction of the next rank-up: what weight or reps you need.
- Rank-ups by weekday.
- Rank distribution by body region and by muscle group.

### 5.5 Records

- Personal-record history (1RM, estimated 1RM, rep PRs and volume PRs for each exercise).

### 5.6 Rank model (summary)

Full design in [RANK_SYSTEM.md](RANK_SYSTEM.md) (decided 2026-10-06; resolves the former open decisions on the rank formula, divisions and overall rank).

- **8 tiers**: Iron, Bronze, Silver, Gold, Platinum, Diamond, Master, Champion. Iron to Diamond have 4 divisions (IV → I); Master and Champion have none.
- **Strength Score (SS)**: every ranked set converts to one pound-for-pound scale based on DOTS: Epley e1RM (sets above 12 reps count as 12) × DOTS coefficient ÷ the lift's share of a total. Pull-ups, chin-ups and dips use bodyweight ratios instead. Men's and women's standards.
- **Realistic calibration**: Gold is an intermediate lifter (about a year), Platinum 2–3 years, Diamond advanced, Master elite (national level), Champion international level. World-record lifts are always Champion.
- **Lift, overall, muscle and discipline ranks**: overall is the mean of the best SS in 5 movement patterns (needs 3); muscles take the best primary lift or 85% of a secondary one; calisthenics is its own ladder.
- **Keeping ranks**: sets are scored at bodyweight on the day (so bulking never costs a rank); records count fully for a year then fade 1% a month to a 75% floor; peak rank is kept as a badge.
- Strength ranks never use effort; XP and weekly leagues reward effort, so experienced lifters keep getting rewards when strength gains slow.
- Ranks are computed **server-side** from logged sets. `src/lib/game/strength.ts` is the reference the rank engine mirrors; the client only previews.

## 6. Friends tab

### 6.1 Friends

- Friends list, add and search, friend requests.

### 6.2 Leaderboards

- **Scopes**: friends, regional (city / college) and global.
- **Filters**: by lift, overall rank, XP and streak.

### 6.3 Invite

- Invite links, plus referral rewards (granted server-side). Lives as a card at the top of the Friends hub (per the mockups), not a separate sub-tab.

## 7. Profile tab

- Sign-up and sign-in.
- Profile customisation (avatar, bio, college, city, gym, badges on show).
- XP and levels.
- Streaks.
- Badges.
- Settings:
  - appearance (dark, light, system)
  - units (kg / lb)
  - notifications
  - privacy
- Data export.
- Delete account.

## 8. Cross-cutting systems

- **Streaks with stakes among friends**: commit to a streak, and friends hold you to it. There are stakes if you break it (the form of the stakes is open).
- **Accountability pods**: small groups that check in together.
- **Communities**: college, hostel, society and gym. Communities compete against each other in **battles**.
- **Notifications**: reminders, social activity, rank-ups, league results, streak at risk.
- **Anti-cheat verification for high ranks**: for example video proof, peer or mod review, and outlier detection, before Master or Champion is granted or shown on public boards.
- **Offline workout logging**: see 4.4.

## 9. Non-functional requirements

- **Platforms**: Android and iOS. It must run in Expo Go during development.
- **India-first**:
  - performs well on low-end Android
  - small data use and bundle size
  - kg default
  - IST-aware weekly resets
  - college and city as first-class regions
- **Offline-first logging**: SQLite (Drizzle) is the source of truth for in-progress workouts, synced through a queue.
- **Server-trusted maths**: ranks, XP, leaderboards, leagues, streak stakes, rewards and anti-cheat run in Postgres or Edge Functions. Clients can only preview.
- **Accessibility**: labels on all touchables, dynamic type (up to 1.6×), contrast-checked tokens, reduced-motion support.
- **Privacy and security**: RLS on every table, private-by-default options, data export and account deletion (DPDP Act 2023).
- **Theming**: dark-first, with a light variant. All colours come from theme tokens. The design system is recorded in [MOBILE-DESIGN.md](../MOBILE-DESIGN.md).

## 10. Phases

See [PROGRESS.md](PROGRESS.md) for the checklist (0 Foundation, 0B Design system, 1 Backend … 15 Launch). Phase 0 shipped a provisional theme, and Phase 0B set the final visual identity before any feature work.

## 10A. Design decisions (Phase 0B, 2026-10-06)

Full detail in [MOBILE-DESIGN.md](../MOBILE-DESIGN.md).

- **Look**: layouts from the Claude Design mockups, styling from the references in `docs/design/references/`. "Calm chrome, loud rewards": near-black neutrals plus one calm burnt-orange signal colour (`#F2662F`); saturated colour only on game objects (rank tiers, rarities).
- **Type**: Instrument Sans (400/500/600), nothing heavier than semibold, tabular figures for numbers. The provisional lime primary and a condensed display face were rejected as too loud.
- **Depth**: borderless surfaces with a lit top edge and soft shadows; a glass bottom tab bar (iOS blur, Android near-opaque); one radial glow reserved for rank and celebration moments.
- **Game layer**: rarity scale (common, rare, epic, legendary) on the rank hues; rank art and avatar frames plug into a registry; avatars carry rank/rarity rings and a level tag; rank progress uses the division ladder.
- **Rank badge art**: the user will supply final art; placeholder shields render until it is registered.
- **Light mode**: designed alongside dark with full token coverage; parity at launch stays open (#19).

## 10B. Auth and onboarding decisions (Phase 1, 2026-10-06)

Schema in [SCHEMA.md](SCHEMA.md).

- **Sign-in**: email one-time code (6 digits, one flow for sign-up and log-in) and Google (Supabase OAuth with PKCE in a browser sheet, so it runs in Expo Go). Phone OTP is not offered (SMS cost). **Apple sign-in is hidden until launch**, but it's required by the App Store once Google is offered, so it must ship before Phase 15.
- **Sessions** persist in SecureStore and refresh only while the app is in the foreground. Sign-out clears this device's session and cached data.
- **Minimum age 13** (birth year; enforced in the app and in Postgres). DPDP handling for 13–17s is still open (#13).
- **Strength standards**: onboarding asks men's / women's / rather not say, explained as "used only to compare you to fair strength standards". "Rather not say" ranks on men's (open) standards. Never shown to others.
- **Onboarding** (8 steps, each saved on Continue so a restart resumes with answers filled in): name and username → units → standards and birth year → height and first weigh-in → experience → main goal (same list as the plan generator) → city and optional college → profile visibility. It ends on a "You're in" screen offering "Create my plan" or "Start a workout". Everything is editable later in Profile → Edit profile and Settings.
- **Visibility**: default `friends`. Everyone signed in can see your name, username and avatar (so people can find and add you); bio, city and college follow your visibility; birth year, standards, height, goals and bodyweight are never shown to anyone.
- **Units**: everything is stored in kg and cm; kg users see cm, lb users see feet and inches.

## 10C. Exercise library decisions (Phase 2, 2026-10-06)

Schema in [SCHEMA.md](SCHEMA.md); data credits in [CREDITS.md](CREDITS.md). Resolves open decision #15.

- **Source**: our own library (268 exercises at v1) written in `supabase/seed/exercises/`, using [free-exercise-db](https://github.com/yuhonas/free-exercise-db) (Unlicense) as a reference. Names normalised ("Equipment + movement", sentence case), muscles re-mapped by hand, Indian gym names as aliases ("pec deck", "dand", "baithak").
- **Media**: none yet. The dataset's images have no stated licence, so `media_url` stays empty. Decide on a media source (or our own clips) before launch.
- **Muscle taxonomy**: 20 muscles in 6 regions (chest, shoulders, arms, back, core, legs) plus an optional neck, off by default. One list for the DB enum, the app and the body-map SVG path ids (`src/lib/exercises/taxonomy.ts`). Roles: primary (volume weight 1), secondary (0.5, or 0.25 when it barely helps), stabiliser (0.25).
- **Ranked lifts**: 32 rank keys (`src/lib/game/rankKeys.ts`), free weights and calisthenics only; machines, cables and Smith never rank (RANK_SYSTEM.md §4.3). Custom exercises never rank.
- **Shipping the library**: a generated, idempotent migration per library version, so `db:push` delivers it to production and apps re-download it when `exercise_library_meta.version` changes.
- **Offline**: the official library and the user's custom exercises are mirrored into SQLite; search runs in memory on the device (fuzzy matching on names and aliases, no extra dependency).
- **Custom exercises**: name, equipment, log type, primary and secondary muscles. Private to their creator. Creating or editing needs a connection until the Phase 4 sync queue.

## 11. Open decisions

Resolve these with the user before building the phase that needs them.

| #   | Topic              | Question                                                                                                                                                                                              | Needed by                  |
| --- | ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| 1   | App name           | Final name, bundle IDs (`com.rankedgym.app` placeholder), store listing, logo.                                                                                                                        | Phase 15 (ideally earlier) |
| 5   | XP and levels      | XP sources (workouts, PRs, streaks, social), the level curve, and anti-farming caps.                                                                                                                  | Phase 11                   |
| 6   | Leagues            | Weekly vs seasonal format, season length, group size, promotion/relegation, and the scoring metric (XP? rank gains?).                                                                                 | Phase 7                    |
| 7   | Streak stakes      | What is at stake: points/XP, cosmetic penalties, or real money. Real money raises legal and payment issues in India, so the recommendation is no money at launch.                                     | Phase 12                   |
| 8   | Anti-cheat         | Which ranks need verification, evidence type (video?), reviewers (mods/peers), outlier thresholds, and appeals.                                                                                       | Phase 13                   |
| 9   | Calories           | Estimation method (MET-based by duration and intensity? a wearable later?).                                                                                                                           | Phase 8                    |
| 10  | Recovery model     | Formula for recovery % per muscle (time decay × volume × RPE?).                                                                                                                                       | Phase 8                    |
| 11  | Regions            | Source for the college and city lists (curated seed? user-submitted plus moderation?), and verification of college membership (college email?).                                                       | Phase 10                   |
| 13  | Under-18 consent   | Minimum age is 13 (decided). Still open: DPDP Act handling for 13–17s (verifiable parental consent, no behavioural tracking): consent flow, forcing private visibility, or raising the minimum to 18. | Before Phase 15            |
| 14  | Referral rewards   | What the inviter and invitee get, and abuse limits.                                                                                                                                                   | Phase 10                   |
| 16  | Plan generator     | Rules-based templates vs an algorithm; progression model (linear, double progression, RIR-based).                                                                                                     | Phase 5                    |
| 17  | Content moderation | Reporting, blocking, moderation tooling for feed, discover and comments.                                                                                                                              | Phase 13                   |
| 18  | Monetisation       | Free vs premium features; ads (probably not).                                                                                                                                                         | Before Phase 15            |
| 19  | Light-mode parity  | Is light mode fully supported at launch or best-effort? (Phase 0 builds both; Phase 0B designs both.)                                                                                                 | Phase 14                   |
| 20  | Charts in Expo Go  | Victory Native needs Skia, which is in Expo Go. Confirm performance on low-end Android when charts land.                                                                                              | Phase 7                    |
| 22  | Age brackets       | Onboarding says leaderboards group people by age bracket, but RANK_SYSTEM.md has no age adjustment. Decide the brackets (e.g. under 18, 18–23, 24–39, 40+) and whether they filter leaderboards only. | Phase 10                   |
| 23  | Apple sign-in      | Required by the App Store when Google is offered. Needs a dev build (or Expo Go's bundle id) and an Apple Developer account.                                                                          | Before Phase 15            |
| 25  | Exercise media     | Source for exercise images or clips with a clear licence (or record our own); `exercises.media_url` is ready.                                                                                         | Before Phase 15            |
| 24  | Countries          | Country is stored (default `IN`) but not asked. Add a picker when launching outside India.                                                                                                            | After launch               |
