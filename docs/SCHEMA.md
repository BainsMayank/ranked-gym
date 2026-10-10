# Database schema

> The Supabase Postgres schema, table by table, so later phases don't need to read migrations.
> Source of truth: `supabase/migrations/`. Update this file in the same change as any migration.
> TypeScript types: `src/types/database.ts`, regenerated with `pnpm db:types` (local) or `pnpm db:types:remote` (linked project).

## Conventions

- Every table in `public` has **row level security enabled** (a pgTAP test fails otherwise). Policies are explicit, per command, `to authenticated`. `anon` has no grants on any table.
- Grants are narrowed to what the policies need (for example, no `insert`/`delete` on `profiles`), so a missing policy can never open a table.
- Weights are **kg** and heights **cm**, always. The UI converts (`src/lib/units.ts`).
- `created_at` / `updated_at` are `timestamptz`; `updated_at` is kept by the `set_updated_at()` trigger. Protect-columns triggers stop updates from rewriting ids and `created_at`.
- Server-trusted values (ranks, XP, leaderboards…) are never written by clients; they arrive in later phases as SQL functions or Edge Functions.
- Tests live in `supabase/tests/database/*.test.sql` (pgTAP) and run with `pnpm db:test`.

## Enums

| Type                 | Values                                                                             |
| -------------------- | ---------------------------------------------------------------------------------- |
| `sex_for_standards`  | `male`, `female`, `unspecified` (ranks on the average of both curves)              |
| `experience_level`   | `beginner`, `intermediate`, `advanced`                                             |
| `primary_goal`       | `stronger`, `muscle`, `fat`, `gain`, `toned`, `curvier`, `calisthenics`, `general` |
| `weight_unit`        | `kg`, `lb`                                                                         |
| `profile_visibility` | `public`, `friends`, `private`                                                     |
| `theme_mode`         | `dark`, `light`, `system`                                                          |

Labels and descriptions for each live in `src/lib/profile/options.ts`.

Exercise library enums (Phase 2). The same lists are `as const` arrays in `src/lib/exercises/taxonomy.ts`, with labels; a Jest test fails if they drift from the generated `Constants`.

| Type                | Values                                                                                                                                                                                                                                                    |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `muscle`            | `upper_chest`, `mid_lower_chest`, `front_delts`, `side_delts`, `rear_delts`, `biceps`, `triceps`, `forearms`, `lats`, `upper_back`, `traps`, `lower_back`, `abs`, `obliques`, `quads`, `hamstrings`, `glutes`, `adductors`, `abductors`, `calves`, `neck` |
| `muscle_region`     | `chest`, `shoulders`, `arms`, `back`, `core`, `legs` (neck has no region and is off by default)                                                                                                                                                           |
| `exercise_category` | `strength`, `calisthenics`, `cardio`, `mobility`                                                                                                                                                                                                          |
| `equipment`         | `barbell`, `dumbbell`, `machine`, `cable`, `bodyweight`, `kettlebell`, `band`, `smith`, `other`                                                                                                                                                           |
| `exercise_mechanic` | `compound`, `isolation`                                                                                                                                                                                                                                   |
| `exercise_log_type` | `weight_reps`, `bodyweight_reps`, `weighted_bodyweight`, `assisted_bodyweight`, `duration`, `distance_duration`                                                                                                                                           |
| `muscle_role`       | `primary`, `secondary`, `stabiliser`                                                                                                                                                                                                                      |

Muscle keys are also the path ids of the body-map SVG (Phase 7).

Routine enums (Phase 3). Mirrored by `src/lib/routines/taxonomy.ts` (a Jest test keeps them in sync).

| Type             | Values                                                                       |
| ---------------- | ---------------------------------------------------------------------------- |
| `set_type`       | `warmup`, `working`, `top`, `backoff`, `drop`, `failure`, `amrap`            |
| `target_type`    | `reps`, `rep_range`, `duration`, `distance`                                  |
| `weight_mode`    | `absolute`, `percent_of_1rm`, `percent_of_top_set`, `bodyweight`, `assisted` |
| `routine_source` | `manual`, `plan`, `copied`, `generated`                                      |
| `recovery_speed` | text                                                                         | `normal`; check `slower`, `normal`, `faster` (Phase 8). Scales fatigue half-lives by 1.25, 1.0, 0.75. Owner update. |
| `effort_metric`  | `rir`, `rpe`, `both`                                                         |

## `profiles`

One row per user, created by the `on_auth_user_created` trigger. **Owner-only** (select, update). Other users read `public_profile_cards`.

