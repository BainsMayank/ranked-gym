# Rank system

> How Ranked Gym turns logged sets into ranks, records and rank history. Rebuilt in Phase 6
> (2026-10-08/09); it replaces the 2026-10-06 DOTS "Strength Score" model (see §16).
>
> **Source of truth**: the Postgres engine (`supabase/migrations/*_rank_engine.sql`,
> `rank_recompute_user`) with the standards in tables (`supabase/seed/standards.ts` →
> `pnpm standards:build`). **Mirror**: `src/lib/game/engine` follows the same rules in TypeScript for
> tests, the fake-user check and previews. A generated test checks the two agree on 50 lifters.
> The app never computes a rank; it only shows what the server sends.

## 1. Principles

1. **Real numbers.** A rank means the same in the app as on a gym floor. World-record lifts are always Champion.
2. **Fair comparisons.** You're judged against lifters of your sex, bodyweight and age bracket.
3. **Current strength.** Ranks come from your best lifting in the last 180 days of training, so they show where you are now.
4. **Hard to lose by accident.** A break never costs points (ranks just show Inactive), and bulking never hurts, because each set is scored at the bodyweight you had that day.
5. **Server-trusted.** Ranks, records and history are computed in Postgres from logged sets. Clients can't write them.

Strength ranks measure strength only. Effort is rewarded separately by XP (Phase 11) and weekly leagues (Phase 7), which never use absolute strength, so an Iron lifter can still win their league.

## 2. The ladder

Every rank sits on a **Rank Score from 0 to 1000**. Tiers and divisions are thresholds on that score, stored in `rank_thresholds` (so they can be rebalanced without an app update).

| Tier     | Starts at | Divisions (III → II → I) |
| -------- | --------: | ------------------------ |
| Iron     |         0 | 0 · 33.33 · 66.67        |
| Bronze   |       100 | 100 · 150 · 200          |
| Silver   |       250 | 250 · 300 · 350          |
| Gold     |       400 | 400 · 450 · 500          |
| Platinum |       550 | 550 · 600 · 650          |
| Diamond  |       700 | 700 · 750 · 800          |
| Master   |       850 | 850 · 883.33 · 916.67    |
| Champion |       950 | none                     |

Every tier but Champion has three divisions, III (lowest) to I (highest), each a third of the tier. The score is capped at 1000. On the ladder, Iron III is position 0 and Champion is position 21 (`rank_ordinal`). A move up that ladder is a rank-up.

## 3. From a lift to a Rank Score

Each lift has a **standard**: the measured value you need at each score anchor. Anchors sit on the tier floors (Bronze 100, Silver 250, Gold 400, Platinum 550, Diamond 700, Master 850, Champion 950), so "Gold" means the Gold anchor of every table.

- **What's measured** depends on the lift (§5): e1RM ÷ bodyweight, clean reps, or hold seconds.
- **Between anchors**, the score is interpolated in a straight line. Below the first anchor, the line runs from zero (an empty-bar bench is still Iron II). Above the last anchor, it continues at the last slope until it reaches 1000. Straight lines keep every division the same step in kg, reps or seconds within a tier, and they can be inverted exactly, which predictions rely on (§12).
- **A progression can be capped.** For example, a tuck front lever tops out at 450 (Gold III) however long you hold it (§5.3).

## 4. Estimated 1RM (e1RM)

| Reps in the set | e1RM                                                                |
| --------------- | ------------------------------------------------------------------- |
| 1               | the weight lifted                                                   |
| 2–10            | the average of Epley (w × (1 + r/30)) and Brzycki (w × 36/(37 − r)) |
| above 10        | no e1RM: the set doesn't rank a weight lift                         |

Epley runs high and Brzycki low as reps rise; their average stays close to tested maxes up to about 10 reps. Above that, estimates drift too far to be fair. Those sets still count for reps-based standards and for records. The logger's live e1RM uses the same formula, so what you see while lifting is what ranks.

## 5. What each lift measures

### 5.1 Weightlifting (barbell and dumbbell)

The value is **e1RM × age factor ÷ bodyweight**. Dumbbell lifts are logged per dumbbell, and their standards are per hand.

| Discipline    | Lifts                                                                                                                                                                                                                                                                                                                                     |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Weightlifting | Back squat, front squat, Bulgarian split squat, deadlift, sumo deadlift, trap bar deadlift, Romanian deadlift, hip thrust, power clean, bench press, incline bench, close-grip bench, dumbbell bench, incline dumbbell press, overhead press, push press, dumbbell shoulder press, barbell row, dumbbell row, barbell curl, dumbbell curl |

