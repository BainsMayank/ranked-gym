import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query';
import { Storage } from 'expo-sqlite/kv-store';
import * as Crypto from 'expo-crypto';
import { useEffect, useState } from 'react';

import { useUserId } from '@/lib/auth/authStore';
import { useServerReads } from '@/lib/ranks/hooks';
import { getSupabase } from '@/lib/supabase';
import type { CompressedPhoto } from '@/lib/photos/compress';

import {
  addComment,
  cancelFriendRequest,
  createMilestonePost,
  createPost,
  deleteComment,
  deletePost,
  editComment,
  editPost,
  fetchDiscover,
  fetchFeed,
  fetchFriendRequests,
  fetchFriends,
  fetchNotifications,
  fetchPost,
  fetchProfile,
  fetchSuggestions,
  fetchUnreadCount,
  fetchUserPosts,
  markNotificationsRead,
  removeFriend,
  reportContent,
  respondFriendRequest,
  searchProfiles,
  sendFriendRequest,
  setBlocked,
  setFollowing,
  setRespect,
  type Attachment,
  type MilestoneRef,
  type PostEdit,
} from './api';
import { addCommentLocally, patchPost, removePosts, toggleRespect } from './cache';
import { socialKeys } from './keys';
import { uploadPostPhotos } from './media';
import {
  milestonePostModes,
  type Comment,
  type Cursor,
  type DiscoverFilter,
  type DiscoverPage,
  type MilestonePostMode,
  type Person,
  type PostPage,
  type ReportReason,
  type Visibility,
} from './types';

const MINUTE = 60_000;
/** Social writes are server-trusted, so they need a connection rather than queueing. */
const online = { networkMode: 'online' } as const;

// ─── Feed, Discover, posts ───────────────────────────────────────────────────────────────────────

const feedCacheKey = (userId: string) => `social.v1.feed.${userId}`;

function cachedFeed(userId: string | undefined): InfiniteData<PostPage, Cursor | null> | undefined {
  if (!userId) return undefined;
  try {
    const raw = Storage.getItemSync(feedCacheKey(userId));
    const page: unknown = raw ? JSON.parse(raw) : null;
    if (typeof page === 'object' && page !== null && 'posts' in page && Array.isArray(page.posts)) {
      return { pages: [page as PostPage], pageParams: [null] };
    }
  } catch {
    // Fall through to a fresh load.
  }
  return undefined;
}

/** Friends, people I follow and me, newest first. The first page is kept on the device. */
export function useFeed() {
  const userId = useUserId();
  return useInfiniteQuery({
    queryKey: socialKeys.feed,
    queryFn: async ({ pageParam }) => {
      const page = await fetchFeed(pageParam);
      if (!pageParam && userId) {
        try {
          Storage.setItemSync(feedCacheKey(userId), JSON.stringify(page));
        } catch {
          // Best effort.
        }
      }
      return page;
    },
    initialPageParam: null as Cursor | null,
    getNextPageParam: (last) => last.next,
    initialData: () => cachedFeed(userId),
    initialDataUpdatedAt: 0,
    enabled: useServerReads(),
    staleTime: MINUTE,
  });
}

interface DiscoverParam {
  asOf: string | null;
  exclude: string[];
}

export function useDiscover(filters: readonly DiscoverFilter[]) {
  return useInfiniteQuery({
    queryKey: socialKeys.discover(filters),
    queryFn: ({ pageParam }) =>
      fetchDiscover({ filters, exclude: pageParam.exclude, asOf: pageParam.asOf }),
    initialPageParam: { asOf: null, exclude: [] } as DiscoverParam,
    getNextPageParam: (last: DiscoverPage, all: DiscoverPage[]): DiscoverParam | undefined =>
      last.done
        ? undefined
        : { asOf: all[0]?.asOf ?? null, exclude: all.flatMap((p) => p.posts.map((x) => x.id)) },
    enabled: useServerReads(),
    staleTime: 5 * MINUTE,
  });
}

