import { Storage } from 'expo-sqlite/kv-store';

import type { Cursor, Post } from './types';

/**
 * "You're all caught up": where the newest post seen last time sits in the feed. Stored per account
 * on the device as the (created_at, id) of the top post when the user last left the feed.
 */

const key = (userId: string) => `social.v1.feedSeen.${userId}`;

/** Feed order: newer first, then id descending (the server's keyset order). */
export function isNewer(a: Cursor, b: Cursor): boolean {
  const ta = Date.parse(a.at);
  const tb = Date.parse(b.at);
  return ta !== tb ? ta > tb : a.id > b.id;
}

export const cursorOf = (p: Pick<Post, 'createdAt' | 'id'>): Cursor => ({
  at: p.createdAt,
  id: p.id,
});

/**
 * Index of the first post already seen, when there are new posts above it; otherwise -1 (nothing
 * new, or nothing seen yet, needs no marker).
 */
export function caughtUpIndex(posts: readonly Post[], seen: Cursor | null): number {
  if (!seen) return -1;
  const i = posts.findIndex((p) => !isNewer(cursorOf(p), seen));
  return i > 0 ? i : -1;
}

export function loadSeen(userId: string): Cursor | null {
  try {
    const raw = Storage.getItemSync(key(userId));
    if (!raw) return null;
    const v: unknown = JSON.parse(raw);
    if (typeof v === 'object' && v !== null && 'at' in v && 'id' in v) {
      const { at, id } = v as { at: unknown; id: unknown };
      if (typeof at === 'string' && typeof id === 'string') return { at, id };
    }
    return null;
  } catch {
    return null;
  }
}

/** Remembers the newest post as seen (never moves backwards). */
export function saveSeen(userId: string, top: Cursor) {
  const current = loadSeen(userId);
  if (current && !isNewer(top, current)) return;
  try {
    Storage.setItemSync(key(userId), JSON.stringify(top));
  } catch {
    // Best effort: the marker is a nicety.
  }
}
