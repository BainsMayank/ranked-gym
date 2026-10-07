import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite';

import * as schema from './schema';

export const DATABASE_NAME = 'ranked-gym.db';

let instance: ReturnType<typeof createDb> | undefined;

function createDb() {
  const sqlite = openDatabaseSync(DATABASE_NAME, { enableChangeListener: true });
  return drizzle(sqlite, { schema });
}

export type LocalDb = ReturnType<typeof createDb>;

/** Lazily opens the local database on first use. Prefer `ensureDb()`, which also migrates it. */
export function getDb(): LocalDb {
  instance ??= createDb();
  return instance;
}