export function usePost(id: string | undefined) {
  return useQuery({
    queryKey: socialKeys.post(id ?? 'none'),
    queryFn: () => (id ? fetchPost(id) : null),
    enabled: useServerReads() && !!id,
    staleTime: 30_000,
  });
}

export function useUserPosts(userId: string | undefined) {
  return useInfiniteQuery({
    queryKey: socialKeys.userPosts(userId ?? 'none'),
    queryFn: ({ pageParam }) => fetchUserPosts(userId ?? '', pageParam),
    initialPageParam: null as Cursor | null,
    getNextPageParam: (last) => last.next,
    enabled: useServerReads() && !!userId,
    staleTime: MINUTE,
  });
}

/** Another lifter's profile with my relationship to them (null when unavailable). */
export function usePublicProfile(username: string | undefined) {
  return useQuery({
    queryKey: socialKeys.profile(username ?? ''),
    queryFn: () => (username ? fetchProfile(username) : null),
    enabled: useServerReads() && !!username,
    staleTime: MINUTE,
  });
}

export function useSuggestions() {
  return useQuery({
    queryKey: socialKeys.suggestions,
    queryFn: fetchSuggestions,
    enabled: useServerReads(),
    staleTime: 10 * MINUTE,
  });
}

/** People by username or name; pass an already debounced query. */
export function useProfileSearch(query: string) {
  const q = query.trim().replace(/^@/, '');
  return useQuery({
    queryKey: socialKeys.search(q),
    queryFn: () => searchProfiles(q),
    enabled: useServerReads() && q.length >= 1,
    staleTime: MINUTE,
  });
}

export function useFriendRequests() {
  return useQuery({
    queryKey: socialKeys.requests,
    queryFn: fetchFriendRequests,
    enabled: useServerReads(),
    staleTime: MINUTE,
  });
}

export function useFriends() {
  return useQuery({
    queryKey: socialKeys.friends,
    queryFn: fetchFriends,
    enabled: useServerReads(),
    staleTime: 5 * MINUTE,
  });
}

// ─── Notifications ───────────────────────────────────────────────────────────────────────────────

export function useNotifications() {
  return useInfiniteQuery({
    queryKey: socialKeys.notifications,
    queryFn: ({ pageParam }) => fetchNotifications(pageParam),
    initialPageParam: null as Cursor | null,
    getNextPageParam: (last) => last.next,
    enabled: useServerReads(),
    staleTime: 30_000,
  });
}

export function useUnreadCount() {
  return useQuery({
    queryKey: socialKeys.unread,
    queryFn: fetchUnreadCount,
    enabled: useServerReads(),
    staleTime: 30_000,
    refetchInterval: 2 * MINUTE,
  });
}

export function useMarkNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    ...online,
    mutationFn: (ids?: string[]) => markNotificationsRead(ids),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: socialKeys.unread });
      void qc.invalidateQueries({ queryKey: socialKeys.notifications });
    },
  });
}

// ─── Respect and comments (optimistic) ──────────────────────────────────────────────────────────

export function useRespect() {
  const qc = useQueryClient();
  return useMutation({
    ...online,
    mutationFn: ({ postId, give }: { postId: string; give: boolean }) => setRespect(postId, give),
    onMutate: ({ postId, give }) => ({
      restore: patchPost(qc, postId, (p) => toggleRespect(p, give)),
    }),
    onError: (_e, _v, ctx) => ctx?.restore(),
  });
}

export interface CommentInput {
  postId: string;
  body: string;
  parentId: string | null;
  author: Person;
}

export function useAddComment() {
  const qc = useQueryClient();
  return useMutation({
    ...online,
    mutationFn: ({ id, input }: { id: string; input: CommentInput }) =>
      addComment({ id, postId: input.postId, body: input.body, parentId: input.parentId }),
    onMutate: ({ id, input }) => {
      const comment: Comment = {
        id,
        parentId: input.parentId,
        body: input.body,
        createdAt: new Date().toISOString(),
        editedAt: null,
        deleted: false,
        author: input.author,
        mine: true,
        canDelete: true,
        pending: true,
      };
      return { restore: addCommentLocally(qc, input.postId, comment) };
    },
    onError: (_e, _v, ctx) => ctx?.restore(),
    onSettled: (_d, _e, { input }) =>
      qc.invalidateQueries({ queryKey: socialKeys.post(input.postId) }),
  });
}

