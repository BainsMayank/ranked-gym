import { migrate } from 'drizzle-orm/expo-sqlite/migrator';

import migrations from '../../../drizzle/migrations';
import { getDb, type LocalDb } from './client';

let ready: Promise<LocalDb> | undefined;

/**
 * The local database with every pending migration applied. Runs the migrations once per app
 * launch; a failure is retried on the next call.
 */
export function ensureDb(): Promise<LocalDb> {
  ready ??= migrate(getDb(), migrations)
    .then(() => getDb())
    .catch((error: unknown) => {
      ready = undefined;
      throw error;
    });
  return ready;
}
