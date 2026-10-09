# Plan engine

> How the plan generator turns seven answers into a multi-week plan. The engine is pure TypeScript in `src/lib/plans/engine/` (no React, SQLite or network), deterministic for the same answers, library and seed. Every rule below has a test: `src/lib/plans/engine/__tests__/` (property tests over 500 sampled profiles, snapshots of the 10 reference profiles, unit tests for scheduling, calendar, progression and deload).
> Phase 5, decided 2026-10-08 (PRODUCT_SPEC.md §10F; resolves open decision #16).

## Pipeline

1. **Answers** (`input.ts`): goal, experience, schedule (N days or specific weekdays), session length (30–90 min), cardio finisher (fat loss and toned only), equipment (full gym, home dumbbells, bodyweight, custom list) with a pull-up/dip bar toggle, up to 3 priority muscle groups, exercises to leave out, plan length (4/6/8 weeks). Goal and experience start from onboarding.
2. **Split and week** (`splits.ts`, `schedule.ts`): pick the split, then place its sessions on the weekdays so back-to-back days never share primary muscles.
3. **Exercises** (`select.ts`, `catalog.ts`): fill each session's slots from curated choices, filtered by kit, bars, avoid list and the session's muscles.
4. **Sets** (`profiles.ts`, `build.ts`, `fit.ts`): goal profile → reps, rest, effort, set structure; the fitter decides how many working sets each exercise gets so every session fits its time and weekly volume heads for its targets.
5. **Deload** (`deload.ts`), **progression** (`progression.ts`) and **explanation** (`explain.ts`).
6. **Calendar** (`calendar.ts`): lay the week over Mon–Sun weeks, then handle missed, moved, skipped and paused days.

`generatePlan(input, ctx, { seed })` returns the plan: one routine per session type (and a deload copy), the weekly layout, per-group volume and the "Why this plan" text. `schedulePlan()` turns it into weeks and dated days.

## Split selection

| Days | Split                                                                                                                                                                                            |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 2    | Full body A/B (curvier: full body with glute focus; calisthenics: skill full body)                                                                                                               |
| 3    | Full body A/B/C; push/pull/legs first only for advanced lifters building muscle or gaining with 75+ min sessions (each muscle once a week needs long sessions). Curvier: glutes / upper / glutes |
| 4    | Upper/lower ×2 (curvier: two glute-focused lower days + two upper)                                                                                                                               |
| 5    | Upper, lower, push, pull, legs (curvier: three glute lower days + two upper)                                                                                                                     |
| 6    | Push/pull/legs ×2 (curvier: lower and upper alternating)                                                                                                                                         |

Calisthenics uses skill-led versions of the same shapes. A split that needs a session the kit can't fill is skipped (calisthenics without a bar never gets pull days of dumbbell rows; it counts only real progressions).

## Weekday spacing

- "N days a week" spreads them: 2 Mon/Thu, 3 Mon/Wed/Fri, 4 Mon/Tue/Thu/Fri, 5 Mon/Tue/Wed/Fri/Sat, 6 Mon–Sat.
- Each session template owns a set of muscles: full body owns everything; upper owns chest, shoulders, arms, back, traps and forearms; lower and legs own quads, hamstrings, glutes, adductors, abductors, calves, lower back and core; push owns chest, front and side delts and triceps; pull owns lats, upper back, rear delts, biceps, forearms and traps. An exercise may go in a session only when **all** its primary muscles belong to that session.
- Sessions on back-to-back days (Sunday → Monday counts) must own disjoint muscles. The scheduler tries the preferred split's orderings (identity first) and falls back to the next split (full body → push/pull/legs or upper/lower). The last resort colours each run of back-to-back days upper/lower alternately, which always fits because a week of at most 6 days always has a gap.
- Cardio finishers don't count towards this rule (they aren't strength work).

## Goal profiles

