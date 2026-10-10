import { QueryClient } from '@tanstack/react-query';

import { addCommentLocally, patchPost, removePosts, toggleRespect } from '../cache';
import type { Comment, Post, PostDetail } from '../types';

const post = (id: string, respects = 0): Post => ({
  id,
  type: 'text',
  author: { id: 'u', username: 'u', displayName: null, avatarUrl: null, rank: null },
  body: 'hi',
  media: [],
  visibility: 'public',
  createdAt: '2026-10-10T10:00:00Z',
  editedAt: null,
  respects,
  comments: 0,
  respected: false,
  mine: false,
  reasons: [],
  attachedWorkout: null,
  attachedPr: null,
});

function setup() {
  // No garbage-collection timers, so Jest exits cleanly.
  const qc = new QueryClient({ defaultOptions: { queries: { gcTime: Infinity } } });
  qc.setQueryData(['social', 'feed'], {
    pages: [{ posts: [post('a'), post('b', 2)], next: null }],
    pageParams: [null],
  });
  qc.setQueryData(['social', 'discover', []], {
    pages: [{ asOf: 'x', posts: [post('b', 2)], done: true }],
    pageParams: [null],
  });
  const detail: PostDetail = { post: post('b', 2), exercises: [], comments: [] };
  qc.setQueryData(['social', 'post', 'b'], detail);
  return qc;
}

type Pages = { pages: { posts: Post[] }[] };

describe('optimistic post cache', () => {
  it('patches every copy of a post and restores them', () => {
    const qc = setup();
    const restore = patchPost(qc, 'b', (p) => toggleRespect(p, true));
    expect(qc.getQueryData<Pages>(['social', 'feed'])?.pages[0]?.posts[1]?.respects).toBe(3);
    expect(qc.getQueryData<Pages>(['social', 'discover', []])?.pages[0]?.posts[0]?.respected).toBe(
      true,
    );
    expect(qc.getQueryData<PostDetail>(['social', 'post', 'b'])?.post.respects).toBe(3);
    restore();
    expect(qc.getQueryData<Pages>(['social', 'feed'])?.pages[0]?.posts[1]?.respects).toBe(2);
    expect(qc.getQueryData<PostDetail>(['social', 'post', 'b'])?.post.respected).toBe(false);
  });

  it('removes posts from every list', () => {
    const qc = setup();
    removePosts(qc, (p) => p.id === 'b');
    expect(qc.getQueryData<Pages>(['social', 'feed'])?.pages[0]?.posts.map((p) => p.id)).toEqual([
      'a',
    ]);
    expect(qc.getQueryData<Pages>(['social', 'discover', []])?.pages[0]?.posts).toEqual([]);
  });

  it('adds a comment and rolls it back', () => {
    const qc = setup();
    const c = { id: 'c1', body: 'nice' } as Comment;
    const restore = addCommentLocally(qc, 'b', c);
    expect(qc.getQueryData<PostDetail>(['social', 'post', 'b'])?.comments).toEqual([c]);
    expect(qc.getQueryData<PostDetail>(['social', 'post', 'b'])?.post.comments).toBe(1);
    restore();
    expect(qc.getQueryData<PostDetail>(['social', 'post', 'b'])?.comments).toEqual([]);
    expect(qc.getQueryData<Pages>(['social', 'feed'])?.pages[0]?.posts[1]?.comments).toBe(0);
  });

  it('respect toggles are idempotent', () => {
    const p = post('x', 1);
    expect(toggleRespect(p, false)).toBe(p);
  });
});
