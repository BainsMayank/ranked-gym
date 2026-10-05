# Ranked Gym — Product Spec

> Working name: **Ranked Gym** (placeholder; see Open decisions).
> Status: living document. Update it whenever a decision is made, and keep **Open decisions** current.

## 1. Vision

A social, ranked gym and self-improvement app for Android and iOS. Every set you log feeds a strength rank (Iron to Champion) for each lift, each muscle and overall. You compete with friends, your college and your city, keep each other accountable, and grow together.

**Audience**: college students in India first (hostels, college gyms, societies), then everyone.

**Core loop**: log a workout (works offline) → server recalculates ranks, XP and streaks → see progress (rank-ups, records, body map) → share and compete (feed, leaderboards, leagues, battles) → come back tomorrow (streaks, stakes, pods).

## 2. Navigation

Five bottom tabs, in this order:

| Tab     | Structure                      | Sub-sections                                                                 |
| ------- | ------------------------------ | ---------------------------------------------------------------------------- |
| Home    | Top tabs                       | For You · Feed · Discover                                                    |
| Workout | One scrolling screen           | My Plan · New Workout · Routines                                             |
| Rank    | Top tabs                       | My Ranks · Body Map · Leagues · Analysis · Records                           |
| Friends | Top tabs                       | Friends · Leaderboards · Invite                                              |
| Profile | Single screen + settings stack | Profile, Settings (account, appearance, units, notifications, privacy, data) |

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

- **8 tiers**: Iron, Bronze, Silver, Gold, Platinum, Diamond, Master, Champion.
- Tiers have divisions (placeholder: IV → I). Master and Champion have none.
- Ranks are computed **server-side** from verified logs. The exact formula is an open decision.

## 6. Friends tab

### 6.1 Friends

- Friends list, add and search, friend requests.

### 6.2 Leaderboards

- **Scopes**: friends, regional (city / college) and global.
- **Filters**: by lift, overall rank, XP and streak.

### 6.3 Invite

- Invite links, plus referral rewards (granted server-side).

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
- **Theming**: dark-first, with a light variant. All colours come from theme tokens.

## 10. Phases

See [PROGRESS.md](PROGRESS.md) for the checklist (0 Foundation … 15 Launch).

## 11. Open decisions

Resolve these with the user before building the phase that needs them.

| #   | Topic              | Question                                                                                                                                                                       | Needed by                  |
| --- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------- |
| 1   | App name           | Final name, bundle IDs (`com.rankedgym.app` placeholder), store listing, logo.                                                                                                 | Phase 15 (ideally earlier) |
| 2   | Rank formula       | Strength standards source (bodyweight-relative ratios? age/sex adjustments? public datasets?), e1RM formula (Epley/Brzycki), and how rep PRs, volume and calisthenics feed in. | Phase 6                    |
| 3   | Divisions          | How many divisions per tier (placeholder IV→I), and whether Master/Champion are percentile-based (top X%).                                                                     | Phase 6                    |
| 4   | Overall rank       | How per-lift and per-muscle ranks combine into an overall rank, and which lifts count.                                                                                         | Phase 6                    |
| 5   | XP and levels      | XP sources (workouts, PRs, streaks, social), the level curve, and anti-farming caps.                                                                                           | Phase 11                   |
| 6   | Leagues            | Weekly vs seasonal format, season length, group size, promotion/relegation, and the scoring metric (XP? rank gains?).                                                          | Phase 7                    |
| 7   | Streak stakes      | What is at stake: points/XP, cosmetic penalties, or real money. Real money raises legal and payment issues in India, so the recommendation is no money at launch.              | Phase 12                   |
| 8   | Anti-cheat         | Which ranks need verification, evidence type (video?), reviewers (mods/peers), outlier thresholds, and appeals.                                                                | Phase 13                   |
| 9   | Calories           | Estimation method (MET-based by duration and intensity? a wearable later?).                                                                                                    | Phase 8                    |
| 10  | Recovery model     | Formula for recovery % per muscle (time decay × volume × RPE?).                                                                                                                | Phase 8                    |
| 11  | Regions            | Source for the college and city lists (curated seed? user-submitted plus moderation?), and verification of college membership (college email?).                                | Phase 10                   |
| 12  | Auth methods       | Email OTP, Google, Apple (required on iOS if other social logins are offered), phone OTP (popular in India; SMS cost).                                                         | Phase 1                    |
| 13  | Age and consent    | Minimum age, and DPDP Act handling for users under 18.                                                                                                                         | Phase 1                    |
| 14  | Referral rewards   | What the inviter and invitee get, and abuse limits.                                                                                                                            | Phase 10                   |
| 15  | Exercise library   | Source and licensing (own dataset vs open dataset), media (GIFs/videos), and muscle taxonomy for the body map.                                                                 | Phase 2                    |
| 16  | Plan generator     | Rules-based templates vs an algorithm; progression model (linear, double progression, RIR-based).                                                                              | Phase 5                    |
| 17  | Content moderation | Reporting, blocking, moderation tooling for feed, discover and comments.                                                                                                       | Phase 13                   |
| 18  | Monetisation       | Free vs premium features; ads (probably not).                                                                                                                                  | Before Phase 15            |
| 19  | Light-mode parity  | Is light mode fully supported at launch or best-effort? (Phase 0 builds both.)                                                                                                 | Phase 14                   |
| 20  | Charts in Expo Go  | Victory Native needs Skia, which is in Expo Go. Confirm performance on low-end Android when charts land.                                                                       | Phase 7                    |
