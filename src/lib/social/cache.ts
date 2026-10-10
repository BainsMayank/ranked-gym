import type { InfiniteData, QueryClient, QueryKey } from '@tanstack/react-query';

import type { Comment, DiscoverPage, Post, PostDetail, PostPage } from './types';

/**
 * One post can sit in several caches at once (Feed, Discover, a profile, its detail screen). These
 * helpers change every copy together for optimistic updates, and return a function that restores
 * exactly what was there before (for rollback).
 */

type Page = PostPage | DiscoverPage;
type Cached = InfiniteData<Page> | PostDetail | null | undefined;

const isInfinite = (v: unknown): v is InfiniteData<Page> =>
  typeof v === 'object' && v !== null && 'pages' in v && Array.isArray(v.pages);
const isDetail = (v: unknown): v is PostDetail =>
  typeof v === 'object' && v !== null && 'post' in v && 'comments' in v;

function mapCached(data: Cached, fn: (p: Post) => Post | null): Cached {
  if (isInfinite(data)) {
    let changed = false;
    const pages = data.pages.map((page) => {
      const posts = page.posts.flatMap((p) => {
        const next = fn(p);
        if (next !== p) changed = true;
        return next ? [next] : [];
      });
      return changed ? { ...page, posts } : page;
    });
    return changed ? { ...data, pages } : data;
  }
  if (isDetail(data)) {
    const next = fn(data.post);
    return next === data.post ? data : next ? { ...data, post: next } : null;
  }
  return data;
}

export type Restore = () => void;

function patchAll(qc: QueryClient, fn: (p: Post) => Post | null): Restore {
  const before: [QueryKey, unknown][] = [];
  for (const [key, data] of qc.getQueriesData<Cached>({ queryKey: ['social'] })) {
    const next = mapCached(data, fn);
    if (next !== data) {
      before.push([key, data]);
      qc.setQueryData(key, next);
    }
  }
  return () => {
    for (const [key, data] of before) qc.setQueryData(key, data);
  };
}

/** Applies `update` to every cached copy of post `id`. */
export function patchPost(qc: QueryClient, id: string, update: (p: Post) => Post): Restore {
  return patchAll(qc, (p) => (p.id === id ? update(p) : p));
}

/** Drops a post (deleted, reported or from someone just blocked) from every list. */
export function removePosts(qc: QueryClient, match: (p: Post) => boolean): Restore {
  return patchAll(qc, (p) => (match(p) ? null : p));
}

/** Gives or takes back respect locally. */
export function toggleRespect(p: Post, give: boolean): Post {
  if (p.respected === give) return p;
  return { ...p, respected: give, respects: Math.max(0, p.respects + (give ? 1 : -1)) };
}

/** Adds a comment to a post's detail cache and bumps its count everywhere. */
export function addCommentLocally(qc: QueryClient, postId: string, comment: Comment): Restore {
  const key = ['social', 'post', postId];
  const before = qc.getQueryData<PostDetail | null>(key);
  const restoreCount = patchPost(qc, postId, (p) => ({ ...p, comments: p.comments + 1 }));
  const counted = qc.getQueryData<PostDetail | null>(key);
  if (counted)
    qc.setQueryData<PostDetail>(key, { ...counted, comments: [...counted.comments, comment] });
  return () => {
    restoreCount();
    qc.setQueryData(key, before);
  };
}
