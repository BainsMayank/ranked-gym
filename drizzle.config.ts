import { defineConfig } from 'drizzle-kit';

// Local SQLite (expo-sqlite) migrations. `pnpm db:local:generate` writes drizzle/.
export default defineConfig({
  dialect: 'sqlite',
  driver: 'expo',
  schema: './src/lib/db/schema.ts',
  out: './drizzle',
});
