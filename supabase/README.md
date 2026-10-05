# supabase/

- `migrations/` — SQL migrations (`supabase migration new <name>`). Schema starts in Phase 1.
- `functions/` — Edge Functions (Deno). Server-trusted calculations (rank, XP, leaderboards, anti-cheat) live here or in Postgres.
- `seed.sql` — local seed data.

Never compute anything that affects ranks, XP, leaderboards or rewards on the client and trust it.
