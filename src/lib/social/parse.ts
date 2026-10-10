import { logTypes, muscles } from '@/lib/exercises/taxonomy';
import { arr, isObj, num, oneOf, parseList, rank, str, type Obj } from '@/lib/ranks/json';
import { setTypes, weightModes } from '@/lib/routines/taxonomy';
import { workoutVisibilities } from '@/lib/workouts/taxonomy';

import {
  discoverReasons,
  notificationKinds,
  postTypes,
  type AppNotification,
  type AttachedWorkout,
  type BestSet,
  type Comment,
  type Cursor,
  type DetailExercise,
  type DiscoverPage,
  type Friend,
  type FriendRequest,
  type FriendRequests,
  type NotificationPage,
  type Person,
  type Post,
  type PostDetail,
  type PostMedia,
  type PostPage,
  type PrMilestone,
  type Profile,
  type SearchResult,
  type Suggestion,
  type SummaryExercise,
  type SummaryRankUp,
  type WorkoutSummary,
} from './types';

/** Parsers for the social RPCs. Malformed rows are dropped, never shown. */

const bool = (v: unknown): boolean => v === true;
const int = (v: unknown): number => Math.round(num(v) ?? 0);

export function parsePerson(v: unknown): Person | null {
  if (!isObj(v)) return null;
  const id = str(v.id);
  if (!id) return null;
  const r = isObj(v.rank) ? rank(v.rank.tier, v.rank.division) : null;
  return {
    id,
    username: str(v.username),
    displayName: str(v.display_name),
    avatarUrl: str(v.avatar_url),
    rank: r,
  };
}

function parseMedia(v: unknown): PostMedia | null {
  if (!isObj(v)) return null;
  const path = str(v.path);
  return path ? { path, w: num(v.w) ?? 4, h: num(v.h) ?? 5 } : null;
}

function parseBest(v: unknown): BestSet {
  const o: Obj = isObj(v) ? v : {};
  return {
    weightKg: num(o.weight_kg),
    reps: num(o.reps),
    durationSec: num(o.duration_sec),
    distanceM: num(o.distance_m),
    weightMode: oneOf(weightModes, o.weight_mode) ?? 'absolute',
  };
}

function parseSummaryExercise(v: unknown): SummaryExercise | null {
  if (!isObj(v)) return null;
  const exerciseId = str(v.exercise_id);
  const name = str(v.name);
  if (!exerciseId || !name) return null;
  return {
    exerciseId,
    name,
    logType: oneOf(logTypes, v.log_type) ?? 'weight_reps',
    sets: int(v.sets),
    pr: bool(v.pr),
    best: parseBest(v.best),
  };
}

function parseRankUp(v: unknown): SummaryRankUp | null {
  if (!isObj(v)) return null;
  const scope = oneOf(['lift', 'overall'] as const, v.scope);
  const key = str(v.key);
  const r = rank(v.tier, v.division);
  if (!scope || !key || !r) return null;
  return { scope, key, name: str(v.name) ?? key, rank: r };
}

export function parseWorkoutSummary(v: unknown): WorkoutSummary | null {
  if (!isObj(v)) return null;
  return {
    name: str(v.name) ?? 'Workout',
    startedAt: str(v.started_at),
    durationSec: num(v.duration_sec),
    volumeKg: num(v.volume_kg) ?? 0,
    sets: int(v.sets),
    exerciseCount: int(v.exercise_count),
    photoPath: str(v.photo_path),
    calisthenics: bool(v.calisthenics),
    records: int(v.records),
    exercises: parseList(v.exercises, parseSummaryExercise),
    rankUps: parseList(v.rank_ups, parseRankUp),
    muscles: parseList(v.muscles, (m) => {
      if (!isObj(m)) return null;
      const muscle = oneOf(muscles, m.muscle);
      return muscle ? { muscle, sets: num(m.sets) ?? 0 } : null;
    }),
  };
}

export function parsePr(v: unknown): PrMilestone | null {
  if (!isObj(v)) return null;
  const exerciseId = str(v.exercise_id);
  const value = num(v.value);
  if (!exerciseId || value === null) return null;
  return {
    workoutId: str(v.workout_id),
    exerciseId,
    exerciseName: str(v.exercise_name) ?? 'Exercise',
    logType: oneOf(logTypes, v.log_type),
    kind: str(v.kind) ?? 'e1rm',
    value,
    previousValue: num(v.previous_value),
    weightKg: num(v.weight_kg),
  };
}

function parseAttachedWorkout(v: unknown): AttachedWorkout | null {
  const summary = parseWorkoutSummary(v);
  const workoutId = isObj(v) ? str(v.workout_id) : null;
  return summary && workoutId ? { ...summary, workoutId } : null;
}

