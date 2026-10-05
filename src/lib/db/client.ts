import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite';

export const DATABASE_NAME = 'ranked-gym.db';

let instance: ReturnType<typeof createDb> | undefined;

function createDb() {
  const sqlite = openDatabaseSync(DATABASE_NAME, { enableChangeListener: true });
  // Pass `{ schema }` from ./schema once tables exist (Phase 2/4) to enable relational queries.
  return drizzle(sqlite);
}

/** Lazily opens the local database on first use. */
export function getDb() {
  instance ??= createDb();
  return instance;
}
