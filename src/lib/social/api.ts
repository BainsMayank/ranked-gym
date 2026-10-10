import { getSupabase } from '@/lib/supabase';
import type { Json } from '@/types/database';

import {
  parseDiscoverPage,
  parseFriend,
  parseFriendRequests,
  parseNotificationPage,
  parsePostDetail,
  parsePostPage,
  parseProfile,
  parseSearchResult,
  parseSuggestion,
} from './parse';
import { parseList } from '@/lib/ranks/json';
import type {
  Cursor,
  DiscoverFilter,
  DiscoverPage,
  Friend,
  FriendRequests,
  NotificationPage,
  PostDetail,
  PostMedia,
  PostPage,
  Profile,
  ReportReason,
  SearchResult,
  Suggestion,
  Visibility,
} from './types';

/** Supabase calls for the social layer. Every read is a definer RPC that applies visibility. */

const cursorArgs = (c: Cursor | null) => ({
  p_before_at: c?.at ?? undefined,
  p_before_id: c?.id ?? undefined,
});

export async function fetchFeed(cursor: Cursor | null, limit = 20): Promise<PostPage> {
  const { data, error } = await getSupabase().rpc('get_feed', {
    ...cursorArgs(cursor),
    p_limit: limit,
  });
  if (error) throw error;
  return parsePostPage(data);
}

export interface DiscoverQuery {
  filters: readonly DiscoverFilter[];
  exclude: readonly string[];
  asOf: string | null;
}

export async function fetchDiscover(q: DiscoverQuery, limit = 20): Promise<DiscoverPage> {
  const { data, error } = await getSupabase().rpc('get_discover', {
    p_filters: [...q.filters],
    p_exclude: [...q.exclude],
    p_as_of: q.asOf ?? undefined,
    p_limit: limit,
  });
  if (error) throw error;
  return parseDiscoverPage(data);
}

export async function fetchPost(id: string): Promise<PostDetail | null> {
  const { data, error } = await getSupabase().rpc('get_post', { p_id: id });
  if (error) throw error;
  return parsePostDetail(data);
}

export async function fetchUserPosts(userId: string, cursor: Cursor | null): Promise<PostPage> {
  const { data, error } = await getSupabase().rpc('get_user_posts', {
    p_user: userId,
    ...cursorArgs(cursor),
  });
  if (error) throw error;
  return parsePostPage(data);
}

export async function fetchProfile(username: string): Promise<Profile | null> {
  const { data, error } = await getSupabase().rpc('get_profile', { p_username: username });
  if (error) throw error;
  return parseProfile(data);
}

export async function fetchSuggestions(): Promise<Suggestion[]> {
  const { data, error } = await getSupabase().rpc('get_people_suggestions', { p_limit: 12 });
  if (error) throw error;
  return parseList(data, parseSuggestion);
}

export async function searchProfiles(query: string, limit = 8): Promise<SearchResult[]> {
  const { data, error } = await getSupabase().rpc('search_profiles', {
    p_query: query,
    p_limit: limit,
  });
  if (error) throw error;
  return parseList(data, parseSearchResult);
}

export async function fetchFriendRequests(): Promise<FriendRequests> {
  const { data, error } = await getSupabase().rpc('get_friend_requests');
  if (error) throw error;
  return parseFriendRequests(data);
}

export async function fetchFriends(): Promise<Friend[]> {
  const { data, error } = await getSupabase().rpc('get_friends');
  if (error) throw error;
  return parseList(data, parseFriend);
}

export async function fetchNotifications(cursor: Cursor | null): Promise<NotificationPage> {
  const { data, error } = await getSupabase().rpc('get_notifications', cursorArgs(cursor));
  if (error) throw error;
  return parseNotificationPage(data);
}

export async function fetchUnreadCount(): Promise<number> {
  const { data, error } = await getSupabase().rpc('get_unread_notification_count');
  if (error) throw error;
  return typeof data === 'number' ? data : 0;
}

export async function markNotificationsRead(ids?: string[]): Promise<void> {
  const { error } = await getSupabase().rpc('mark_notifications_read', { p_ids: ids });
  if (error) throw error;
}

// ─── Graph ───────────────────────────────────────────────────────────────────────────────────────

export async function sendFriendRequest(userId: string): Promise<'pending' | 'accepted'> {
  const { data, error } = await getSupabase().rpc('send_friend_request', { p_user: userId });
  if (error) throw error;
  return data === 'accepted' ? 'accepted' : 'pending';
}

export async function respondFriendRequest(id: string, accept: boolean): Promise<void> {
  const { error } = await getSupabase().rpc('respond_friend_request', {
    p_id: id,
    p_accept: accept,
  });
  if (error) throw error;
}

export async function cancelFriendRequest(id: string): Promise<void> {
  const { error } = await getSupabase().rpc('cancel_friend_request', { p_id: id });
  if (error) throw error;
}

export async function removeFriend(userId: string): Promise<void> {
  const { error } = await getSupabase().rpc('remove_friend', { p_user: userId });
  if (error) throw error;
}