Machines, cables and Smith machines never rank because they differ between gyms. They still earn records, volume and (later) XP. Custom exercises never rank.

**How the standards are made.** Each lift has a _share_: the part of a powerlifting-style total its 1RM typically represents (back squat ≈ 35% for men, bench 25.5%). Each anchor sits at a fixed DOTS score (Bronze 120, Silver 165, Gold 205, Platinum 250, Diamond 310, Master 390, Champion 500). For each bodyweight band, that score is turned back into the e1RM a lifter of that weight needs, then divided by bodyweight. DOTS is the coefficient powerlifting federations use for "best lifter". It bends the curve so heavier lifters need more kg but a smaller multiple of bodyweight. The reasoning for every lift's share is a comment block in `supabase/seed/standards/weightlifting.ts`.

### 5.2 Calisthenics (bodyweight)

| Lift              | Measured as                                                     |
| ----------------- | --------------------------------------------------------------- |
| Pull-up, chin-up  | clean reps, or weighted: (bodyweight + added) e1RM ÷ bodyweight |
| Dip               | clean reps, or weighted (same)                                  |
| Push-up           | clean reps, or weighted (plate or vest)                         |
| Pistol squat      | clean reps per leg, or weighted                                 |
| Muscle-up         | clean reps                                                      |
| Handstand push-up | clean reps (wall, full range)                                   |

A set scores the **better of the reps and weighted tables**. Up to 10 reps the two agree (10 bodyweight pull-ups score about the same either way), so adding a belt never costs you. Reps tables don't need a weigh-in. Some anchors are below one rep (0.5) only so that a first rep lands on the right tier (a woman's first pull-up is Silver).

| Pull-up, men   | Bronze | Silver | Gold | Platinum | Diamond | Master | Champion |
| -------------- | -----: | -----: | ---: | -------: | ------: | -----: | -------: |
| Clean reps     |      1 |      5 |   11 |       16 |      22 |     30 |       40 |
| Weighted ratio |   1.00 |   1.15 | 1.35 |     1.55 |    1.75 |   2.00 |     2.30 |

| Pull-up, women | Bronze | Silver | Gold | Platinum | Diamond | Master | Champion |
| -------------- | -----: | -----: | ---: | -------: | ------: | -----: | -------: |
| Clean reps     |    0.5 |      1 |    4 |        8 |      12 |     17 |       24 |
| Weighted ratio |   0.85 |   1.00 | 1.15 |     1.30 |    1.50 |   1.70 |     1.95 |

A weighted ratio of 2.0 means a single with your own bodyweight added (a 75 kg man with +75 kg is Master). The other lifts' tables, with their reasoning, are in `supabase/seed/standards/calisthenics.ts`.

### 5.3 Skills (holds)

Static skills score the **longest hold**. Progressions rank into the full skill (through `rank_variants`), each capped below the next step, so a long tuck lever never outranks a short full one.

| Skill       | Progressions (cap)                                                                     | Full skill                               |
| ----------- | -------------------------------------------------------------------------------------- | ---------------------------------------- |
| Front lever | Tuck (Gold III), advanced tuck (Platinum II), straddle (Diamond II)                    | 1 s Diamond, 3 s Master, 15 s Champion   |
| Back lever  | Tuck (Gold III)                                                                        | 3 s Platinum, 10 s Diamond, 20 s Master  |
| Planche     | Lean (Silver II), tuck (Platinum II), advanced tuck (Diamond II), straddle (Master II) | 0.5 s Diamond, 2 s Master, 10 s Champion |
| L-sit       | Tuck (Gold III)                                                                        | 10 s Gold, 30 s Diamond, 60 s Champion   |
| Handstand   | Against a wall (Gold III)                                                              | 10 s Gold, 30 s Platinum, 60 s Diamond   |

Holds and skill reps are the same for men and women, because they depend on leverage and bodyweight ratio more than absolute strength.

## 6. Who you're compared with