/** A new id for an optimistic comment or post (the server accepts client ids). */
export const newSocialId = () => Crypto.randomUUID();

export function useEditComment(postId: string) {
  const qc = useQueryClient();
  return useMutation({
    ...online,
    mutationFn: ({ id, body }: { id: string; body: string }) => editComment(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: socialKeys.post(postId) }),
  });
}

export function useDeleteComment(postId: string) {
  const qc = useQueryClient();
  return useMutation({
    ...online,
    mutationFn: (id: string) => deleteComment(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: socialKeys.post(postId) });
      patchPost(qc, postId, (p) => ({ ...p, comments: Math.max(0, p.comments - 1) }));
    },
  });
}

// ─── Posting ─────────────────────────────────────────────────────────────────────────────────────

export interface ComposedPost {
  id: string;
  body: string;
  photos: CompressedPhoto[];
  visibility: Visibility;
  attach: Attachment | null;
}

/** Uploads the photos, then creates the post (replaying the same id is safe). */
export function useCreatePost() {
  const qc = useQueryClient();
  const userId = useUserId();
  return useMutation({
    ...online,
    mutationFn: async (post: ComposedPost) => {
      if (!userId) throw new Error('Sign in to post.');
      const media = await uploadPostPhotos(userId, post.id, post.photos);
      return createPost({
        id: post.id,
        body: post.body,
        media,
        visibility: post.visibility,
        attach: post.attach,
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: socialKeys.all }),
  });
}

export function useEditPost() {
  const qc = useQueryClient();
  return useMutation({
    ...online,
    mutationFn: (edit: PostEdit) => editPost(edit),
    onSuccess: () => qc.invalidateQueries({ queryKey: socialKeys.all }),
  });
}

export function useDeletePost() {
  const qc = useQueryClient();
  return useMutation({
    ...online,
    mutationFn: (id: string) => deletePost(id),
    onMutate: (id) => ({ restore: removePosts(qc, (p) => p.id === id) }),
    onError: (_e, _v, ctx) => ctx?.restore(),
    onSettled: () => qc.invalidateQueries({ queryKey: socialKeys.all }),
  });
}

export function useMilestonePost() {
  const qc = useQueryClient();
  return useMutation({
    ...online,
    mutationFn: ({ ref, visibility }: { ref: MilestoneRef; visibility: Visibility | null }) =>
      createMilestonePost(ref, visibility),
    onSuccess: () => qc.invalidateQueries({ queryKey: socialKeys.feed }),
  });
}

export function useReport() {
  const qc = useQueryClient();
  return useMutation({
    ...online,
    mutationFn: (r: {
      target: { postId: string } | { commentId: string };
      reason: ReportReason;
      details: string;
    }) => reportContent(r.target, r.reason, r.details),
    // A reported post leaves this person's lists straight away.
    onSuccess: (_d, r) => {
      if ('postId' in r.target) {
        const { postId } = r.target;
        removePosts(qc, (p) => p.id === postId);
      }
    },
  });
}

// ─── Graph ───────────────────────────────────────────────────────────────────────────────────────

export type FriendAction =
  | { kind: 'request'; userId: string }
  | { kind: 'accept' | 'decline'; requestId: string }
  | { kind: 'cancel'; requestId: string }
  | { kind: 'remove'; userId: string };

export function useFriendAction() {
  const qc = useQueryClient();
  return useMutation({
    ...online,
    mutationFn: async (a: FriendAction) => {
      switch (a.kind) {
        case 'request':
          return sendFriendRequest(a.userId);
        case 'accept':
        case 'decline':
          await respondFriendRequest(a.requestId, a.kind === 'accept');
          return a.kind === 'accept' ? 'accepted' : 'declined';
        case 'cancel':
          await cancelFriendRequest(a.requestId);
          return 'none';
        case 'remove':
          await removeFriend(a.userId);
          return 'none';
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: socialKeys.all }),
  });
}

export function useFollow() {
  const qc = useQueryClient();
  return useMutation({
    ...online,
    mutationFn: ({ userId, follow }: { userId: string; follow: boolean }) =>
      setFollowing(userId, follow),
    onSuccess: () => qc.invalidateQueries({ queryKey: socialKeys.all }),
  });
}

export function useBlock() {
  const qc = useQueryClient();
  return useMutation({
    ...online,
    mutationFn: ({ userId, block }: { userId: string; block: boolean }) =>
      setBlocked(userId, block),
    onSuccess: (_d, { userId, block }) => {
      if (block) removePosts(qc, (p) => p.author.id === userId);
      void qc.invalidateQueries({ queryKey: socialKeys.all });
    },
  });
}

// ─── Milestone setting ───────────────────────────────────────────────────────────────────────────

/** Settings → Privacy → Share milestones (auto, ask, never; default ask). */
export function useMilestoneMode() {
  const userId = useUserId();
  return useQuery({
    queryKey: socialKeys.milestoneMode,
    queryFn: async (): Promise<MilestonePostMode> => {
      const { data, error } = await getSupabase()
        .from('user_settings')
        .select('milestone_posts')
        .single();
      if (error) throw error;
      return milestonePostModes.find((m) => m === data.milestone_posts) ?? 'ask';
    },
    enabled: useServerReads() && !!userId,
    staleTime: 30 * MINUTE,
  });
}

export function useSetMilestoneMode() {
  const qc = useQueryClient();
  const userId = useUserId();
  return useMutation({
    ...online,
    mutationFn: async (mode: MilestonePostMode) => {
      if (!userId) throw new Error('Sign in first.');
      const { error } = await getSupabase()
        .from('user_settings')
        .update({ milestone_posts: mode })
        .eq('user_id', userId);
      if (error) throw error;
      return mode;
    },
    onSuccess: (mode) => qc.setQueryData(socialKeys.milestoneMode, mode),
  });
}

// ─── Realtime ────────────────────────────────────────────────────────────────────────────────────

type Channel = ReturnType<ReturnType<typeof getSupabase>['channel']>;

/**
 * Subscribes once Realtime carries this user's token (postgres_changes applies RLS as the
 * subscriber, so an anonymous socket would hear nothing). Returns the cleanup.
 */
function subscribeAs(build: (supabase: ReturnType<typeof getSupabase>) => Channel): () => void {
  const supabase = getSupabase();
  let channel: Channel | null = null;
  let cancelled = false;
  void (async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) await supabase.realtime.setAuth(data.session.access_token);
    if (!cancelled) channel = build(supabase).subscribe();
  })();
  return () => {
    cancelled = true;
    if (channel) void supabase.removeChannel(channel);
  };
}