export async function setFollowing(userId: string, follow: boolean): Promise<void> {
  const { error } = await getSupabase().rpc(follow ? 'follow_user' : 'unfollow_user', {
    p_user: userId,
  });
  if (error) throw error;
}

export async function setBlocked(userId: string, block: boolean): Promise<void> {
  const { error } = await getSupabase().rpc(block ? 'block_user' : 'unblock_user', {
    p_user: userId,
  });
  if (error) throw error;
}

// ─── Posts ───────────────────────────────────────────────────────────────────────────────────────

export type Attachment =
  { workoutId: string } | { pr: { workoutId: string; exerciseId: string; kind: string } };

export interface NewPost {
  id: string;
  body: string;
  media: PostMedia[];
  visibility: Visibility;
  attach: Attachment | null;
}

function attachJson(a: Attachment | null): Json {
  if (!a) return null;
  if ('workoutId' in a) return { workout_id: a.workoutId };
  return { pr: { workout_id: a.pr.workoutId, exercise_id: a.pr.exerciseId, kind: a.pr.kind } };
}

export async function createPost(post: NewPost): Promise<string> {
  const { data, error } = await getSupabase().rpc('create_post', {
    p: {
      id: post.id,
      body: post.body,
      visibility: post.visibility,
      media: post.media.map((m) => ({ path: m.path, w: m.w, h: m.h })),
      attach: attachJson(post.attach),
    },
  });
  if (error) throw error;
  return String(data);
}

export interface PostEdit {
  id: string;
  body: string;
  visibility: Visibility;
  keepMedia: string[] | null;
}

export async function editPost(edit: PostEdit): Promise<void> {
  const { error } = await getSupabase().rpc('edit_post', {
    p_id: edit.id,
    p_body: edit.body,
    p_visibility: edit.visibility,
    p_keep_media: edit.keepMedia ?? undefined,
  });
  if (error) throw error;
}

export async function deletePost(id: string): Promise<void> {
  const { error } = await getSupabase().from('posts').delete().eq('id', id);
  if (error) throw error;
}

export type MilestoneRef =
  | { kind: 'pr'; workoutId: string; exerciseId: string; prKind: string }
  | { kind: 'rank_up'; scope: string; key: string; workoutId: string | null }
  | { kind: 'league_result'; leagueId: string };

export async function createMilestonePost(
  ref: MilestoneRef,
  visibility: Visibility | null,
): Promise<string> {
  const p_ref: Json =
    ref.kind === 'pr'
      ? { workout_id: ref.workoutId, exercise_id: ref.exerciseId, kind: ref.prKind }
      : ref.kind === 'rank_up'
        ? { scope: ref.scope, key: ref.key, workout_id: ref.workoutId }
        : { league_id: ref.leagueId };
  const { data, error } = await getSupabase().rpc('create_milestone_post', {
    p_kind: ref.kind,
    p_ref,
    p_visibility: visibility ?? undefined,
  });
  if (error) throw error;
  return String(data);
}

export async function setRespect(postId: string, give: boolean): Promise<void> {
  const supabase = getSupabase();
  if (give) {
    const { error } = await supabase.from('post_likes').insert({ post_id: postId });
    // Already given (a double tap racing the first request) is fine.
    if (error && error.code !== '23505') throw error;
  } else {
    const { error } = await supabase.from('post_likes').delete().eq('post_id', postId);
    if (error) throw error;
  }
}

export interface NewComment {
  id: string;
  postId: string;
  body: string;
  parentId: string | null;
}

export async function addComment(c: NewComment): Promise<void> {
  const { error } = await getSupabase().rpc('add_comment', {
    p_id: c.id,
    p_post: c.postId,
    p_body: c.body,
    p_parent: c.parentId ?? undefined,
  });
  if (error) throw error;
}

export async function editComment(id: string, body: string): Promise<void> {
  const { error } = await getSupabase().rpc('edit_comment', { p_id: id, p_body: body });
  if (error) throw error;
}

export async function deleteComment(id: string): Promise<void> {
  const { error } = await getSupabase().rpc('delete_comment', { p_id: id });
  if (error) throw error;
}

export async function reportContent(
  target: { postId: string } | { commentId: string },
  reason: ReportReason,
  details: string,
): Promise<void> {
  const { error } = await getSupabase().rpc('report_content', {
    p_reason: reason,
    p_post: 'postId' in target ? target.postId : undefined,
    p_comment: 'commentId' in target ? target.commentId : undefined,
    p_details: details,
  });
  if (error) throw error;
}

// ─── Errors ──────────────────────────────────────────────────────────────────────────────────────

const FRIENDLY_CODES = new Set(['22023', '42501', 'P0001']);

/**
 * The social functions raise short, user-facing messages (22023 / 42501); show those as they are.
 * Anything else is a connection or server problem.
 */
export function socialErrorMessage(error: unknown): string {
  if (typeof error === 'object' && error !== null) {
    const { code, message } = error as { code?: unknown; message?: unknown };
    if (typeof code === 'string' && FRIENDLY_CODES.has(code) && typeof message === 'string') {
      if (/row-level security|permission denied/i.test(message)) return 'That isn’t available.';
      return message;
    }
  }
  return 'Something went wrong. Check your connection and try again.';
}