export function parsePost(v: unknown): Post | null {
  if (!isObj(v)) return null;
  const id = str(v.id);
  const type = oneOf(postTypes, v.type);
  const author = parsePerson(v.author);
  const createdAt = str(v.created_at);
  if (!id || !type || !author || !createdAt) return null;
  const data: Obj = isObj(v.data) ? v.data : {};
  const base = {
    id,
    author,
    body: str(v.body),
    media: parseList(v.media, parseMedia),
    visibility: oneOf(workoutVisibilities, v.visibility) ?? 'friends',
    createdAt,
    editedAt: str(v.edited_at),
    respects: int(v.respects),
    comments: int(v.comments),
    respected: bool(v.respected),
    mine: bool(v.mine),
    reasons: parseList(v.reasons, (r) => oneOf(discoverReasons, r)),
  };
  switch (type) {
    case 'workout': {
      const workoutId = str(v.workout_id);
      const workout = parseWorkoutSummary(v.workout);
      return workoutId && workout ? { ...base, type, workoutId, workout } : null;
    }
    case 'text':
    case 'photo':
      return {
        ...base,
        type,
        attachedWorkout: parseAttachedWorkout(data.workout),
        attachedPr: parsePr(data.pr),
      };
    case 'pr': {
      const pr = parsePr(data);
      return pr ? { ...base, type, pr } : null;
    }
    case 'rank_up': {
      const r = rank(data.tier, data.division);
      const key = str(data.key);
      if (!r || !key) return null;
      return {
        ...base,
        type,
        rankUp: {
          scope: str(data.scope) ?? 'lift',
          key,
          name: str(data.name) ?? key,
          from: rank(data.from_tier, data.from_division),
          rank: r,
          workoutId: str(data.workout_id),
        },
      };
    }
    case 'goal': {
      const title = str(data.title);
      return title ? { ...base, type, goal: { title, goalType: str(data.goal_type) } } : null;
    }
    case 'league_result': {
      const leagueId = str(data.league_id);
      if (!leagueId) return null;
      return {
        ...base,
        type,
        league: {
          leagueId,
          name: str(data.name) ?? 'League',
          kind: str(data.kind) ?? 'ranked',
          division: str(data.division),
          place: num(data.place),
          points: num(data.points),
          outcome: oneOf(['promoted', 'stayed', 'demoted'] as const, data.outcome),
        },
      };
    }
  }
}

export function parseCursor(v: unknown): Cursor | null {
  if (!isObj(v)) return null;
  const at = str(v.at);
  const id = str(v.id);
  return at && id ? { at, id } : null;
}

export function parsePostPage(v: unknown): PostPage {
  const o: Obj = isObj(v) ? v : {};
  return { posts: parseList(o.posts, parsePost), next: parseCursor(o.next) };
}

export function parseDiscoverPage(v: unknown): DiscoverPage {
  const o: Obj = isObj(v) ? v : {};
  return {
    asOf: str(o.as_of) ?? new Date().toISOString(),
    posts: parseList(o.posts, parsePost),
    done: o.done !== false,
  };
}

export function parseComment(v: unknown): Comment | null {
  if (!isObj(v)) return null;
  const id = str(v.id);
  const createdAt = str(v.created_at);
  const author = parsePerson(v.author);
  if (!id || !createdAt || !author) return null;
  return {
    id,
    parentId: str(v.parent_id),
    body: str(v.body),
    createdAt,
    editedAt: str(v.edited_at),
    deleted: bool(v.deleted),
    author,
    mine: bool(v.mine),
    canDelete: bool(v.can_delete),
  };
}

function parseDetailExercise(v: unknown, i: number): DetailExercise | null {
  if (!isObj(v)) return null;
  const exerciseId = str(v.exercise_id);
  if (!exerciseId) return null;
  return {
    id: `x${i}`,
    exerciseId,
    name: str(v.name) ?? 'Exercise',
    logType: oneOf(logTypes, v.log_type) ?? 'weight_reps',
    custom: bool(v.custom),
    supersetGroup: num(v.superset_group),
    restSeconds: int(v.rest_seconds),
    restAfterSupersetSeconds: null,
    notes: null,
    sets: arr(v.sets).flatMap((s, j) => {
      if (!isObj(s)) return [];
      return [
        {
          id: `x${i}s${j}`,
          setType: oneOf(setTypes, s.set_type) ?? 'working',
          weightMode: oneOf(weightModes, s.weight_mode) ?? 'absolute',
          targetType: null,
          targetReps: null,
          targetRepsMin: null,
          targetRepsMax: null,
          targetDurationSec: null,
          targetDistanceM: null,
          targetWeightKg: null,
          targetRir: null,
          targetRpe: null,
          tempo: null,
          reps: num(s.reps),
          weightKg: num(s.weight_kg),
          durationSec: num(s.duration_sec),
          distanceM: num(s.distance_m),
          rir: num(s.rir),
          rpe: num(s.rpe),
          completed: true,
          completedAt: null,
          failed: bool(s.failed),
          isPr: bool(s.is_pr),
        },
      ];
    }),
  };
}

