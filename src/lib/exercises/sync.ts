import Constants from 'expo-constants';

import { assertAccount } from '@/lib/auth/scope';
import { readSupabaseConfig } from '@/lib/supabase';

import { fetchCustomExercises, fetchLibraryVersion, fetchOfficialExercises } from './api';
import {
  countOfficialExercises,
  readLocalLibrarySource,
  readLocalLibraryVersion,
  replaceCustomExercises,
  replaceOfficialExercises,
} from './repository';

export interface LibrarySyncResult {
  version: number;
  /** True when the official library was downloaded this time. */
  downloaded: boolean;
}

/**
 * Mirrors the server library into SQLite. The official library (~270 exercises) is downloaded
 * only when its version changes, so a normal launch costs one tiny request plus the user's own
 * custom exercises.
 */
export async function syncExerciseLibrary(userId: string): Promise<LibrarySyncResult> {
  const source = readSupabaseConfig(Constants.expoConfig?.extra)?.url.replace(/\/+$/, '');
  if (!source) throw new Error('Supabase is not configured');
  const [remoteVersion, localVersion, localCount, localSource] = await Promise.all([
    fetchLibraryVersion(),
    readLocalLibraryVersion(),
    countOfficialExercises(),
    readLocalLibrarySource(),
  ]);

  const downloaded = remoteVersion !== localVersion || localCount === 0 || source !== localSource;
  if (downloaded) {
    const official = await fetchOfficialExercises();
    assertAccount(userId);
    await replaceOfficialExercises(official, remoteVersion, source);
  }
  const custom = await fetchCustomExercises(userId);
  assertAccount(userId);
  await replaceCustomExercises(custom);
  return { version: remoteVersion, downloaded };
}