| Goal         | Main lift                                                             | Secondary | Accessory                             | Rest (s)       | Extras                                                  |
| ------------ | --------------------------------------------------------------------- | --------- | ------------------------------------- | -------------- | ------------------------------------------------------- |
| Stronger     | Beginner 3×5 (fixed); others top set 3–5 RIR 1 + back-offs 4–6 at 90% | 4–6       | 8–12                                  | 180–210/150/90 | Top set only on the session's first main lift           |
| Build muscle | 6–10                                                                  | 8–12      | 10–15 (advanced: last set to failure) | 120/90/75      | —                                                       |
| Gain weight  | 5–8                                                                   | 6–10      | 10–15, max 3 sets                     | 150/120/75     | Accessories weighted 0.7 when filling volume            |
| Lose fat     | 8–12                                                                  | 10–12     | 12–15                                 | 90/75/45       | Accessories in supersets; optional finisher             |
| Toned        | 10–12                                                                 | 12–15     | 12–15                                 | 75/60/45       | Same as fat loss                                        |
| Curvier      | 8–12                                                                  | 10–12     | 12–15                                 | 120/90/60      | Hip thrust, RDL, split squat, abduction every lower day |
| Calisthenics | 5–8                                                                   | 6–10      | 8–12                                  | 150/120/75     | Skill holds first (15/20/25 s by level), no warm-ups    |
| General      | 8–10                                                                  | 10–12     | 12–15                                 | 120/90/60      | —                                                       |

- Effort is RIR (beginners one rep further from failure), or the matching RPE when the lifter tracks RPE.
- Weighted plans start the first main lift with two unloaded warm-up sets (8 and 4 reps).
- Finisher: 10 min for sessions up to 45 min, 15 at 60, 20 at 75+; a bike, incline walk, elliptical, rower or skipping rope in a gym, a brisk walk at home. It counts inside the session's time.

## Weekly volume

- Counted in hard (non-warm-up) sets per group: chest, back, shoulders, biceps, triceps, quads, hamstrings, glutes (incl. abductors), calves, core.
- A set counts 1 for the exercise's main muscle (its first primary), 0.5 for other primary movers and the library weight (0.5/0.25) for helpers. Front delts as helpers in presses don't count towards shoulders (every press works them; counting them crowded out chest work).
- Level ranges: beginner 8–10, intermediate 10–16, advanced 12–20.
- Each group has a role: **focus** (priority muscles; aim for the top), **normal** (middle), **maintain** (bottom; floor 60% of it) or **minor** (biceps, triceps, calves, core by default; target 60% of the bottom, no floor). Goals change roles: muscle and gain keep arms at the bottom of the range, curvier focuses glutes and hamstrings and keeps the upper body at the bottom, calisthenics keeps legs and core at the bottom.
- **Ceiling**: no group ever goes above the level's top.
- **Time wins**: sessions always fit. A group can end below its floor; the explanation then says why (time, equipment, or the number of days) and what would fix it.

## The fitter

