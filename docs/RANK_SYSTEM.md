# Rank system

> How Ranked Gym turns lifts into ranks. Decided 2026-10-06 (resolves Open decisions #2, #3 and #4 in [PRODUCT_SPEC.md](PRODUCT_SPEC.md)).
> Reference implementation: [`src/lib/game/strength.ts`](../src/lib/game/strength.ts), pinned by its tests. The Phase 6 rank engine (Postgres) mirrors it and is the source of truth.

## 1. Principles

1. **Real numbers.** A rank means the same thing as it would on a gym floor. Gold is a solid intermediate lifter, not a world-class one. World-record lifts are Champion, every time.
2. **Pound for pound.** A 60 kg lifter and a 100 kg lifter are judged on one fair scale (DOTS), and men and women on their own standards. Heavier lifters need more kg, but not proportionally more.
3. **Fast at the start, steady after.** New lifters rank up every few weeks because real beginner gains are fast. Later, ranks slow down the way real progress does, and other systems (below) keep the rewards coming.
4. **Every PR counts.** Even +2.5 kg moves your Strength Score and the progress bar. You never train for months with nothing changing.
5. **Hard to lose.** Bulking, a bad day or a short break never drops your rank. Only records more than a year old fade, and only gently.
6. **Trusted.** The server calculates ranks from logged sets. High ranks need verification before they show on public boards.

## 2. Three ways to progress

Strength ranks alone would stall for experienced lifters, so progress is split into three layers that reward different things:

| Layer             | Measures                 | Moves                             | Who wins                                          |
| ----------------- | ------------------------ | --------------------------------- | ------------------------------------------------- |
| **Strength rank** | How strong you are       | With PRs (fast early, slow later) | The strongest, pound for pound                    |
| **Level (XP)**    | How much work you put in | Every workout, streak and PR      | The most consistent                               |
| **League**        | How your week went       | Weekly, resets each week          | Anyone who trains hard this week, at any strength |

Leagues and XP never use absolute strength, so an Iron lifter can win their league. Ranks never use effort, so a rank always means real strength. Leagues (#6) and the XP curve (#5) are specified separately.

## 3. The ladder

8 tiers. Iron to Diamond have 4 divisions each (IV → I). Master and Champion have none. Within Master and Champion, your Strength Score and board position show where you stand.

| Tier     | Strength Score | Who gets here                           | Typical time (consistent training) |
| -------- | -------------- | --------------------------------------- | ---------------------------------- |
| Iron     | 0 – 140        | Just started                            | Day one                            |
| Bronze   | 140 – 190      | Novice: first few months                | 1 – 3 months                       |
| Silver   | 190 – 240      | Novice to early intermediate            | 4 – 9 months                       |
| Gold     | 240 – 290      | Intermediate                            | About 1 year                       |
| Platinum | 290 – 350      | Strong intermediate                     | 2 – 3 years                        |
| Diamond  | 350 – 430      | Advanced. Strongest person in most gyms | 3 – 6 years                        |
| Master   | 430 – 520      | Elite. State or national level          | Years of dedicated training        |
| Champion | 520 +          | International level, world records      | The very top                       |

Iron IV (0–80) catches the very first sessions, then Iron III, II and I start at 80, 100 and 120. Above Iron, divisions split each tier evenly: 12.5 SS each for Bronze to Gold, 15 for Platinum and 20 for Diamond. For a 75 kg man, 12.5 SS is about 4.5 kg on the bench or 6 kg on the squat.

## 4. Strength Score (SS)

Every ranked set converts to a **Strength Score** on one scale, so squats, bench, pull-ups, light and heavy lifters all share the same ladder. The scale is DOTS (the formula powerlifting federations use for "best lifter"), so a lifter's overall SS from squat, bench and deadlift is close to their real DOTS score.

### 4.1 Barbell and dumbbell lifts

```
e1RM = load                          (1 rep)
e1RM = load × (1 + reps ÷ 30)        (2–12 reps, Epley; sets above 12 reps count as 12)
SS   = e1RM × DOTS(bodyweight, sex) ÷ share(lift, sex)
```

- **DOTS(bodyweight, sex)** is the standard DOTS coefficient. Bodyweight is clamped to 40–210 kg (men) and 40–150 kg (women).
- **share** is the share of a powerlifting total that lift typically represents. It sets how heavy each lift needs to be relative to the others.
- Capping at 12 reps keeps the estimate honest (high-rep estimates run high), yet still lets a beginner who trains in the 8–12 range rank from day one.
- Warm-up sets never count. Working, top, back-off, drop and failure sets do.

### 4.2 Bodyweight lifts (pull-ups, chin-ups, dips)

These are judged on **system load ÷ bodyweight**, where system load = bodyweight + added weight (assistance counts as negative). 1.0 means one clean bodyweight rep. Bodyweight lifts don't scale like barbell lifts (a heavy lifter carries their own weight), so a ratio is fairer here than DOTS. Each tier starts at a set ratio, and the SS in between is interpolated.

| Pull-up ratio | Bronze | Silver | Gold | Platinum | Diamond | Master | Champion |
| ------------- | -----: | -----: | ---: | -------: | ------: | -----: | -------: |
| Men           |   1.00 |   1.15 | 1.35 |     1.55 |    1.75 |   2.00 |     2.30 |
| Women         |   0.85 |   1.00 | 1.15 |     1.30 |    1.50 |   1.70 |     1.95 |

So a man's first strict pull-up is Bronze, 12 bodyweight reps are Gold, and +75 kg at 75 kg bodyweight is Master. A woman's first unassisted pull-up is Silver. Chin-ups need 5% more; dips have their own table in the code.

### 4.3 Which lifts rank

Only free-weight and bodyweight lifts with stable standards rank. Machines and cables differ from gym to gym, so they still earn XP, volume and records but no rank.

| Pattern (overall) | Lifts                                                             |
| ----------------- | ----------------------------------------------------------------- |
| Squat             | Back squat, front squat                                           |
| Hinge             | Deadlift, sumo deadlift, trap bar deadlift, Romanian deadlift     |
| Horizontal push   | Bench press, incline bench, close-grip bench, dumbbell bench, dip |
| Vertical push     | Overhead press                                                    |
| Pull              | Pull-up, chin-up, barbell row                                     |
| Muscle ranks only | Hip thrust, barbell curl                                          |

The share for each lift (men / women) is in `rankedLifts` in the code. More lifts can be added later by setting a share, with no schema change.

**Rank keys** (Phase 2, `src/lib/game/rankKeys.ts`). Each ranked lift has one key, and exactly one official exercise carries it (`exercises.rank_key`, unique). Custom exercises never carry one.

| Status                                     | Keys                                                                                                                                                                                                                                                |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Standard defined (above)                   | `backSquat`, `frontSquat`, `deadlift`, `sumoDeadlift`, `trapBarDeadlift`, `romanianDeadlift`, `hipThrust`, `benchPress`, `inclineBench`, `closeGripBench`, `dumbbellBench`, `dip`, `overheadPress`, `pullUp`, `chinUp`, `barbellRow`, `barbellCurl` |
| Free weight, standard in Phase 6           | `bulgarianSplitSquat`, `powerClean`, `inclineDumbbellBench`, `pushPress`, `dumbbellShoulderPress`, `dumbbellRow`, `dumbbellCurl`                                                                                                                    |
| Calisthenics discipline, tables in Phase 6 | `pushUp`, `muscleUp`, `pistolSquat`, `handstandPushUp`, `frontLever`, `backLever`, `planche`, `lSit`                                                                                                                                                |

Skill progressions (tuck and straddle levers, planche leans) are separate exercises without keys; the Phase 6 calisthenics tables may grade them through the skill's key.

## 5. What it takes (1RM or e1RM)

Generated from the model. Each cell is where the tier starts; divisions sit evenly in between. Pull-up shows added kg (BW = bodyweight, − = assisted).

**Men, 60 kg**

| Lift               | Bronze | Silver |  Gold | Platinum | Diamond | Master | Champion |
| ------------------ | -----: | -----: | ----: | -------: | ------: | -----: | -------: |
| Squat              |   57.5 |     80 |   100 |      120 |     145 |  177.5 |      215 |
| Bench              |   42.5 |   57.5 |  72.5 |     87.5 |     105 |    130 |    157.5 |
| Deadlift           |     65 |     90 | 112.5 |      135 |     165 |    200 |    242.5 |
| Overhead press     |   27.5 |   37.5 |  47.5 |     57.5 |    67.5 |     85 |    102.5 |
| Pull-up (added kg) |     BW |    +10 |   +20 |    +32.5 |     +45 |    +60 |    +77.5 |

**Men, 75 kg**

| Lift               | Bronze | Silver |  Gold | Platinum | Diamond | Master | Champion |
| ------------------ | -----: | -----: | ----: | -------: | ------: | -----: | -------: |
| Squat              |   67.5 |   92.5 | 117.5 |    142.5 |     170 |    210 |    252.5 |
| Bench              |     50 |   67.5 |    85 |    102.5 |     125 |  152.5 |      185 |
| Deadlift           |   77.5 |    105 | 132.5 |      160 |   192.5 |  237.5 |    287.5 |
| Overhead press     |   32.5 |   42.5 |    55 |     67.5 |      80 |    100 |      120 |
| Pull-up (added kg) |     BW |  +12.5 | +27.5 |    +42.5 |   +57.5 |    +75 |    +97.5 |

**Men, 90 kg**

| Lift               | Bronze | Silver |  Gold | Platinum | Diamond | Master | Champion |
| ------------------ | -----: | -----: | ----: | -------: | ------: | -----: | -------: |
| Squat              |     75 |  102.5 |   130 |    157.5 |     190 |  232.5 |    282.5 |
| Bench              |     55 |     75 |    95 |      115 |   137.5 |    170 |      205 |
| Deadlift           |     85 |    115 | 147.5 |    177.5 |     215 |  262.5 |    317.5 |
| Overhead press     |     35 |   47.5 |    60 |       75 |      90 |    110 |    132.5 |
| Pull-up (added kg) |     BW |  +12.5 | +32.5 |      +50 |   +67.5 |    +90 |   +117.5 |

**Women, 55 kg**

| Lift               | Bronze | Silver | Gold | Platinum | Diamond | Master | Champion |
| ------------------ | -----: | -----: | ---: | -------: | ------: | -----: | -------: |
| Squat              |     45 |     60 |   75 |     92.5 |     110 |    135 |      165 |
| Bench              |     25 |     35 |   45 |     52.5 |      65 |     80 |       95 |
| Deadlift           |     50 |   67.5 |   85 |    102.5 |     125 |  152.5 |      185 |
| Overhead press     |     15 |   22.5 | 27.5 |     32.5 |      40 |     50 |       60 |
| Pull-up (added kg) |   −7.5 |     BW | +7.5 |    +17.5 |   +27.5 |  +37.5 |    +52.5 |

**Women, 70 kg**

| Lift               | Bronze | Silver | Gold | Platinum | Diamond | Master | Champion |
| ------------------ | -----: | -----: | ---: | -------: | ------: | -----: | -------: |
| Squat              |     50 |     70 | 87.5 |      105 |   127.5 |  157.5 |      190 |
| Bench              |     30 |     40 |   50 |     62.5 |      75 |   92.5 |      110 |
| Deadlift           |   57.5 |   77.5 | 97.5 |      120 |   142.5 |  177.5 |    212.5 |
| Overhead press     |   17.5 |     25 | 32.5 |     37.5 |    47.5 |   57.5 |       70 |
| Pull-up (added kg) |    −10 |     BW |  +10 |      +20 |     +35 |    +50 |    +67.5 |

**Sanity checks (in the tests):** for a 75 kg man, common published standards land where intended (beginner bench 47 kg → Iron, novice 68 → Silver, intermediate 94 → Gold, advanced 125 → Diamond, elite 160 → Master). World-record-level lifts (light and heavy, men and women) are all Champion.

## 6. Overall, muscle and discipline ranks

- **Lift rank**: your best SS for that lift.
- **Overall rank**: the mean of your best SS in each of the 5 patterns (squat, hinge, horizontal push, vertical push, pull). It appears once 3 patterns are ranked and is marked provisional until all 5 are. A plain mean means fixing a weak pattern raises your overall as much as pushing a strong one.
- **Muscle ranks** (Body map): each muscle takes the best SS of the lifts that train it as a primary mover, or 85% of a lift that trains it as a secondary mover. Muscles with no ranked lift (calves for now) stay unranked until a standard is added.

  | Lift              | Primary                        | Secondary (× 0.85)           |
  | ----------------- | ------------------------------ | ---------------------------- |
  | Squats            | Quads, glutes                  | Lower back, core             |
  | Deadlifts         | Glutes, hamstrings, lower back | Traps, forearms, quads       |
  | Romanian deadlift | Hamstrings, glutes             | Lower back, forearms         |
  | Hip thrust        | Glutes                         | Hamstrings                   |
  | Bench variants    | Chest (close-grip: triceps)    | Triceps, shoulders           |
  | Dip               | Chest, triceps                 | Shoulders                    |
  | Overhead press    | Shoulders                      | Triceps, core, traps         |
  | Pull-up / chin-up | Lats (chin-up: + biceps)       | Biceps, forearms             |
  | Barbell row       | Lats, traps                    | Biceps, lower back, forearms |
  | Barbell curl      | Biceps                         | Forearms                     |

- **Disciplines**: Weightlifting is the overall rank above. **Calisthenics** is a separate rank on the same ladder built from rep and skill standards (pull, push, core, legs; for example first pull-up → Bronze, first muscle-up → Platinum, full front lever → Master). Its tables are finalised in Phase 6.

## 7. Keeping your rank

- **Bodyweight on the day.** Each set is scored with your bodyweight at the time (latest weigh-in within 30 days), the way a meet weighs you in. The set still logs without a recent weigh-in and ranks as soon as you add one. Bodyweight changes never re-score old sets, so a bulk never costs you a rank.
- **Records last a year, then fade gently.** A record counts in full for 365 days, then loses 1% a month, never below 75%. A long break slowly lowers a rank instead of resetting it, and the comeback is quick because old strength returns fast.
- **Peak rank is forever.** Your highest rank ever stays on your profile as a badge.
- **Promotion is instant.** No placement grind and no waiting for a weekly update.

## 8. Why it never feels stuck

| Stage       | What moves                                                                                                                              |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| First month | First rank on each lift is "placed" with a reveal. Iron and Bronze divisions are close together, so most lifts rank up every 2–3 weeks. |
| Months 1–12 | A division every 2–8 weeks per lift. With 10+ lifts and 12 muscles ranked, something ranks up most weeks.                               |
| Year 2+     | Divisions take months, but every +2.5 kg moves SS and the bar. Predictions show the exact set to aim for ("95 kg × 5 → Platinum II").   |
| Always      | XP, streaks, weekly leagues (effort-based), records, muscle balance and goals keep rewarding training even when strength is plateaued.  |

Rep PRs count too: 92.5 × 6 beats 92.5 × 5 through the e1RM, so a lifter stuck on weight still ranks up by adding reps.

## 9. Fairness and anti-cheat (Phase 13)

- Ranks come only from logged sets processed by the server, never a client-sent rank or score.
- **Verification**: lifts that would reach **Master or Champion** need video before they show as verified or on public boards. Unverified, they still count for you privately.
- **Outlier checks**: flag an e1RM jump over 15% within 14 days above Gold, and bodyweight changes over 5% within a week (a lower claimed bodyweight raises SS).
- **Leaderboards** rank by SS (pound for pound) by default; filters add absolute kg and IPF weight classes.

## 10. Still open

- **Which standards someone uses.** Onboarding asks men's, women's or "rather not say" (`profiles.sex_for_standards`), explained as used only for fair standards. "Rather not say" ranks on men's (open) standards (decided 2026-10-06). Users can switch in Edit profile.
- **Calibration against real data.** Lift shares, the pull-up and dip ratios, and the hip thrust and curl standards are v1 estimates. Before launch, check them against OpenPowerlifting and our own beta data, and adjust the shares in `strength.ts` (the tests guard the anchors).
- **Age.** No age adjustment at launch (the audience is 17–25). Teen and masters coefficients can be added later.
- **Calisthenics tables**: full rep and skill standards, Phase 6.