- **Bodyweight.** Each set is scored at the weigh-in closest to that set, up to 30 days either side (on a tie, the later weigh-in wins). A weighted set with no weigh-in in range doesn't rank. The summary then shows "Add a weigh-in to rank these lifts", and the set ranks as soon as you add one. Because each set uses that day's bodyweight, a bulk never lowers an old score.
- **Bodyweight bands.** Standards are stored per band (men 45–140 kg, women 40–120 kg). Values are blended in a straight line between band centres, so crossing a band edge never makes a score jump. Below the lightest centre or above the heaviest, the edge band applies.
- **Sex.** Onboarding asks "Men's", "Women's" or "Rather not say". **Rather not say ranks on the average of the men's and women's values** at your bodyweight; the Edit profile screen explains this. Changing it re-ranks every lift.
- **Age.** Your measured value (e1RM, reps or seconds) is multiplied by an age factor, roughly the McCulloch (masters) and Foster (teen) coefficients. Age is the current year minus your birth year. The factors are in `strength_age_brackets`.

  | Age    | under 16 | 16–17 | 18–34 | 35–39 | 40–49 | 50–59 |  60+ |
  | ------ | -------: | ----: | ----: | ----: | ----: | ----: | ---: |
  | Factor |     1.15 |  1.06 |  1.00 |  1.02 |  1.08 |  1.18 | 1.32 |

## 7. Which sets count

A set can rank when **all** of these hold:

- it's completed, in a finished workout
- it's not a warm-up (working, top, back-off, drop, failure and AMRAP sets all count)
- it's not marked failed
- it's not assisted (assistance mode, or an assisted exercise like the assisted pull-up machine)
- the exercise carries a rank key (or is a skill progression), so machines and custom exercises don't rank
- it isn't held back by a guardrail (§11)

## 8. Your score for each lift: the 180-day window

Your score for a lift is the **best set within the 180 days before your latest set of that lift**. The window is anchored to your own training, not to today:

- **While you're away** the score stays frozen. After 60 days with no rankable sets at all, your ranks show as **Inactive** (greyed), with no points lost.
- **When you come back**, your next session of that lift moves the window forward. Records older than 180 days before it drop out, so the score reflects your strength now. This is the only way a lift ranks down, apart from editing or deleting workouts.

## 9. Muscle, region, overall and discipline ranks

- **Muscle**: a weighted average of the lift scores that train it, using the library's muscle weights (primary 1, secondary 0.5 or 0.25; stabilisers don't count). Muscles nothing trains stay unranked.
- **Region** (chest, shoulders, arms, back, core, legs): the average of its ranked muscles.
- **Overall**: a weighted average of the ranked regions. The weights are legs 0.25, back 0.20, chest 0.20, shoulders 0.15, arms 0.10 and core 0.10, renormalised over the regions you have.
- **Placement**: the overall rank appears once you have **5 ranked lifts covering at least 4 regions**. A lift covers the regions of its primary muscles. Before that, the summary shows "Placement: 3/5 lifts", like placement matches in games.
- **Weightlifting** and **Calisthenics** ranks use the same muscle → region → weighted pipeline on their own lifts only. Each needs 3 lifts.

Every level is rounded to 2 decimals before the next one uses it, in Postgres and in the mirror alike.

## 10. Personal records

Every exercise keeps records, ranked or not (machines and custom exercises too):

| Record                | Value                                                  |
| --------------------- | ------------------------------------------------------ |
| Estimated 1RM         | e1RM of a weight-lift set (1–10 reps)                  |
| Heaviest weight       | the load (or added load on a bodyweight lift)          |
| Most reps at a weight | reps, kept separately for each weight (0 = bodyweight) |
| Best set volume       | weight × reps                                          |
| Best session volume   | weight × reps over the exercise's sets in one workout  |
| Longest hold          | seconds, for timed exercises                           |

A value is a record when it beats **every earlier value** of that kind, strictly. The first value for an exercise (or the first set at a new weight) is a **baseline**. It's stored, but not celebrated, so a first workout doesn't show 15 PRs; the summary says "today's numbers are the baseline". Warm-ups, failed sets, assisted sets and flagged sets never set records. Records are rebuilt in order on every recompute, so editing or deleting a workout puts them right. Sets that set a record get `workout_sets.is_pr`.

## 11. Guardrails

Sets that look impossible are **flagged for review** instead of ranking or setting records (`rank_flags`, status pending). Full anti-cheat is Phase 13.

- e1RM above a per-lift multiple of bodyweight (bench 4×, squat 5×, deadlift 5.5× … well above every world record). Sets above 10 reps are judged as if they were 10.
- More than 100 reps with any load on any exercise.
- Bodyweight lifts above a rep limit (pull-ups 80, push-ups 200 …) and holds above a time limit (front lever 120 s …).

An approved flag lets the set rank; a rejected one keeps it out. The summary says when a set was held back ("If it was a typo, edit the workout").

## 12. History, rewards and predictions

