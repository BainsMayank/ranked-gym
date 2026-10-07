import { fetchCustomExercises, fetchLibraryVersion, fetchOfficialExercises } from './api';
import {
  countOfficialExercises,
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
  const [remoteVersion, localVersion, localCount] = await Promise.all([
    fetchLibraryVersion(),
    readLocalLibraryVersion(),
    countOfficialExercises(),
  ]);

  const downloaded = remoteVersion !== localVersion || localCount === 0;
  if (downloaded) {
    await replaceOfficialExercises(await fetchOfficialExercises(), remoteVersion);
  }
  await replaceCustomExercises(await fetchCustomExercises(userId));
  return { version: remoteVersion, downloaded };
}
