import { Storage } from 'expo-sqlite/kv-store';

/** Private persisted caches must leave the device with their account. */
export function clearAccountCache(userId: string): void {
  const keys = new Set([
    `social.v1.feed.${userId}`,
    `social.v1.feedSeen.${userId}`,
    `latest-bodyweight.${userId}`,
    `training-settings.${userId}`,
    `onboarded.${userId}`,
  ]);
  for (const key of Storage.getAllKeysSync()) {
    let ownInsights = false;
    if (key.startsWith('insights.v1.')) {
      try {
        const query: unknown = JSON.parse(key.slice('insights.v1.'.length));
        ownInsights = Array.isArray(query) && query[1] === userId;
      } catch {
        // An unrecognised cache key cannot identify this account.
      }
    }
    if (keys.has(key) || ownInsights) Storage.removeItemSync(key);
  }
}
