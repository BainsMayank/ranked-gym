import { Storage } from 'expo-sqlite/kv-store';

/**
 * Remembers which users finished onboarding, so a cold start with no network (a basement gym) still
 * opens the app instead of waiting on the profile query. The server's `onboarded_at` stays the truth.
 */
const key = (userId: string) => `onboarded.${userId}`;

export function readOnboarded(userId: string): boolean {
  try {
    return Storage.getItemSync(key(userId)) === '1';
  } catch {
    return false;
  }
}

export function writeOnboarded(userId: string, onboarded: boolean): void {
  try {
    if (onboarded) Storage.setItemSync(key(userId), '1');
    else Storage.removeItemSync(key(userId));
  } catch {
    // Only an optimisation; the profile query decides once it loads.
  }
}
