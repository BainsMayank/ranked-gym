# Ranked Gym

An Android and iOS training app built with Expo, TypeScript, local SQLite and Supabase.
Workouts, routines and plans save locally and sync through an outbox; ranks, leagues and
social access rules are authoritative on the server.

## Develop

Use Node.js 22.18 or newer and pnpm 12.9.1 (pinned in `package.json`).

```sh
pnpm install --frozen-lockfile
cp .env.example .env
# Set SUPABASE_URL and SUPABASE_ANON_KEY in .env.
pnpm start
```

Development opens an account-free preview by default. To test real authentication and sync,
set `EXPO_PUBLIC_DEV_AUTH_BYPASS=false` and restart Expo. See [development notes](docs/DEVELOPMENT.md)
and [backend setup](docs/BACKEND_SETUP.md) for local Docker, hosted configuration and device checks.

## Verify

```sh
pnpm check              # references, SQLite migrations, types, lint, formatting and Jest
pnpm expo:doctor        # Expo dependency and configuration checks (requires network)
pnpm db:start           # requires Docker; applies migrations on a fresh local stack
pnpm db:test            # transactional pgTAP suite against the local database
pnpm db:types:check     # generated TypeScript schema matches the running local database
```

`pnpm integrity` checks local imports/assets, static navigation routes, relative Markdown links,
server migration filenames, and the SQLite migration journal/bundle. It replays every SQLite
migration in memory and compares the results with the snapshots and current source schema.
It does not exercise runtime navigation, external websites or native device behavior.

Database type generation writes atomically only after generation and formatting succeed.
`pnpm db:types` reads local Supabase; `pnpm db:types:remote` reads the linked hosted project.
Never substitute a service-role or secret key for the app's anonymous/publishable key.

## Project map

| Directory                       | Purpose                                                      |
| ------------------------------- | ------------------------------------------------------------ |
| `app/`                          | Expo Router route wrappers and layouts                       |
| `src/features/`                 | Feature screens and controllers                              |
| `src/components/`, `src/theme/` | Shared components and design tokens                          |
| `src/lib/`                      | Domain logic, repositories, sync and API clients             |
| `drizzle/`                      | Generated local SQLite migrations and snapshots              |
| `supabase/`                     | Server migrations, access-control tests and local seed tools |
| `scripts/`                      | Integrity checks, safe type generation and artwork tooling   |
| `docs/`                         | Product rules, schema, setup, audit findings and progress    |

Read [CLAUDE.md](CLAUDE.md) for engineering conventions, [the product spec](docs/PRODUCT_SPEC.md)
for intended behavior, [progress](docs/PROGRESS.md) for unfinished phases, and
[the integrity audit](docs/INTEGRITY_AUDIT.md) for verification evidence and remaining risks.

Friends invite/referral and leaderboard work (Phase 10), Profile/XP/export/account deletion
(Phase 11), and later phases remain unfinished. Passing checks does not make those features
production-ready.