/**
 * True once someone else posts something this user can see (Realtime applies the posts RLS policy
 * per subscriber). Call `reset` after showing the new posts.
 */
export function useNewPostsSignal() {
  const userId = useUserId();
  const enabled = useServerReads();
  const [hasNew, setHasNew] = useState(false);
  useEffect(() => {
    if (!enabled || !userId) return;
    return subscribeAs((supabase) =>
      supabase
        .channel(`feed:${userId}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'posts' },
          (payload) => {
            const row = payload.new as { author_id?: unknown };
            if (row.author_id !== userId) setHasNew(true);
          },
        ),
    );
  }, [enabled, userId]);
  return { hasNew, reset: () => setHasNew(false) };
}

/** Refreshes the bell and the notifications list when a notification arrives. */
export function useNotificationsRealtime() {
  const userId = useUserId();
  const enabled = useServerReads();
  const qc = useQueryClient();
  useEffect(() => {
    if (!enabled || !userId) return;
    return subscribeAs((supabase) =>
      supabase.channel(`notifications:${userId}`).on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          void qc.invalidateQueries({ queryKey: socialKeys.unread });
          void qc.invalidateQueries({ queryKey: socialKeys.notifications });
          void qc.invalidateQueries({ queryKey: socialKeys.requests });
        },
      ),
    );
  }, [enabled, userId, qc]);
}
