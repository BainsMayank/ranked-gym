import { clearAccountCache } from '../accountCache';

const mockStorage = new Map<string, string>();
jest.mock('expo-sqlite/kv-store', () => ({
  Storage: {
    getAllKeysSync: () => [...mockStorage.keys()],
    removeItemSync: (key: string) => mockStorage.delete(key),
  },
}));

it('clears only the departing account across every private cache namespace', () => {
  const privateKeys = [
    'social.v1.feed.a',
    'social.v1.feedSeen.a',
    'latest-bodyweight.a',
    'training-settings.a',
    'onboarded.a',
    'insights.v1.["insights","a","goals"]',
  ];
  const keep = ['social.v1.feed.b', 'insights.v1.["insights","b","a"]', 'insights.preview.goals'];
  mockStorage.clear();
  for (const key of [...privateKeys, ...keep]) mockStorage.set(key, 'private-data');
  clearAccountCache('a');
  expect([...mockStorage.keys()]).toEqual(keep);
});
