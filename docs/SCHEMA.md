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
| `sex_for_standards`  | `male`, `female`, `unspecified` (ranks on men's/open standards)                    |
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

What other signed-in users may see. Runs with the view owner's rights (`security_invoker = false`, `security_barrier = true`) so it can expose a column subset of rows that `profiles` RLS hides. `select` granted to `authenticated` only; rows only when `auth.uid()` is set and the profile is onboarded.

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

Index: `(user_id, logged_at desc)`. Ranks score sets at the bodyweight on the day (RANK_SYSTEM.md), so Phase 4/6 read the latest log at or before a set.

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

## Functions

| Function                                                                                                       | Kind                     | Purpose                                                                                                                                                                                                       |
| -------------------------------------------------------------------------------------------------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `handle_new_user()`                                                                                            | trigger, definer         | Creates `profiles` (+ Google name/picture) and `user_settings` for each new auth user                                                                                                                         |
| `username_available(name text) → boolean`                                                                      | definer, `authenticated` | Format + reserved + unique check; your own username counts as available                                                                                                                                       |
| `is_reserved_username(name text) → boolean`                                                                    | immutable                | Reserved names (admin, support, rankedgym…)                                                                                                                                                                   |
| `are_friends(a uuid, b uuid) → boolean`                                                                        | definer                  | **Stub returning false**; Phase 10 replaces it with the friendships lookup                                                                                                                                    |
| `can_view_profile_details(owner, vis, viewer)`                                                                 | definer                  | Visibility rule used by `public_profile_cards`                                                                                                                                                                |
| `set_updated_at()`, `*_protect_columns()`, `profiles_enforce_min_age()`                                        | triggers                 |                                                                                                                                                                                                               |
| `region_of_muscle(m muscle) → muscle_region`                                                                   | immutable                | Body region of a muscle (null for neck). For server-side muscle maths (Phase 8)                                                                                                                               |
| `save_custom_exercise(p_id, p_name, p_equipment, p_log_type, p_primary muscle[], p_secondary muscle[]) → uuid` | invoker, `authenticated` | Creates or edits the caller's custom exercise and replaces its muscles in one transaction. Derives category, mechanic, slug and MET. Rejects no primary muscle or a muscle in both lists (22023). RLS applies |

## Auth

- Email one-time code (6 digits; template must contain `{{ .Token }}`) and Google (Supabase OAuth + PKCE through a browser sheet).
- Redirect URLs allowed: `exp://**` (Expo Go) and `rankedgym://**` (builds).
- Sessions persist in SecureStore (chunked; `src/lib/auth/secureStorage.ts`).

## Local SQLite (device)

Drizzle schema in `src/lib/db/schema.ts`; migrations in `drizzle/` (`pnpm db:local:generate` after a schema change), applied on first use by `ensureDb()`.

| Table              | Purpose                                                                                             |
| ------------------ | --------------------------------------------------------------------------------------------------- |
| `exercises`        | Mirror of the official library plus the user's custom exercises (arrays as JSON text)               |
| `exercise_muscles` | Mirror of their muscle links                                                                        |
| `exercise_usage`   | Per-device pick counts and last use, for Recent / Most used (Phase 4 feeds it from logged sets too) |
| `meta`             | Key-value sync state (`exercise_library_version`)                                                   |

Sync (`src/lib/exercises/sync.ts`, on launch when signed in and online): read `exercise_library_meta.version`; download the official library only when it differs from the local version (or nothing is cached); always refresh the user's custom exercises. Sign-out clears custom exercises and usage; the official library stays.
