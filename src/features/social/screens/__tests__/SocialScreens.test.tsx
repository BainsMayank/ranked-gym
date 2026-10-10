import { render, screen, userEvent } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { parsePost, parsePostDetail } from '@/lib/social/parse';
import type { Post, PostDetail } from '@/lib/social/types';
import { useSyncStatusStore } from '@/lib/sync/status';

import { ComposerScreen } from '../ComposerScreen';
import { CopyWorkoutScreen } from '../CopyWorkoutScreen';
import { FeedScreen } from '../FeedScreen';
import { PostDetailScreen } from '../PostDetailScreen';

/** Feed, post detail, composer and copy workout over mocked social hooks. */

const mockPush = jest.fn();
const mockBack = jest.fn();
const mockReplace = jest.fn();
let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  router: {
    push: (...a: unknown[]) => mockPush(...a),
    back: () => mockBack(),
    replace: (...a: unknown[]) => mockReplace(...a),
    navigate: jest.fn(),
    canGoBack: () => true,
  },
  useLocalSearchParams: () => mockParams,
  useFocusEffect: jest.fn(),
}));

const mockKv = new Map<string, string>();
jest.mock('expo-sqlite/kv-store', () => ({
  Storage: {
    getItemSync: (k: string) => mockKv.get(k) ?? null,
    setItemSync: (k: string, v: string) => void mockKv.set(k, v),
  },
}));
jest.mock('@/lib/auth/authStore', () => ({ useUserId: () => 'me' }));
jest.mock('@/lib/profile', () => ({
  useProfile: () => ({
    data: {
      units: 'kg',
      username: 'me',
      display_name: 'Me',
      avatar_url: null,
      visibility: 'friends',
    },
  }),
}));
jest.mock('@/lib/ranks', () => ({
  useServerReads: () => true,
  usePersonalRecords: () => ({ data: [] }),
}));
jest.mock('@/lib/workouts', () => ({
  ...jest.requireActual('@/lib/workouts/oneRepMax'),
  ...jest.requireActual('@/lib/workouts/lastTime'),
  useWorkoutHistory: () => ({ data: [] }),
}));
jest.mock('@/lib/exercises', () => ({
  useExercises: () => ({ data: [{ id: 'e1' }], isLoading: false }),
}));
const mockSaveRoutine = jest.fn();
jest.mock('@/lib/routines', () => ({
  ...jest.requireActual('@/lib/routines/summary'),
  ...jest.requireActual('@/lib/routines/defaults'),
  ...jest.requireActual('@/lib/routines/setRules'),
  saveDraft: jest.fn(),
  useSaveRoutine: () => ({ mutate: mockSaveRoutine, isPending: false }),
}));

let mockFeed: Post[] = [];
let mockDetail: PostDetail | null = null;
const mockRespect = jest.fn();
const mockComment = jest.fn();
const mockCreate = jest.fn();
const mockIdle = { mutate: jest.fn(), isPending: false };
jest.mock('@/lib/social/hooks', () => ({
  useFeed: () => ({
    data: { pages: [{ posts: mockFeed, next: null }] },
    isLoading: false,
    isSuccess: true,
    isError: false,
    refetch: jest.fn(),
  }),
  useNewPostsSignal: () => ({ hasNew: false, reset: jest.fn() }),
  usePost: () => ({ data: mockDetail, isLoading: false, isError: false }),
  useRespect: () => ({ mutate: mockRespect }),
  useAddComment: () => ({ mutate: mockComment, isPending: false }),
  useDeleteComment: () => mockIdle,
  useDeletePost: () => mockIdle,
  useBlock: () => mockIdle,
  useReport: () => mockIdle,
  useCreatePost: () => ({ mutate: mockCreate, isPending: false }),
  useEditPost: () => mockIdle,
  useProfileSearch: () => ({ data: [] }),
  newSocialId: () => 'new-id',
}));

jest.mock('@/lib/social/media', () => ({
  POST_MEDIA_BUCKET: 'post-media',
  WORKOUT_PHOTO_BUCKET: 'workout-photos',
  MAX_POST_PHOTOS: 4,
  useMediaUrl: () => ({ data: null }),
  pickPostPhotos: jest.fn(),
}));

const author = {
  id: 'u1',
  username: 'aarav',
  display_name: 'Aarav',
  avatar_url: null,
  rank: { tier: 'gold', division: 2 },
};
const rawWorkout = {
  id: 'p1',
  type: 'workout',
  author,
  media: [],
  data: {},
  workout_id: 'w1',
  workout: {
    name: 'Leg day',
    duration_sec: 3600,
    volume_kg: 5200,
    sets: 12,
    exercise_count: 2,
    records: 1,
    exercises: [
      {
        exercise_id: 'e1',
        name: 'Barbell back squat',
        log_type: 'weight_reps',
        sets: 5,
        pr: true,
        best: { weight_kg: 140, reps: 5, weight_mode: 'absolute' },
      },
    ],
    rank_ups: [],
    muscles: [],
  },
  visibility: 'friends',
  created_at: '2026-10-10T09:00:00Z',
  respects: 2,
  comments: 1,
  respected: false,
  mine: false,
};
const post = (patch: Record<string, unknown>) => {
  const p = parsePost({ ...rawWorkout, ...patch });
  if (!p) throw new Error('bad fixture');
  return p;
};

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};
const show = (ui: ReactElement) =>
  render(<SafeAreaProvider initialMetrics={METRICS}>{ui}</SafeAreaProvider>);

beforeEach(() => {
  jest.clearAllMocks();
  mockKv.clear();
  mockParams = {};
  useSyncStatusStore.setState({ online: true });
});

