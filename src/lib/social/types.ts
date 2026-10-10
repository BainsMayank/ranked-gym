import type { LogType, Muscle } from '@/lib/exercises/taxonomy';
import type { Rank } from '@/lib/game/ranks';
import type { WeightMode } from '@/lib/routines/taxonomy';
import type { WorkoutVisibility } from '@/lib/workouts/taxonomy';
import type { WorkoutExercise } from '@/lib/workouts/types';

/**
 * The social layer as the app reads it (Phase 9). Shapes mirror the JSON the Postgres functions in
 * `*_social.sql` return; every visibility decision is made there, never here.
 */

export const postTypes = [
  'workout',
  'text',
  'photo',
  'pr',
  'rank_up',
  'goal',
  'league_result',
] as const;
export type PostType = (typeof postTypes)[number];

export const milestonePostModes = ['auto', 'ask', 'never'] as const;
export type MilestonePostMode = (typeof milestonePostModes)[number];

export const reportReasons = [
  'spam',
  'harassment',
  'hate',
  'nudity',
  'violence',
  'self_harm',
  'false_info',
  'other',
] as const;
export type ReportReason = (typeof reportReasons)[number];

export const notificationKinds = [
  'respect',
  'comment',
  'reply',
  'mention',
  'friend_request',
  'friend_accepted',
  'follow',
] as const;
export type NotificationKind = (typeof notificationKinds)[number];

export const discoverFilters = [
  'college',
  'city',
  'similar_rank',
  'same_goal',
  'calisthenics',
  'beginners',
] as const;
export type DiscoverFilter = (typeof discoverFilters)[number];

/** Why Discover showed a post or a person (only what the author shows publicly). */
export const discoverReasons = ['college', 'city', 'similar_rank', 'mutual'] as const;
export type DiscoverReason = (typeof discoverReasons)[number];

export type Visibility = WorkoutVisibility;

/** Name, username and avatar are visible to every signed-in user; rank only where the profile is. */
export interface Person {
  id: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  rank: Rank | null;
}

export interface PostMedia {
  path: string;
  w: number;
  h: number;
}

export interface BestSet {
  weightKg: number | null;
  reps: number | null;
  durationSec: number | null;
  distanceM: number | null;
  weightMode: WeightMode;
}

export interface SummaryExercise {
  exerciseId: string;
  name: string;
  logType: LogType;
  sets: number;
  pr: boolean;
  best: BestSet;
}

export interface SummaryRankUp {
  scope: 'lift' | 'overall';
  key: string;
  name: string;
  rank: Rank;
}

/** What a workout post shows; kept by triggers on the server. */
export interface WorkoutSummary {
  name: string;
  startedAt: string | null;
  durationSec: number | null;
  volumeKg: number;
  sets: number;
  exerciseCount: number;
  photoPath: string | null;
  calisthenics: boolean;
  records: number;
  exercises: SummaryExercise[];
  rankUps: SummaryRankUp[];
  muscles: { muscle: Muscle; sets: number }[];
}

export interface PrMilestone {
  workoutId: string | null;
  exerciseId: string;
  exerciseName: string;
  logType: LogType | null;
  kind: string;
  value: number;
  previousValue: number | null;
  weightKg: number | null;
}

export interface RankUpMilestone {
  scope: string;
  key: string;
  name: string;
  from: Rank | null;
  rank: Rank;
  workoutId: string | null;
}

export interface GoalMilestone {
  title: string;
  goalType: string | null;
}

export interface LeagueMilestone {
  leagueId: string;
  name: string;
  kind: string;
  division: string | null;
  place: number | null;
  points: number | null;
  outcome: 'promoted' | 'stayed' | 'demoted' | null;
}

/** A workout attached to a text or photo post (a snapshot taken when posting). */
export interface AttachedWorkout extends WorkoutSummary {
  workoutId: string;
}

interface PostBase {
  id: string;
  author: Person;
  body: string | null;
  media: PostMedia[];
  visibility: Visibility;
  createdAt: string;
  editedAt: string | null;
  respects: number;
  comments: number;
  respected: boolean;
  mine: boolean;
  /** Discover only. */
  reasons: DiscoverReason[];
}

export type Post =
  | (PostBase & { type: 'workout'; workoutId: string; workout: WorkoutSummary })
  | (PostBase & {
      type: 'text' | 'photo';
      attachedWorkout: AttachedWorkout | null;
      attachedPr: PrMilestone | null;
    })
  | (PostBase & { type: 'pr'; pr: PrMilestone })
  | (PostBase & { type: 'rank_up'; rankUp: RankUpMilestone })
  | (PostBase & { type: 'goal'; goal: GoalMilestone })
  | (PostBase & { type: 'league_result'; league: LeagueMilestone });

export interface Comment {
  id: string;
  parentId: string | null;
  body: string | null;
  createdAt: string;
  editedAt: string | null;
  deleted: boolean;
  author: Person;
  mine: boolean;
  canDelete: boolean;
  /** Set on optimistic comments until the server confirms them. */
  pending?: boolean;
}

/** A workout post's exercises in the shape the history components use (ids are synthetic). */
export interface DetailExercise extends WorkoutExercise {
  name: string;
  logType: LogType;
  custom: boolean;
}

export interface PostDetail {
  post: Post;
  exercises: DetailExercise[];
  comments: Comment[];
}

export interface Cursor {
  at: string;
  id: string;
}

export interface PostPage {
  posts: Post[];
  next: Cursor | null;
}

export interface DiscoverPage {
  asOf: string;
  posts: Post[];
  done: boolean;
}

export type FriendState = 'none' | 'friends' | 'outgoing' | 'incoming';

export interface Profile extends Person {
  visibility: Visibility;
  bio: string | null;
  city: string | null;
  college: string | null;
  canView: boolean;
  counts: { friends: number; followers: number; following: number } | null;
  mutualFriends: number | null;
  relationship: {
    me: boolean;
    friend: FriendState;
    requestId: string | null;
    following: boolean;
    followsMe: boolean;
    blocked: boolean;
  };
}

export interface Suggestion extends Person {
  college: string | null;
  city: string | null;
  mutualFriends: number;
  reasons: DiscoverReason[];
}

export interface SearchResult extends Person {
  isFriend: boolean;
}

export interface FriendRequest {
  id: string;
  createdAt: string;
  user: Person;
  mutualFriends: number;
}

export interface FriendRequests {
  incoming: FriendRequest[];
  outgoing: FriendRequest[];
}

export interface Friend extends Person {
  since: string;
}

export interface AppNotification {
  id: string;
  kind: NotificationKind;
  createdAt: string;
  read: boolean;
  actor: Person;
  post: { id: string; type: PostType; preview: string } | null;
  comment: { id: string; preview: string } | null;
  request: { id: string; status: 'pending' | 'accepted' | 'declined' } | null;
}

export interface NotificationPage {
  items: AppNotification[];
  next: Cursor | null;
}
