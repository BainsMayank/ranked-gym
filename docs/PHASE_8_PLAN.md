# Phase 8: Home For You

Planned 2026-10-09 from the user's Phase 8 brief. Phase 7 work in the checkout is preserved.

## Design and navigation

App read: ranked fitness for college students in India; calm branded chrome and expressive rewards. iOS and Android first-class, unified brand. Existing dials remain expression 6, motion 5, density 4. Use `mobile-taste` for every screen and `mobile-design-review` at completion, existing theme tokens and base components only. Greeting belongs inside Today as requested. Recovery colours use existing danger/warning/success tokens.

- Home For You: Today, four live entry cards in two rows, recent records/rank-ups, weekly comparison.
- Push `/insights/muscles`, `/insights/recovery`, `/insights/goals`, `/insights/overview` from Home.
- Push `/goals/edit?id=…` (omit id for creation); keyboard-aware form, explicit back/cancel, return after save.
- Bodyweight logging is a short sheet on Overview. Custom muscle dates are inline fields. Recovery speed is on Recovery.
- Existing bottom tabs, Home top tabs and deep links remain. Android back pops; direct detail links have a Home fallback.

## Build order

1. Define date/counting contracts and add owner-only goals, recovery preferences, authenticated analytics RPCs and pgTAP proofs. Reuse authoritative workout totals and rank records. Generate database types.
2. Add a pure exponential recovery model with documented constants and clock-controlled tests. Return a compact per-muscle fatigue snapshot from Postgres; advance it locally between refreshes.
3. Persist validated user-scoped analytics snapshots on device. Hydrate synchronously, refresh in background, invalidate after workout/bodyweight/goal changes and on foreground/reconnection. Show stale/offline states. Server data replaces snapshots atomically.
4. Implement the dashboard and four detail screens on the same aggregates. Reuse shared `BodyMap`, charts, grouped lists, progress and form components.
5. Implement seven goal types, prediction-based suggestions, trends, edit/archive, idempotent completion, reduced-motion-aware celebration and optional achievement posts.
6. Validate correctness with independent arithmetic, SQL/RLS tests, recovery tests, goal tests and screen flows. Run `pnpm check`; review every changed screen in dark/light and large text where reachable; fix high findings, record remaining findings and unverified device checks in `PROGRESS.md`.

## Data contracts

- Only completed workouts feed analytics. Count completed non-warm-up sets; missed sets are excluded from muscle/recovery and lift goals. Use primary 1.0, secondary 0.5 and no stabilisers for Home muscle analytics, per this brief. Existing rank and plan maths stay unchanged.
- Volume uses the logger's kg × reps convention (bodyweight exercises use added load; assisted sets add no kg). Muscle totals overlap and must not be summed to obtain workout volume. Overview uses server workout totals.
- Dates are half-open intervals. Display calendar dates in the user's device timezone; pass explicit UTC boundaries to SQL. Weeks are Monday–Sunday. Compare equal-length periods; weekly summary compares elapsed week with the same elapsed part of last week. Undefined percentage changes show an absolute delta.
- Plan volume recommendations are group-level and use different weighting. Show the existing group ranges as guidance alongside muscles, label weekly-equivalent sets and use role/experience targets without claiming per-head prescriptions. Accessory muscles without a plan group have no fabricated target.
- Records count record rows with `previous_value` present, excluding baselines. Rank-ups exclude placement and rank-down events.
- Recovery: weighted fatigue accumulates per set, RIR takes precedence, RPE converts to `10 - RPE`, missing effort uses RIR 2. Decay is exponential, never a fixed timer. Constants, normalisation, readiness cutoff and speed multipliers are versioned and documented as an estimate.
- Goals store `type`, validated `target jsonb`, `start_value`, `deadline`, `status`, ownership and timestamps. Automated progress comes from server data; custom goals use an explicit checkbox. Completion and achievement posting are idempotent. Auto-post is off by default.
- Projection needs enough observations and a trend toward the target; otherwise show that more data is needed. Warn gently above approximately 1% bodyweight/week.

## Dependencies and acceptance

League storage/scoring is not present in the current checkout; the league chip must show a truthful unavailable/unplaced state until Phase 7 provides membership. Basic workout-day streak can be computed server-side here; stakes and notification logic remain Phase 12. Feed is still a mock: implement the minimal real goal-achievement post path for the requested opt-in, with privacy and exactly-once posting; general Feed remains Phase 9.

Acceptance requires three independent spot-checks against the user's real logged workouts, recovery at several clock offsets, all seven goal types saved and evaluated, a checkbox goal completed, cached Home visible after relaunch offline, and goal completion persisting without repeated posts. Fixture checks are separate from real-account acceptance. Never mark real-account or physical-device checks passed without access and evidence.
