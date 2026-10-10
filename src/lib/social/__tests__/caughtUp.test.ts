import { caughtUpIndex, isNewer, loadSeen, saveSeen } from '../caughtUp';
import type { Post } from '../types';

const mockStore = new Map<string, string>();
jest.mock('expo-sqlite/kv-store', () => ({
  Storage: {
    getItemSync: (k: string) => mockStore.get(k) ?? null,
    setItemSync: (k: string, v: string) => void mockStore.set(k, v),
  },
}));

const post = (id: string, at: string) => ({ id, createdAt: at }) as Post;

describe('caught-up marker', () => {
  const posts = [
    post('c', '2026-10-10T10:00:00Z'),
    post('b', '2026-10-10T09:00:00Z'),
    post('a', '2026-10-10T08:00:00Z'),
  ];

  it('sits above the first post already seen', () => {
    expect(caughtUpIndex(posts, { at: '2026-10-10T09:00:00Z', id: 'b' })).toBe(1);
  });

  it('is hidden when nothing is new or nothing was seen', () => {
    expect(caughtUpIndex(posts, { at: '2026-10-10T10:00:00Z', id: 'c' })).toBe(-1);
    expect(caughtUpIndex(posts, null)).toBe(-1);
    expect(caughtUpIndex(posts, { at: '2026-10-09T00:00:00Z', id: 'z' })).toBe(-1);
  });

  it('orders equal times by id, like the server', () => {
    expect(
      isNewer({ at: '2026-10-10T10:00:00Z', id: 'b' }, { at: '2026-10-10T10:00:00.000Z', id: 'a' }),
    ).toBe(true);
  });

  it('remembers the newest post and never moves backwards', () => {
    saveSeen('u1', { at: '2026-10-10T10:00:00Z', id: 'c' });
    saveSeen('u1', { at: '2026-10-10T08:00:00Z', id: 'a' });
    expect(loadSeen('u1')).toEqual({ at: '2026-10-10T10:00:00Z', id: 'c' });
    expect(loadSeen('u2')).toBeNull();
  });
});