- **Snapshots** (`rank_snapshots`): a row whenever a score changes by 0.1 or more, for every scope (lift, muscle, region, overall, weightlifting, calisthenics). These feed the progression chart in Phase 7.
- **Events** (`rank_events`): _placed_ (first rank), _rank up_ or _rank down_, whenever the tier or division changes. Each event is tagged with the workout that caused it.
- **Rewards**: `save_workout` scores a finished workout as it syncs and returns `{ prs, rank_changes, placement, needs_bodyweight, flagged, xp_placeholder }`. The summary screen shows them, with a badge reveal for the biggest rank-up. They're kept in `workout_rewards` and shown on the workout in History.
- **Predictions** (`get_rank_predictions`). For each lift: the next division's score, turned back into what you'd need at today's bodyweight.
  - Weightlifting: the e1RM, and the weight for sets of 1, 3, 5 and 8 reps, rounded up to 0.5 kg.
  - Calisthenics: clean reps, added kg for 1/3/5/8 reps, or hold seconds.
  - **ETA**: a least-squares line through your best e1RM per session over the last 8 weeks (best score per session for calisthenics). It needs at least 4 sessions, otherwise "Need more sessions"; a flat or falling trend says so instead of guessing.

## 13. When ranks are recomputed

`rank_recompute_user` rebuilds one lifter's ranks, records, flags and history from their sets. It's deterministic, so running it again is always safe.

| What happened                                   | When it runs                                  |
| ----------------------------------------------- | --------------------------------------------- |
| A workout is finished, or a finished one edited | right away, inside `save_workout`             |
| A workout is deleted                            | queued (`rank_jobs`), pg_cron within a minute |
| A weigh-in is added, changed or deleted         | queued                                        |
| Standards sex or birth year changes             | queued                                        |
| New standards or settings are published         | everyone with a finished workout is queued    |

If scoring ever fails inside `save_workout`, the save still succeeds and the lifter is queued instead.

## 14. Rebalancing

Standards, thresholds, age factors, region weights and settings all live in tables.

1. Edit `supabase/seed/standards.ts` (or the files in `supabase/seed/standards/`).
2. Bump `STANDARDS_VERSION`.
3. Run `pnpm standards:build`. It validates the standards and writes a migration that publishes the version and queues everyone.
4. Run `pnpm ranks:fake` to regenerate the 50-lifter parity test.
5. Run `pnpm db:reset && pnpm db:test`.

The distribution table prints in both `pnpm test` and `pnpm db:test`, so the effect of a change is visible straight away.

**Fake-user check (v1).** 50 fake lifters with realistic histories (`supabase/seed/fakeUsers.ts`) are used:

- Their strength is modelled from training age using ExRx-style tables, independently of our standards.
- Strength is scaled by talent, bodyweight and sex.
- The mix is 30 men, 15 women and 5 "rather not say", aged 16–52, with gym and calisthenics styles.

| Training age     | Iron | Bronze | Silver | Gold | Platinum | Diamond | Master | Champion |
| ---------------- | ---: | -----: | -----: | ---: | -------: | ------: | -----: | -------: |
| 0–6 months (20)  |    1 |     15 |      4 |      |          |         |        |          |
| 6–12 months (12) |      |      2 |      7 |    2 |        1 |         |        |          |
| 1–2 years (12)   |      |        |      4 |    6 |        2 |         |        |          |
| 3–5 years (5)    |      |        |        |      |        4 |       1 |        |          |
| 8+ years (1)     |      |        |        |      |          |         |      1 |          |

The tests require most beginners in Iron–Silver, most 1–2 year lifters in Gold–Platinum, and at most two lifters in Master and Champion. The first calibration (the 2026-10-06 tier floors) put most 1–2 year lifters in Silver. v1 eases the middle of the ladder, which is why its anchors sit lower than the old floors.

## 15. What it takes (e1RM, kg)

Generated from standards v1. Each cell is where the tier starts; divisions sit evenly in between.

**Men**

