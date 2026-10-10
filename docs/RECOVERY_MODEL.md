# Recovery estimate, version 1

This is a training-load heuristic, not a measurement of tissue recovery or advice to train through pain. Sleep, food, illness and stress matter. The app shows that qualification beside the results.

Only completed, non-failed, non-warm-up strength/calisthenics sets from completed workouts contribute. Primary/secondary links use their stored `exercise_muscles.weight`; stabilisers do not contribute. Time is set completion, falling back to workout end/start. Future sets are ignored. Timed strength sets contribute one set. Cardio/mobility do not.

For each set and muscle: `initial fatigue = muscle weight × clamp(1 + (2 - RIR) × 0.15, 0.5, 1.5)`. Actual RIR wins; otherwise actual RPE converts to `10 - RPE`; otherwise RIR 2. Targets are not substituted for actual effort.

At elapsed hours `h`, remaining fatigue is `initial fatigue × 0.5^(h / (halfLife × speed))`. Fatigue adds across sets and sessions before clamping. `recovery % = clamp(100 × (1 - total fatigue / 10), 0, 100)`. Ten fresh primary RIR-2 sets therefore give 0%, then 50% after one half-life. Five such sets give 50% initially. Keeping raw fatigue avoids a heavy session recovering unrealistically fast after saturation.

Half-lives in hours:

| Muscles                                                 | Hours |
| ------------------------------------------------------- | ----: |
| Quads, glutes, adductors, abductors                     |    60 |
| Hamstrings, lower back                                  |    48 |
| Chest, lats, upper back                                 |    36 |
| Delts, traps, calves                                    |    30 |
| Biceps, triceps, forearms, abs, obliques, optional neck |    24 |

Slower multiplies half-life by 1.25, normal by 1, faster by 0.75. Ready means at least 80%. These constants are deliberately simple product defaults, not scientifically validated muscle-specific predictions. No recent recorded work means 100% **estimated from logged training**, never a claim about unlogged exercise.

Postgres aggregates all eligible historical sets to a raw fatigue snapshot at `asOf`, using `recovery_half_life`. `src/lib/insights/recovery.ts` mirrors the maths with pure functions. Between network refreshes, raw fatigue decays locally every minute and on foreground, so cached recovery advances hour by hour while offline. Changing speed requires a new aggregate because it changes the entire historical decay, not just future time.

Tests cover effort fallback/precedence, additive fatigue, exact half-life, small versus large muscles, speed ordering, future timestamps, secondary weighting, stabiliser exclusion, saturation and snapshot/reference parity. A full recompute naturally handles edited/deleted workouts.
