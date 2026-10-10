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

Phase 8 brief, decided 2026-10-09. Read [RECOVERY_MODEL.md](RECOVERY_MODEL.md) for the recovery heuristic and [PHASE_8_PLAN.md](PHASE_8_PLAN.md) for the implementation plan.

- Today card: optional personal greeting inside the card, planned session or recovery suggestion, Start/Resume/Generate, actual training-day streak, and this week's league division and position (links to Leagues; hidden in the signed-out preview).
- Four entry cards in a 2×2 grid: Muscle Analysis (most-worked muscle), Recovery (mean estimated recovery), Goals (nearest active goal), Overview (this week's volume). Recent PRs/rank-ups follow, then Monday-through-today sessions, volume and time versus the same weekdays last week.
- Muscle Analysis: 7 days, 30 days, 90 days or custom (up to 366 days), shared BodyMap with sets/volume toggle, ranked muscle list, outlined weekly guidance bands from Plan Engine, neglected muscles and push/pull/legs distribution. Successful completed strength/calisthenics working sets count primary 1.0 and secondary 0.5; stabilisers, warm-ups, failed and unfinished sets are excluded. Muscle totals overlap; never sum them to calculate workout volume.
- Recovery: fatigue from each eligible set, library muscle weight and RIR (actual RIR, else 10−RPE, else 2), exponential decay with 24–60 hour muscle half-lives, capacity 10, clamped 0–100%. Ready means at least 80%. Recovery speed is slower/normal/faster. The screen advances cached raw fatigue every minute and on foreground; it explicitly mentions sleep, food and stress.
- Goals: lift (kg × reps in one set), rank (overall/lift division), bodyweight, workouts per calendar week, streak, calendar-month volume, custom checkbox. Server derives baselines/current values, persists completion and creates at most one optional milestone post. Sharing defaults off and follows profile visibility. Four or more observations over at least seven days permit a trend-based estimate; no date is invented for a flat/insufficient trend. Bodyweight changes over about 1% per week receive a gentle warning.
- Overview: 7, 14 (default), 30 or 90 days, compared with the preceding equal interval; volume, sessions, duration/average, new records excluding baselines, calorie estimates with missing-data notes and bodyweight trend. Daily bars, duration line, training calendar, weigh-in line and seven-day mean of the latest observation per local day. Missing days are not interpolated. All range records link to their workouts in a virtualised list.
- Signed-in aggregates are computed in Postgres and validated/cached in SQLite KV by account, range and timezone. Cached data renders immediately and refreshes in the background; unsynced workout notices explain temporary differences. Workouts, weigh-ins, goals, foreground and recovery-speed changes invalidate the appropriate data.
- Account-free development preview stays available. It reads actual on-device workouts through SQLite, stores development goals/weigh-ins/recovery speed locally, and labels its source. It never awards client-computed ranks or publishes posts. Production continues to use the auth gate and authoritative server calculations.

### 3.2 Feed

Built in Phase 9 (§10I).

- Posts from friends, people I follow and me, newest first, with pull to refresh, paging, a "New posts" pill (Supabase Realtime) and a "You're all caught up" marker where last visit's posts begin.
- Post types: workouts (posted automatically from the summary's visibility), text and photo posts (up to 4 photos, an attached workout or PR, @mentions), and celebratory milestones (records, rank-ups, goals, league results).
- **Respect** (our like) and comments with one level of replies, both optimistic. Edit and delete your own; report others' posts and comments; block people.
- **Copy a workout** into my routines: a preview where I rename it and keep or blank their weights, then save or open the builder. The routine shows "Copied from @user".
- A bell on Home lists respects, comments, replies, mentions, friend requests and follows (push arrives in Phase 12).

### 3.3 Discover

- Public posts from people I don't know yet, to find training partners and grow together. Ranked in Postgres by recency, engagement and similarity (same college, same city, similar overall rank, same goal, similar training days), at most two posts per author per page: [DISCOVER_RANKING.md](DISCOVER_RANKING.md).
- Filters: My college, My city, Similar rank, Same goal, Calisthenics, Beginners. People search by name or @username.
- "People to train with": public lifters like me, with mutual friends, and Add friend or Follow.

## 4. Workout tab

One scrolling screen with three sections.

### 4.1 My Plan (plan generator)

The user picks:

- **Goal**: get stronger, build muscle, lose fat, gain weight, get toned, glute and lower-body focus ("curvier"), general fitness, calisthenics.
- **Experience level** (for example beginner, intermediate, advanced).
- **Equipment** available (for example full gym, dumbbells only, home or bodyweight, college gym).
- **Session length**.
- **Schedule**: either a number of days per week, or specific weekdays.

The app generates a **multi-week plan**, shows today's session, and tracks adherence. Rules and decisions: §10F and [PLAN_ENGINE.md](PLAN_ENGINE.md).

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
- Prefills from the routine and from last session's numbers. Rest timer, a finish summary, and PR detection on the server (Phase 6). Details in §10E.

## 5. Rank tab

### 5.1 My Ranks

- Overall rank.
- Per-lift ranks.
- Rank progression over time (chart).

### 5.2 Body Map

- Front and back body views, with each muscle coloured by its rank (rank colour palette).

### 5.3 Leagues

- Weekly leagues in groups of about 30 at a similar overall rank, scored by League Points that reward effort and progress, not strength. Rookie → Contender → Elite → Legend with promotion and demotion every Monday, 8-week seasons with rewards, custom leagues for friends and challenges. Rules: [RANK_SYSTEM.md](RANK_SYSTEM.md) §18.

### 5.4 Analysis

- Weightlifting rank vs calisthenics rank.
- Prediction of the next rank-up: what weight or reps you need.
- Rank-ups by weekday.
- Rank distribution by body region and by muscle group.

### 5.5 Records

- Personal-record history (1RM, estimated 1RM, rep PRs and volume PRs for each exercise).

### 5.6 Rank model (summary)

Full rules in [RANK_SYSTEM.md](RANK_SYSTEM.md) (rebuilt in Phase 6, 2026-10-08/09).

- **8 tiers**: Iron, Bronze, Silver, Gold, Platinum, Diamond, Master, Champion. Every tier but Champion has divisions III → I. Tiers and divisions are thresholds on a **0–1000 Rank Score**, stored in a table so they can be rebalanced without an app update.
- **Per lift**: your best set in the 180 days before your latest set of that lift, against a standards table:
  - Weightlifting: e1RM ÷ bodyweight, by sex and bodyweight band, with an age factor. e1RM is the mean of Epley and Brzycki over 1–10 reps.
  - Calisthenics: clean reps, or weighted e1RM of bodyweight + added load, whichever scores better.
  - Skills: hold seconds, with progressions capped below the full skill.
  - "Rather not say" uses the average of the men's and women's curves.
- **Aggregates**: muscle = weighted by how much each lift trains it; region = average of its muscles; overall = region-weighted, unlocked by **placement** (5 lifts across 4 regions). Weightlifting and Calisthenics ranks are separate.
- **Keeping ranks**: each set is scored at the weigh-in closest to it (±30 days), so bulking never costs a rank. After 60 days without rankable sets, ranks show Inactive with no points lost.
- **Records** for every exercise: e1RM, heaviest weight, most reps at a weight, best set and session volume, longest hold. The first time is a baseline, not a PR.
- **Calibration**: anchors from DOTS-based lift shares, checked on 50 fake lifters. Beginners land Iron–Silver, 1–2 year lifters Gold–Platinum, Master and Champion stay rare, and world records are Champion.
- Ranks are computed **server-side** in Postgres when a finished workout syncs; the summary screen shows the PRs and rank changes it returns. `src/lib/game/engine` mirrors the rules for tests and previews.

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
- **Rank and league art** (2026-10-09): original generated metal/enamel PNGs registered centrally; eight rank tiers with live SVG division pips, plus four distinct weekly-league emblems. Licensed MIT anatomy replaces the provisional shapes; source and schematic muscle mapping are documented in `assets/body/README.md`.
- **Light mode**: designed alongside dark with full token coverage; parity at launch stays open (#19).

## 10B. Auth and onboarding decisions (Phase 1, 2026-10-06)

Schema in [SCHEMA.md](SCHEMA.md).

- **Sign-in**: email one-time code (6 digits, one flow for sign-up and log-in) and Google (Supabase OAuth with PKCE in a browser sheet, so it runs in Expo Go). Phone OTP is not offered (SMS cost). **Apple sign-in is hidden until launch**, but it's required by the App Store once Google is offered, so it must ship before Phase 15.
- **Sessions** persist in SecureStore and refresh only while the app is in the foreground. Sign-out clears this device's session and cached data.
- **Minimum age 13** (birth year; enforced in the app and in Postgres). DPDP handling for 13–17s is still open (#13).
- **Strength standards**: onboarding asks men's / women's / rather not say, explained as "used only to compare you to fair strength standards". "Rather not say" ranked on men's (open) standards until Phase 6; it now uses the average of both curves (§10G). Never shown to others.
- **Onboarding** (8 steps, each saved on Continue so a restart resumes with answers filled in): name and username → units → standards and birth year → height and first weigh-in → experience → main goal (same list as the plan generator) → city and optional college → profile visibility. It ends on a "You're in" screen offering "Create my plan" or "Start a workout". Everything is editable later in Profile → Edit profile and Settings.
- **Visibility**: default `friends`. Everyone signed in can see your name, username and avatar (so people can find and add you); bio, city and college follow your visibility; birth year, standards, height, goals and bodyweight are never shown to anyone.
- **Units**: everything is stored in kg and cm; kg users see cm, lb users see feet and inches.

## 10C. Exercise library decisions (Phase 2, 2026-10-06)

Schema in [SCHEMA.md](SCHEMA.md); data credits in [CREDITS.md](CREDITS.md). Resolves open decision #15.

- **Source**: our own library (268 exercises at v1) written in `supabase/seed/exercises/`, using [free-exercise-db](https://github.com/yuhonas/free-exercise-db) (Unlicense) as a reference. Names normalised ("Equipment + movement", sentence case), muscles re-mapped by hand, Indian gym names as aliases ("pec deck", "dand", "baithak").
- **Media**: none yet. The dataset's images have no stated licence, so `media_url` stays empty. Decide on a media source (or our own clips) before launch.
- **Muscle taxonomy**: 20 muscles in 6 regions (chest, shoulders, arms, back, core, legs) plus an optional neck, off by default. One list for the DB enum, the app and the body-map SVG path ids (`src/lib/exercises/taxonomy.ts`). Roles: primary (volume weight 1), secondary (0.5, or 0.25 when it barely helps), stabiliser (0.25).
- **Ranked lifts**: 32 rank keys (`src/lib/game/rankKeys.ts`; 33 since Phase 6 added `handstand`), free weights and calisthenics only; machines, cables and Smith never rank (RANK_SYSTEM.md §5). Custom exercises never rank.
- **Shipping the library**: a generated, idempotent migration per library version, so `db:push` delivers it to production and apps re-download it when `exercise_library_meta.version` changes.
- **Offline**: the official library and the user's custom exercises are mirrored into SQLite; search runs in memory on the device (fuzzy matching on names and aliases, no extra dependency).
- **Custom exercises**: name, equipment, log type, primary and secondary muscles. Private to their creator. Creating or editing needs a connection until the Phase 4 sync queue.

## 10D. Routine builder decisions (Phase 3, 2026-10-07)

Schema in [SCHEMA.md](SCHEMA.md); the model lives in `src/lib/routines` so live logging (Phase 4) and the plan generator (Phase 5) reuse it unchanged.

- **Set types**: warm-up, working, top, back-off, drop, failure, AMRAP. Warm-ups never count toward working sets, muscle volume or ranks; every other type does. A drop set belongs to the set above it (so it can't come first) and shows indented. Badges: W, numbered working sets (1, 2, 3), T, B, D, F, A.
- **Targets and load**: a set targets reps, a rep range, a time or a distance (cells take "8", "8-10", "0:45"). Load is kg (in the user's unit), % of 1RM, % of the top set before it, added weight on bodyweight, or assistance. Effort is RIR or RPE (5–10 in 0.5 steps), chosen in Settings → Training, with "both" as the advanced option.
- **Supersets**: consecutive exercises sharing a group number, labelled A1/A2/B1 and drawn with an orange rail. Members rest their own time (usually none) before the next member, then a shared round rest. Moving or removing a member re-forms or dissolves the group automatically.
- **Duration estimate**: reps × seconds per rep (tempo sum, else 3 s; range midpoint), or the time/distance target, plus rests (warm-up rest capped at 60 s, 10 s before a drop set, 15 s between superset members), plus 60 s setup per exercise, rounded to 5 minutes. Stored on save; display only.
- **Warm-up generator**: 2–4 sets (by load) ramping to the first working weight, rounded to the equipment's step, never below the empty bar.
- **Colour**: a rank hue, shown only as a small dot and a 2px edge (no new tokens; calm chrome).
- **Starter routines**: 10 bundled in the app (`templates.ts`, by exercise slug, checked by a test against the seed). Adding one copies it as the user's own (`source = 'copied'`).
- **Reorder**: an in-house reorder mode (compact rows dragged by a handle, Move up / Move down for screen readers); no drag library. In the routine list, dragging across a folder header moves the routine into that folder.
- **Editing model**: explicit Save, with the working copy autosaved as a local draft (restored after a crash or kill), Undo for the last 10 edits, and a Save / Discard / Keep editing sheet when leaving with changes.
- **Offline and sync**: SQLite is the source of truth on the device; a generic outbox (`src/lib/sync`) pushes whole routines through `save_routine()` and Phase 4 reuses it for workouts. Pending local changes win over the server; otherwise the last push wins.
- **New exercises** start with three working sets (8–12 reps, RIR 2) and the user's default rest (isolation work gets three quarters of it).
- **Approved additions**: `@shopify/flash-list` (long lists) and `expo-haptics` (pulled forward from Phase 4: selection feedback on drag steps, chips and pickers).

## 10E. Workout logging decisions (Phase 4, 2026-10-08)

Schema in [SCHEMA.md](SCHEMA.md); model in `src/lib/workouts`, sync engine in `src/lib/sync`. Resolves open decision #9.

- **Local-first**: the workout being logged lives in SQLite (one in progress per device) and in memory; every change is saved a moment later and when the app backgrounds, so a kill or a phone restart loses nothing (the rest timer included). Drafts push at most every 20 s; finishing pushes straight away.
- **Sync rules**: idempotent upserts by client-generated ids; drafts: the latest `client_updated_at` wins; finished workouts are immutable except explicit edits, which keep the previous version in `workout_revisions`. Clients write only through `save_workout()`. Retries back off 5 s to 10 min, retry at once when the connection returns, and show as "not synced" after 8 failures.
- **Server values**: duration, volume (completed working sets, weight x reps; assisted sets add none) and the calorie estimate are computed in Postgres; the app previews the same maths. `is_pr` is left to the rank engine (Phase 6).
- **Calories (resolves #9)**: MET x bodyweight (kg) x hours, MET averaged over exercises weighted by completed working sets, always labelled an estimate. Bodyweight is the latest weigh-in, snapshotted on the workout.
- **Estimated 1RM**: a single is itself; 2-9 reps Epley; 10-12 reps the lower of Epley and Brzycki; above 12 counts as 12. Shown for working sets with a bar or stack weight. Display only. (Phase 6 replaced this with the rank formula: the mean of Epley and Brzycki, 1–10 reps, no estimate above.)
- **Suggestions**: an empty cell shows the target, else last time (matched by set kind and position), else the set before it in this session; ticking an empty set adopts it.
- **Keypad**: custom docked keypad (no system keyboard) with +/- 2.5 kg (5 lb), the plate calculator and Next (weight, reps, next set). Time is typed as digits (130 = 1:30).
- **Rest**: starts on tick for the exercise's rest (warm-ups at most 60 s, none before a drop set); supersets go A1 → A2 without rest and rest after the round. Opens as a sheet, folds into a bar; a local notification (sound per device setting) fires at the end. Notification permission is asked on the first rest, never on launch.
- **Plates**: per-side plates from the user's inventory and bar (kg plates for kg users, standard lb plates for lb users by default), closest load without going over.
- **Random workouts**: focus regions or "Surprise me" (the split trained least recently, full body without history), 20-90 minutes, equipment (bodyweight always), intensity. Compound lifts first, no repeated movement pattern, ranked lifts and free weights preferred, fits the duration model. Reroll one (same pattern) or all. Can be saved as a routine (`source = 'generated'`).
- **Finishing**: unticked sets are dropped; summary with effort (1-10), notes, optional photo (private bucket, uploaded after the workout), visibility (defaults to the profile's), and "Update routine with these changes" when the session deviated (structure plus lifted weights; rep targets stay).
- **Mini bar**: docks above the tab bar on every tab while a workout is in progress.
- **Approved additions**: expo-keep-awake, expo-notifications (local only), expo-network, expo-image-picker, expo-file-system.

## 10F. Plan generator decisions (Phase 5, 2026-10-08)

Rules in [PLAN_ENGINE.md](PLAN_ENGINE.md); schema in [SCHEMA.md](SCHEMA.md). Resolves open decision #16.

- **Rules-based engine**: pure TypeScript (`src/lib/plans/engine`), deterministic per answers, library and seed; split tables by days, goal profiles, weekly-volume targets by level, curated exercise choices. No AI; "Why this plan" is plain text built from the rules applied.
- **Questionnaire**: seven screens (goal, experience, schedule, session length, equipment, focus and exercises to leave out, plan length), prefilled from onboarding; a live preview of the split. Equipment adds a pull-up/dip bar toggle; fat loss and toned add an optional 10–20 min cardio finisher inside the session time. Priority muscles are picked from 10 volume groups.
- **Back-to-back days never share primary muscles**: each session owns a set of muscles and exercises must fit inside it; the scheduler orders sessions (and falls back to another split) so neighbouring days own disjoint muscles, Sunday → Monday included.
- **Time wins over volume**: every session fits its time (the routine builder's duration estimate); weekly sets never exceed the level's ceiling but can fall below the floor, and the plan says why and what would fix it.
- **Progression (resolves #16)**: linear for beginners (+2.5 kg upper, +5 kg lower), double progression for everyone else, reps then harder variations for bodyweight moves, +5 s for holds. Applied when a planned session starts; week 1 leaves weights blank with "find your working weight". Deload in the last week of 6- and 8-week plans (60% of sets, 2 more reps in reserve, ~90% loads).
- **Routines**: one per session type plus a deload copy, shared across weeks (`source = 'plan'`), hidden from the Routines list. Swap and regenerate ask "just this session" (the day gets its own copy) or "every week".
- **Calendar**: Monday–Sunday weeks; start this week (past days left out) or next Monday, defaulting to this week when at least half its sessions remain. Missed sessions offer "shift the week" (later sessions move by the same gap; the plan ends later) or "skip". Move within the week (with a warning when it lands next to the same muscles), pause and resume (days move by the time paused), end plan. One active plan at a time; starting a new one ends the old one.
- **Tracking**: finishing a planned workout marks its day done locally and on the server (trigger), even when the workout syncs before the plan. Plans sync like routines (outbox, whole-plan `save_plan()`, pending local changes win).

## 10G. Rank engine decisions (Phase 6, 2026-10-08/09)

Rules in [RANK_SYSTEM.md](RANK_SYSTEM.md); schema in [SCHEMA.md](SCHEMA.md). Replaces the 2026-10-06 DOTS model (RANK_SYSTEM.md §16 lists what changed).

- **Postgres engine**: `rank_recompute_user` rebuilds a lifter's ranks, records and history from their sets. `save_workout` runs it when a workout completes or is edited and returns the rewards. Deletes, weigh-ins, profile changes and new standards queue a background recompute, processed by pg_cron every minute. No Edge Function.
- **Standards in tables**: `pnpm standards:build` publishes a version from `supabase/seed/standards.ts`, and publishing queues everyone. Weightlifting tables come from DOTS lift shares per bodyweight band; calisthenics and skill tables are written by hand. The middle of the ladder was eased after the fake-user check showed 1–2 year lifters landing in Silver.
- **The window counts back from your latest set of each lift**, not from today, so a break never costs points and ranks show Inactive after 60 days.
- **Age factors** (under 16 ×1.15 … 60+ ×1.32) are applied to the measured value. "Rather not say" uses the average of both curves.
- **Machines stay unranked**. Weightlifting = barbell and dumbbell lifts; Calisthenics = bodyweight lifts and skills. Pull-ups, chin-ups and dips moved to Calisthenics. New rank key `handstand` (library v2).
- **Bodyweight**: each set uses the weigh-in closest to it within ±30 days. A weighted set without one waits, and the summary asks for a weigh-in.
- **Records**: every exercise, six kinds. The first time is a baseline, not celebrated. Rebuilt on every recompute.
- **Guardrails**: impossible-looking sets (e1RM over a per-lift multiple of bodyweight, more than 100 loaded reps, rep and hold limits) are flagged for review instead of ranking.
- **Summary**: after Save the app waits for the sync, then shows a tier-coloured badge reveal for the biggest rank-up (Reanimated spring, success haptic, a fade under reduced motion), the PRs, other rank changes, placement progress and any weigh-in prompt. Offline it says the ranks follow when it syncs. The same rewards show on the workout in History.
- **Client**: `src/lib/ranks` holds parsers, the API and hooks (`useWorkoutRewards`, `useRanks`, `useRankPredictions`). `src/lib/game/strength.ts` is gone; the logger's e1RM uses the engine formula (no estimate above 10 reps).

## 10H. Rank tab and leagues decisions (Phase 7, 2026-10-09)

Rules in [RANK_SYSTEM.md](RANK_SYSTEM.md) §18–19; schema in [SCHEMA.md](SCHEMA.md). This resolves open decision #6.

- **Leagues, decided with the user**:
  - pg_cron and SQL (`league_run_cycle`, hourly and idempotent), not an Edge Function, as with the rank engine.
  - Anyone onboarded with a workout in the last 14 days is placed automatically, and a first workout mid-week joins straight away.
  - Results show in the app (a sheet on the next open) with a local reminder. Push arrives in Phase 12.
- **Format**:
  - Rookie, Contender, Elite and Legend.
  - Groups of about 30 by overall Rank Score.
  - The top and bottom 20% move, with no promotion on 0 LP.
  - 8-week seasons with a badge for everyone and frames for Elite and Legend.
- **LP formula**: workouts (40 a day), planned sessions (+15), PRs (10, cap 60), lift rank-ups (30, cap 90), beating your 4-week baseline (+50) and score gains (2 per point, cap 60). Absolute strength never counts.
- **Custom leagues**:
  - Private, 1–8 weeks, joined by an 8-character code or link.
  - Scored by LP, attendance, one lift's improvement or volume.
  - The creator adds challenges.
  - `community_id` is reserved for Phase 12B.
- **Clock**: `league_now()` lets tests and `pnpm leagues:simulate` look at fast-forwarded weeks; results never depend on it.
- **Rank tab**:
  - My Ranks: hero with placement progress, a progression chart (Victory Native, 1M–All, any scope, rank-up markers), every rankable lift, a lift detail screen and How ranks work.
  - Body Map: muscle sheet with the lifts behind it and the weakest link.
  - Analysis: predictions, rank-ups by weekday and time of day, the region donut, strengths and balance ratios.
  - Records: grouped by exercise, with filters. Share to feed is wired in Phase 9.
  - Server reads need an account; the signed-out preview shows a sign-in prompt instead of errors.
- **Percentile**: shown only with 20 or more lifters of your standards sex and bodyweight band, as a percentage only.
- **Art**:
  - Rank badges are the generated metal PNGs (Codex pass) with vector pips. The interim SVG set was removed.
  - Season frames are original SVG components in `avatarFrameArt`.
  - The shared `BodyMap` now also draws the exercise detail and workout summary muscle maps.
- **Approved additions**: `victory-native` and `@shopify/react-native-skia` (Skia's install script approved in `pnpm-workspace.yaml`).

## 10I. Social decisions (Phase 9, 2026-10-10)

Schema in [SCHEMA.md](SCHEMA.md) → Social; ranking in [DISCOVER_RANKING.md](DISCOVER_RANKING.md).

- **Graph**: friends are mutual (request → accept); follows are one-way and only for public profiles; blocking ends friendships, requests and follows both ways and hides each person from the other everywhere (posts, comments, profiles, search, Discover, suggestions). `are_friends` is real now (it was a stub).
- **Visibility (follows the existing privacy copy)**: the more restrictive of a post's and its author's profile visibility wins. A friends-only profile caps public posts at friends; a private profile's posts are only for its author. Only public posts from public profiles reach Discover.
- **Workout posts**: every finished workout that isn't "Only me" gets a post automatically with the summary's visibility (a private workout gets none); changing the workout's visibility later moves or removes the post. Workout notes never appear.
- **Milestones**: Settings → Privacy → Share milestones: Ask me (default; Share buttons after a workout, in Records and on league results), Automatically (each workout's best record and biggest rank-up), Never (also turns off goal posts). Milestones are built on the server from the user's own data. Phase 8's `goal_posts` moved into `posts`.
- **Photos**: up to 4 per post, resized to 1600 px and re-encoded on the phone (which strips EXIF, GPS included; workout photos get the same treatment now that they appear on posts). Private storage with short-lived signed links, cached by path.
- **Goal and experience** are ranking signals and filters only, never printed on cards (decided with the user). Discover reason chips name only college, city, similar rank and mutual friends.
- **Friends tab (decided with the user)**: requests and the friends list are real now; search lives in Discover; invites, QR, contacts and leaderboards remain Phase 10.
- **Moderation**: reports (8 reasons, optional details) are stored for review; review tools stay in Phase 13 (#17 narrowed).
- **Approved additions**: `expo-image` (cached images in lists) and `expo-image-manipulator` (resizing and EXIF stripping).

## 11. Open decisions

Resolve these with the user before building the phase that needs them.

| #   | Topic              | Question                                                                                                                                                                                              | Needed by                  |
| --- | ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| 1   | App name           | Final name, bundle IDs (`com.rankedgym.app` placeholder), store listing, logo.                                                                                                                        | Phase 15 (ideally earlier) |
| 5   | XP and levels      | XP sources (workouts, PRs, streaks, social), the level curve, and anti-farming caps.                                                                                                                  | Phase 11                   |
| 7   | Streak stakes      | What is at stake: points/XP, cosmetic penalties, or real money. Real money raises legal and payment issues in India, so the recommendation is no money at launch.                                     | Phase 12                   |
| 8   | Anti-cheat         | Which ranks need verification, evidence type (video?), reviewers (mods/peers), outlier thresholds, and appeals.                                                                                       | Phase 13                   |
| 11  | Regions            | Source for the college and city lists (curated seed? user-submitted plus moderation?), and verification of college membership (college email?).                                                       | Phase 10                   |
| 13  | Under-18 consent   | Minimum age is 13 (decided). Still open: DPDP Act handling for 13–17s (verifiable parental consent, no behavioural tracking): consent flow, forcing private visibility, or raising the minimum to 18. | Before Phase 15            |
| 14  | Referral rewards   | What the inviter and invitee get, and abuse limits.                                                                                                                                                   | Phase 10                   |
| 17  | Content moderation | Reporting and blocking shipped in Phase 9. Still open: who reviews reports, tooling, auto-hide thresholds, appeals.                                                                                   | Phase 13                   |
| 18  | Monetisation       | Free vs premium features; ads (probably not).                                                                                                                                                         | Before Phase 15            |
| 19  | Light-mode parity  | Is light mode fully supported at launch or best-effort? (Phase 0 builds both; Phase 0B designs both.)                                                                                                 | Phase 14                   |
| 20  | Charts in Expo Go  | Victory Native and Skia are installed (Phase 7). Confirm chart performance on low-end Android.                                                                                                        | Phase 14                   |
| 22  | Age brackets       | Rank age factors are decided (Phase 6). Still open: whether leaderboards also group people by age bracket (onboarding says they do), and which brackets.                                              | Phase 10                   |
| 23  | Apple sign-in      | Required by the App Store when Google is offered. Needs a dev build (or Expo Go's bundle id) and an Apple Developer account.                                                                          | Before Phase 15            |
| 25  | Exercise media     | Source for exercise images or clips with a clear licence (or record our own); `exercises.media_url` is ready.                                                                                         | Before Phase 15            |
| 24  | Countries          | Country is stored (default `IN`) but not asked. Add a picker when launching outside India.                                                                                                            | After launch               |