| Column                     | Type                        | Notes                                                                                    |
| -------------------------- | --------------------------- | ---------------------------------------------------------------------------------------- |
| `id`                       | uuid PK                     | = `auth.users.id`, cascades on user delete                                               |
| `username`                 | text unique, null           | `^[a-z0-9_]{3,20}$`, not reserved (`is_reserved_username`). Null until onboarding step 1 |
| `display_name`             | text, null                  | 1–40 chars. Prefilled from Google's name                                                 |
| `avatar_url`               | text, null                  | ≤ 2048 chars. Prefilled from Google's picture                                            |
| `bio`                      | text, null                  | ≤ 160 chars                                                                              |
| `sex_for_standards`        | enum, default `unspecified` | Used only to pick strength standards. Never shown to others                              |
| `birth_year`               | smallint, null              | 1900–2100; trigger blocks age < 13 (`profiles_min_age`, SQLSTATE 23514)                  |
| `height_cm`                | numeric(4,1), null          | 100–250                                                                                  |
| `experience_level`         | enum, null                  |                                                                                          |
| `primary_goal`             | enum, null                  | Same list as the plan generator                                                          |
| `country`                  | text, default `IN`          | ISO 3166-1 alpha-2                                                                       |
| `city`                     | text, null                  | 1–60 chars (free text until open decision #11)                                           |
| `college`                  | text, null                  | 1–100 chars                                                                              |
| `units`                    | enum, default `kg`          | Display preference only                                                                  |
| `visibility`               | enum, default `friends`     |                                                                                          |
| `onboarded_at`             | timestamptz, null           | Set when onboarding finishes; requires username, display_name and birth_year             |
| `created_at`, `updated_at` | timestamptz                 |                                                                                          |

## `public_profile_cards` (view)

What other signed-in users may see. Runs with the view owner's rights (`security_invoker = false`, `security_barrier = true`) so it can expose a column subset of rows that `profiles` RLS hides. `select` granted to `authenticated` only; rows only when `auth.uid()` is set, the profile is onboarded and neither side has blocked the other (Phase 9).

| Column                                                       | Visible to                                                                                    |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| `id`, `username`, `display_name`, `avatar_url`, `visibility` | every signed-in user (so people can find and add each other)                                  |
| `bio`, `city`, `college`, `country`                          | the owner; everyone if `public`; friends if `friends` (`can_view_profile_details`); else null |

Never exposed: `sex_for_standards`, `birth_year`, `height_cm`, `experience_level`, `primary_goal`, `units`, bodyweight.

## `bodyweight_logs`

Weigh-ins. **Owner-only** (select, insert, update, delete).

| Column       | Type            | Notes                                                |
| ------------ | --------------- | ---------------------------------------------------- |
| `id`         | uuid PK         | Client may supply it (idempotent offline sync later) |
| `user_id`    | uuid → profiles | Defaults to `auth.uid()`; policy forces your own id  |
| `weight_kg`  | numeric(5,2)    | 20–400                                               |
| `logged_at`  | timestamptz     | Default now()                                        |
| `created_at` | timestamptz     |                                                      |

Index: `(user_id, logged_at desc)`. The rank engine scores each set at the weigh-in closest to it (±30 days, RANK_SYSTEM.md §6); any insert, update or delete queues a recompute.

## `user_settings`

Per-user preferences, created by the signup trigger. **Owner-only** (select, update).

| Column                     | Type               | Default / notes                                                                                   |
| -------------------------- | ------------------ | ------------------------------------------------------------------------------------------------- |
| `user_id`                  | uuid PK → profiles |                                                                                                   |
| `notification_prefs`       | jsonb object       | `workout_reminders`, `streak_at_risk`, `rank_ups`, `friend_activity`, `league_results` (all true) |
| `theme`                    | enum               | `dark` (not yet synced with the app's theme store; Phase 11)                                      |
| `rest_timer_default_sec`   | integer            | 120 (0–900)                                                                                       |
| `plate_inventory`          | jsonb array        | `[{weight_kg, pairs}]`: 25×4, 20×2, 15×2, 10×2, 5×2, 2.5×2, 1.25×2                                |
| `bar_weight_kg`            | numeric(4,1)       | 20 (0–50)                                                                                         |
| `effort_metric`            | enum               | `rir` (Phase 3). Which effort target routines and logging show: RIR, RPE or both                  |
| `milestone_posts`          | enum               | `ask` (Phase 9): `auto`, `ask` or `never`. Whether records, rank-ups and goals become posts       |
| `created_at`, `updated_at` | timestamptz        |                                                                                                   |

## `exercises`

The exercise library. `created_by` null = **official** (readable by every signed-in user, written only by migrations); otherwise a **custom** exercise, readable and writable by its creator only.

| Column                     | Type                  | Notes                                                                                          |
| -------------------------- | --------------------- | ---------------------------------------------------------------------------------------------- |
| `id`                       | uuid PK               | Client may supply it (custom exercises use a client id; offline creation later)                |
| `slug`                     | text                  | `^[a-z0-9]+(-[a-z0-9]+)*$`, ≤ 80. Unique among official rows; unique per creator for custom    |
| `name`                     | text                  | 2–60 chars                                                                                     |
| `aliases`                  | text[]                | Search names, including Indian gym names ("pec deck", "dand", "baithak")                       |
| `category`                 | enum                  |                                                                                                |
| `equipment`                | enum                  |                                                                                                |
| `mechanic`                 | enum                  |                                                                                                |
| `log_type`                 | enum                  | What a set records (weight × reps, bodyweight ± load, time, distance + time)                   |
| `unilateral`               | boolean               | One side at a time                                                                             |
| `instructions`             | text[]                | Steps. Official rows need at least one                                                         |
| `tips`, `common_mistakes`  | text[]                | Bullets                                                                                        |
| `media_url`                | text, null            | Unused until a media source is chosen                                                          |
| `met_value`                | numeric(4,1)          | 1–20, default 3.5. Calorie estimates (open decision #9)                                        |
| `is_rankable`, `rank_key`  | boolean, text null    | `rank_key` is unique and links to a ranked lift (`src/lib/game/rankKeys.ts`); implies rankable |
| `created_by`               | uuid → profiles, null | Default `auth.uid()`. Cascades on account deletion                                             |
| `is_public`                | boolean               | Official rows are public; custom rows private (until sharing, Phase 9)                         |
| `created_at`, `updated_at` | timestamptz           |                                                                                                |

Checks: custom exercises can never be rankable or carry a `rank_key` (anti-cheat); machines, cables and Smith never rank (enforced by the seed validation, RANK_SYSTEM.md §4.3). The protect-columns trigger freezes `id`, `created_by` and `created_at`, so a custom exercise can't become official.

Policies: select `created_by is null or created_by = auth.uid()`; insert, update and delete only where `created_by = auth.uid()`.

## `exercise_muscles`

Muscles an exercise trains. Primary key `(exercise_id, muscle)`, so a muscle appears once per exercise. Cascades with the exercise. Indexed on `muscle`.

| Column        | Type         | Notes                                                                                                         |
| ------------- | ------------ | ------------------------------------------------------------------------------------------------------------- |
| `exercise_id` | uuid         |                                                                                                               |
| `muscle`      | enum         |                                                                                                               |
| `role`        | enum         |                                                                                                               |
| `weight`      | numeric(3,2) | Share of a set's volume for this muscle: primary 1, secondary 0.5 or 0.25, stabiliser 0.25 (check constraint) |

Policies follow the parent: readable when the exercise is, writable only on your own custom exercise.

## `exercise_library_meta`

One row (`id = true`) with `version` (integer) and `updated_at`. Read-only for signed-in users. Each generated library migration sets `version`; the app re-downloads the official library into SQLite when it differs from its local copy.

### How the official library is maintained

`supabase/seed/exercises.ts` (+ `supabase/seed/exercises/*.ts`) is the source of truth. `pnpm exercises:build` validates it (`supabase/seed/validate.ts`) and writes `supabase/migrations/<ts>_exercise_library_v<N>.sql`, an idempotent upsert keyed on the official slug (ids stay stable), which replaces the official muscle links and sets the version. Bump `LIBRARY_VERSION` for each new release; re-running for the same version rewrites that file. Never rename a published slug.

## Routines (Phase 3)

A routine is saved whole: the app writes it to SQLite, then pushes it with `save_routine()`. The set model is shared with live logging (Phase 4 prefills sessions from it) and the plan generator (Phase 5 writes `source = 'plan'` routines with a `progression_rule`). Ids are client-supplied, so offline creation syncs idempotently.

### `routine_folders`

**Owner-only** (select, insert, update, delete). Unique `(id, user_id)` backs the routines' composite foreign key.

| Column                     | Type            | Notes                                     |
| -------------------------- | --------------- | ----------------------------------------- |
| `id`                       | uuid PK         |                                           |
| `user_id`                  | uuid → profiles | Default `auth.uid()`; cascades            |
| `name`                     | text            | 1–40 chars (e.g. "Push Pull Legs")        |
| `sort_order`               | integer         |                                           |
| `created_at`, `updated_at` | timestamptz     | Protect-columns trigger freezes id, owner |

### `routines`

**Owner-only.** `(folder_id, user_id)` references `routine_folders (id, user_id)` `on delete set null (folder_id)`, so a routine can only sit in its owner's folder and survives the folder being deleted.

| Column                     | Type                 | Notes                                                                      |
| -------------------------- | -------------------- | -------------------------------------------------------------------------- |
| `id`                       | uuid PK              |                                                                            |
| `user_id`                  | uuid → profiles      | Default `auth.uid()`; cascades; frozen by trigger                          |
| `folder_id`                | uuid, null           |                                                                            |
| `name`                     | text                 | 1–60 chars                                                                 |
| `description`              | text, null           | ≤ 500                                                                      |
| `colour`                   | text, null           | A rank hue key (`iron` … `champion`), shown only as a small mark           |
| `estimated_duration_min`   | integer              | 0–1440. Computed by the client on save (`src/lib/routines/duration.ts`)    |
| `source`                   | enum, default manual | `copied` for starter routines and copies; `plan` from Phase 5              |
| `source_ref`               | text, null           | ≤ 100. `template:<slug>`, a plan id, a post id                             |
| `source_label`             | text, null           | ≤ 40. Credit for a copy (`@aarav`, shown as "Copied from @aarav"; Phase 9) |
| `sort_order`               | integer              | Order within its folder                                                    |
| `archived`                 | boolean              | Hidden from the main list                                                  |
| `created_at`, `updated_at` | timestamptz          | `updated_at` is the sync version                                           |

### `routine_exercises`

Readable and writable with the parent routine (`owns_routine()`); writes also require the exercise to be visible to the caller (`can_use_exercise()`: official or their own custom exercise).

| Column                        | Type                | Notes                                                                                |
| ----------------------------- | ------------------- | ------------------------------------------------------------------------------------ |
| `id`                          | uuid PK             |                                                                                      |
| `routine_id`                  | uuid → routines     | Cascades                                                                             |
| `exercise_id`                 | uuid → exercises    | **Restrict**: a custom exercise in use can't be deleted                              |
| `sort_order`                  | integer             |                                                                                      |
| `superset_group`              | smallint, null      | 1–100. Consecutive exercises with the same value are a superset/circuit (A1, A2…)    |
| `rest_seconds`                | integer, default 90 | 0–900. Rest after each set; inside a superset, rest before the next member (often 0) |
| `rest_after_superset_seconds` | integer, null       | 0–900. Superset members only: rest after a full round (same on every member)         |
| `notes`                       | text, null          | ≤ 500                                                                                |
| `progression_rule`            | jsonb object, null  | Plan progression (Phase 5)                                                           |
| `created_at`                  | timestamptz         |                                                                                      |

### `routine_sets`

Readable and writable with the parent routine (`owns_routine_exercise()`).

| Column                          | Type                     | Notes                                                                                 |
| ------------------------------- | ------------------------ | ------------------------------------------------------------------------------------- |
| `id`                            | uuid PK                  |                                                                                       |
| `routine_exercise_id`           | uuid → routine_exercises | Cascades                                                                              |
| `sort_order`                    | integer                  |                                                                                       |
| `set_type`                      | enum                     | Warm-ups never count toward working sets, volume or ranking                           |
| `target_type`                   | enum                     | Decides which target is required (check `routine_sets_target_present`)                |
| `reps` / `reps_min`, `reps_max` | smallint, null           | 1–100. `reps` target needs `reps`; `rep_range` needs min < max                        |
| `duration_sec` / `distance_m`   | integer, null            | 1–7200 s / 1–100 000 m                                                                |
| `weight_kg`                     | numeric(6,2), null       | 0–1000. Bar/stack weight (absolute), added load (bodyweight) or assistance (assisted) |
| `weight_mode`                   | enum                     | A percentage mode always has `weight_percent`, and only those do                      |
| `weight_percent`                | numeric(4,1), null       | 1–150. % of 1RM or % of the last top set before it                                    |
| `rir`                           | smallint, null           | 0–5                                                                                   |
| `rpe`                           | numeric(3,1), null       | 5–10 in 0.5 steps                                                                     |
| `tempo`                         | text, null               | `^[0-9X]-[0-9X]-[0-9X]-[0-9X]$` (e.g. `3-1-X-0`)                                      |
| `created_at`                    | timestamptz              |                                                                                       |

A drop set belongs to the nearest earlier non-drop set (no parent column), so it can never be first; `save_routine` rejects that.

## Workouts (Phase 4)

Logged sessions. Written **only** through `save_workout()` (security definer, checks ownership itself); clients have `select` on all four tables and `delete` on `workouts` (children cascade). Ids are client-supplied, so a workout logged offline reaches the server exactly once however often the push is retried.

| Enum             | Values                                  |
| ---------------- | --------------------------------------- |
| `workout_status` | `in_progress`, `completed`, `discarded` |

### `workouts`

**Owner-only** (select, delete).

| Column                     | Type                  | Notes                                                                                     |
| -------------------------- | --------------------- | ----------------------------------------------------------------------------------------- |
| `id`                       | uuid PK               | Client id                                                                                 |
| `user_id`                  | uuid → profiles       | Cascades                                                                                  |
| `routine_id`               | uuid → routines, null | Set null on routine delete; an unknown or foreign routine is dropped on save              |
| `plan_day_id`              | uuid, null            | The planned session it came from (no foreign key; see Plans)                              |
| `name`                     | text                  | 1–60                                                                                      |
| `started_at`, `ended_at`   | timestamptz           | Not in the future; completed needs `ended_at`                                             |
| `duration_sec`             | integer, null         | **Server**: ended − started, completed only (≤ 24 h)                                      |
| `notes`                    | text, null            | ≤ 1000                                                                                    |
| `perceived_effort`         | smallint, null        | 1–10                                                                                      |
| `bodyweight_kg`            | numeric(5,2), null    | Snapshot of the latest weigh-in                                                           |
| `calories_est`             | integer, null         | **Server**: MET (weighted by completed working sets) × bodyweight × hours                 |
| `total_volume_kg`          | numeric(10,2)         | **Server**: weight × reps over completed non-warm-up sets (absolute and bodyweight modes) |
| `visibility`               | `profile_visibility`  | Default `friends`                                                                         |
| `status`                   | `workout_status`      |                                                                                           |
| `client_updated_at`        | timestamptz           | The device clock at its last change: the version for "latest draft wins"                  |
| `revision`                 | integer               | Bumped by each edit of a completed workout                                                |
| `photo_path`               | text, null            | `<user id>/<workout id>.jpg` in `workout-photos`; set only via `set_workout_photo()`      |
| `created_at`, `updated_at` | timestamptz           |                                                                                           |

Index `(user_id, started_at desc)`.

### `workout_exercises`

Readable with the parent workout (`owns_workout()`). Columns as `routine_exercises` minus `progression_rule`: `id`, `workout_id` (cascade), `exercise_id` (**restrict**), `sort_order`, `superset_group`, `rest_seconds`, `rest_after_superset_seconds`, `notes`. Indexed on `exercise_id` (exercise history).

### `workout_sets`

Readable with the parent workout. `set_type`, `weight_mode` (how `weight_kg` is read: bar, added, assistance), optional targets (`target_type`, `target_reps`, `target_reps_min/max`, `target_duration_sec`, `target_distance_m`, `target_weight_kg` (percentages resolved to kg at start), `target_rir`, `target_rpe`, `tempo`), actuals (`reps` 0–500, `weight_kg`, `duration_sec`, `distance_m`, `rir` 0–10, `rpe` 1–10 in 0.5), `completed`, `completed_at`, `failed` (attempted and missed), `is_pr` (**server only**: set by the rank engine on sets that beat a record).

### `workout_revisions`

Append-only history of edits to completed workouts: `workout_id`, `user_id`, `revision` (the number the snapshot had), `snapshot` (jsonb, payload shape), `created_at`. Unique `(workout_id, revision)`. Owner can read.

### Storage: `workout-photos`

Private bucket (5 MB, JPEG/PNG). Policies on `storage.objects`: select, insert, update and delete only where the first folder is the caller's id. Local Supabase runs Storage (`pnpm db:start` no longer excludes it).

## Plans (Phase 5)

A training plan: a schedule of days over 4–8 weeks, each day pointing at a routine the plan generator wrote (`routines.source = 'plan'`, `source_ref` = the plan id). How plans are built: [PLAN_ENGINE.md](PLAN_ENGINE.md). The app writes plans to SQLite and pushes them whole with `save_plan()`; ids are client-supplied.

| Enum              | Values                                                                                    |
| ----------------- | ----------------------------------------------------------------------------------------- |
| `plan_status`     | `active`, `completed`, `abandoned`                                                        |
| `plan_day_status` | `pending`, `done`, `missed`, `moved` (still to do, on a different day than first planned) |

### `plans`

**Owner-only** (select, insert, update, delete). A partial unique index allows **one active plan per user**.

| Column                     | Type              | Notes                                                                                               |
| -------------------------- | ----------------- | --------------------------------------------------------------------------------------------------- |
| `id`                       | uuid PK           | Client id                                                                                           |
| `user_id`                  | uuid → profiles   | Default `auth.uid()`; cascades; frozen by trigger                                                   |
| `name`                     | text              | 1–60 ("Build muscle · 4 days")                                                                      |
| `goal`                     | `primary_goal`    |                                                                                                     |
| `settings`                 | jsonb object      | `{v, input, seed}`: the questionnaire answers and the engine seed (`src/lib/plans/engine/input.ts`) |
| `start_date`, `end_date`   | date              | `end_date >= start_date`, at most 120 days apart                                                    |
| `status`                   | `plan_status`     | Default `active`                                                                                    |
| `paused_at`                | timestamptz, null | Set while paused                                                                                    |
| `created_at`, `updated_at` | timestamptz       | `updated_at` is the sync version                                                                    |

### `plan_weeks`

Readable and writable with the plan (`owns_plan()`). `id`, `plan_id` (cascade), `week` (1–12), `starts_on` (the Monday), `deload` (the lighter last week of 6- and 8-week plans). Unique `(plan_id, week)`.

### `plan_days`

Readable and writable with the plan; inserts and updates also require the routine to be the caller's (`owns_routine()`).

| Column          | Type                  | Notes                                                    |
| --------------- | --------------------- | -------------------------------------------------------- |
| `id`            | uuid PK               | Client id; workouts point at it (`workouts.plan_day_id`) |
| `plan_id`       | uuid → plans          | Cascades                                                 |
| `week`          | smallint              | 1–12                                                     |
| `date`          | date                  | Where the session is now                                 |
| `original_date` | date                  | Where it was first planned                               |
| `template_key`  | text                  | 1–20, the session type (`UPPER_A`); shared across weeks  |
| `label`         | text                  | 1–60 ("Upper A")                                         |
| `routine_id`    | uuid → routines, null | On delete set null                                       |
| `status`        | `plan_day_status`     | Default `pending`                                        |
| `created_at`    | timestamptz           |                                                          |

Index `(plan_id, date)`.

`workouts.plan_day_id` has **no foreign key** (a workout logged offline can reach the server before its plan). The `workouts_check_plan_day` trigger drops a plan day that belongs to another user; `workouts_mark_plan_day` marks the owner's day `done` when a workout completes, and `save_plan` never turns a done day back.

## Ranks (Phase 6)

The rank engine: rules in [RANK_SYSTEM.md](RANK_SYSTEM.md). Configuration tables are written only by migrations (`pnpm standards:build`) and readable by every signed-in user; result tables are written only by the engine (security definer) and readable by their owner. `anon` has no access.

| Enum               | Values                                                                     |
| ------------------ | -------------------------------------------------------------------------- |
| `rank_tier`        | `iron` … `champion` (same order as the theme's `rankTiers`)                |
| `rank_scope`       | `lift`, `muscle`, `region`, `overall`, `weightlifting`, `calisthenics`     |
| `rank_discipline`  | `weightlifting`, `calisthenics`                                            |
| `standard_metric`  | `e1rm_ratio`, `reps`, `hold_seconds`                                       |
| `rank_status`      | `ranked`, `placement` (overall or discipline not unlocked yet)             |
| `rank_event_kind`  | `placed`, `rank_up`, `rank_down`                                           |
| `pr_kind`          | `e1rm`, `weight`, `reps_at_weight`, `set_volume`, `session_volume`, `hold` |
| `rank_flag_reason` | `reps_over_limit`, `e1rm_over_limit`, `hold_over_limit`                    |
| `rank_flag_status` | `pending`, `approved`, `rejected`                                          |

### Configuration

| Table                   | Columns                                                                                                                                                                                                                                   |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `rank_settings`         | One row: `active_standards_version`, `window_days` (180), `inactive_days` (60), `placement_lifts` (5), `placement_regions` (4), `discipline_min_lifts` (3), `bw_window_days` (30), `max_score` (1000). **Any update queues every lifter** |
| `rank_thresholds`       | `version`, `tier`, `division` (3–1; null only for Champion), `min_score`. PK `(version, min_score)`                                                                                                                                       |
| `rank_region_weights`   | `region` PK, `weight` (overall rank)                                                                                                                                                                                                      |
| `strength_age_brackets` | `min_age` PK, `max_age` (null = open), `factor`                                                                                                                                                                                           |
| `rank_lifts`            | `rank_key` PK, `name`, `discipline`, guardrails `max_ratio`, `max_reps`, `max_hold_sec`                                                                                                                                                   |
| `rank_variants`         | `slug` PK (an official exercise), `rank_key`: skill progressions that rank into their parent skill                                                                                                                                        |
| `strength_standards`    | `version`, `rank_key`, `variant` ('' or a progression slug), `sex` (male/female), `bw_min`, `bw_max`, `metric`, `anchor_scores[]`, `anchor_values[]`, `max_score`. Unique `(version, rank_key, variant, metric, sex, bw_min)`             |

### Results

| Table              | Columns                                                                                                                                                                                                                                    |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `ranks_current`    | PK `(user_id, scope, key)`; `score`, `tier`, `division` (null while placing), `status`, `best_set_id` (→ workout_sets, set null), `last_set_at`, `details` (placement progress for overall/disciplines), `standards_version`, `updated_at` |
| `rank_snapshots`   | `user_id`, `scope`, `key`, `score`, `tier`, `division`, `standards_version`, `taken_at`: written when a score changes by ≥ 0.1. Index `(user_id, scope, key, taken_at)`                                                                    |
| `rank_events`      | `user_id`, `scope`, `key`, `kind`, `from_tier`/`from_division`, `to_tier`/`to_division`, `score`, `workout_id` (the save that caused it; null for background runs), `created_at`                                                           |
| `personal_records` | `user_id`, `exercise_id`, `kind`, `weight_kg` (reps-at-weight only), `value`, `previous_value` (null = baseline), `workout_id`, `workout_set_id` (null for session volume), `achieved_at`. Rebuilt in full on every recompute              |
| `rank_flags`       | `workout_set_id` PK, `user_id`, `reason`, `status`, `created_at`. Pending and rejected sets don't rank or set records                                                                                                                      |
| `workout_rewards`  | `workout_id` PK, `user_id`, `rewards` (jsonb, as returned by `save_workout`), `updated_at`                                                                                                                                                 |
| `rank_jobs`        | `user_id` PK (no foreign key: queued from triggers during deletes), `reason`, `queued_at`. No policies; engine only                                                                                                                        |

Triggers queue a recompute when a finished workout is deleted (`workouts_rank_delete`), a weigh-in changes (`bodyweight_logs_rank`), `sex_for_standards` or `birth_year` changes (`profiles_rank_inputs`), or `rank_settings` is updated (`rank_settings_changed`, everyone). pg_cron runs `process_rank_jobs(200)` every minute (`process-rank-jobs`).

## Functions

| Function                                                                                                                                                                         | Kind                     | Purpose                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `handle_new_user()`                                                                                                                                                              | trigger, definer         | Creates `profiles` (+ Google name/picture) and `user_settings` for each new auth user                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `username_available(name text) → boolean`                                                                                                                                        | definer, `authenticated` | Format + reserved + unique check; your own username counts as available                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `is_reserved_username(name text) → boolean`                                                                                                                                      | immutable                | Reserved names (admin, support, rankedgym…)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `are_friends(a uuid, b uuid) → boolean`                                                                                                                                          | definer                  | An accepted `friendships` row for the pair (Phase 9; was a stub returning false)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `can_view_profile_details(owner, vis, viewer)`                                                                                                                                   | definer                  | Visibility rule used by `public_profile_cards`; false across a block (Phase 9)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `set_updated_at()`, `*_protect_columns()`, `profiles_enforce_min_age()`                                                                                                          | triggers                 |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `region_of_muscle(m muscle) → muscle_region`                                                                                                                                     | immutable                | Body region of a muscle (null for neck). For server-side muscle maths (Phase 8)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `save_custom_exercise(p_id, p_name, p_equipment, p_log_type, p_primary muscle[], p_secondary muscle[]) → uuid`                                                                   | invoker, `authenticated` | Creates or edits the caller's custom exercise and replaces its muscles in one transaction. Derives category, mechanic, slug and MET. Rejects no primary muscle or a muscle in both lists (22023). RLS applies                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `save_routine(p jsonb) → timestamptz`                                                                                                                                            | invoker, `authenticated` | Saves a whole routine (snake_case JSON with `exercises[].sets[]`, order = array position) in one transaction: upserts routine, exercises and sets by client id, deletes the missing ones, returns `updated_at`. Rejects > 30 exercises, > 20 sets, a leading drop set (22023). RLS applies                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `owns_routine(id)`, `owns_routine_exercise(id)`, `can_use_exercise(id)`                                                                                                          | invoker, stable          | Policy helpers for the routine child tables                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `save_workout(p jsonb) → jsonb`                                                                                                                                                  | definer, `authenticated` | Saves a whole workout (`exercises[].sets[]`, order = position). A push not newer than the stored `client_updated_at` changes nothing; a completed workout changes only with `edit: true`, which snapshots it into `workout_revisions` and bumps `revision`. Rejects foreign ids, unusable exercises, > 40 exercises, > 30 sets, a future start (42501/22023). Recomputes totals. When the saved workout is completed, runs the rank engine (a failure queues a job instead of failing the save). Returns `{applied, revision, client_updated_at, status, rewards}`; `rewards` = `{workout_id, standards_version, prs[], baselines, rank_changes[], placement, needs_bodyweight, flagged, xp_placeholder}` (null for replays and drafts) |
| `set_workout_photo(p_id, p_path default null)`                                                                                                                                   | definer, `authenticated` | Attaches or clears the photo path (must be in the caller's folder)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `refresh_workout_totals(id)`, `workout_snapshot(id)`                                                                                                                             | definer, internal        | Duration, volume and calories; a workout as JSON for revisions. Not callable by clients                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `owns_workout(id)`                                                                                                                                                               | invoker, stable          | Policy helper for the workout child tables                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `save_plan(p jsonb) → timestamptz`                                                                                                                                               | invoker, `authenticated` | Saves a whole plan (snake_case JSON with `weeks[]` and `days[]`) in one transaction: upserts by client id, deletes missing weeks and days, returns `updated_at`. Saving an active plan marks the caller's other active plan `abandoned`. A day already `done` stays done. Rejects > 12 weeks, > 100 days (22023). RLS applies                                                                                                                                                                                                                                                                                                                                                                                                           |
| `owns_plan(id)`                                                                                                                                                                  | invoker, stable          | Policy helper for `plan_weeks` and `plan_days`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `rank_recompute_user(p_user, p_workout default null) → jsonb`                                                                                                                    | definer, internal        | The rank engine: rebuilds one user's flags, lift/muscle/region/overall/discipline ranks, snapshots, events, records and `is_pr` (advisory lock per user). With a workout id, tags events with it, stores and returns that workout's rewards. Not callable by clients                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `process_rank_jobs(p_max) → integer`                                                                                                                                             | definer, internal        | Runs queued recomputes (pg_cron). Not callable by clients                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `get_ranks()`                                                                                                                                                                    | invoker, `authenticated` | The caller's `ranks_current` rows plus `inactive` (no rankable set for `inactive_days`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `get_rank_predictions() → jsonb`                                                                                                                                                 | invoker, `authenticated` | Per ranked lift: next division, `target_score`, `e1rm_kg` and `loads` (1/3/5/8 reps), or `reps` / `added_loads` / `seconds`, `eta {status, days}`, `bodyweight_kg`, `bodyweight_stale`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `get_workout_rewards(p_workout) → jsonb`                                                                                                                                         | invoker, `authenticated` | The stored rewards of the caller's workout (null otherwise)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `rank_e1rm`, `rank_rep_factor`, `rank_interp`, `rank_ordinal`, `rank_tier_for`, `rank_age_factor`, `rank_standard_at`, `rank_metric_score`, `rank_set_score`, `rank_flag_reason` | immutable/stable helpers | The engine's maths, mirrored by `src/lib/game/engine` and table-tested in `07_ranks.test.sql`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `rank_enqueue(user, reason)` and the `rank_enqueue_*()` triggers                                                                                                                 | definer, internal        | Queue recomputes. Not callable by clients                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `workouts_check_plan_day()`, `workouts_mark_plan_day()`                                                                                                                          | triggers, definer        | Drop a foreign `plan_day_id`; mark the owner's plan day done when a workout completes. Not callable by clients                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |

## Auth

- Email one-time code (6 digits; template must contain `{{ .Token }}`) and Google (Supabase OAuth + PKCE through a browser sheet).
- Redirect URLs allowed: `exp://**` (Expo Go) and `rankedgym://**` (builds).
- Sessions persist in SecureStore (chunked; `src/lib/auth/secureStorage.ts`).

## Rank tab and leagues (Phase 7)

Rules: [RANK_SYSTEM.md](RANK_SYSTEM.md) §18–19. Migrations `*_rank_tab.sql` (reads) and `*_leagues.sql`; pgTAP `09_rank_tab` and `11_leagues`.

### Rank tab reads

All are invoker functions over the caller's own rows, granted to `authenticated`, except `get_lift_percentile`:

| Function                                            | Returns                                                                                                                                                                                                                 |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `get_rank_history(p_scope, p_key, p_since) → jsonb` | `{snapshots[{at, score, tier, division}], events[{at, kind, from_*, to_*, score}]}`. Snapshots include the last one before `p_since`; events are timed by their workout                                                 |
| `get_rank_events(p_since) → table`                  | `scope, key, kind, from/to tier and division, score, at (workout start), workout_id`                                                                                                                                    |
| `get_personal_records() → table`                    | Every record and baseline, with `exercise_name, rank_key, log_type, workout_name` and the set's `reps, weight_kg, duration_sec, weight_mode`                                                                            |
| `get_lift_bests() → table`                          | Per ranked lift: the best set (`weight_kg, reps, duration_sec, e1rm`) and the weigh-in it was scored at                                                                                                                 |
| `get_lift_detail(p_rank_key) → jsonb`               | `rank`, `sets` in the 180-day window with scores (`is_best`), best per `sessions` (all time), `standards` (anchor values at today's bodyweight and age)                                                                 |
| `get_lift_percentile(p_rank_key) → jsonb`           | **Definer.** `{percentile, cohort, min_cohort (20), sex, bw_min, bw_max}` among other lifters of the same standards sex and bodyweight band. `percentile` stays null below 20, and no identities or scores are returned |

### Leagues

| Enum              | Values                                                                |
| ----------------- | --------------------------------------------------------------------- |
| `league_division` | `rookie`, `contender`, `elite`, `legend`                              |
| `league_kind`     | `ranked` (weekly groups), `custom` (friends), `community` (Phase 12B) |
| `league_scoring`  | `lp`, `volume`, `lift_improvement`, `attendance`                      |
| `league_outcome`  | `promoted`, `stayed`, `demoted`                                       |
| `league_status`   | `open`, `closed`                                                      |
| `challenge_kind`  | `most_reps`, `lift_frequency`, `workouts`                             |

| Table               | Columns                                                                                                                                                                                                                                                                                                    |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `league_seasons`    | `id`, `number` (unique), `starts_at`, `ends_at` (8 weeks), `status`. Signed-in users can read                                                                                                                                                                                                              |
| `league_weeks`      | `id`, `season_id`, `week_no` 1–8, `starts_at` (Monday 00:00 IST, unique), `ends_at`, `status`, `closed_at`. Signed-in users can read                                                                                                                                                                       |
| `leagues`           | `id`, `kind`, `week_id` + `division` + `group_no` (ranked only), `name`, `owner_id` (custom), `community_id` (no FK yet, Phase 12B), `scoring`, `scoring_rank_key` (lift improvement only), `starts_at`, `ends_at`, `invite_code` (`^[A-Z2-9]{8}$`, unique), `max_members`, `status`. **Members can read** |
| `league_members`    | PK `(league_id, user_id)`; `joined_at`, `seed_score` (overall score at placement), and frozen at close: `final_points`, `final_position`, `outcome`, `result_seen_at`. **Members can read**                                                                                                                |
| `league_standing`   | `user_id` PK, `division` (default rookie). Owner can read                                                                                                                                                                                                                                                  |
| `league_challenges` | `id`, `league_id`, `kind`, `title`, `rank_key`, `target` (none for most reps), `starts_at`, `ends_at`, `created_by`. Members can read                                                                                                                                                                      |
| `season_rewards`    | PK `(user_id, season_id)`; `best_division`, `badge_key` (`season-<n>-<division>`), `frame_key` (`season-elite` / `season-legend`), `granted_at`. Owner can read                                                                                                                                            |

**Grants and policies:** clients get `select` only. The member policies use `is_league_member()` (definer, to avoid RLS recursion). Every write goes through the functions below.

**Engine functions** (internal, not callable by clients):

- **Time:** `league_week_start(at)`, and `league_now()`, which is `now()` unless a session sets `app.league_now` (tests and the simulator; clients can't).
- **Points:** `league_qualifying_workouts`, `league_lp_breakdown(user, from, to) → jsonb` (one key per source plus `total` and `counts`), `league_lp`, `league_member_points(league, user, to)` (by scoring), `league_ranking(league, to)` (points, then tie-breaks), `league_zone_size(n)` (20%, rounded).
- **The cycle:** `league_seed_score`, `league_add_challenges`, `league_close_league`, `league_place` (mid-week join), `league_open_week`, `league_run_cycle(p_now) → jsonb` (pg_cron `league-weekly-cycle`, hourly at :35).
- **Trigger:** `workouts_league_join` (after insert or update of status on `workouts`), which places a lifter on their first completed workout of an open week.

**Client RPCs** (`authenticated`):

- `get_league_home() → jsonb`: season, week, division, my league (position, points, promote and demote counts), LP `breakdown`, an unseen `result`, and my open `custom` leagues.
- `get_league_standings(league) → jsonb`: members only. Rows with `position, user_id, points, display_name, username, avatar_url, is_you, outcome, zone`.
- `get_league_challenges(league) → jsonb`: members only. Each with `mine`, `completed_by` and the top 3 `leaders`.
- `get_league_history() → jsonb` and `get_season_recap(season) → jsonb`.
- `create_custom_league(name, weeks 1–8, scoring, rank_key?) → {id, invite_code}`: at most 5 open leagues per owner.
- `join_league(code) → uuid`: case-insensitive; `P0002` for a wrong code, `22023` when the league is finished or full.
- `leave_league(league)`: the owner leaving deletes the league.
- `create_league_challenge(league, kind, title, rank_key?, target?)`: owner of a custom league only, up to 10 challenges.
- `mark_league_result_seen(league)`: also clears older unseen results.

## Phase 8: Home insights and goals

Migrations: `20261009133032_home_insights.sql`, `20261009134301_goal_trends.sql`, `20261009140956_home_insights_calendar.sql`.

### Views and RPCs

- `home_working_sets`: security-invoker view over caller-owned completed workouts and successful, completed, non-warm-up strength/calisthenics sets. Includes exercise id, timestamps, effort and loaded kg × reps (absolute/bodyweight modes). Underlying workout RLS still applies.
- `get_home_analytics(p_start, p_end, p_zone default Asia/Kolkata) → jsonb`: authenticated, invoker. Half-open range of at most 366 days; current/previous period session totals, zero-filled daily series, weighted muscle sets/volume, all-history raw fatigue decayed to `asOf`, recent weigh-ins (including seven-day lead-in), PRs excluding baselines, prior PR count and lift/overall rank-up events. Records retain `weight_kg` for reps-at-load labels. Overview reads authoritative workout totals; muscle sets use primary 1.0, secondary 0.5, exclude stabilisers. Fatigue uses the exercise library's actual muscle weights, RIR/RPE and muscle half-life. `recovery_half_life(muscle)` and `training_streak(p_now,p_zone)` are supporting authenticated helpers.
- `save_goal(p_id,p_type,p_target,p_deadline default null,p_auto_post default false,p_archive default false,p_zone default Asia/Kolkata) → uuid`: authenticated, definer, empty search path. Checks caller/goal ownership, target shape, usable exercise/rank key/division and an initial weigh-in for bodyweight goals. Derives `start_value` on the server. Clients cannot directly write the goals table or forge status.
- `get_goals(p_zone default Asia/Kolkata) → jsonb`: authenticated, definer, empty search path. Locks the caller's goals, evaluates current values and atomically marks newly achieved goals. An unplaced rank never completes an Iron target. Opted-in posts use profile visibility and a unique goal id. Returns current/target values and aggregate trend observations; calendar grouping uses `p_zone`. `goal_observations` is internal only; `goal_value` enforces owner identity.

### `goals`

Owner-only SELECT, engine/RPC writes. UUID `id`, `user_id` → profiles, validated `type`, `target jsonb`, numeric `start_value`, nullable date `deadline`, `status` active/achieved/archived, `auto_post` false, nullable `achieved_at`, `created_at`, `updated_at`. Index `(user_id,status)`.

Every target contains `title` (1–80 characters). Lift: `exercise_id`, positive `weight_kg`, integer `reps`; rank: `scope` overall/lift, `key`, threshold `score`; bodyweight: `kg` (20–400); weekly_workouts/streak/monthly_volume: `value`; custom: boolean `checked`. First achievement persists even if the metric later declines. Archiving preserves it.

### Goal posts

Phase 8's `goal_posts` table was folded into `posts` (type `goal`, `milestone_key` `goal:<id>`) by the Phase 9 migration, which moved its rows and dropped it. `get_goals` now inserts the post; the `milestone_posts = 'never'` setting overrides a goal's own `auto_post`, and a private profile never posts.

### Device cache and account-free development

`insights.v1.<query key>` in Expo SQLite KV stores validated analytics/goals by user, range and timezone. Sign-out clears the former user's insight cache; local writes and sync completion invalidate queries. Cached fatigue retains raw values rather than clamped percentages so hour-by-hour decay stays correct offline.

Development auth bypass reads actual completed on-device workouts through SQLite aggregates and the same pure fatigue model. `insights.preview.goals`, `.bodyweight`, `.speed` store account-free development data only. These rows never sync or publish, and rank targets wait for server validation. No local relational schema migration was needed.

## Social (Phase 9)

Migration `20261010090000_social.sql`; pgTAP `12_social.test.sql` (131 assertions, including the visibility matrix and the non-friend API proofs). Discover's ranking: [DISCOVER_RANKING.md](DISCOVER_RANKING.md). Rules: PRODUCT_SPEC §10I.

**The visibility rule** (only here, never in the app): a post is visible to its author, and to anyone else when neither has blocked the other, the author is onboarded, and the **more restrictive** of the post's visibility and the author's profile visibility allows it: `public` = every signed-in user, `friends` = accepted friends, `private` = nobody. So a friends-only profile caps its public posts at friends, and a private profile's posts are only ever seen by their author.

| Enum                  | Values                                                                                  |
| --------------------- | --------------------------------------------------------------------------------------- |
| `friendship_status`   | `pending`, `accepted`, `declined`                                                       |
| `post_type`           | `workout`, `text`, `photo`, `pr`, `rank_up`, `goal`, `league_result`                    |
| `milestone_post_mode` | `auto`, `ask`, `never`                                                                  |
| `report_reason`       | `spam`, `harassment`, `hate`, `nudity`, `violence`, `self_harm`, `false_info`, `other`  |
| `notification_kind`   | `respect`, `comment`, `reply`, `mention`, `friend_request`, `friend_accepted`, `follow` |

### Tables

| Table           | Columns                                                                                                                                                                                                                                                                                                                                                               | Access                                                                                                                                                                            |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `friendships`   | `id`, `requester_id`, `addressee_id`, `status`, `created_at`, `responded_at`. One row per unordered pair (unique index on least/greatest); no self rows                                                                                                                                                                                                               | Either side can SELECT. Written only by the graph RPCs                                                                                                                            |
| `follows`       | PK `(follower_id, followee_id)`, `created_at`. Only public profiles can be followed                                                                                                                                                                                                                                                                                   | Either side can SELECT. RPC writes                                                                                                                                                |
| `blocks`        | PK `(blocker_id, blocked_id)`, `created_at`                                                                                                                                                                                                                                                                                                                           | Only the blocker can SELECT (the blocked person can't tell). RPC writes                                                                                                           |
| `posts`         | `id` (client id), `author_id`, `type`, `workout_id` (workout posts only; cascades; unique), `goal_id`, `body` ≤ 1000, `media` (≤ 4 `{path, w, h}`), `data` (milestone or attachment snapshot, built by the server), `workout_summary` (kept by triggers), `milestone_key` (unique per author), `visibility`, `created_at`, `edited_at`, `like_count`, `comment_count` | SELECT where `can_view_post_row`; the author can DELETE. No INSERT/UPDATE grants: RPCs and triggers only. Counters are trigger-maintained. In the `supabase_realtime` publication |
| `post_likes`    | PK `(post_id, user_id)`, `created_at` ("Respect")                                                                                                                                                                                                                                                                                                                     | SELECT where the post is visible and the liker isn't blocked; INSERT your own on a visible post; DELETE your own                                                                  |
| `comments`      | `id` (client id), `post_id`, `author_id`, `parent_id` (one level: the parent is a top-level comment on the same post), `body` 1–500 (null once deleted), `created_at`, `edited_at`, `deleted_at`                                                                                                                                                                      | SELECT where the post is visible and the author isn't blocked. RPC writes                                                                                                         |
| `reports`       | `id`, `reporter_id`, `post_id` xor `comment_id`, `reason`, `details` ≤ 500, `status` (`open`; review is Phase 13), `created_at`. Unique per reporter and target                                                                                                                                                                                                       | The reporter can SELECT their own; INSERT (columns `post_id, comment_id, reason, details`) only for a target they can see                                                         |
| `notifications` | `id`, `user_id` (recipient), `actor_id`, `kind`, `post_id`, `comment_id`, `created_at`, `read_at`. Respect and follow are deduplicated                                                                                                                                                                                                                                | The recipient can SELECT and UPDATE `read_at` only. Written by triggers and RPCs. In the `supabase_realtime` publication                                                          |

Notifications are never created across a block, for a post the recipient can't see, or for yourself. Taking respect back removes its notification; deleting a comment removes its notifications (cascade).

**Workout posts**: a trigger on `workouts` (`workouts_social_post`, after insert or update) keeps one post per completed, non-private workout: `private` deletes it, a visibility change follows, deleting the workout cascades. The `workout_summary` (name, totals, set count, first three exercises with their best set and PR flag, records count, rank-ups, weighted muscle sets for the thumbnail, `photo_path`, `calisthenics`) is rebuilt on each change and again when `workout_rewards` is written, so the feed reads one column. Post time is the workout's end.

**Milestones**: `social_build_milestone` builds a record (`pr:<workout>:<exercise>:<kind>`), rank-up (`rank:<scope>:<key>:<tier>:<division>`) or league result (`league:<id>`) from the user's own rows; clients only choose which. With `milestone_posts = 'auto'`, the first `workout_rewards` row of a workout posts its best record and biggest rank-up (trigger `workout_rewards_social`). Goals: see Phase 8 above.

### Storage

- `post-media` (private, 5 MB, JPEG): `<author>/<post>/<n>.jpg`. Owners upload and delete in their folder; SELECT where `can_view_post` allows the post id in the path. The app re-encodes photos before upload (EXIF and GPS stripped) and signs URLs in batches.
- `workout-photos` gains a SELECT policy: the photo of a workout whose post the viewer can see (`can_view_workout_photo`).

### Functions

| Function                                                                                                                                                                                                                                              | Kind                             | Purpose                                                                                                                                                                                                                               |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `is_blocked(a, b)`, `can_view_profile(viewer, owner)`, `can_view_post_row(viewer, author, vis)`, `can_view_post(viewer, post)`, `can_view_comment(viewer, comment)`, `can_view_workout_photo(viewer, path)`, `visibility_rank(vis)`, `try_uuid(text)` | definer helpers, `authenticated` | The visibility rule, used by policies (RLS and storage run them as the caller)                                                                                                                                                        |
| `send_friend_request(user) → text`                                                                                                                                                                                                                    | definer RPC                      | `pending` or `accepted` (asking someone who asked you accepts). A decline quietly stays pending for 30 days. At most 100 waiting                                                                                                      |
| `respond_friend_request(id, accept)`, `cancel_friend_request(id)`, `remove_friend(user)`                                                                                                                                                              | definer RPCs                     | The addressee answers; the requester cancels; either removes                                                                                                                                                                          |
| `follow_user(user)`, `unfollow_user(user)`                                                                                                                                                                                                            | definer RPCs                     | Public, onboarded, unblocked profiles only                                                                                                                                                                                            |
| `block_user(user)`, `unblock_user(user)`                                                                                                                                                                                                              | definer RPCs                     | Blocking deletes friendships, requests, follows and notifications both ways. Unblocking doesn't restore them                                                                                                                          |
| `create_post(p jsonb) → uuid`                                                                                                                                                                                                                         | definer RPC                      | Text/photo posts: `{id, body, media[], visibility, attach: {workout_id} \| {pr: {workout_id, exercise_id, kind}}}`. Media must be the caller's uploads for this post; attachments the caller's own. Replays return the id; 30 an hour |
| `edit_post(id, body, visibility, keep_media[])`                                                                                                                                                                                                       | definer RPC                      | Caption, visibility, which photos stay; a workout post's visibility is its workout's                                                                                                                                                  |
| `create_milestone_post(kind, ref, visibility) → uuid`                                                                                                                                                                                                 | definer RPC                      | Records, rank-ups, league results; idempotent per milestone                                                                                                                                                                           |
| `add_comment(id, post, body, parent)`, `edit_comment(id, body)`, `delete_comment(id)`                                                                                                                                                                 | definer RPCs                     | Client ids (optimistic UI); 10 a minute; the comment's or the post's author can delete; one with replies is soft-deleted                                                                                                              |
| `report_content(reason, post, comment, details)`, `mark_notifications_read(ids)`                                                                                                                                                                      | invoker RPCs                     |                                                                                                                                                                                                                                       |
| `get_feed(before_at, before_id, limit)`                                                                                                                                                                                                               | definer read                     | Me, friends and followees; keyset `(created_at, id) desc`; `{posts, next}`                                                                                                                                                            |
| `get_post(id)`                                                                                                                                                                                                                                        | definer read                     | A visible post with `workout_detail` (exercises, completed sets) and `comment_list` (≤ 300, blocked authors hidden); null otherwise                                                                                                   |
| `get_user_posts(user, cursor…)`, `get_profile(username)`                                                                                                                                                                                              | definer reads                    | A profile with counts, mutual friends and my relationship (null if they blocked me)                                                                                                                                                   |
| `get_discover(filters[], exclude[], as_of, limit)`, `get_people_suggestions(limit)`                                                                                                                                                                   | definer reads                    | See DISCOVER_RANKING.md                                                                                                                                                                                                               |
| `search_profiles(query, limit)`, `get_friend_requests()`, `get_friends()`, `get_notifications(cursor…)`, `get_unread_notification_count()`                                                                                                            | reads                            | Friends first in search; blocked people never appear                                                                                                                                                                                  |
| `social_*`, `workouts_social_post`, `workout_rewards_social`, `post_likes_count`, `comments_count`                                                                                                                                                    | definer, internal                | Builders, triggers and helpers. Not callable by clients                                                                                                                                                                               |

Posts carry the author card from `social_person_json`: id, username, display name, avatar and the overall rank (only where the profile is visible).

## Local SQLite (device)

Drizzle schema in `src/lib/db/schema.ts`; migrations in `drizzle/` (`pnpm db:local:generate` after a schema change), applied on first use by `ensureDb()`.

| Table                                                              | Purpose                                                                                                                                                                                                                                                                        |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `exercises`                                                        | Mirror of the official library plus the user's custom exercises (arrays as JSON text)                                                                                                                                                                                          |
| `exercise_muscles`                                                 | Mirror of their muscle links                                                                                                                                                                                                                                                   |
| `exercise_usage`                                                   | Per-device pick counts and last use, for Recent / Most used (Phase 4 feeds it from logged sets too)                                                                                                                                                                            |
| `meta`                                                             | Key-value sync state (`exercise_library_version`, `exercise_library_source`)                                                                                                                                                                                                   |
| `routine_folders`, `routines`, `routine_exercises`, `routine_sets` | Mirrors of the routine tables (this user's rows only); the source of truth on the device. `routines.source_label` since `drizzle/0005`                                                                                                                                         |
| `routine_drafts`                                                   | Autosaved editor state per routine (JSON), restored when the editor reopens; cleared on save or discard                                                                                                                                                                        |
| `sync_queue`                                                       | Outbox: one row per `(entity, entity_id)` with `op` (upsert/delete), attempts, last error and next attempt. Entities: `routine_folder`, `routine`, `plan`, `workout`, `workout_photo`                                                                                          |
| `plans`, `plan_weeks`, `plan_days`                                 | Mirrors of the plan tables (this user's rows only; `settings` as JSON text)                                                                                                                                                                                                    |
| `workouts`, `workout_exercises`, `workout_sets`                    | Mirrors of the workout tables. A unique partial index allows one `in_progress` row. Local-only columns: `runtime` (rest timer, JSON), `photo_uri` (picked file in the documents folder), `pushed_at`, `pending_edit`, `rewards` (what `save_workout` returned; `drizzle/0004`) |

Sync (`src/lib/exercises/sync.ts`, on launch when signed in and online): read
`exercise_library_meta.version`; download the official library when the version differs, nothing
is cached, or `meta.exercise_library_source` differs from the configured backend URL. A cache
without a recorded source refreshes once. Matching versions across hosted/local projects do not
imply matching exercise IDs. Always refresh the user's custom exercises. Sign-out clears custom
exercises and usage; the official library stays.

Routine sync (`src/lib/routines/sync.ts` + `src/lib/sync/`): every local write queues its entity in the same SQLite transaction. The runner pushes due items (folders, then routines, then folder deletes) on launch, on foreground and after each save, backing off on failure (5 s doubling to 10 min). The pull fetches `id, updated_at` for all routines, downloads only changed ones, and removes local ones the server no longer has unless a push is pending; pending local changes always win. Sign-out clears routines, drafts and the queue.

Workout sync (`src/lib/workouts/sync.ts`): a successful push of a finished workout stores the returned `rewards` locally and refreshes the `ranks` queries (the summary screen waits on them). The active workout is saved 250 ms after each change (and immediately on backgrounding) and queued with a 20 s delay; finishing, editing, discarding and deleting queue immediately. Workouts push at rank 3 (after routines), photos at rank 4, deletes last. The runner (`src/lib/sync/runner.ts`) backs off 5 s doubling to 10 min, keeps a timer for the next due item, skips draining while the OS reports no connection, and retries failed items at once when it comes back (`startSyncEngine`, mounted by the tab layout). After 8 failures an item shows as "not synced" but keeps retrying. The pull fetches `id, client_updated_at, revision` of finished workouts and downloads only changed ones; pending local changes win. Sign-out clears workouts too.

Plan sync (`src/lib/plans/sync.ts`): creating or editing a plan writes it (and any routines it changed) to SQLite and queues them in one transaction. Plans push at rank 2 (after routines, before workouts) through `save_plan()`; the pull downloads plans whose `updated_at` differs, unless a local change is pending, and keeps days already done on this device done. Finishing a planned workout marks its local day done in the same transaction. Sign-out clears plans too.

Social (Phase 9) keeps no SQLite tables: the Feed's first page is cached in Expo SQLite KV as
`social.v1.feed.<user>` and the newest post seen as `social.v1.feedSeen.<user>` (the "caught up"
marker). These, insight caches, latest bodyweight, training settings and the onboarding flag are
removed on sign-out/account switches. Everything else is TanStack Query memory.

Account transitions close protected screens and stop retries before clearing in-memory workout
and routine drafts, settling outstanding saves/pushes and deleting cached account data. The next
session is published only after cleanup succeeds; stale server pulls check the account before
applying data. The outbox does not push in account-free preview.

Exercise, folder, routine, workout and plan listings paginate in stable ID order with exact counts.
Sync rejects incomplete or count-changing listings before using them to reconcile deletions.
`pnpm integrity` replays all SQLite migrations in memory, verifies their journal/bundle/snapshot
chain, and checks the migrated columns against the current Drizzle schema.