describe('Feed', () => {
  it('shows workout posts with their best sets, records and Respect', async () => {
    mockFeed = [post({})];
    await show(<FeedScreen />);
    expect(screen.getByText('Leg day')).toBeTruthy();
    expect(screen.getByText('140 × 5')).toBeTruthy();
    expect(screen.getByText('1 record')).toBeTruthy();
    await userEvent.setup().press(screen.getByLabelText('Give respect'));
    expect(mockRespect).toHaveBeenCalledWith({ postId: 'p1', give: true }, expect.anything());
  });

  it('marks where the posts you have seen begin', async () => {
    mockKv.set('social.v1.feedSeen.me', JSON.stringify({ at: '2026-10-10T09:00:00Z', id: 'p1' }));
    mockFeed = [post({ id: 'p2', created_at: '2026-10-10T11:00:00Z' }), post({})];
    await show(<FeedScreen />);
    expect(screen.getByText('You’re all caught up')).toBeTruthy();
  });

  it('suggests Discover when the feed is empty', async () => {
    mockFeed = [];
    await show(<FeedScreen />);
    expect(screen.getByText('Your feed is quiet')).toBeTruthy();
  });

  it('offers Copy workout on other people’s workouts', async () => {
    mockFeed = [post({})];
    await show(<FeedScreen />);
    await userEvent.setup().press(screen.getByText('Copy workout'));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/post/[id]/copy', params: { id: 'p1' } });
  });
});

describe('Post detail', () => {
  const detail = () =>
    parsePostDetail({
      ...rawWorkout,
      workout_detail: [
        {
          exercise_id: 'e1',
          name: 'Barbell back squat',
          log_type: 'weight_reps',
          sets: [{ set_type: 'working', weight_mode: 'absolute', weight_kg: 140, reps: 5 }],
        },
      ],
      comment_list: [
        {
          id: 'c1',
          parent_id: null,
          body: 'Strong @aarav',
          created_at: '2026-10-10T10:00:00Z',
          author: { ...author, id: 'u2', username: 'bob', display_name: 'Bob' },
          mine: false,
          can_delete: false,
        },
        {
          id: 'c2',
          parent_id: 'c1',
          body: 'Agreed',
          created_at: '2026-10-10T10:05:00Z',
          author: { ...author, id: 'u3', username: 'eve', display_name: 'Eve' },
          mine: false,
          can_delete: false,
        },
      ],
    });

  it('threads replies under their comment and replies to the thread', async () => {
    mockParams = { id: 'p1' };
    mockDetail = detail();
    await show(<PostDetailScreen />);
    expect(screen.getByText('Agreed')).toBeTruthy();
    const user = userEvent.setup();
    await user.press(screen.getAllByText('Reply')[0]!);
    expect(screen.getByText('Replying to @bob')).toBeTruthy();
    await user.type(screen.getByLabelText('Comment'), 'Same here');
    await user.press(screen.getByLabelText('Send comment'));
    expect(mockComment).toHaveBeenCalledWith(
      {
        id: 'new-id',
        input: expect.objectContaining({ postId: 'p1', body: 'Same here', parentId: 'c1' }),
      },
      expect.anything(),
    );
  });

  it('says when a post is not available', async () => {
    mockParams = { id: 'gone' };
    mockDetail = null;
    await show(<PostDetailScreen />);
    expect(screen.getByText('This post isn’t available')).toBeTruthy();
  });
});

describe('Composer', () => {
  it('enables Post once there is text, and counts characters', async () => {
    await show(<ComposerScreen />);
    const postButton = screen.getByRole('button', { name: 'Post' });
    expect(postButton).toBeDisabled();
    await userEvent.setup().type(screen.getByLabelText('Post text'), 'Deadlift PR today');
    expect(screen.getByText('17 / 1000')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Post' })).toBeEnabled();
    await userEvent.setup().press(screen.getByRole('button', { name: 'Post' }));
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'new-id', body: 'Deadlift PR today', visibility: 'friends' }),
      expect.anything(),
    );
  });

  it('explains when the profile caps a public post', async () => {
    await show(<ComposerScreen />);
    await userEvent.setup().press(screen.getByText('Public'));
    expect(screen.getByText(/Your profile is friends only/)).toBeTruthy();
  });
});

describe('Copy workout', () => {
  it('previews the routine with credit and leaves out exercises you cannot use', async () => {
    mockParams = { id: 'p1' };
    const d = parsePostDetail({
      ...rawWorkout,
      workout_detail: [
        {
          exercise_id: 'e1',
          name: 'Barbell back squat',
          log_type: 'weight_reps',
          sets: [{ set_type: 'working', weight_mode: 'absolute', weight_kg: 140, reps: 5 }],
        },
        {
          exercise_id: 'custom',
          name: 'Aarav’s sled push',
          log_type: 'weight_reps',
          custom: true,
          sets: [{ set_type: 'working', weight_mode: 'absolute', weight_kg: 60, reps: 10 }],
        },
      ],
      comment_list: [],
    });
    mockDetail = d;
    await show(<CopyWorkoutScreen />);
    expect(screen.getByText('140 × 5')).toBeTruthy();
    expect(screen.getByText(/Left out: Aarav’s sled push/)).toBeTruthy();
    await userEvent.setup().press(screen.getByText('Save routine'));
    const doc = mockSaveRoutine.mock.calls[0]?.[0] as {
      source: string;
      sourceLabel: string;
      exercises: unknown[];
    };
    expect(doc).toMatchObject({
      source: 'copied',
      sourceRef: 'p1',
      sourceLabel: '@aarav',
      name: 'Leg day',
    });
    expect(doc.exercises).toHaveLength(1);
  });
});