| Bodyweight | Lift           | Bronze | Silver |  Gold | Platinum | Diamond | Master | Champion |
| ---------- | -------------- | -----: | -----: | ----: | -------: | ------: | -----: | -------: |
| 60 kg      | Squat          |     50 |   67.5 |    85 |    102.5 |   127.5 |  162.5 |    207.5 |
|            | Bench          |     35 |     50 |  62.5 |       75 |    92.5 |  117.5 |      150 |
|            | Deadlift       |     55 |   77.5 |    95 |    117.5 |     145 |  182.5 |      235 |
|            | Overhead press |   22.5 |   32.5 |    40 |       50 |      60 |   77.5 |     97.5 |
| 75 kg      | Squat          |   57.5 |     80 |   100 |    122.5 |     150 |    190 |      245 |
|            | Bench          |   42.5 |   57.5 |  72.5 |       90 |     110 |  137.5 |    177.5 |
|            | Deadlift       |     65 |     90 | 112.5 |    137.5 |     170 |    215 |      275 |
|            | Overhead press |   27.5 |   37.5 |  47.5 |     57.5 |    72.5 |     90 |      115 |
| 90 kg      | Squat          |     65 |     90 |   110 |      135 |   167.5 |    210 |      270 |
|            | Bench          |   47.5 |     65 |    80 |     97.5 |   122.5 |    155 |    197.5 |
|            | Deadlift       |   72.5 |    100 |   125 |    152.5 |     190 |  237.5 |      305 |
|            | Overhead press |     30 |   42.5 |  52.5 |       65 |      80 |    100 |    127.5 |

**Women**

| Bodyweight | Lift           | Bronze | Silver | Gold | Platinum | Diamond | Master | Champion |
| ---------- | -------------- | -----: | -----: | ---: | -------: | ------: | -----: | -------: |
| 55 kg      | Squat          |   37.5 |   52.5 |   65 |       80 |    97.5 |  122.5 |    157.5 |
|            | Bench          |   22.5 |     30 | 37.5 |       45 |    57.5 |   72.5 |     92.5 |
|            | Deadlift       |   42.5 |   57.5 | 72.5 |     87.5 |     110 |  137.5 |    177.5 |
|            | Overhead press |     15 |     20 | 22.5 |       30 |      35 |     45 |     57.5 |
| 70 kg      | Squat          |     45 |     60 |   75 |     92.5 |   112.5 |  142.5 |    182.5 |
|            | Bench          |     25 |     35 | 42.5 |     52.5 |      65 |   82.5 |    107.5 |
|            | Deadlift       |     50 |   67.5 |   85 |    102.5 |   127.5 |    160 |      205 |
|            | Overhead press |     15 |   22.5 | 27.5 |     32.5 |    42.5 |   52.5 |     67.5 |

For a 75 kg man the bench lines up with the ExRx (Kilgore) standards: untrained ≈ 50 kg is Bronze, novice ≈ 66 kg Silver, intermediate (about two years) ≈ 82 kg Gold, advanced ≈ 100 kg Platinum, elite ≈ 127 kg Diamond. World-record lifts at every bodyweight, men and women, are Champion (tested).

## 16. What changed from the 2026-10-06 model

Superseded in Phase 6, at the brief's request:

- DOTS "Strength Score" → the 0–1000 Rank Score from a standards table (DOTS now only builds the weightlifting tables).
- Divisions IV–I with Master and Champion undivided → III–I for every tier but Champion.
- Records fading after a year (−1% a month, floor 75%) → a 180-day window anchored to your latest set, plus Inactive after 60 days.
- Epley capped at 12 reps → the mean of Epley and Brzycki, 1–10 reps.
- Overall as the mean of 5 movement patterns (needing 3) → region-weighted, with placement at 5 lifts across 4 regions.
- Muscle ranks from the best primary lift (or 85% of a secondary one) → a weighted average by muscle share.
- "Rather not say" on men's standards → the average of both curves.
- No age adjustment → age factors.
- Pull-ups, chin-ups and dips moved from the weightlifting patterns to the Calisthenics discipline (they still count towards muscles and overall).

Peak-rank badges were part of the old model; the history tables make them possible. They move to the badges work in Phase 11 (the Rank tab shipped without them).

## 17. Still open