1. Main and secondary lifts (and core work) go in first, round-robin across sessions so every session gets its main lifts before any gets extras: 3 sets, else 2.
2. Then greedily, the move that closes the most weighted gap: one more set on an exercise already in (worth less the more sets it has) or a new accessory with 2 sets. Gaps below a group's floor count three times as much as gaps between floor and target. Role weights: focus 1.6, normal 1, maintain 0.8, minor 0.5.
3. A move is taken only if the session still fits (the routine builder's duration estimate, warm-ups, supersets and the finisher included) and no group passes its ceiling. Caps: 4 sets for skills, 5 for main lifts, 4 for the rest (+1 for secondary and accessories with 3 days a week or fewer).

## Exercise selection

- Curated choices per slot (`catalog.ts`), first one that fits wins: kit, bars (pull-ups, dips, hanging work, levers, inverted rows), gym-only bodyweight moves (back extension, glute-ham raise), the avoid list, and the session's muscles. Beginners see harder moves (pull-ups, front squats, hanging leg raises…) last.
- Non-main slots prefer exercises the week doesn't use yet, so A and B days differ; main lifts may repeat on purpose (squatting twice a week).
- No curated choice left: search the library by the slot's pattern, then its muscle (ranked lifts and free weights first, technical lifts excluded).
- Calisthenics ladders pick a rung by level (beginner, intermediate, advanced) and step down a rung when the kit can't do it: handstand, L-sit, front lever, planche, push-up, dip, pull-up, chin-up, row, squat, lunge, hinge, pike, core.
- Order in a session: skills, then compound lifts, then isolation work. Fat-loss and toned plans pair neighbouring accessories into supersets.

## Progression

Stored on each routine exercise as `progression_rule`, applied when a planned session starts (`suggestTargets`):

- Week 1, or nothing logged yet: weights blank, with "Find your working weight: pick a load that leaves about 2 reps in reserve on every set."
- **Linear** (beginners, loaded lifts): all reps hit last time → +2.5 kg (upper body, dumbbells), +5 kg (lower-body barbell and machine); otherwise the same weight.
- **Double** (everyone else): every set at the top of the range → +increment and back to the bottom; otherwise the same weight, one more rep.
- **Reps** (bodyweight): add reps to the top of the range, then a note to move to the next progression.
- **Hold**: +5 s once the target is held, up to 60 s (skills) or 90 s.
- **Deload week**: about 90% of last time's weight.

## Deload

The last week of 6- and 8-week plans uses a lighter copy of each session: working sets × 0.6 (rounded, at least one), RIR +2 (max 4) or RPE −2, and top, back-off, failure and AMRAP sets become plain working sets.

## Calendar

- Weeks run Monday to Sunday. "This week" leaves out days already past; the default is this week when at least half its sessions are still ahead, else next Monday.
- **Missed**: an open session whose date has passed (none while paused). The lifter can **shift the week** (the missed session moves to today, or the next day that doesn't sit next to a session with the same muscles, and every open session after it moves by the same number of days; the plan ends later) or **skip** it (status `missed`).
- **Move**: to another free day in the same week, today or later; warns when it lands next to a session training the same muscles. A moved day keeps `original_date`.
- **Pause**: `paused_at` set; resuming moves every open session from the pause day on by the days paused.
- **Swap / regenerate**: "just this session" gives the day its own copy of the routine; "every week" edits the shared routine and its deload copy.
- Finishing a planned workout marks its day done (locally and by a server trigger).

## The 10 reference profiles

Generated by `profiles.test.ts` (rendered with `renderPlan`). Notation: `2W` two warm-ups, `3×6-10` three sets of 6–10, `top`/`backoff` set types, `(linear)`/`(double)`/`(reps)`/`(hold)` the progression rule, `*` a priority group. Weekly sets are fractional (helpers count half).

#### 1. Beginner, build muscle, Mon/Wed/Fri, 60 min, full gym, 8 weeks

```text
Build muscle · 3 days — Full body
Week: Mon Full body A · Wed Full body B · Fri Full body C
Full body A (~50 min)
  - Barbell back squat: 2W + 3×6-10 RIR 2, rest 120s (linear)
  - Barbell bench press: 4×6-10 RIR 2, rest 120s (linear)
  - Lat pulldown: 3×8-12 RIR 2, rest 90s (linear)
  - Barbell Romanian deadlift: 5×8-12 RIR 2, rest 90s (linear)
  - Cable rope pushdown: 2×10-15 RIR 2, rest 75s (linear)
  - Cable crunch: 3×10-15 RIR 2, rest 75s (linear)
Full body B (~53 min)
  - Barbell deadlift: 2W + 3×6-10 RIR 2, rest 120s (linear)
  - Barbell overhead press: 5×6-10 RIR 2, rest 120s (linear)
  - Barbell bent-over row: 3×8-12 RIR 2, rest 90s (linear)
  - Dumbbell Bulgarian split squat: 2×8-12 RIR 2, rest 90s (linear)
  - Dumbbell curl: 4×10-15 RIR 2, rest 75s (linear)
  - Standing calf raise: 5×10-15 RIR 2, rest 75s (linear)
Full body C (~31 min)
  - Leg press: 2W + 3×6-10 RIR 2, rest 120s (linear)
  - Incline dumbbell press: 4×6-10 RIR 2, rest 120s (linear)
  - Chest-supported dumbbell row: 3×8-12 RIR 2, rest 90s (linear)
  - Plank: 2×30s, rest 60s (hold)
Weekly sets: Chest 9.25, Back 9.75, Shoulders 8.75, Biceps 8.5, Triceps 8.5, Quads 9.5, Hamstrings 8.5, Glutes 9.5, Calves 5, Core 5
```

#### 2. Intermediate, get stronger, 4 days, 75 min, full gym, 6 weeks

```text
Get stronger · 4 days — Upper / lower
Week: Mon Upper A · Tue Lower A · Thu Upper B · Fri Lower B
Upper A (~57 min)
  - Barbell bench press: 2W + 1×top 3-5 + 3×backoff 4-6 @90% RIR 1, rest 180s (double)
  - Barbell bent-over row: 4×4-6 RIR 2, rest 150s (double)
  - Dumbbell shoulder press: 4×4-6 RIR 2, rest 150s (double)
  - Lat pulldown: 3×4-6 RIR 2, rest 150s (double)
  - Cable crossover: 4×8-12 RIR 2, rest 90s (double)
Lower A (~47 min)
  - Barbell back squat: 2W + 1×top 3-5 + 2×backoff 4-6 @90% RIR 1, rest 180s (double)
  - Barbell Romanian deadlift: 4×4-6 RIR 2, rest 150s (double)
  - Dumbbell Bulgarian split squat: 3×4-6 RIR 2, rest 150s (double)
  - Standing calf raise: 3×8-12 RIR 2, rest 90s (double)
  - Cable crunch: 3×8-12 RIR 2, rest 90s (double)
Upper B (~42 min)
  - Barbell overhead press: 2W + 1×top 3-5 + 3×backoff 4-6 @90% RIR 1, rest 180s (double)
  - Pull-up: 3×4-6 RIR 2, rest 150s (reps)
  - Incline dumbbell press: 3×4-6 RIR 2, rest 150s (double)
  - Chest-supported dumbbell row: 3×4-6 RIR 2, rest 150s (double)
Lower B (~57 min)
  - Barbell deadlift: 2W + 1×top 3-5 + 4×backoff 4-6 @90% RIR 1, rest 180s (double)
  - Leg press: 3×4-6 RIR 2, rest 150s (double)
  - Dumbbell walking lunge: 3×4-6 RIR 2, rest 150s (double)
  - Seated calf raise: 2×8-12 RIR 2, rest 90s (double)
  - Plank: 3×40s, rest 60s (hold)
  - Lying leg curl: 4×8-12 RIR 2, rest 90s (double)
Weekly sets: Chest 13, Back 14.25, Shoulders 13, Biceps 6.5, Triceps 7.5, Quads 14.5, Hamstrings 13.5, Glutes 13, Calves 6, Core 6
```

#### 3. Advanced, build muscle, 6 days, 90 min, chest and shoulders priority, 8 weeks

```text
Build muscle · 6 days — Push / pull / legs ×2
Week: Mon Push A · Tue Pull A · Wed Legs A · Thu Push B · Fri Pull B · Sat Legs B
Push A (~39 min)
  - Barbell bench press: 2W + 4×6-10 RIR 1, rest 120s (double)
  - Dumbbell shoulder press: 4×8-12 RIR 1, rest 90s (double)
  - Incline dumbbell press: 4×8-12 RIR 1, rest 90s (double)
  - Dumbbell lateral raise: 1×10-15 + 1×failure 10-15 RIR 0, rest 75s (double)
  - Cable crossover: 1×10-15 + 1×failure 10-15 RIR 0, rest 75s (double)
Pull A (~37 min)
  - Pull-up: 4×6-10 RIR 1, rest 120s (reps)
  - Barbell bent-over row: 2W + 4×6-10 RIR 1, rest 120s (double)
  - Cable face pull: 2×10-15 RIR 0, rest 75s (double)
  - Dumbbell curl: 1×10-15 + 1×failure 10-15 RIR 0, rest 75s (double)
  - Hammer curl: 1×10-15 + 1×failure 10-15 RIR 0, rest 75s (double)
Legs A (~56 min)
  - Barbell back squat: 2W + 5×6-10 RIR 1, rest 120s (double)
  - Barbell Romanian deadlift: 4×8-12 RIR 1, rest 90s (double)
  - Dumbbell Bulgarian split squat: 4×8-12 RIR 1, rest 90s (double)
  - Seated leg curl: 2×10-15 + 1×failure 10-15 RIR 0, rest 75s (double)
  - Standing calf raise: 3×10-15 + 1×failure 10-15 RIR 0, rest 75s (double)
  - Cable crunch: 3×10-15 + 1×failure 10-15 RIR 0, rest 75s (double)
Push B (~35 min)
  - Barbell overhead press: 2W + 4×6-10 RIR 1, rest 120s (double)
  - Dumbbell bench press: 4×8-12 RIR 1, rest 90s (double)
  - Barbell incline bench press: 4×8-12 RIR 1, rest 90s (double)
  - Cable lateral raise: 1×10-15 + 1×failure 10-15 RIR 0, rest 75s (double)
Pull B (~21 min)
  - Chest-supported dumbbell row: 2W + 4×6-10 RIR 1, rest 120s (double)
  - Lat pulldown: 4×8-12 RIR 1, rest 90s (double)
Legs B (~56 min)
  - Barbell hip thrust: 2W + 5×6-10 RIR 1, rest 120s (double)
  - Leg press: 4×8-12 RIR 1, rest 90s (double)
  - Dumbbell walking lunge: 4×8-12 RIR 1, rest 90s (double)
  - Lying leg curl: 3×10-15 + 1×failure 10-15 RIR 0, rest 75s (double)
  - Seated calf raise: 2×10-15 + 1×failure 10-15 RIR 0, rest 75s (double)
  - Plank: 4×45s, rest 60s (hold)
Weekly sets: Chest 20*, Back 17, Shoulders 20*, Biceps 12, Triceps 12, Quads 18.25, Hamstrings 17.75, Glutes 15.5, Calves 8, Core 8
```

#### 4. Beginner, lose fat, Mon/Tue/Wed, 45 min, home dumbbells, cardio, 4 weeks

```text
Lose fat · 3 days — Push / pull / legs
Week: Mon Push A · Tue Pull A · Wed Legs A
Push A (~39 min)
  - Dumbbell bench press: 2W + 4×8-12 RIR 3, rest 90s (linear)
  - Dumbbell shoulder press: 4×10-12 RIR 3, rest 75s (linear)
  - Incline dumbbell press: 4×10-12 RIR 3, rest 75s (linear)
  - Walking: 1×600s, rest 0s (none)
Pull A (~39 min)
  - One-arm dumbbell row: 2W + 4×8-12 RIR 3, rest 90s (linear)
  - Chest-supported dumbbell row: 4×8-12 RIR 3, rest 90s (linear)
  - Dumbbell rear delt fly: 2×12-15 RIR 3, rest 75s [superset 1] (linear)
  - Dumbbell curl: 2×12-15 RIR 3, rest 75s [superset 1] (linear)
  - Walking: 1×600s, rest 0s (none)
Legs A (~45 min)
  - Goblet squat: 2W + 3×8-12 RIR 3, rest 90s (linear)
  - Dumbbell Romanian deadlift: 3×10-12 RIR 3, rest 75s (linear)
  - Dumbbell Bulgarian split squat: 3×10-12 RIR 3, rest 75s (linear)
  - Dumbbell reverse lunge: 2×12-15 RIR 3, rest 75s [superset 1] (linear)
  - Nordic hamstring curl: 2×12-15 RIR 3, rest 75s [superset 1] (reps)
  - Reverse crunch: 2×12-15 RIR 3, rest 45s (reps)
  - Walking: 1×600s, rest 0s (none)
Weekly sets: Chest 9, Back 9, Shoulders 10, Biceps 6, Triceps 6, Quads 8, Hamstrings 5.75, Glutes 6, Calves 0, Core 2
Short: Hamstrings — 45-minute sessions can't fit 8 sets alongside everything else. Add a day or 15 minutes to reach it. | Glutes — 45-minute sessions can't fit 8 sets alongside everything else. Add a day or 15 minutes to reach it.
```

#### 5. Intermediate, curvier, Mon/Tue/Thu/Fri, 60 min, glutes and hamstrings priority, 8 weeks

```text
Get curvier · 4 days — Lower (glutes) / upper
Week: Mon Glutes and hamstrings · Tue Upper A · Thu Glutes and quads · Fri Upper B
Glutes and hamstrings (~46 min)
  - Barbell hip thrust: 2W + 5×8-12 RIR 1, rest 120s (double)
  - Barbell back squat: 4×10-12 RIR 1, rest 90s (double)
  - Barbell Romanian deadlift: 4×10-12 RIR 1, rest 90s (double)
  - Seated leg curl: 2×12-15 RIR 1, rest 60s (double)
  - Cable crunch: 4×12-15 RIR 1, rest 60s (double)
Upper A (~39 min)
  - Barbell bench press: 2W + 3×8-12 RIR 1, rest 120s (double)
  - Barbell bent-over row: 3×8-12 RIR 1, rest 120s (double)
  - Dumbbell shoulder press: 4×10-12 RIR 1, rest 90s (double)
  - Lat pulldown: 3×10-12 RIR 1, rest 90s (double)
  - Dumbbell lateral raise: 2×12-15 RIR 1, rest 60s (double)
Glutes and quads (~44 min)
  - Barbell Romanian deadlift: 2W + 4×8-12 RIR 1, rest 120s (double)
  - Dumbbell Bulgarian split squat: 4×10-12 RIR 1, rest 90s (double)
  - Machine hip thrust: 3×10-12 RIR 1, rest 90s (double)
  - Leg extension: 4×12-15 RIR 1, rest 60s (double)
  - Standing calf raise: 4×12-15 RIR 1, rest 60s (double)
Upper B (~32 min)
  - Incline dumbbell press: 2W + 3×8-12 RIR 1, rest 120s (double)
  - Pull-up: 3×8-12 RIR 1, rest 120s (reps)
  - Dumbbell bench press: 3×10-12 RIR 1, rest 90s (double)
  - Chest-supported dumbbell row: 3×10-12 RIR 1, rest 90s (double)
Weekly sets: Chest 10, Back 12, Shoulders 10.5, Biceps 6, Triceps 6.5, Quads 13.25, Hamstrings 16*, Glutes 16*, Calves 4, Core 4
```

#### 6. Beginner, calisthenics, 3 days, 45 min, bodyweight with bars, 6 weeks

```text
Calisthenics · 3 days — Full body
Week: Mon Full body A · Wed Full body B · Fri Full body C
Full body A (~36 min)
  - Wall handstand: 3×15s, rest 90s (hold)
  - Tuck L-sit: 3×15s, rest 90s (hold)
  - Push-up: 4×5-8 RIR 2, rest 150s (reps)
  - Bodyweight squat: 3×6-10 RIR 2, rest 120s (reps)
  - Hollow body hold: 2×30s, rest 60s (hold)
Full body B (~44 min)
  - Planche lean: 3×15s, rest 90s (hold)
  - Bench dip: 3×5-8 RIR 2, rest 150s (reps)
  - Inverted row: 3×5-8 RIR 2, rest 150s (reps)
  - Bodyweight lunge: 3×6-10 RIR 2, rest 120s (reps)
  - Glute bridge: 5×6-10 RIR 2, rest 120s (reps)
Full body C (~37 min)
  - Tuck front lever: 3×15s, rest 90s (hold)
  - Push-up: 3×5-8 RIR 2, rest 150s (reps)
  - Negative pull-up: 3×5-8 RIR 2, rest 150s (reps)
  - Box pistol squat: 3×6-10 RIR 2, rest 120s (reps)
  - Toes-to-bar: 2×8-12 RIR 2, rest 75s (reps)
Weekly sets: Chest 9.25, Back 10, Shoulders 9, Biceps 3, Triceps 9.5, Quads 9, Hamstrings 1.25, Glutes 9.5, Calves 0, Core 8.5
Short: Hamstrings — kept near the minimum so your main goal gets the time.
```

#### 7. Intermediate, gain weight, Mon–Fri, 60 min, full gym, 8 weeks

```text
Gain weight · 5 days — Upper / lower + push / pull / legs
Week: Mon Upper A · Tue Lower A · Wed Push B · Thu Pull B · Fri Legs B
Upper A (~50 min)
  - Barbell bench press: 2W + 4×5-8 RIR 1, rest 150s (double)
  - Barbell bent-over row: 4×5-8 RIR 1, rest 150s (double)
  - Dumbbell shoulder press: 4×6-10 RIR 1, rest 120s (double)
  - Lat pulldown: 3×6-10 RIR 1, rest 120s (double)
  - Dumbbell curl: 2×10-15 RIR 1, rest 75s (double)
Lower A (~50 min)
  - Barbell back squat: 2W + 4×5-8 RIR 1, rest 150s (double)
  - Barbell Romanian deadlift: 4×6-10 RIR 1, rest 120s (double)
  - Dumbbell Bulgarian split squat: 3×6-10 RIR 1, rest 120s (double)
  - Seated leg curl: 2×10-15 RIR 1, rest 75s (double)
  - Standing calf raise: 3×10-15 RIR 1, rest 75s (double)
  - Cable crunch: 3×10-15 RIR 1, rest 75s (double)
Push B (~35 min)
  - Barbell overhead press: 2W + 5×5-8 RIR 1, rest 150s (double)
  - Dumbbell bench press: 4×6-10 RIR 1, rest 120s (double)
  - Incline dumbbell press: 3×6-10 RIR 1, rest 120s (double)
Pull B (~24 min)
  - Chest-supported dumbbell row: 2W + 3×5-8 RIR 1, rest 150s (double)
  - Neutral-grip pull-up: 3×6-10 RIR 1, rest 120s (reps)
  - Hammer curl: 2×10-15 RIR 1, rest 75s (double)
Legs B (~52 min)
  - Barbell deadlift: 2W + 5×5-8 RIR 1, rest 150s (double)
  - Leg press: 3×6-10 RIR 1, rest 120s (double)
  - Dumbbell walking lunge: 3×6-10 RIR 1, rest 120s (double)
  - Lying leg curl: 3×10-15 RIR 1, rest 75s (double)
  - Seated calf raise: 3×10-15 RIR 1, rest 75s (double)
  - Plank: 3×40s, rest 60s (hold)
Weekly sets: Chest 13.25, Back 14.25, Shoulders 13.25, Biceps 10.5, Triceps 10, Quads 15.5, Hamstrings 14.75, Glutes 13.5, Calves 6.75, Core 6
```

#### 8. Advanced, get stronger, Sat/Sun, 90 min, avoids back squat and deadlift, 6 weeks

```text
Get stronger · 2 days — Upper / lower
Week: Sat Upper A · Sun Lower A
Upper A (~87 min)
  - Barbell bench press: 2W + 1×top 3-5 + 4×backoff 4-6 @90% RIR 1, rest 210s (double)
  - Barbell bent-over row: 5×4-6 RIR 2, rest 150s (double)
  - Dumbbell shoulder press: 5×4-6 RIR 2, rest 150s (double)
  - Lat pulldown: 5×4-6 RIR 2, rest 150s (double)
  - Dumbbell lateral raise: 5×8-12 RIR 2, rest 90s (double)
  - Cable crossover: 5×8-12 RIR 2, rest 90s (double)
Lower A (~88 min)
  - Barbell front squat: 2W + 1×top 3-5 + 4×backoff 4-6 @90% RIR 1, rest 210s (double)
  - Barbell Romanian deadlift: 5×4-6 RIR 2, rest 150s (double)
  - Dumbbell Bulgarian split squat: 5×4-6 RIR 2, rest 150s (double)
  - Seated leg curl: 5×8-12 RIR 2, rest 90s (double)
  - Standing calf raise: 4×8-12 RIR 2, rest 90s (double)
  - Cable crunch: 3×8-12 RIR 2, rest 90s (double)
  - Leg extension: 5×8-12 RIR 2, rest 90s (double)
Weekly sets: Chest 11.25, Back 12.5, Shoulders 13.75, Biceps 5, Triceps 5, Quads 15, Hamstrings 11.25, Glutes 7.5, Calves 4, Core 3
Short: Chest — 90-minute sessions can't fit 12 sets alongside everything else. Add a day or 15 minutes to reach it. | Hamstrings — 90-minute sessions can't fit 12 sets alongside everything else. Add a day or 15 minutes to reach it. | Glutes — 90-minute sessions can't fit 12 sets alongside everything else. Add a day or 15 minutes to reach it.
```

#### 9. Beginner, get toned, 2 days, 30 min, bodyweight without bars, 4 weeks

```text
Get toned · 2 days — Full body A / B
Week: Mon Full body A · Thu Full body B
Full body A (~30 min)
  - Bodyweight squat: 3×10-12 RIR 3, rest 75s (reps)
  - Push-up: 3×10-12 RIR 3, rest 75s (reps)
  - Glute bridge: 3×12-15 RIR 3, rest 60s (reps)
  - Walking: 1×600s, rest 0s (none)
Full body B (~30 min)
  - Pike push-up: 3×10-12 RIR 3, rest 75s (reps)
  - Bodyweight lunge: 3×12-15 RIR 3, rest 60s (reps)
  - Glute bridge: 3×10-12 RIR 3, rest 75s (reps)
  - Walking: 1×600s, rest 0s (none)
Weekly sets: Chest 3.75, Back 0, Shoulders 3, Biceps 0, Triceps 3, Quads 6, Hamstrings 1.5, Glutes 9, Calves 0, Core 0
Short: Chest — 30-minute sessions can't fit 8 sets alongside everything else. Add a day or 15 minutes to reach it. | Back — nothing in your equipment trains it directly; a pull-up bar would help. | Shoulders — 30-minute sessions can't fit 8 sets alongside everything else. Add a day or 15 minutes to reach it. | Quads — 30-minute sessions can't fit 8 sets alongside everything else. Add a day or 15 minutes to reach it. | Hamstrings — 2 days a week leaves limited room for more direct work without overloading single sessions; adding a day would raise it.
```

#### 10. Intermediate, general fitness, Thu–Mon (incl. Sun and Mon), 45 min, dumbbells + cables + machines, 6 weeks

```text
General fitness · 5 days — Upper / lower + push / pull / legs
Week: Mon Upper A · Thu Lower A · Fri Push B · Sat Pull B · Sun Legs B
Upper A (~39 min)
  - Dumbbell bench press: 2W + 3×8-10 RIR 2, rest 120s (double)
  - One-arm dumbbell row: 3×8-10 RIR 2, rest 120s (double)
  - Dumbbell shoulder press: 4×10-12 RIR 2, rest 90s (double)
  - Lat pulldown: 3×10-12 RIR 2, rest 90s (double)
  - Cable crossover: 2×12-15 RIR 2, rest 60s (double)
Lower A (~45 min)
  - Goblet squat: 2W + 3×8-10 RIR 2, rest 120s (double)
  - Machine hip thrust: 4×10-12 RIR 2, rest 90s (double)
  - Dumbbell Bulgarian split squat: 4×10-12 RIR 2, rest 90s (double)
  - Seated leg curl: 3×12-15 RIR 2, rest 60s (double)
  - Standing calf raise: 3×12-15 RIR 2, rest 60s (double)
  - Cable crunch: 2×12-15 RIR 2, rest 60s (double)
Push B (~26 min)
  - Dumbbell shoulder press: 2W + 4×8-10 RIR 2, rest 120s (double)
  - Machine chest press: 3×10-12 RIR 2, rest 90s (double)
  - Incline dumbbell press: 3×10-12 RIR 2, rest 90s (double)
Pull B (~21 min)
  - Chest-supported dumbbell row: 2W + 3×8-10 RIR 2, rest 120s (double)
  - Close-grip lat pulldown: 3×10-12 RIR 2, rest 90s (double)
  - Cable face pull: 2×12-15 RIR 2, rest 60s (double)
Legs B (~44 min)
  - Machine hip thrust: 2W + 3×8-10 RIR 2, rest 120s (double)
  - Leg press: 3×10-12 RIR 2, rest 90s (double)
  - Dumbbell walking lunge: 3×10-12 RIR 2, rest 90s (double)
  - Lying leg curl: 4×12-15 RIR 2, rest 60s (double)
  - Seated calf raise: 2×12-15 RIR 2, rest 60s (double)
  - Plank: 4×40s, rest 60s (hold)
Weekly sets: Chest 13, Back 13, Shoulders 13.75, Biceps 6, Triceps 8.5, Quads 13, Hamstrings 13, Glutes 13.5, Calves 6, Core 6
```

### Reading them

1. **Beginner, muscle, Mon/Wed/Fri**: three full-body days, each with a squat, a press, a pull and a hinge; every group lands in 8–10 sets; linear progression throughout.
2. **Intermediate, stronger, 4 days**: upper/lower with a top set and back-offs on the first lift of each day (bench, squat, OHP, deadlift); 2–4 min rests make these the longest sessions.
3. **Advanced, muscle, 6 days, chest + shoulders priority**: push/pull/legs twice; chest and shoulders reach the 20-set ceiling, the other big groups 15–18, arms 12. Pull B is short because back and biceps already have their sets.
4. **Beginner, fat loss, Mon/Tue/Wed, dumbbells**: back-to-back days rule out full body, so push/pull/legs; accessories are supersets, every session ends with a 10-minute walk; hamstrings and glutes fall short at 45 minutes and the plan says so.
5. **Intermediate, curvier, glutes + hamstrings priority**: hip thrust, RDL and split squats lead the lower days; glutes and hamstrings hit 16 (the top), the upper body sits at the bottom of the range.
6. **Beginner calisthenics with bars**: wall handstand, tuck L-sit, planche lean and tuck front lever holds, then push-up, negative pull-up, bench dip, inverted row and squat progressions.
7. **Intermediate, gain weight, Mon–Fri**: upper/lower then push/pull/legs, compound lifts at 5–8 reps carry most of the volume.
8. **Advanced, stronger, Sat/Sun, avoids back squat and deadlift**: back-to-back weekend days give upper/lower; front squat replaces the back squat, RDL the deadlift; 2 × 90 min can't reach 12 sets for chest, hamstrings and glutes, explained.
9. **Beginner, toned, 2 × 30 min, bodyweight, no bar**: squats, push-ups, pike push-ups, lunges and glute bridges plus a walk; no back training is possible without a bar, and the plan says a doorway bar would fix it.
10. **Intermediate, general, Thu–Mon, dumbbells + cables + machines**: five days including Sunday → Monday; the hybrid split keeps those two days on different muscles.
