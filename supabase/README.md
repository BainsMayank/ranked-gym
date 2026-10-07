# supabase/

- `config.toml`: local stack and auth settings (redirect URLs, OTP length, email templates). `supabase config push` can copy auth settings to the linked project.
- `migrations/`: SQL migrations (`supabase migration new <name>`). The only way the schema changes. Described in `docs/SCHEMA.md`.
- `tests/database/`: pgTAP tests (`pnpm db:test`). Every table needs tests proving another user can't read or change it.
- `templates/`: auth email templates. The sign-in email must contain `{{ .Token }}` (the app uses codes, not links).
- `functions/`: Edge Functions (Deno). Server-trusted calculations (rank, XP, leaderboards, anti-cheat) live here or in Postgres.
- `seed.sql`: local-only seed data (empty). Data every environment needs ships as a migration instead.
- `seed/`: the official exercise library. `exercises.ts` (+ `exercises/*.ts`) is the source; `validate.ts` checks it; `build.ts` writes it as a migration.

### Updating the exercise library

1. Edit `seed/exercises/*.ts` (never rename a published slug: it's the upsert key) and bump `LIBRARY_VERSION` in `seed/exercises.ts`.
2. `pnpm exercises:build` validates the data and writes `migrations/<ts>_exercise_library_v<N>.sql` (re-running for the same version rewrites that file).
3. `pnpm db:reset && pnpm db:test`, then `pnpm db:push` for the hosted project. Apps notice the new version on next launch and re-download the library.

Local stack: `colima start`, then `pnpm db:start` (Studio at http://127.0.0.1:54323 is skipped by the script; drop the `-x` flag to get it). Mailpit (emails) is at http://127.0.0.1:54324.

Never compute anything that affects ranks, XP, leaderboards or rewards on the client and trust it.