- **Peak-rank badges** (Phase 11 badges).
- **Calibration against real data.** v1 standards are estimates checked against published tables and the fake-user model. Before launch, check them against OpenPowerlifting and beta data and publish version 2.
- **Verification for high ranks** (Master and Champion, video or review), outlier checks on jumps, and review tools for flags: Phase 13 (open decision #8).
- **Leaderboard age brackets** (open decision #22). Age factors are decided; whether boards also group by age isn't.

## 18. Weekly leagues

Leagues reward **effort and progress, never absolute strength**, so an Iron lifter can win their group. Source of truth: `supabase/migrations/*_leagues.sql`; tested in `11_leagues.test.sql`.

### Format

- **Weeks** run Monday 00:00 to Monday 00:00 **IST**. **Seasons** are 8 weeks.
- **Divisions**: Rookie → Contender → Elite → Legend. Everyone starts in Rookie; your division carries from week to week (`league_standing`).
- **Placement**: at the weekly reset, everyone onboarded with a completed workout in the last 14 days is placed. Within each division, lifters are sorted by overall Rank Score (unplaced count as 0) and split into `ceil(n / 30)` near-equal groups, so groups hold similar ranks.
- **Joining mid-week**: a lifter's first completed workout during an open week places them straight away, in their division's group with the closest average score and room (up to 35), or a new group.
- **Results**: the top 20% of a group (rounded) are promoted and the bottom 20% demoted. Nobody promotes on 0 LP. Rookie can't demote and Legend can't promote. Ties go to whoever's last workout of the week came first, then whoever joined first.
- **Season rewards**: everyone who played gets a badge for the best division they reached (`season-<n>-<division>`). Elite and Legend also earn an avatar frame (`season-elite`, `season-legend`).
- **Results reach you** in the app on your next open after the reset (a results sheet, shown once). If notifications are already allowed and **League results** is on, the app also schedules a local reminder for the reset. Push notifications arrive in Phase 12.

### League Points (LP)

LP are counted per IST week, from your workouts and the rank engine's history:

| Source                                                                                                                          | LP         | Cap             |
| ------------------------------------------------------------------------------------------------------------------------------- | ---------- | --------------- |
| A completed workout with at least 4 completed working sets                                                                      | 40         | one per IST day |
| A planned session done within a day of its planned date                                                                         | +15        | one per day     |
| A PR (records that beat an earlier value; baselines don't count)                                                                | 10 each    | 60 a week       |
| A lift rank-up, or a lift's first rank                                                                                          | 30 each    | 90 a week       |
| Beat your baseline: this week's working sets are at least 110% of your own 4-week weekly average (your first week: 2+ workouts) | 50         | once a week     |
| Strength gain: 2 LP per Rank Score point gained this week on lifts you already had                                              | 2 × points | 60 a week       |

Nothing here grows with how much you lift: a workout is worth the same at Iron and Champion, PRs and rank-ups are relative to you, and score gains are on the 0–1000 scale, where each division is the same step at every tier. A busy week is worth about 400 LP.

LP are computed when read, so editing or deleting a workout corrects them. A week's final LP are frozen when it closes.

### The cycle

`league_run_cycle(p_now)` (pg_cron, hourly at :35; idempotent):

1. Closes every open week that has ended: final points and positions, promotion and demotion, divisions updated.
2. Finishes every season that has ended and grants its rewards.
3. Opens the week containing `p_now`, with placement and two challenges per group from a fixed pool.
4. Closes custom leagues that have ended.

Running it hourly means the Monday reset happens by 00:35 IST and catches up after downtime. `pnpm leagues:simulate` fast-forwards it locally.

### Custom leagues

A lifter can run up to 5 private leagues at a time, for 1–8 weeks, joined by an 8-character invite code (also an invite link). Each is scored one of four ways:

- **League Points**: as above, with weekly caps per IST week.
- **Attendance**: IST days with a qualifying workout.
- **Lift improvement**: Rank Score gained on one chosen lift, from your score at the start (or your first score in the league).
- **Volume**: working-set kilograms. This is the one absolute measure, and it's opt-in among friends.

Custom leagues have no promotion. The creator can add challenges, and leaving as the creator ends the league. `leagues.community_id` lets a league belong to a college, hostel or society in Phase 12B.

### Challenges

- **Most reps** of a lift, where the most wins.
- **Lift sessions**: train a lift N times (distinct IST days).
- **Workouts**: N qualifying workouts.

Weekly groups get two automatic challenges; custom-league creators add their own. Challenges show progress and leaders, and don't add LP.

## 19. The Rank tab reads

The app reads ranks only through these owner-only functions (`*_rank_tab.sql`, tested in `09_rank_tab.test.sql`):

- `get_rank_history`: snapshots for the progression chart, plus rank-up markers.
- `get_rank_events`: rank-ups by weekday and time of day, timed by the workout that caused them.
- `get_personal_records`: the Records tab.
- `get_lift_bests`: the set behind each ranked lift.
- `get_lift_detail`: the sets that counted, history and standards at your bodyweight and age.
- `get_lift_percentile`: a percentage among lifters of the same standards sex and bodyweight band. It returns nothing until 20 or more lifters are in the cohort, and never returns anyone's identity.

The body map's "built from" and "weakest link" split a server muscle score back into its lifts with the library weights of §9. This is display only.