export function parsePostDetail(v: unknown): PostDetail | null {
  const post = parsePost(v);
  if (!post || !isObj(v)) return null;
  return {
    post,
    exercises: arr(v.workout_detail)
      .map(parseDetailExercise)
      .filter((x): x is DetailExercise => x !== null),
    comments: parseList(v.comment_list, parseComment),
  };
}

export function parseProfile(v: unknown): Profile | null {
  const person = parsePerson(v);
  if (!person || !isObj(v)) return null;
  const rel: Obj = isObj(v.relationship) ? v.relationship : {};
  const counts = isObj(v.counts) ? v.counts : null;
  return {
    ...person,
    visibility: oneOf(workoutVisibilities, v.visibility) ?? 'friends',
    bio: str(v.bio),
    city: str(v.city),
    college: str(v.college),
    canView: bool(v.can_view),
    counts: counts
      ? {
          friends: int(counts.friends),
          followers: int(counts.followers),
          following: int(counts.following),
        }
      : null,
    mutualFriends: num(v.mutual_friends),
    relationship: {
      me: bool(rel.me),
      friend: oneOf(['none', 'friends', 'outgoing', 'incoming'] as const, rel.friend) ?? 'none',
      requestId: str(rel.request_id),
      following: bool(rel.following),
      followsMe: bool(rel.follows_me),
      blocked: bool(rel.blocked),
    },
  };
}

export function parseSuggestion(v: unknown): Suggestion | null {
  const person = parsePerson(v);
  if (!person || !isObj(v)) return null;
  return {
    ...person,
    college: str(v.college),
    city: str(v.city),
    mutualFriends: int(v.mutual_friends),
    reasons: parseList(v.reasons, (r) => oneOf(discoverReasons, r)),
  };
}

export function parseSearchResult(v: unknown): SearchResult | null {
  const person = parsePerson(v);
  return person && isObj(v) ? { ...person, isFriend: bool(v.is_friend) } : null;
}

function parseRequest(v: unknown): FriendRequest | null {
  if (!isObj(v)) return null;
  const id = str(v.id);
  const user = parsePerson(v.user);
  if (!id || !user) return null;
  return {
    id,
    createdAt: str(v.created_at) ?? '',
    user,
    mutualFriends: int(v.mutual_friends),
  };
}

export function parseFriendRequests(v: unknown): FriendRequests {
  const o: Obj = isObj(v) ? v : {};
  return {
    incoming: parseList(o.incoming, parseRequest),
    outgoing: parseList(o.outgoing, parseRequest),
  };
}

export function parseFriend(v: unknown): Friend | null {
  const person = parsePerson(v);
  return person && isObj(v) ? { ...person, since: str(v.since) ?? '' } : null;
}

export function parseNotification(v: unknown): AppNotification | null {
  if (!isObj(v)) return null;
  const id = str(v.id);
  const kind = oneOf(notificationKinds, v.kind);
  const actor = parsePerson(v.actor);
  const createdAt = str(v.created_at);
  if (!id || !kind || !actor || !createdAt) return null;
  const post = isObj(v.post) ? v.post : null;
  const comment = isObj(v.comment) ? v.comment : null;
  const request = isObj(v.request) ? v.request : null;
  const postId = post ? str(post.id) : null;
  const postType = post ? oneOf(postTypes, post.type) : null;
  const commentId = comment ? str(comment.id) : null;
  const requestId = request ? str(request.id) : null;
  const status = request
    ? oneOf(['pending', 'accepted', 'declined'] as const, request.status)
    : null;
  return {
    id,
    kind,
    createdAt,
    read: bool(v.read),
    actor,
    post:
      post && postId && postType
        ? { id: postId, type: postType, preview: str(post.preview) ?? '' }
        : null,
    comment: comment && commentId ? { id: commentId, preview: str(comment.preview) ?? '' } : null,
    request: requestId && status ? { id: requestId, status } : null,
  };
}

export function parseNotificationPage(v: unknown): NotificationPage {
  const o: Obj = isObj(v) ? v : {};
  return { items: parseList(o.items, parseNotification), next: parseCursor(o.next) };
}
